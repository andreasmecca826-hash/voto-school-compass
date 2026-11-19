package it.voto.school;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONException;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyStore;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class DidupSyncVault {
    private static final String PREFS = "voto.didup.sync";
    private static final String KEY_ALIAS = "voto.didup.credentials.v1";
    private static final String KEY_SCHOOL = "enc_school_code";
    private static final String KEY_USERNAME = "enc_username";
    private static final String KEY_PASSWORD = "enc_password";
    private static final String KEY_ACCESS = "enc_supabase_access";
    private static final String KEY_REFRESH = "enc_supabase_refresh";
    private static final String KEY_EXPIRES = "supabase_expires_at";
    private static final String KEY_INTERVAL_MINUTES = "interval_minutes";
    private static final String LEGACY_INTERVAL_HOURS = "interval_hours";
    private static final String KEY_QUIET_HOURS_ENABLED = "quiet_hours_enabled";
    private static final String KEY_QUIET_HOURS_START = "quiet_hours_start";
    private static final String KEY_QUIET_HOURS_END = "quiet_hours_end";
    static final String DEFAULT_QUIET_HOURS_START = "00:00";
    static final String DEFAULT_QUIET_HOURS_END = "06:00";

    private DidupSyncVault() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }

    private static String encrypt(String value) throws Exception {
        if (value == null || value.isEmpty()) return "";
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] iv = cipher.getIV();
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
        buffer.put(iv);
        buffer.put(encrypted);
        return Base64.encodeToString(buffer.array(), Base64.NO_WRAP);
    }

    private static String decrypt(String encoded) {
        if (encoded == null || encoded.isEmpty()) return "";
        try {
            byte[] all = Base64.decode(encoded, Base64.NO_WRAP);
            if (all.length < 13) return "";
            ByteBuffer buffer = ByteBuffer.wrap(all);
            byte[] iv = new byte[12];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String utcNow() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    static synchronized void saveCredentials(Context context, String schoolCode, String username,
                                             String password, String supabaseUrl, String publishableKey,
                                             int intervalMinutes) throws Exception {
        SharedPreferences.Editor editor = prefs(context).edit();
        editor.putString(KEY_SCHOOL, encrypt(schoolCode.trim()));
        editor.putString(KEY_USERNAME, encrypt(username.trim()));
        editor.putString(KEY_PASSWORD, encrypt(password));
        editor.putString("supabase_url", supabaseUrl.trim());
        editor.putString("publishable_key", publishableKey.trim());
        editor.putInt(KEY_INTERVAL_MINUTES, Math.max(15, Math.min(1440, intervalMinutes)));
        editor.remove(LEGACY_INTERVAL_HOURS);
        editor.putBoolean("enabled", true);
        editor.apply();
    }

    static synchronized void saveSession(Context context, String accessToken, String refreshToken,
                                         long expiresAt) throws Exception {
        SharedPreferences.Editor editor = prefs(context).edit();
        editor.putString(KEY_ACCESS, encrypt(accessToken));
        editor.putString(KEY_REFRESH, encrypt(refreshToken));
        editor.putLong(KEY_EXPIRES, Math.max(0L, expiresAt));
        editor.apply();
    }

    static synchronized void clearSupabaseSession(Context context) {
        prefs(context).edit()
                .remove(KEY_ACCESS)
                .remove(KEY_REFRESH)
                .remove(KEY_EXPIRES)
                .putString("status", "session_required")
                .putString("message", "Accedi di nuovo a VOTO per riprendere la sincronizzazione DidUP.")
                .apply();
    }

    static synchronized JSONObject getSupabaseSession(Context context) throws JSONException {
        SharedPreferences p = prefs(context);
        JSONObject result = new JSONObject();
        result.put("accessToken", decrypt(p.getString(KEY_ACCESS, "")));
        result.put("refreshToken", decrypt(p.getString(KEY_REFRESH, "")));
        result.put("expiresAt", p.getLong(KEY_EXPIRES, 0L));
        return result;
    }

    static synchronized JSONObject buildInput(Context context) throws JSONException {
        SharedPreferences p = prefs(context);
        JSONObject input = new JSONObject();
        input.put("schoolCode", decrypt(p.getString(KEY_SCHOOL, "")));
        input.put("username", decrypt(p.getString(KEY_USERNAME, "")));
        input.put("password", decrypt(p.getString(KEY_PASSWORD, "")));
        input.put("supabaseUrl", p.getString("supabase_url", ""));
        input.put("publishableKey", p.getString("publishable_key", ""));
        input.put("supabaseAccessToken", decrypt(p.getString(KEY_ACCESS, "")));
        input.put("supabaseRefreshToken", decrypt(p.getString(KEY_REFRESH, "")));
        input.put("supabaseExpiresAt", p.getLong(KEY_EXPIRES, 0L));
        return input;
    }

    static synchronized boolean hasCredentials(Context context) {
        SharedPreferences p = prefs(context);
        return !decrypt(p.getString(KEY_SCHOOL, "")).isEmpty()
                && !decrypt(p.getString(KEY_USERNAME, "")).isEmpty()
                && !decrypt(p.getString(KEY_PASSWORD, "")).isEmpty();
    }

    static synchronized boolean hasSession(Context context) {
        SharedPreferences p = prefs(context);
        return !decrypt(p.getString(KEY_ACCESS, "")).isEmpty()
                && !decrypt(p.getString(KEY_REFRESH, "")).isEmpty();
    }

    static synchronized void updateFromWorker(Context context, JSONObject result) throws Exception {
        SharedPreferences.Editor editor = prefs(context).edit();
        String access = result.optString("accessToken", "");
        String refresh = result.optString("refreshToken", "");
        long expiresAt = result.optLong("expiresAt", 0L);
        if (!access.isEmpty() && !refresh.isEmpty()) {
            editor.putString(KEY_ACCESS, encrypt(access));
            editor.putString(KEY_REFRESH, encrypt(refresh));
            editor.putLong(KEY_EXPIRES, expiresAt);
        }
        boolean ok = result.optBoolean("ok", false);
        String code = result.optString("code", "sync_error");
        boolean attachmentWarning = code.startsWith("attachment_");
        editor.putString("status", ok && !attachmentWarning ? "success" : code);
        editor.putString("message", result.optString("message", "Sincronizzazione non riuscita."));
        editor.putString("last_attempt_at", utcNow());
        if (ok) editor.putString("last_sync_at", result.optString("syncedAt", utcNow()));
        editor.apply();
    }

    static synchronized void setLocalStatus(Context context, String code, String message) {
        prefs(context).edit()
                .putString("status", code)
                .putString("message", message)
                .putString("last_attempt_at", utcNow())
                .apply();
    }

    static synchronized void setEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean("enabled", enabled).apply();
    }

    static synchronized void setQuietHours(Context context, boolean enabled, String startTime,
                                           String endTime) {
        if (!isValidClockTime(startTime) || !isValidClockTime(endTime)) {
            throw new IllegalArgumentException("Inserisci due orari validi nel formato HH:mm.");
        }
        if (enabled && startTime.equals(endTime)) {
            throw new IllegalArgumentException("L’orario di inizio e quello di fine devono essere diversi.");
        }
        prefs(context).edit()
                .putBoolean(KEY_QUIET_HOURS_ENABLED, enabled)
                .putString(KEY_QUIET_HOURS_START, startTime)
                .putString(KEY_QUIET_HOURS_END, endTime)
                .apply();
    }

    static synchronized boolean isQuietHoursNow(Context context) {
        Calendar localTime = Calendar.getInstance();
        int minuteOfDay = localTime.get(Calendar.HOUR_OF_DAY) * 60 + localTime.get(Calendar.MINUTE);
        SharedPreferences p = prefs(context);
        return isWithinQuietHours(
                p.getBoolean(KEY_QUIET_HOURS_ENABLED, true),
                p.getString(KEY_QUIET_HOURS_START, DEFAULT_QUIET_HOURS_START),
                p.getString(KEY_QUIET_HOURS_END, DEFAULT_QUIET_HOURS_END),
                minuteOfDay
        );
    }

    static boolean isWithinQuietHours(boolean enabled, String startTime, String endTime,
                                      int minuteOfDay) {
        if (!enabled || minuteOfDay < 0 || minuteOfDay >= 24 * 60
                || !isValidClockTime(startTime) || !isValidClockTime(endTime)) return false;
        int start = toMinutes(startTime);
        int end = toMinutes(endTime);
        if (start == end) return false;
        if (start < end) return minuteOfDay >= start && minuteOfDay < end;
        return minuteOfDay >= start || minuteOfDay < end;
    }

    private static boolean isValidClockTime(String value) {
        if (value == null || !value.matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) return false;
        return true;
    }

    private static int toMinutes(String value) {
        return Integer.parseInt(value.substring(0, 2)) * 60
                + Integer.parseInt(value.substring(3, 5));
    }

    static synchronized void setIntervalMinutes(Context context, int intervalMinutes) {
        prefs(context).edit()
                .putInt(KEY_INTERVAL_MINUTES, Math.max(15, Math.min(1440, intervalMinutes)))
                .remove(LEGACY_INTERVAL_HOURS)
                .apply();
    }

    static synchronized boolean isEnabled(Context context) {
        return prefs(context).getBoolean("enabled", false);
    }

    static synchronized void setUpdateNotificationsEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean("update_notifications_enabled", enabled).apply();
    }

    static synchronized boolean areUpdateNotificationsEnabled(Context context) {
        return prefs(context).getBoolean("update_notifications_enabled", false);
    }

    static synchronized int intervalMinutes(Context context) {
        SharedPreferences p = prefs(context);
        if (p.contains(KEY_INTERVAL_MINUTES)) {
            return Math.max(15, Math.min(1440, p.getInt(KEY_INTERVAL_MINUTES, 360)));
        }
        int legacyHours = Math.max(1, Math.min(24, p.getInt(LEGACY_INTERVAL_HOURS, 6)));
        int migratedMinutes = legacyHours * 60;
        p.edit().putInt(KEY_INTERVAL_MINUTES, migratedMinutes).remove(LEGACY_INTERVAL_HOURS).apply();
        return migratedMinutes;
    }

    static synchronized void setQueued(Context context) {
        prefs(context).edit()
                .putString("status", "queued")
                .putString("message", "Sincronizzazione richiesta.")
                .apply();
    }

    static synchronized JSONObject getStatus(Context context) throws JSONException {
        SharedPreferences p = prefs(context);
        JSONObject result = new JSONObject();
        result.put("enabled", p.getBoolean("enabled", false));
        result.put("hasCredentials", hasCredentials(context));
        result.put("hasSession", hasSession(context));
        result.put("intervalMinutes", intervalMinutes(context));
        result.put("quietHoursEnabled", p.getBoolean(KEY_QUIET_HOURS_ENABLED, true));
        result.put("quietHoursStart", p.getString(KEY_QUIET_HOURS_START, DEFAULT_QUIET_HOURS_START));
        result.put("quietHoursEnd", p.getString(KEY_QUIET_HOURS_END, DEFAULT_QUIET_HOURS_END));
        result.put("status", p.getString("status", "idle"));
        result.put("updateNotificationsEnabled", areUpdateNotificationsEnabled(context));
        result.put("notificationPermissionGranted", DidupUpdateNotifier.canPost(context));
        result.put("message", p.getString("message", ""));
        result.put("lastSyncAt", p.getString("last_sync_at", ""));
        result.put("lastAttemptAt", p.getString("last_attempt_at", ""));
        return result;
    }

    static synchronized void clearAll(Context context) {
        prefs(context).edit().clear().apply();
        try {
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);
        } catch (Exception ignored) {
            // Encrypted values are removed even if the OS rejects key deletion.
        }
    }
}
