package it.voto.school

import android.app.DownloadManager
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.StatFs
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.Content
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

@CapacitorPlugin(name = "LocalLlm")
class LocalLlmPlugin : Plugin() {
    companion object {
        private const val MODEL_NAME = "Qwen3-0.6B.litertlm"
        private const val URL = "https://huggingface.co/litert-community/Qwen3-0.6B/resolve/8d42ab5f1db14cad987fac57aeb17d070f9e180d/Qwen3-0.6B.litertlm?download=true"
        private const val SIZE = 613722264L
        private const val SHA256 = "c5f39b4191926786c3e6668b62af4d6eb15248dfc7a5348252a9b406f33f2108"
        private const val MAX_PROMPT = 12000
        private const val MAX_OUTPUT = 384
        private const val ERROR_UNSUPPORTED = "Il modello locale richiede un dispositivo Android arm64-v8a."
        private const val PREFS = "local_llm_plugin"
        private const val PREF_DOWNLOAD_ID = "download_id"
    }

    private val executor: ScheduledExecutorService = Executors.newSingleThreadScheduledExecutor()
    private val stateLock = Any()
    @Volatile private var downloadId: Long? = null
    @Volatile private var verified = false
    @Volatile private var verificationRunning = false
    @Volatile private var verificationError: String? = null
    private var currentEngine: Engine? = null
    private var idleClose: ScheduledFuture<*>? = null
    private var lastUse = 0L
    private val modelFile get() = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir, MODEL_NAME)
    private val preferences get() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun load() {
        super.load()
        val savedId = preferences.getLong(PREF_DOWNLOAD_ID, -1L).takeIf { it >= 0L }
        synchronized(stateLock) { downloadId = savedId }
    }

    private fun rememberDownload(id: Long?) {
        synchronized(stateLock) { downloadId = id }
        if (id == null) preferences.edit().remove(PREF_DOWNLOAD_ID).apply()
        else preferences.edit().putLong(PREF_DOWNLOAD_ID, id).apply()
    }

    private fun supported() = Build.VERSION.SDK_INT >= 24 && Build.SUPPORTED_ABIS.any { it == "arm64-v8a" }
    private fun fail(call: PluginCall, message: String) { call.reject(message) }
    private fun status(state: String, bytes: Long = 0, error: String? = null): JSObject {
        val result = JSObject().put("supported", supported()).put("state", if (!supported()) "unsupported" else state)
            .put("downloadedBytes", bytes).put("totalBytes", SIZE).put("progress", (bytes.toDouble() / SIZE).coerceIn(0.0, 1.0))
        if (error != null) result.put("errorMessage", error)
        return result
    }

    @PluginMethod fun getStatus(call: PluginCall) {
        if (!supported()) { call.resolve(status("unsupported")); return }
        val id = synchronized(stateLock) { downloadId }
        if (id != null) {
            var cursor: android.database.Cursor? = null
            try {
                val query = DownloadManager.Query().setFilterById(id)
                cursor = (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).query(query)
                if (cursor != null && cursor.moveToFirst()) {
                    val bytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)).coerceAtLeast(0)
                    when (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))) {
                        DownloadManager.STATUS_SUCCESSFUL -> {
                            cursor.close(); cursor = null
                            executor.execute {
                                if (synchronized(stateLock) { downloadId == id }) {
                                    rememberDownload(null)
                                    if (!verified && !verificationRunning) {
                                        verificationRunning = true
                                        verifyModel()
                                    }
                                }
                            }
                            call.resolve(status("verifying", SIZE)); return
                        }
                        DownloadManager.STATUS_FAILED -> {
                            val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                            cursor.close(); cursor = null
                            executor.execute {
                                if (synchronized(stateLock) { downloadId == id }) {
                                    rememberDownload(null)
                                    verificationError = "DownloadManager ha interrotto il download (codice $reason)."
                                }
                            }
                            call.resolve(status("error", bytes, "DownloadManager ha interrotto il download (codice $reason).")); return
                        }
                        else -> { call.resolve(status("downloading", bytes.coerceAtMost(SIZE))); return }
                    }
                }
            } catch (_: Exception) {
                // Query transitoria non deve bloccare il bridge; lo stato persistito resta interrogabile al prossimo polling.
            } finally { cursor?.close() }
        }
        val error = verificationError
        if (error != null) call.resolve(status("error", modelFile.length(), error))
        else if (modelFile.isFile && modelFile.length() == SIZE && verified) call.resolve(status("ready", SIZE))
        else if (modelFile.isFile && modelFile.length() == SIZE) {
            if (!verificationRunning) executor.execute {
                if (!verified && !verificationRunning) { verificationRunning = true; verifyModel() }
            }
            call.resolve(status("verifying", SIZE))
        } else if (modelFile.exists()) call.resolve(status("error", modelFile.length(), "Il file del modello è incompleto o non valido."))
        else call.resolve(status("not-installed"))
    }

    // Runs only on the serial executor. No state monitor is held during file I/O or hashing.
    private fun verifyModel() {
        try {
            if (!modelFile.isFile || modelFile.length() != SIZE) throw IllegalStateException("Dimensione del modello non valida.")
            val digest = MessageDigest.getInstance("SHA-256")
            modelFile.inputStream().buffered().use { input ->
                val buffer = ByteArray(1024 * 1024)
                while (true) { val n = input.read(buffer); if (n < 0) break; digest.update(buffer, 0, n) }
            }
            val actual = digest.digest().joinToString("") { "%02x".format(it) }
            if (!actual.equals(SHA256, true)) { modelFile.delete(); throw IllegalStateException("Verifica SHA-256 del modello non riuscita; file rimosso.") }
            verified = true; verificationError = null
        } catch (e: Exception) { verified = false; verificationError = e.localizedMessage ?: "Verifica del modello non riuscita." }
        finally { verificationRunning = false }
    }

    @PluginMethod fun downloadModel(call: PluginCall) {
        if (!supported()) { fail(call, ERROR_UNSUPPORTED); return }
        executor.execute {
            try {
                if (downloadId != null) { call.resolve(); return@execute }
                if (modelFile.isFile && modelFile.length() == SIZE) { call.resolve(); return@execute }
                val base = modelFile.parentFile ?: context.filesDir
                val available = StatFs(base.absolutePath).availableBytes
                if (available < SIZE + 128L * 1024 * 1024) { fail(call, "Spazio insufficiente: servono almeno 614 MB più margine per il modello."); return@execute }
                modelFile.delete(); verified = false; verificationError = null
                val req = DownloadManager.Request(android.net.Uri.parse(URL)).setTitle("Modello AI locale")
                    .setDescription("Download del modello Qwen3 0.6B")
                    .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, MODEL_NAME)
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                rememberDownload((context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req))
                call.resolve()
            } catch (e: Exception) { rememberDownload(null); fail(call, "Impossibile avviare il download: ${e.localizedMessage ?: "errore sconosciuto"}") }
        }
    }

    @PluginMethod fun cancelDownload(call: PluginCall) {
        executor.execute {
            try {
                downloadId?.let { (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).remove(it) }
                rememberDownload(null); modelFile.delete(); verified = false; verificationError = null; call.resolve()
            } catch (e: Exception) { rememberDownload(null); fail(call, "Impossibile annullare il download: ${e.localizedMessage ?: "errore sconosciuto"}") }
        }
    }

    @PluginMethod fun deleteModel(call: PluginCall) {
        executor.execute {
            try {
                downloadId?.let { (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).remove(it) }
                rememberDownload(null); closeEngine(); modelFile.delete(); verified = false; verificationRunning = false; verificationError = null; call.resolve()
            } catch (e: Exception) { fail(call, "Impossibile eliminare il modello: ${e.localizedMessage ?: "errore sconosciuto"}") }
        }
    }

    @PluginMethod fun generate(call: PluginCall) {
        if (!supported()) { fail(call, ERROR_UNSUPPORTED); return }
        val prompt = call.getString("prompt") ?: ""
        if (prompt.isBlank() || prompt.length > MAX_PROMPT) { fail(call, "Il prompt deve contenere da 1 a $MAX_PROMPT caratteri."); return }
        executor.execute {
            try {
                if (!modelFile.isFile || modelFile.length() != SIZE) throw IllegalStateException("Scarica prima il modello locale e attendi la verifica.")
                if (!verified) {
                    if (verificationRunning) throw IllegalStateException("Verifica del modello in corso.")
                    verificationRunning = true; verifyModel()
                    if (!verified) throw IllegalStateException(verificationError ?: "Modello non verificato.")
                }
                currentEngine?.let { if (System.currentTimeMillis() - lastUse > TimeUnit.MINUTES.toMillis(5)) closeEngine() }
                val engine = currentEngine ?: Engine(EngineConfig(modelPath = modelFile.absolutePath, backend = Backend.CPU())).also { it.initialize(); currentEngine = it }
                val response = engine.createConversation().use { it.sendMessage(Message.user(prompt), maxOutputToken = MAX_OUTPUT) }
                lastUse = System.currentTimeMillis()
                idleClose?.cancel(false)
                idleClose = executor.schedule({ if (currentEngine === engine && System.currentTimeMillis() - lastUse >= TimeUnit.MINUTES.toMillis(5)) closeEngine() }, 5, TimeUnit.MINUTES)
                val text = response.contents.contents.filterIsInstance<Content.Text>().joinToString("") { it.text }.take(12000)
                call.resolve(JSObject().put("text", text))
            } catch (e: Exception) { call.reject("Generazione locale non riuscita: ${e.localizedMessage ?: "errore sconosciuto"}") }
        }
    }

    private fun closeEngine() { idleClose?.cancel(false); idleClose = null; try { currentEngine?.close() } finally { currentEngine = null } }
    override fun handleOnDestroy() { executor.execute { closeEngine() }; executor.shutdown(); super.handleOnDestroy() }
}
