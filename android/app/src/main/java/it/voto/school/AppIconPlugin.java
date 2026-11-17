package it.voto.school;

import android.content.ComponentName;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.LinkedHashMap;
import java.util.Map;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    private static final String PREFS = "voto_native_preferences";
    private static final String ICON_KEY = "launcher_icon";
    private static final Map<String, String> ALIASES = new LinkedHashMap<>();

    static {
        ALIASES.put("classic", "AppIconClassic");
        ALIASES.put("light", "AppIconLight");
        ALIASES.put("ocean", "AppIconOcean");
        ALIASES.put("violet", "AppIconViolet");
    }

    @PluginMethod
    public void getAppIcon(PluginCall call) {
        String selected = getContext()
            .getSharedPreferences(PREFS, 0)
            .getString(ICON_KEY, "classic");
        if (!ALIASES.containsKey(selected)) selected = "classic";
        JSObject result = new JSObject();
        result.put("name", selected);
        call.resolve(result);
    }

    @PluginMethod
    public void setAppIcon(PluginCall call) {
        String selected = call.getString("name");
        if (selected == null || !ALIASES.containsKey(selected)) {
            call.reject("Variante icona non riconosciuta.");
            return;
        }

        PackageManager packageManager = getContext().getPackageManager();
        String packageName = getContext().getPackageName();
        try {
            // Abilita prima la nuova icona: il launcher non resta mai senza un alias attivo.
            ComponentName selectedComponent = new ComponentName(
                packageName,
                packageName + "." + ALIASES.get(selected)
            );
            packageManager.setComponentEnabledSetting(
                selectedComponent,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );

            for (Map.Entry<String, String> entry : ALIASES.entrySet()) {
                if (entry.getKey().equals(selected)) continue;
                ComponentName component = new ComponentName(
                    packageName,
                    packageName + "." + entry.getValue()
                );
                packageManager.setComponentEnabledSetting(
                    component,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP
                );
            }

            SharedPreferences preferences = getContext().getSharedPreferences(PREFS, 0);
            preferences.edit().putString(ICON_KEY, selected).apply();
            JSObject result = new JSObject();
            result.put("name", selected);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Android non ha potuto aggiornare l’icona. Riprova.");
        }
    }
}
