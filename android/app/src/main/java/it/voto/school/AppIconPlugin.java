package it.voto.school;

<<<<<<< HEAD
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
=======
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;

>>>>>>> e48bbe463b01a481c3470249d2dc18f7ca72f677
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
<<<<<<< HEAD
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import org.json.JSONException;

@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    private static final String PREFERENCES_NAME = "voto_app_icon";
    private static final String PREFERENCE_SELECTED_ICON = "selected_icon";
    private static final String PREFERENCE_SELECTED_LABEL = "selected_label";
    private static final String PREFERENCE_CUSTOM_SHORTCUT_NAME = "custom_shortcut_name";
    private static final String PREFERENCE_OLD_CUSTOM_SHORTCUT_HIDE_ICON =
        "custom_shortcut_hide_icon";
    private static final String PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME = "custom_shortcut_hide_name";
    private static final String CUSTOM_SHORTCUT_ID = "voto-custom-home-icon";
    private static final String INVISIBLE_SHORTCUT_LABEL = "\u200B";
    private static final int CUSTOM_ICON_SIZE = 192;
    private static final int MAX_SHORTCUT_NAME_LENGTH = 25;

    @PluginMethod
    public void getIcon(PluginCall call) {
        String storedIconId = preferences().getString(PREFERENCE_SELECTED_ICON, "voto");
        String storedLabelId = preferences().getString(PREFERENCE_SELECTED_LABEL, null);
        String iconId = AppIconComponents.migrateIconId(storedIconId);
        String labelId = AppIconComponents.migrateLabelId(storedLabelId);
        if (iconId == null || labelId == null) {
            call.reject("La preferenza per l’icona salvata non è valida.");
            return;
        }
        if (!storedIconId.equals(iconId) || !storedLabelIdEquals(storedLabelId, labelId)) {
            try {
                updateAppIcon(iconId, labelId);
            } catch (RuntimeException error) {
                call.reject("Impossibile ripristinare l’icona dopo l’aggiornamento.", error);
                return;
            }
        }

        ShortcutManager shortcutManager = getShortcutManager();
        boolean galleryShortcutSupported =
            shortcutManager != null && shortcutManager.isRequestPinShortcutSupported();
        ShortcutInfo customShortcut = galleryShortcutSupported
            ? findCustomShortcut(shortcutManager)
            : null;
        try {
            restoreShortcutIconIfNeeded(shortcutManager, customShortcut);
        } catch (IOException | RuntimeException error) {
            call.reject("Impossibile ripristinare l’icona del collegamento.", error);
            return;
        }
        JSObject result = new JSObject()
            .put("icon", iconId)
            .put("label", labelId)
            .put("galleryShortcutSupported", galleryShortcutSupported)
            .put("customShortcutPinned", customShortcut != null)
            .put("customShortcutName", getCustomShortcutName(customShortcut))
            .put(
                "customShortcutNameHidden",
                preferences().getBoolean(PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME, false)
            );
        try {
            String customIcon = readCustomIconDataUrl();
            if (customIcon != null) result.put("customIconDataUrl", customIcon);
            call.resolve(result);
        } catch (IOException error) {
            call.reject("Impossibile leggere l’anteprima dell’icona personalizzata.", error);
        }
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String iconId = call.getString("icon");
        String labelId = call.getString("label");
        if (
            !AppIconComponents.isCurrentIconId(iconId) ||
            !AppIconComponents.isCurrentLabelId(labelId)
        ) {
            call.reject("L’icona richiesta non è disponibile.");
            return;
        }

        try {
            updateAppIcon(iconId, labelId);
            call.resolve(new JSObject().put("icon", iconId).put("label", labelId));
        } catch (RuntimeException error) {
            call.reject("Impossibile aggiornare l’icona dell’app.", error);
        }
    }

    @PluginMethod
    public void setCustomShortcutName(PluginCall call) {
        String name = normalizeShortcutName(call.getString("name"));
        if (name == null) {
            call.reject("Inserisci un nome da 1 a " + MAX_SHORTCUT_NAME_LENGTH + " caratteri.");
            return;
        }

        ShortcutManager shortcutManager = getShortcutManager();
        ShortcutInfo currentShortcut = shortcutManager == null
            ? null
            : findCustomShortcut(shortcutManager);
        if (currentShortcut == null) {
            call.reject("Crea prima un collegamento dalla galleria.");
            return;
        }

        File iconFile = customIconFile();
        Bitmap iconBitmap = BitmapFactory.decodeFile(iconFile.getAbsolutePath());
        if (iconBitmap == null) {
            call.reject("L’anteprima del collegamento personalizzato non è disponibile.");
            return;
        }
        try {
            ShortcutInfo updatedShortcut = buildCustomShortcut(
                iconBitmap,
                name,
                preferences().getBoolean(PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME, false)
            );
            if (!shortcutManager.updateShortcuts(Collections.singletonList(updatedShortcut))) {
                throw new IllegalStateException("Il launcher non ha accettato il nuovo nome.");
            }
            if (
                !preferences()
                    .edit()
                    .putString(PREFERENCE_CUSTOM_SHORTCUT_NAME, name)
                    .commit()
            ) {
                throw new IllegalStateException("Impossibile salvare il nome del collegamento.");
            }
            call.resolve(new JSObject().put("name", name));
        } catch (RuntimeException error) {
            call.reject("Impossibile aggiornare il nome del collegamento.", error);
        } finally {
            iconBitmap.recycle();
        }
    }

    @PluginMethod
    public void setCustomShortcutNameVisibility(PluginCall call) {
        boolean hideName;
        try {
            hideName = call.getData().getBoolean("hideName");
        } catch (JSONException error) {
            call.reject("L’opzione di visibilità del testo non è valida.", error);
            return;
        }

        ShortcutManager shortcutManager = getShortcutManager();
        ShortcutInfo currentShortcut = shortcutManager == null
            ? null
            : findCustomShortcut(shortcutManager);
        if (currentShortcut != null) {
            Bitmap iconBitmap = BitmapFactory.decodeFile(
                customIconFile().getAbsolutePath()
            );
            if (iconBitmap == null) {
                call.reject("L’anteprima del collegamento personalizzato non è disponibile.");
                return;
            }
            try {
                ShortcutInfo updatedShortcut = buildCustomShortcut(
                    iconBitmap,
                    getCustomShortcutName(currentShortcut),
                    hideName
                );
                if (
                    !shortcutManager.updateShortcuts(Collections.singletonList(updatedShortcut))
                ) {
                    throw new IllegalStateException(
                        "Il launcher non ha accettato la nuova impostazione."
                    );
                }
            } catch (RuntimeException error) {
                call.reject("Impossibile aggiornare la visibilità del testo.", error);
                return;
            } finally {
                iconBitmap.recycle();
            }
        }

        if (
            !preferences()
                .edit()
                .putBoolean(PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME, hideName)
                .commit()
        ) {
            call.reject("Impossibile salvare la visibilità del testo.");
            return;
        }
        call.resolve(new JSObject().put("hideName", hideName));
    }

    private void updateAppIcon(String iconId, String labelId) {
        String selectedClass = AppIconComponents.componentClassName(
            getContext().getPackageName(),
            iconId,
            labelId
        );
        PackageManager packageManager = getContext().getPackageManager();
        Map<ComponentName, Integer> previousStates = new LinkedHashMap<>();
        try {
            for (String supportedIconId : AppIconComponents.iconIds()) {
                for (String supportedLabelId : AppIconComponents.labelIds()) {
                    ComponentName component = new ComponentName(
                        getContext(),
                        AppIconComponents.componentClassName(
                            getContext().getPackageName(),
                            supportedIconId,
                            supportedLabelId
                        )
                    );
                    previousStates.put(
                        component,
                        packageManager.getComponentEnabledSetting(component)
                    );
                }
            }
            for (String legacyIconId : AppIconComponents.legacyIconIds()) {
                ComponentName component = new ComponentName(
                    getContext(),
                    AppIconComponents.legacyComponentClassName(
                        getContext().getPackageName(),
                        legacyIconId
                    )
                );
                previousStates.put(
                    component,
                    packageManager.getComponentEnabledSetting(component)
                );
            }

            for (Map.Entry<ComponentName, Integer> entry : previousStates.entrySet()) {
                int state = entry.getKey().getClassName().equals(selectedClass)
                    ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                packageManager.setComponentEnabledSetting(
                    entry.getKey(),
                    state,
=======
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
>>>>>>> e48bbe463b01a481c3470249d2dc18f7ca72f677
                    PackageManager.DONT_KILL_APP
                );
            }

<<<<<<< HEAD
            if (
                !preferences()
                    .edit()
                    .putString(PREFERENCE_SELECTED_ICON, iconId)
                    .putString(PREFERENCE_SELECTED_LABEL, labelId)
                    .commit()
            ) {
                throw new IllegalStateException("Impossibile salvare la preferenza dell’icona.");
            }
        } catch (RuntimeException error) {
            restoreComponentStates(packageManager, previousStates, error);
            throw error;
        }
    }

    @PluginMethod
    public void chooseCustomIcon(PluginCall call) {
        ShortcutManager shortcutManager = getShortcutManager();
        if (shortcutManager == null || !shortcutManager.isRequestPinShortcutSupported()) {
            call.reject("Questo dispositivo non supporta i collegamenti personalizzati alla Home.");
            return;
        }
        String name = normalizeShortcutName(call.getString("name"));
        if (name == null) {
            call.reject("Inserisci un nome da 1 a " + MAX_SHORTCUT_NAME_LENGTH + " caratteri.");
            return;
        }

        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType("image/*");
        call.getData().put("name", name);
        startActivityForResult(call, picker, "customIconSelected");
    }

    @ActivityCallback
    private void customIconSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        String name = normalizeShortcutName(call.getData().getString("name"));
        if (name == null) {
            call.reject("Il nome del collegamento non è valido.");
            return;
        }
        Intent data = result.getData();
        Uri imageUri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || imageUri == null) {
            call.resolve(new JSObject().put("status", "cancelled").put("name", name));
            return;
        }

        Bitmap iconBitmap = null;
        try {
            iconBitmap = decodeSquareIcon(imageUri);
            saveCustomIcon(iconBitmap);

            ShortcutManager shortcutManager = getShortcutManager();
            if (shortcutManager == null || !shortcutManager.isRequestPinShortcutSupported()) {
                throw new IllegalStateException(
                    "Il launcher non supporta i collegamenti personalizzati alla Home."
                );
            }

            boolean hideName = preferences().getBoolean(
                PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME,
                false
            );
            ShortcutInfo shortcut = buildCustomShortcut(iconBitmap, name, hideName);
            String shortcutStatus;
            if (isCustomShortcutPinned(shortcutManager)) {
                if (!shortcutManager.updateShortcuts(Collections.singletonList(shortcut))) {
                    throw new IllegalStateException(
                        "Il launcher non ha accettato l’aggiornamento del collegamento."
                    );
                }
                shortcutStatus = "updated";
            } else if (shortcutManager.requestPinShortcut(shortcut, null)) {
                shortcutStatus = "requested";
            } else {
                throw new IllegalStateException(
                    "Il launcher non ha accettato la richiesta del collegamento."
                );
            }
            if (
                !preferences()
                    .edit()
                    .putString(PREFERENCE_CUSTOM_SHORTCUT_NAME, name)
                    .commit()
            ) {
                throw new IllegalStateException("Impossibile salvare il nome del collegamento.");
            }
            call.resolve(customShortcutResult(shortcutStatus, name));
        } catch (IOException | RuntimeException error) {
            call.reject("Impossibile creare il collegamento con questa immagine.", error);
        } finally {
            if (iconBitmap != null) iconBitmap.recycle();
        }
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private ShortcutManager getShortcutManager() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null;
        return (ShortcutManager) getContext().getSystemService(Context.SHORTCUT_SERVICE);
    }

    private ShortcutInfo findCustomShortcut(ShortcutManager shortcutManager) {
        for (ShortcutInfo shortcut : shortcutManager.getPinnedShortcuts()) {
            if (CUSTOM_SHORTCUT_ID.equals(shortcut.getId())) return shortcut;
        }
        return null;
    }

    private boolean isCustomShortcutPinned(ShortcutManager shortcutManager) {
        return findCustomShortcut(shortcutManager) != null;
    }

    private ShortcutInfo buildCustomShortcut(Bitmap iconBitmap, String name, boolean hideName) {
        Intent launchIntent = new Intent(getContext(), MainActivity.class);
        launchIntent.setAction("it.voto.school.OPEN_CUSTOM_ICON_SHORTCUT");
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        String shortcutName = hideName ? INVISIBLE_SHORTCUT_LABEL : name;
        return new ShortcutInfo.Builder(getContext(), CUSTOM_SHORTCUT_ID)
            .setShortLabel(shortcutName)
            .setLongLabel(shortcutName)
            .setIcon(Icon.createWithBitmap(iconBitmap))
            .setIntent(launchIntent)
            .build();
    }

    private void restoreShortcutIconIfNeeded(
        ShortcutManager shortcutManager,
        ShortcutInfo shortcut
    ) throws IOException {
        if (
            !preferences().getBoolean(PREFERENCE_OLD_CUSTOM_SHORTCUT_HIDE_ICON, false)
        ) return;

        if (shortcut != null) {
            Bitmap iconBitmap = BitmapFactory.decodeFile(
                customIconFile().getAbsolutePath()
            );
            if (iconBitmap == null) {
                throw new IOException("L’anteprima del collegamento personalizzato non è disponibile.");
            }
            try {
                ShortcutInfo restoredShortcut = buildCustomShortcut(
                    iconBitmap,
                    getCustomShortcutName(shortcut),
                    preferences().getBoolean(PREFERENCE_CUSTOM_SHORTCUT_HIDE_NAME, false)
                );
                if (
                    shortcutManager == null ||
                    !shortcutManager.updateShortcuts(Collections.singletonList(restoredShortcut))
                ) {
                    throw new IllegalStateException(
                        "Il launcher non ha accettato il ripristino dell’immagine."
                    );
                }
            } finally {
                iconBitmap.recycle();
            }
        }

        if (
            !preferences().edit().remove(PREFERENCE_OLD_CUSTOM_SHORTCUT_HIDE_ICON).commit()
        ) {
            throw new IllegalStateException(
                "Impossibile salvare il ripristino dell’immagine del collegamento."
            );
        }
    }

    private String getCustomShortcutName(ShortcutInfo shortcut) {
        String storedName = preferences().getString(PREFERENCE_CUSTOM_SHORTCUT_NAME, null);
        String normalizedStoredName = normalizeShortcutName(storedName);
        if (normalizedStoredName != null) return normalizedStoredName;

        CharSequence shortcutLabel = shortcut == null ? null : shortcut.getShortLabel();
        if (shortcutLabel != null && !INVISIBLE_SHORTCUT_LABEL.contentEquals(shortcutLabel)) {
            String normalizedShortcutLabel = normalizeShortcutName(shortcutLabel.toString());
            if (normalizedShortcutLabel != null) return normalizedShortcutLabel;
        }
        return "VOTO";
    }

    private Bitmap decodeSquareIcon(Uri imageUri) throws IOException {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream input = getContext().getContentResolver().openInputStream(imageUri)) {
            if (input == null) throw new IOException("Impossibile aprire l’immagine selezionata.");
            BitmapFactory.decodeStream(input, null, bounds);
        }

        if (
            bounds.outWidth <= 0 ||
            bounds.outHeight <= 0 ||
            (long) bounds.outWidth * bounds.outHeight > 100_000_000L
        ) {
            throw new IOException("Dimensioni dell’immagine non valide o troppo grandi.");
        }

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = 1;
        while (
            Math.max(bounds.outWidth, bounds.outHeight) / options.inSampleSize > CUSTOM_ICON_SIZE * 4
        ) {
            options.inSampleSize *= 2;
        }

        Bitmap decoded;
        try (InputStream input = getContext().getContentResolver().openInputStream(imageUri)) {
            if (input == null) throw new IOException("Impossibile aprire l’immagine selezionata.");
            decoded = BitmapFactory.decodeStream(input, null, options);
        }
        if (decoded == null) throw new IOException("Il file selezionato non è un’immagine valida.");

        int cropSize = Math.min(decoded.getWidth(), decoded.getHeight());
        int cropX = (decoded.getWidth() - cropSize) / 2;
        int cropY = (decoded.getHeight() - cropSize) / 2;
        Bitmap square = Bitmap.createBitmap(decoded, cropX, cropY, cropSize, cropSize);
        Bitmap resized = Bitmap.createScaledBitmap(
            square,
            CUSTOM_ICON_SIZE,
            CUSTOM_ICON_SIZE,
            true
        );
        if (resized != square) square.recycle();
        if (decoded != resized && decoded != square) decoded.recycle();
        return resized;
    }

    private void saveCustomIcon(Bitmap iconBitmap) throws IOException {
        File directory = getContext().getFilesDir();
        File temporary = new File(directory, "voto-custom-icon.tmp");
        File destination = customIconFile();
        try (FileOutputStream output = new FileOutputStream(temporary)) {
            if (!iconBitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                throw new IOException("Impossibile codificare l’immagine selezionata.");
            }
            output.flush();
        }
        if (destination.exists() && !destination.delete()) {
            temporary.delete();
            throw new IOException("Impossibile aggiornare l’immagine personalizzata salvata.");
        }
        if (!temporary.renameTo(destination)) {
            temporary.delete();
            throw new IOException("Impossibile salvare l’immagine personalizzata.");
        }
    }

    private String readCustomIconDataUrl() throws IOException {
        File iconFile = customIconFile();
        if (!iconFile.exists()) return null;
        try (
            FileInputStream input = new FileInputStream(iconFile);
            ByteArrayOutputStream output = new ByteArrayOutputStream()
        ) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = input.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }
            return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        }
    }

    private File customIconFile() {
        return new File(getContext().getFilesDir(), "voto-custom-icon.png");
    }

    private JSObject customShortcutResult(String status, String name) throws IOException {
        return new JSObject()
            .put("status", status)
            .put("name", name)
            .put("customIconDataUrl", readCustomIconDataUrl());
    }

    private String normalizeShortcutName(String name) {
        if (name == null) return null;
        String trimmed = name.trim();
        return trimmed.isEmpty() || trimmed.length() > MAX_SHORTCUT_NAME_LENGTH ? null : trimmed;
    }

    private boolean storedLabelIdEquals(String storedLabelId, String labelId) {
        return storedLabelId != null && storedLabelId.equals(labelId);
    }

    private static void restoreComponentStates(
        PackageManager packageManager,
        Map<ComponentName, Integer> previousStates,
        RuntimeException cause
    ) {
        for (Map.Entry<ComponentName, Integer> entry : previousStates.entrySet()) {
            try {
                packageManager.setComponentEnabledSetting(
                    entry.getKey(),
                    entry.getValue(),
                    PackageManager.DONT_KILL_APP
                );
            } catch (RuntimeException rollbackError) {
                cause.addSuppressed(rollbackError);
            }
=======
            SharedPreferences preferences = getContext().getSharedPreferences(PREFS, 0);
            preferences.edit().putString(ICON_KEY, selected).apply();
            JSObject result = new JSObject();
            result.put("name", selected);
            call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Android non ha potuto aggiornare l’icona. Riprova.");
>>>>>>> e48bbe463b01a481c3470249d2dc18f7ca72f677
        }
    }
}
