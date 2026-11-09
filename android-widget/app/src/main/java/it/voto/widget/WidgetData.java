package it.voto.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.util.TypedValue;
import android.view.View;
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
import java.text.SimpleDateFormat;
import java.util.Date;
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
  private static final Object SESSION_LOCK = new Object();
  private static final Object REFRESH_LOCK = new Object();
  private static boolean refreshInFlight = false;

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
    refresh(context, null);
  }

  static void refresh(Context context, android.content.BroadcastReceiver.PendingResult pendingResult) {
    synchronized (REFRESH_LOCK) {
      if (refreshInFlight) {
        if (pendingResult != null) pendingResult.finish();
        return;
      }
      refreshInFlight = true;
    }
    new Thread(() -> {
      try {
        String[] values = fetch(context);
        renderProvider(context, new ComponentName(context, SmallWidgetProvider.class), false, values);
        renderProvider(context, new ComponentName(context, LargeWidgetProvider.class), true, values);
        renderProvider(context, new ComponentName(context, MediumWidgetProvider.class), false, values);
        renderProvider(context, new ComponentName(context, WideWidgetProvider.class), true, values);
        renderProvider(context, new ComponentName(context, CompactWidgetProvider.class), false, true, values);
      } finally {
        synchronized (REFRESH_LOCK) { refreshInFlight = false; }
        if (pendingResult != null) pendingResult.finish();
      }
    }).start();
  }

  static void update(Context context, ComponentName provider, boolean large) {
    update(context, provider, large, false);
  }

  static void update(Context context, ComponentName provider, boolean large, boolean compact) {
    update(context, provider, large, compact, null);
  }

  static void update(Context context, ComponentName provider, boolean large, boolean compact,
                     android.content.BroadcastReceiver.PendingResult pendingResult) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(provider);
    if (ids.length == 0) {
      if (pendingResult != null) pendingResult.finish();
      return;
    }
    refresh(context, pendingResult);
  }

  private static void renderProvider(Context context, ComponentName provider, boolean large, String[] values) {
    renderProvider(context, provider, large, false, values);
  }

  private static void renderProvider(Context context, ComponentName provider, boolean large, boolean compact, String[] values) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    for (int id : manager.getAppWidgetIds(provider)) manager.updateAppWidget(id, views(context, values, large, compact, id));
  }

  static boolean hasSession(Context context) {
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    return prefs.getString(REFRESH_TOKEN_KEY, "").length() > 0 && prefs.getString(ACCESS_TOKEN_KEY, "").length() > 0;
  }

  static void applyDefaultsToAllWidgets(Context context) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    ComponentName[] providers = {
        new ComponentName(context, SmallWidgetProvider.class),
        new ComponentName(context, MediumWidgetProvider.class),
        new ComponentName(context, LargeWidgetProvider.class),
        new ComponentName(context, WideWidgetProvider.class),
        new ComponentName(context, CompactWidgetProvider.class)
    };
    android.content.SharedPreferences.Editor editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
    for (ComponentName provider : providers) for (int id : manager.getAppWidgetIds(provider)) {
      editor.remove(WidgetConfigureActivity.MODE_KEY + id)
          .remove(WidgetConfigureActivity.THEME_KEY + id)
          .remove(WidgetConfigureActivity.INTERFACE_THEME_KEY + id)
          .remove(WidgetConfigureActivity.TEXT_SIZE_KEY + id)
          .remove(WidgetConfigureActivity.SHOW_UPDATED_KEY + id)
          .remove(WidgetConfigureActivity.GLASS_BACKGROUND_KEY + id)
          .remove(WidgetConfigureActivity.TRANSPARENT_BACKGROUND_KEY + id)
          .remove(WidgetConfigureActivity.HIDE_TITLE_KEY + id);
    }
    editor.apply();
  }

  private static String[] fetch(Context context) {
    try {
      String accessToken = validAccessToken(context);
      if (accessToken.length() == 0) return new String[]{"Accedi dall'app", "", "", "", "", "", "", "", "", "", ""};
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
      return new String[]{"Dati non disponibili", messageFor(e), "", "", "", "", "", "", "", "", ""};
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
    synchronized (SESSION_LOCK) {
      HttpError lastRotationError = null;
      for (int attempt = 0; attempt < 3; attempt++) {
        android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String current = prefs.getString(ACCESS_TOKEN_KEY, "");
        long expiresAt = prefs.getLong(EXPIRES_AT_KEY, 0L);
        if (current.length() > 0 && expiresAt > System.currentTimeMillis() + 60_000L) return current;
        String refresh = prefs.getString(REFRESH_TOKEN_KEY, "");
        if (refresh.length() == 0) throw new Exception("Sessione scaduta: accedi di nuovo");
        try {
          JSONObject body = new JSONObject();
          body.put("refresh_token", refresh);
          JSONObject result = requestJson(AUTH_TOKEN_URL + "?grant_type=refresh_token", "POST", body.toString(), null);
          saveSession(context, result);
          return result.optString("access_token", "");
        } catch (HttpError error) {
          if (!isRefreshRotationError(error)) throw error;
          lastRotationError = error;
          try { Thread.sleep(350L); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw interrupted; }
        }
      }
      throw lastRotationError == null ? new Exception("Sessione scaduta: accedi di nuovo") : lastRotationError;
    }
  }

  private static boolean isRefreshRotationError(HttpError error) {
    return error.status == 400 && error.getMessage() != null && error.getMessage().contains("refresh_token_already_used");
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
        .commit();
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
      if (http.status == 400 && http.getMessage() != null && http.getMessage().contains("refresh_token_already_used")) return "Sessione in aggiornamento, riprova tra poco";
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
    String attendanceText = attendance == null ? "Assenze non disponibili" : "Assenze: " + attendance.optInt("absenceDays", 0) + " giorni · " + attendance.optInt("absenceHours", 0) + " ore";
    JSONArray notifications = root.optJSONArray("notifications"); int notes = 0, unread = 0; String latestCircular = "Nessuna circolare"; String latestCircularDate = "";
    if (notifications != null) for (int i = 0; i < notifications.length(); i++) { JSONObject n = notifications.optJSONObject(i); if (n == null) continue; if ("note".equals(n.optString("type"))) notes++; if ("notice".equals(n.optString("type"))) { String date = n.optString("date"); if (date.compareTo(latestCircularDate) > 0) { latestCircularDate = date; latestCircular = n.optString("title", ""); if (latestCircular.length() == 0) latestCircular = n.optString("attachmentName", "Circolare"); } } if (!n.optBoolean("read", false)) unread++; }
    JSONArray assignments = root.optJSONArray("assignments"); int openAssignments = 0; String nextAssignment = "Nessun compito in sospeso"; String nextDate = "9999-99-99"; String today = new SimpleDateFormat("yyyy-MM-dd", Locale.ITALIAN).format(new Date());
    if (assignments != null) for (int i = 0; i < assignments.length(); i++) { JSONObject a = assignments.optJSONObject(i); if (a == null || a.optBoolean("completed", false)) continue; openAssignments++; String due = a.optString("dueDate", ""); if (due.length() > 0 && due.compareTo(today) >= 0 && due.compareTo(nextDate) < 0) { nextDate = due; nextAssignment = a.optString("title", "Compito") + (a.optString("subject", "").length() > 0 ? " · " + a.optString("subject") : "") + " · " + due; } }
    JSONObject student = root.optJSONObject("student"); String studentText = student == null ? "Studente" : student.optString("name", "Studente") + (student.optString("className", "").length() > 0 ? " · " + student.optString("className") : "");
    return new String[]{"Media " + average, latest.length() == 0 ? "Nessun voto" : latest + " — " + latestSubject, formatUpdated(root.optString("updatedAt", "")), attendanceText, "Note: " + notes, "Circolare: " + latestCircular, "Compiti aperti: " + openAssignments, nextAssignment, "Non lette: " + unread, studentText, "Materie valutate: " + subjectCount};
  }

  private static String formatUpdated(String raw) {
    if (raw == null || raw.length() < 19) return "Aggiornato ora";
    try {
      Date parsed = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.ITALIAN).parse(raw.substring(0, 19));
      return "Aggiornato " + new SimpleDateFormat("dd/MM HH:mm", Locale.ITALIAN).format(parsed);
    } catch (Exception ignored) { return "Aggiornato ora"; }
  }

  private static int themeBackground(int theme) {
    switch (theme) {
      case 1: return Color.rgb(18, 53, 43);
      case 2: return Color.rgb(42, 28, 63);
      case 3: return Color.rgb(18, 18, 18);
      case 4: return Color.rgb(247, 244, 237);
      case 5: return Color.rgb(92, 45, 24);
      case 6: return Color.rgb(24, 61, 82);
      case 7: return Color.rgb(86, 24, 37);
      case 8: return Color.rgb(55, 59, 66);
      case 9: return Color.rgb(30, 34, 42);
      case 10: return Color.rgb(78, 53, 18);
      case 11: return Color.rgb(31, 70, 104);
      case 12: return Color.rgb(103, 43, 35);
      case 13: return Color.rgb(55, 42, 83);
      case 14: return Color.rgb(4, 31, 38);
      case 15: return Color.rgb(25, 25, 18);
      case 16: return Color.rgb(45, 45, 48);
      case 17: return Color.rgb(8, 35, 93);
      case 18: return Color.rgb(8, 73, 119);
      case 19: return Color.rgb(58, 37, 23);
      case 20: return Color.rgb(28, 39, 77);
      case 21: return Color.rgb(16, 67, 48);
      case 22: return Color.rgb(18, 76, 48);
      case 23: return Color.rgb(6, 24, 13);
      case 24: return Color.rgb(39, 19, 77);
      case 25: return Color.rgb(35, 32, 78);
      case 26: return Color.rgb(31, 83, 55);
      case 27: return Color.rgb(8, 77, 114);
      case 28: return Color.rgb(103, 48, 24);
      case 29: return Color.rgb(24, 55, 91);
      default: return Color.rgb(23, 32, 51);
    }
  }

  private static double grade(String value) { try { String s = value.trim().replace(',', '.').replace("½", ".5"); double delta = 0; if (s.endsWith("+")) { delta = .15; s = s.substring(0, s.length() - 1).trim(); } else if (s.endsWith("-")) { delta = -.15; s = s.substring(0, s.length() - 1).trim(); } if (s.contains("/")) { String[] parts = s.split("/"); return (Double.parseDouble(parts[0].trim()) + Double.parseDouble(parts[1].trim())) / 2 + delta; } return Double.parseDouble(s) + delta; } catch (Exception e) { return -1; } }

  private static RemoteViews views(Context context, String[] values, boolean large, boolean compact, int id) {
    int layout = compact ? R.layout.widget_compact : (large ? R.layout.widget_large : R.layout.widget_small);
    RemoteViews views = new RemoteViews(context.getPackageName(), layout);
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    int mode = prefs.getInt(WidgetConfigureActivity.MODE_KEY + id, compact ? prefs.getInt(WidgetConfigureActivity.COMPACT_MODE_KEY, 7) : prefs.getInt(large ? WidgetConfigureActivity.LARGE_MODE_KEY : WidgetConfigureActivity.SMALL_MODE_KEY, large ? 5 : 0));
    int theme = prefs.getInt(WidgetConfigureActivity.THEME_KEY + id, prefs.getInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, 0));
    int interfaceTheme = prefs.getInt(WidgetConfigureActivity.INTERFACE_THEME_KEY + id, prefs.getInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, 0));
    int textSize = prefs.getInt(WidgetConfigureActivity.TEXT_SIZE_KEY + id, 1);
    boolean showUpdated = prefs.getBoolean(WidgetConfigureActivity.SHOW_UPDATED_KEY + id, true);
    boolean glassBackground = prefs.getBoolean(WidgetConfigureActivity.GLASS_BACKGROUND_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, false));
    boolean transparentBackground = prefs.getBoolean(WidgetConfigureActivity.TRANSPARENT_BACKGROUND_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, false));
    boolean hideTitle = prefs.getBoolean(WidgetConfigureActivity.HIDE_TITLE_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_HIDE_TITLE_KEY, true));
    String text = mode == 0 ? values[0] : mode == 1 ? values[1] : mode == 2 ? values[3] : mode == 3 ? values[4] : mode == 4 ? values[5] : mode == 6 ? values[6] : mode == 7 ? values[7] : mode == 8 ? values[8] : mode == 9 ? values[9] : mode == 10 ? values[10] : values[0] + "\n" + values[6] + "\n" + values[7] + "\n" + values[3] + " · " + values[4] + " · " + values[5];
    int background = themeBackground(theme);
    boolean systemDark = (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    boolean lightInterface = interfaceTheme == 1 || (interfaceTheme == 0 && !systemDark);
    if (interfaceTheme == 1) background = Color.rgb(247, 247, 249);
    if (interfaceTheme == 3) background = Color.BLACK;
    int foreground = lightInterface ? Color.rgb(36, 42, 50) : Color.WHITE;
    int secondary = lightInterface ? Color.rgb(78, 87, 99) : Color.rgb(216, 226, 242);
    int muted = lightInterface ? Color.rgb(103, 111, 121) : Color.rgb(154, 170, 194);
    if (glassBackground) views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_glass);
    else if (transparentBackground) views.setInt(R.id.widget_root, "setBackgroundColor", Color.TRANSPARENT);
    else views.setInt(R.id.widget_root, "setBackgroundColor", background);
    views.setTextColor(R.id.title, foreground);
    views.setTextColor(R.id.summary, secondary);
    views.setTextColor(R.id.updated, muted);
    views.setViewVisibility(R.id.title, hideTitle ? View.GONE : View.VISIBLE);
    if (large) views.setTextColor(R.id.details, secondary);
    float summarySize = textSize == 0 ? 13f : textSize == 2 ? 19f : 16f;
    views.setTextViewTextSize(R.id.summary, TypedValue.COMPLEX_UNIT_SP, summarySize);
    views.setTextViewTextSize(R.id.updated, TypedValue.COMPLEX_UNIT_SP, textSize == 0 ? 9f : 11f);
    if (large) views.setTextViewTextSize(R.id.details, TypedValue.COMPLEX_UNIT_SP, textSize == 0 ? 11f : textSize == 2 ? 16f : 13f);
    views.setViewVisibility(R.id.updated, showUpdated ? View.VISIBLE : View.GONE);
    views.setTextViewText(R.id.summary, text); views.setTextViewText(R.id.updated, values[2]); if (large) views.setTextViewText(R.id.details, mode == 5 ? values[1] : "");
    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://voto-school-compass.pages.dev/"));
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, intent, flags));
    return views;
  }

  private static final class HttpError extends Exception { final int status; HttpError(int status, String body) { super(body); this.status = status; } }
}
