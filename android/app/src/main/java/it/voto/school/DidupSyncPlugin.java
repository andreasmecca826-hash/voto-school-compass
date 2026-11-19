package it.voto.school;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

@CapacitorPlugin(name = "DidupSync")
public class DidupSyncPlugin extends Plugin {
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossibile aprire le impostazioni Android di VOTO.");
        }
    }

    @PluginMethod
    public void saveCredentials(PluginCall call) {
        String schoolCode = call.getString("schoolCode", "").trim();
        String username = call.getString("username", "").trim();
        String password = call.getString("password", "");
        String supabaseUrl = call.getString("supabaseUrl", "").trim();
        String publishableKey = call.getString("publishableKey", "").trim();
        int intervalMinutes = call.getInt("intervalMinutes", 360);
        if (schoolCode.isEmpty() || username.isEmpty() || password.isEmpty()
                || supabaseUrl.isEmpty() || publishableKey.isEmpty()) {
            call.reject("Completa tutti i campi richiesti.");
            return;
        }
        if (schoolCode.length() > 40 || username.length() > 160 || password.length() > 512) {
            call.reject("Uno dei campi supera la lunghezza consentita.");
            return;
        }
        try {
            DidupSyncVault.saveCredentials(getContext(), schoolCode, username, password,
                    supabaseUrl, publishableKey, intervalMinutes);
            DidupSyncWorker.configurePeriodic(getContext());
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossibile cifrare e salvare le credenziali su questo dispositivo.");
        }
    }

    @PluginMethod
    public void setSupabaseSession(PluginCall call) {
        String accessToken = call.getString("accessToken", "");
        String refreshToken = call.getString("refreshToken", "");
        long expiresAt = call.getLong("expiresAt", 0L);
        if (accessToken.isEmpty() || refreshToken.isEmpty()) {
            call.reject("La sessione VOTO non contiene i token necessari.");
            return;
        }
        try {
            DidupSyncVault.saveSession(getContext(), accessToken, refreshToken, expiresAt);
            DidupSyncWorker.configurePeriodic(getContext());
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossibile proteggere la sessione VOTO sul dispositivo.");
        }
    }

    @PluginMethod
    public void clearSupabaseSession(PluginCall call) {
        DidupSyncWorker.cancelAll(getContext());
        DidupSyncVault.clearSupabaseSession(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getSupabaseSession(PluginCall call) {
        try {
            JSObject result = JSObject.fromJSONObject(DidupSyncVault.getSupabaseSession(getContext()));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Sessione VOTO nativa non disponibile.");
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            JSONObject status = DidupSyncVault.getStatus(getContext());
            JSObject result = JSObject.fromJSONObject(status);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Stato sincronizzazione non disponibile.");
        }
    }

    @PluginMethod
    public void syncNow(PluginCall call) {
        if (!DidupSyncVault.hasCredentials(getContext())) {
            DidupSyncVault.setLocalStatus(getContext(), "credentials_required", "Inserisci le credenziali DidUP.");
            call.reject("Inserisci prima le credenziali DidUP.");
            return;
        }
        if (!DidupSyncVault.hasSession(getContext())) {
            DidupSyncVault.setLocalStatus(getContext(), "session_required", "Apri VOTO e accedi per autorizzare la sincronizzazione.");
            call.reject("Apri VOTO e accedi prima di sincronizzare.");
            return;
        }
        if (!DidupSyncWorker.enqueueImmediate(getContext())) {
            call.reject("Non è stato possibile avviare la sincronizzazione.");
            return;
        }
        JSObject result = new JSObject();
        result.put("queued", true);
        call.resolve(result);
    }

    @PluginMethod
    public void setQuietHours(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", true);
        String startTime = call.getString("startTime", DidupSyncVault.DEFAULT_QUIET_HOURS_START);
        String endTime = call.getString("endTime", DidupSyncVault.DEFAULT_QUIET_HOURS_END);
        try {
            DidupSyncVault.setQuietHours(getContext(), enabled, startTime, endTime);
            call.resolve();
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage());
        } catch (Exception error) {
            call.reject("Impossibile salvare la fascia senza controlli.");
        }
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        int intervalMinutes = call.getInt("intervalMinutes", DidupSyncVault.intervalMinutes(getContext()));
        DidupSyncVault.setIntervalMinutes(getContext(), intervalMinutes);
        DidupSyncVault.setEnabled(getContext(), enabled);
        if (enabled) {
            DidupSyncWorker.configurePeriodic(getContext());
        } else {
            DidupSyncWorker.cancelPeriodic(getContext());
            DidupSyncWorker.cancelAttachmentContinuations(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        DidupSyncWorker.cancelAll(getContext());
        DidupSyncVault.clearAll(getContext());
        call.resolve();
    }
}
