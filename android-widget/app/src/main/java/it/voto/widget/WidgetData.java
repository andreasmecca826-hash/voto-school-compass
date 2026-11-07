package it.voto.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

final class WidgetData {
  static final String PREFS = "voto_widget";
  static final String EMAIL_KEY = "supabase_email";
  static final String ACCESS_TOKEN_KEY = "supabase_access_token";
  static final String REFRESH_TOKEN_KEY = "supabase_refresh_token";
  static final String EXPIRES_AT_KEY = "supabase_expires_at";
  static final String SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
  static final String SUPABASE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
  static final String SCHOOL_DATA_URL = SUPABASE_URL + "/functions/v1/school-data";
  static final String AUTH_TOKEN_URL = SUPABASE_URL + "/auth/v1/token";

  interface LoginCallback { void done(String error); }

  static void login(Context context, String email, String password, LoginCallback callback) {
    new Thread(() -> {
      String error;
      try {
        JSONObject body = new JSONObject();
        body.put("email", email);
        body.put("password", password);
        JSONObject result = requestJson(AUTH_TOKEN_URL + "?grant_type=password", "POST", body.toString(), null);
        saveSession(context, result);
        error = null;
      } catch (Exception e) {
        error = messageFor(e);
      }
      final String resultError = error;
      android.os.Handler handler = new android.os.Handler(context.getMainLooper());
      handler.post(() -> callback.done(resultError));
    }).start();
  }

  static void logout(Context context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .remove(ACCESS_TOKEN_KEY).remove(REFRESH_TOKEN_KEY).remove(EXPIRES_AT_KEY).apply();
  }

  static void saveOAuthSession(Context context, String accessToken, String refreshToken, long expiresIn) throws Exception {
    JSONObject result = new JSONObject();
    result.put("access_token", accessToken);
    result.put("refresh_token", refreshToken);
    result.put("expires_in", expiresIn > 0 ? expiresIn : 3600L);
    saveSession(context, result);
  }

  static void refresh(Context context) {
    update(context, new ComponentName(context, SmallWidgetProvider.class), false);
    update(context, new ComponentName(context, LargeWidgetProvider.class), true);
  }

  static void update(Context context, ComponentName provider, boolean large) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(provider);
    if (ids.length == 0) return;
    new Thread(() -> {
      String[] values = fetch(context);
      for (int id : ids) manager.updateAppWidget(id, views(context, values, large, id));
    }).start();
  }

  private static String[] fetch(Context context) {
    try {
      String accessToken = validAccessToken(context);
      if (accessToken.length() == 0) return new String[]{"Accedi dall'app", "", "", "", "", ""};
      JSONObject root;
      try {
        root = requestJson(SCHOOL_DATA_URL, "GET", null, accessToken);
      } catch (HttpError e) {
        if (e.status != 401) throw e;
        accessToken = refreshAccessToken(context);
        root = requestJson(SCHOOL_DATA_URL, "GET", null, accessToken);
      }
      return summarize(root);
    } catch (Exception e) {
      return new String[]{"Dati non disponibili", messageFor(e), "", "", "", ""};
    }
  }

  private static String validAccessToken(Context context) throws Exception {
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String token = prefs.getString(ACCESS_TOKEN_KEY, "");
    long expiresAt = prefs.getLong(EXPIRES_AT_KEY, 0L);
    if (token.length() > 0 && expiresAt > System.currentTimeMillis() + 60_000L) return token;
    String refresh = prefs.getString(REFRESH_TOKEN_KEY, "");
    return refresh.length() == 0 ? "" : refreshAccessToken(context);
  }

  private static String refreshAccessToken(Context context) throws Exception {
    String refresh = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(REFRESH_TOKEN_KEY, "");
    if (refresh.length() == 0) throw new Exception("Sessione scaduta: accedi di nuovo");
    JSONObject body = new JSONObject();
    body.put("refresh_token", refresh);
    JSONObject result = requestJson(AUTH_TOKEN_URL + "?grant_type=refresh_token", "POST", body.toString(), null);
    saveSession(context, result);
    return result.optString("access_token", "");
  }

  private static void saveSession(Context context, JSONObject result) throws Exception {
    String access = result.optString("access_token", "");
    String refresh = result.optString("refresh_token", "");
    if (access.length() == 0 || refresh.length() == 0) throw new Exception("Risposta Supabase incompleta");
    long expiresIn = result.optLong("expires_in", 3600L);
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        .putString(ACCESS_TOKEN_KEY, access)
        .putString(REFRESH_TOKEN_KEY, refresh)
        .putLong(EXPIRES_AT_KEY, System.currentTimeMillis() + expiresIn * 1000L)
        .apply();
  }

  private static JSONObject requestJson(String endpoint, String method, String body, String accessToken) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
    connection.setRequestMethod(method);
    connection.setConnectTimeout(10_000);
    connection.setReadTimeout(15_000);
    connection.setRequestProperty("apikey", SUPABASE_KEY);
    connection.setRequestProperty("Accept", "application/json");
    if (accessToken != null && accessToken.length() > 0) connection.setRequestProperty("Authorization", "Bearer " + accessToken);
    if (body != null) {
      connection.setDoOutput(true);
      connection.setRequestProperty("Content-Type", "application/json");
      byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
      try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
    }
    int status = connection.getResponseCode();
    InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
    String response = read(stream);
    connection.disconnect();
    if (status < 200 || status >= 300) throw new HttpError(status, response);
    return new JSONObject(response);
  }

  private static String read(InputStream stream) throws Exception {
    if (stream == null) return "";
    StringBuilder result = new StringBuilder();
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) result.append(line);
    }
    return result.toString();
  }

  private static String messageFor(Exception error) {
    if (error instanceof HttpError) {
      HttpError http = (HttpError) error;
      if (http.status == 400) return "Email o password non validi";
      if (http.status == 401) return "Sessione scaduta: accedi di nuovo";
      if (http.status == 403) return "Account non autorizzato al registro";
      if (http.status == 503) return "Dati scolastici non disponibili";
    }
    return error.getMessage() == null ? "Controlla connessione" : error.getMessage();
  }

  private static String[] summarize(JSONObject root) {
    JSONArray subjects = root.optJSONArray("subjects");
    double subjectSum = 0; int subjectCount = 0;
    String latest = "", latestSubject = "", latestDate = "";
    if (subjects != null) for (int i = 0; i < subjects.length(); i++) {
      JSONObject subject = subjects.optJSONObject(i); if (subject == null) continue;
      JSONArray grades = subject.optJSONArray("grades"); if (grades == null) continue;
      double weighted = 0, weights = 0;
      for (int j = 0; j < grades.length(); j++) {
        JSONObject grade = grades.optJSONObject(j); if (grade == null) continue;
        double value = grade(grade.optString("value"));
        if (value >= 0) { double weight = grade.optDouble("weight", 1); if (weight <= 0) weight = 1; weighted += value * weight; weights += weight; }
        String date = grade.optString("date");
        if (date.compareTo(latestDate) > 0) { latestDate = date; latest = grade.optString("value"); latestSubject = subject.optString("name"); }
      }
      if (weights > 0) { subjectSum += weighted / weights; subjectCount++; }
    }
    String average = subjectCount == 0 ? "—" : String.format(Locale.ITALIAN, "%.2f", subjectSum / subjectCount);
    JSONObject attendance = root.optJSONObject("attendance");
    String attendanceText = attendance == null ? "Assenze non disponibili" : "Assenze: " + attendance.optInt("absenceDays", 0) + " giorni · Ritardi: " + attendance.optInt("delays", 0);
    JSONArray notifications = root.optJSONArray("notifications"); int notes = 0, circulars = 0;
    if (notifications != null) for (int i = 0; i < notifications.length(); i++) { JSONObject n = notifications.optJSONObject(i); if (n == null) continue; if ("note".equals(n.optString("type"))) notes++; if ("notice".equals(n.optString("type"))) circulars++; }
    return new String[]{"Media " + average, latest.length() == 0 ? "Nessun voto" : "Ultimo: " + latest + " — " + latestSubject, "Aggiornato " + root.optString("updatedAt", "ora"), attendanceText, "Note: " + notes, "Circolari: " + circulars};
  }

  private static double grade(String value) { try { String s = value.trim().replace(',', '.').replace("½", ".5"); double delta = 0; if (s.endsWith("+")) { delta = .15; s = s.substring(0, s.length() - 1).trim(); } else if (s.endsWith("-")) { delta = -.15; s = s.substring(0, s.length() - 1).trim(); } if (s.contains("/")) { String[] parts = s.split("/"); return (Double.parseDouble(parts[0].trim()) + Double.parseDouble(parts[1].trim())) / 2 + delta; } return Double.parseDouble(s) + delta; } catch (Exception e) { return -1; } }

  private static RemoteViews views(Context context, String[] values, boolean large, int id) {
    int layout = large ? R.layout.widget_large : R.layout.widget_small;
    RemoteViews views = new RemoteViews(context.getPackageName(), layout);
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    int mode = prefs.getInt(WidgetConfigureActivity.MODE_KEY + id, prefs.getInt(large ? WidgetConfigureActivity.LARGE_MODE_KEY : WidgetConfigureActivity.SMALL_MODE_KEY, large ? 5 : 0));
    String text = mode == 0 ? values[0] : mode == 1 ? values[1] : mode == 2 ? values[3] : mode == 3 ? values[4] : mode == 4 ? values[5] : values[0] + "\n" + values[1] + "\n" + values[3] + "\n" + values[4] + " · " + values[5];
    views.setTextViewText(R.id.summary, text); views.setTextViewText(R.id.updated, values[2]); if (large) views.setTextViewText(R.id.details, mode == 5 ? values[1] : "");
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://voto-school-compass.pages.dev/"));
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
    views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, intent, flags));
    return views;
  }

  private static final class HttpError extends Exception { final int status; HttpError(int status, String body) { super(body); this.status = status; } }
}
