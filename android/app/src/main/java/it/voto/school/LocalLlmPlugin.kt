package it.voto.school

import android.app.DownloadManager
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.StatFs
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

@CapacitorPlugin(name = "LocalLlm")
class LocalLlmPlugin : Plugin() {
    data class ModelSpec(val id: String, val label: String, val modelName: String, val size: Long, val required: Long, val compatibility: String, val recommended: String, val license: String, val source: String, val url: String, val note: String? = null)
    companion object {
        private const val PREFS = "local_llm_plugin"
        private const val SELECTED = "selected_model"
        private const val MAX_PROMPT = 12000
        private const val MAX_OUTPUT = 384
        private val MODELS = listOf(
            ModelSpec("qwen3-4b", "Locale Potente", "Qwen3 4B · LiteRT-LM int4", 2272935936L, 2500000000L, "Android arm64 con almeno 8 GB RAM", "telefoni potenti", "Apache-2.0", "https://huggingface.co/litert-community/Qwen3-4B", "https://huggingface.co/litert-community/Qwen3-4B/resolve/965e091f07b566834b6af1dfe92b143dc92f46e7/qwen3_4b_mixed_int4.litertlm?download=true", "Conversione LiteRT-LM int4, non il file GGUF Q4_K_M."),
            ModelSpec("gemma3n-e2b", "Locale Media", "Gemma 3n E2B-it · LiteRT-LM int4", 3655827456L, 3900000000L, "Android arm64 con almeno 8 GB RAM", "uso multimodale compatibile", "Gemma Terms of Use", "https://huggingface.co/warped-community/gemma-3n-E2B-it-litert-lm", "https://huggingface.co/warped-community/gemma-3n-E2B-it-litert-lm/resolve/578c09610e661ed16bd7d22e1ecf9922d92f7064/gemma-3n-E2B-it-int4.litertlm?download=true", "Conversione LiteRT-LM pubblica della famiglia Gemma 3n; verificare i termini Gemma prima dell’uso commerciale."),
            ModelSpec("qwen3-1.7b", "Locale Leggera", "Qwen3 1.7B · LiteRT-LM int4", 977184032L, 1200000000L, "Android arm64 con almeno 4 GB RAM", "telefoni medi e potenti", "Apache-2.0", "https://huggingface.co/litert-community/Qwen3-1.7B", "https://huggingface.co/litert-community/Qwen3-1.7B/resolve/87603f0ff3fe74b9b77ed0477edb773b4b596f32/Qwen3-1.7B_dynamic_wi4b32_afp32.litertlm?download=true", "File LiteRT-LM dynamic int4 ufficiale; non è un GGUF."),
            ModelSpec("qwen3-0.6b", "Locale Ultra Leggera", "Qwen3 0.6B · LiteRT-LM", 613722264L, 750000000L, "Android arm64 con poca RAM", "telefoni con poca RAM", "Apache-2.0", "https://huggingface.co/litert-community/Qwen3-0.6B", "https://huggingface.co/litert-community/Qwen3-0.6B/resolve/8d42ab5f1db14cad987fac57aeb17d070f9e180d/Qwen3-0.6B.litertlm?download=true")
        )
        private const val UNSUPPORTED = "I modelli locali richiedono un dispositivo Android arm64-v8a."
    }

    private val executor: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val lock = Any()
    private val downloadIds = mutableMapOf<String, Long>()
    private val verified = mutableSetOf<String>()
    private val verificationRunning = mutableSetOf<String>()
    private val errors = mutableMapOf<String, String>()
    private var currentEngine: Engine? = null
    private var currentModel: String? = null
    private var idleClose: ScheduledFuture<*>? = null
    private var lastUse = 0L
    private val prefs get() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun spec(id: String) = MODELS.firstOrNull { it.id == id }
    private fun modelFile(m: ModelSpec) = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir, "${m.id}.litertlm")
    private fun supported() = Build.VERSION.SDK_INT >= 24 && Build.SUPPORTED_ABIS.any { it == "arm64-v8a" }
    private fun availableBytes(m: ModelSpec) = StatFs(modelFile(m).parentFile?.absolutePath ?: context.filesDir.absolutePath).availableBytes

    override fun load() { super.load(); MODELS.forEach { model -> prefs.getLong("download_${model.id}", -1L).takeIf { value -> value >= 0 }?.let { value -> downloadIds[model.id] = value } } }
    private fun fail(call: PluginCall, message: String) = call.reject(message)
    private fun status(m: ModelSpec, state: String, bytes: Long = 0L, error: String? = null): JSObject {
        val result = JSObject().put("modelId", m.id).put("supported", supported()).put("state", if (!supported()) "unsupported" else state).put("downloadedBytes", bytes).put("totalBytes", m.size).put("requiredFreeBytes", m.required).put("availableBytes", availableBytes(m)).put("progress", (bytes.toDouble() / m.size).coerceIn(0.0, 1.0))
        if (error != null) result.put("errorMessage", error)
        return result
    }
    private fun remember(id: String, downloadId: Long?) { if (downloadId == null) prefs.edit().remove("download_$id").apply() else prefs.edit().putLong("download_$id", downloadId).apply(); synchronized(lock) { if (downloadId == null) downloadIds.remove(id) else downloadIds[id] = downloadId } }

    @PluginMethod fun getCatalog(call: PluginCall) { val array = JSArray(); MODELS.forEach { m -> array.put(JSObject().put("id", m.id).put("label", m.label).put("modelName", m.modelName).put("sizeBytes", m.size).put("requiredFreeBytes", m.required).put("compatibility", m.compatibility).put("recommendedFor", m.recommended).put("license", m.license).put("sourceUrl", m.source).apply { if (m.note != null) put("note", m.note) }) }; call.resolve(JSObject().put("models", array)) }
    @PluginMethod fun getSelectedModel(call: PluginCall) { call.resolve(JSObject().put("modelId", prefs.getString(SELECTED, null))) }
    @PluginMethod fun selectModel(call: PluginCall) { val id = call.getString("modelId"); if (spec(id ?: "") == null) { fail(call, "Modello locale non riconosciuto."); return }; prefs.edit().putString(SELECTED, id).apply(); call.resolve() }

    @PluginMethod fun getStatus(call: PluginCall) {
        val m = spec(call.getString("modelId") ?: "") ?: run { fail(call, "Modello locale non riconosciuto."); return }
        if (!supported()) { call.resolve(status(m, "unsupported")); return }
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val id = synchronized(lock) { downloadIds[m.id] }
        if (id != null) {
            manager.query(DownloadManager.Query().setFilterById(id))?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)).coerceAtLeast(0)
                    when (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                        DownloadManager.STATUS_SUCCESSFUL -> { remember(m.id, null); executor.execute { verify(m) }; call.resolve(status(m, "verifying", m.size)); return }
                        DownloadManager.STATUS_FAILED -> { val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)); remember(m.id, null); val message = "Download interrotto (codice $reason)."; synchronized(lock) { errors[m.id] = message }; call.resolve(status(m, "error", bytes, message)); return }
                        else -> { call.resolve(status(m, "downloading", bytes.coerceAtMost(m.size))); return }
                    }
                }
            }
        }
        val file = modelFile(m); val error = synchronized(lock) { errors[m.id] }
        when { error != null -> call.resolve(status(m, "error", file.length(), error)); file.isFile && file.length() == m.size && verified.contains(m.id) -> call.resolve(status(m, "ready", m.size)); file.isFile && file.length() == m.size -> { if (verificationRunning.add(m.id)) executor.execute { verify(m) }; call.resolve(status(m, "verifying", m.size)) }; file.exists() -> call.resolve(status(m, "error", file.length(), "Il file del modello è incompleto o non valido.")); else -> call.resolve(status(m, "not-installed")) }
    }

    private fun verify(m: ModelSpec) { try { if (!modelFile(m).isFile || modelFile(m).length() != m.size) throw IllegalStateException("Dimensione del modello non valida."); synchronized(lock) { verified.add(m.id); errors.remove(m.id) } } catch (e: Exception) { modelFile(m).delete(); synchronized(lock) { verified.remove(m.id); errors[m.id] = e.localizedMessage ?: "Verifica non riuscita." } } finally { verificationRunning.remove(m.id) } }

    @PluginMethod fun downloadModel(call: PluginCall) {
        val m = spec(call.getString("modelId") ?: "") ?: run { fail(call, "Modello locale non riconosciuto."); return }
        if (!supported()) { fail(call, UNSUPPORTED); return }
        executor.execute { try { if (downloadIds[m.id] != null || (modelFile(m).isFile && modelFile(m).length() == m.size)) { call.resolve(); return@execute }; val free = availableBytes(m); if (free < m.required) { fail(call, "Spazio insufficiente: servono ${m.required / 1000000} MB liberi per ${m.label}."); return@execute }; modelFile(m).delete(); verified.remove(m.id); errors.remove(m.id); val request = DownloadManager.Request(android.net.Uri.parse(m.url)).setTitle("${m.label} · VOTO").setDescription("Download di ${m.modelName}").setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, "${m.id}.litertlm").setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE); val id = (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request); remember(m.id, id); call.resolve() } catch (e: Exception) { remember(m.id, null); fail(call, "Impossibile avviare il download: ${e.localizedMessage ?: "errore sconosciuto"}") } }
    }
    @PluginMethod fun cancelDownload(call: PluginCall) { mutateDownload(call, true) }
    @PluginMethod fun deleteModel(call: PluginCall) { mutateDownload(call, false) }
    private fun mutateDownload(call: PluginCall, cancel: Boolean) { val m = spec(call.getString("modelId") ?: "") ?: run { fail(call, "Modello locale non riconosciuto."); return }; executor.execute { try { synchronized(lock) { downloadIds[m.id] }?.let { (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).remove(it) }; remember(m.id, null); if (!cancel) closeEngine(); modelFile(m).delete(); verified.remove(m.id); verificationRunning.remove(m.id); errors.remove(m.id); call.resolve() } catch (e: Exception) { fail(call, "Operazione sul modello non riuscita: ${e.localizedMessage ?: "errore sconosciuto"}") } } }

    @PluginMethod fun generate(call: PluginCall) {
        if (!supported()) { fail(call, UNSUPPORTED); return }; val prompt = call.getString("prompt") ?: ""; if (prompt.isBlank() || prompt.length > MAX_PROMPT) { fail(call, "Il prompt deve contenere da 1 a $MAX_PROMPT caratteri."); return }; val id = call.getString("modelId") ?: prefs.getString(SELECTED, null) ?: "qwen3-0.6b"; val m = spec(id) ?: run { fail(call, "Modello locale non riconosciuto."); return }
        executor.execute { try { if (!modelFile(m).isFile || modelFile(m).length() != m.size) throw IllegalStateException("Scarica prima il modello locale e attendi la verifica."); if (!verified.contains(m.id)) { if (verificationRunning.contains(m.id)) throw IllegalStateException("Verifica del modello in corso."); verify(m); if (!verified.contains(m.id)) throw IllegalStateException(errors[m.id] ?: "Modello non verificato.") }; if (currentModel != m.id) { closeEngine(); currentModel = m.id }; currentEngine?.let { if (System.currentTimeMillis() - lastUse > TimeUnit.MINUTES.toMillis(5)) closeEngine() }; val engine = currentEngine ?: Engine(EngineConfig(modelPath = modelFile(m).absolutePath, backend = Backend.CPU())).also { it.initialize(); currentEngine = it }; val response = engine.createConversation().use { it.sendMessage(Message.user(prompt), maxOutputToken = MAX_OUTPUT) }; lastUse = System.currentTimeMillis(); idleClose?.cancel(false); idleClose = executor.schedule({ if (currentEngine === engine && System.currentTimeMillis() - lastUse >= TimeUnit.MINUTES.toMillis(5)) closeEngine() }, 5, TimeUnit.MINUTES); val text = response.contents.contents.filterIsInstance<Content.Text>().joinToString("") { it.text }.take(12000); call.resolve(JSObject().put("text", text).put("modelId", m.id)) } catch (e: Exception) { call.reject("Generazione locale non riuscita: ${e.localizedMessage ?: "errore sconosciuto"}") } }
    }
    private fun closeEngine() { idleClose?.cancel(false); idleClose = null; try { currentEngine?.close() } finally { currentEngine = null; currentModel = null } }
    override fun handleOnDestroy() { executor.execute { closeEngine() }; executor.shutdown(); super.handleOnDestroy() }
}
