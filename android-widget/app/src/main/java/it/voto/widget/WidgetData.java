package it.voto.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.util.TypedValue;
import android.util.Base64;
import android.view.View;
import android.widget.RemoteViews;

import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

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
import java.util.concurrent.TimeUnit;

public final class WidgetData {
  static final String PREFS = "voto_widget";
  private static final String OWNER_KEY = "active_owner_id";
  static final String SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
  static final String SUPABASE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
  static final String SCHOOL_DATA_URL = SUPABASE_URL + "/functions/v1/school-data";
  static final String AUTH_TOKEN_URL = SUPABASE_URL + "/auth/v1/token";
  public static void refresh(Context context) {
    Context app = context.getApplicationContext();
    if (!hasSession(app)) {
      clearForLogout(app);
      return;
    }
    scheduleRefresh(app, ExistingWorkPolicy.KEEP);
  }

  public static void refreshLatest(Context context) {
    Context app = context.getApplicationContext();
    if (!hasSession(app)) {
      clearForLogout(app);
      return;
    }
    scheduleRefresh(app, ExistingWorkPolicy.REPLACE);
  }

  private static void scheduleRefresh(Context app, ExistingWorkPolicy policy) {
    Constraints constraints = new Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build();
    OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(WidgetRefreshWorker.class)
        .setConstraints(constraints)
        .setBackoffCriteria(androidx.work.BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
        .build();
    WorkManager.getInstance(app).enqueueUniqueWork(
        "voto-widget-refresh",
        policy,
        request
    );
  }

  public static void onSessionChanged(Context context) {
    Context app = context.getApplicationContext();
    String nextOwner = ownerId(app);
    if (nextOwner.isEmpty()) {
      clearForLogout(app);
      return;
    }
    android.content.SharedPreferences prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String previousOwner = prefs.getString(OWNER_KEY, "");
    if (nextOwner.equals(previousOwner)) return;
    prefs.edit().putString(OWNER_KEY, nextOwner).apply();
    renderAll(app, statusValues("Caricamento account VOTO…", "loading"));
    refreshLatest(app);
  }

  public static void clearForLogout(Context context) {
    Context app = context.getApplicationContext();
    app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(OWNER_KEY).apply();
    WorkManager.getInstance(app).cancelUniqueWork("voto-widget-refresh");
    renderAll(app, statusValues("Accedi a VOTO", "signed_out"));
  }

  public static void refreshNow(Context context) throws Exception {
    String requestedOwner = ownerId(context);
    if (requestedOwner.isEmpty()) {
      clearForLogout(context);
      return;
    }
    String[] values = fetch(context);
    String currentOwner = ownerId(context);
    if (!canApplyResult(requestedOwner, currentOwner)) {
      if (currentOwner.isEmpty()) clearForLogout(context);
      else onSessionChanged(context);
      return;
    }
    renderAll(context, values);
  }

  static boolean canApplyResult(String requestedOwner, String currentOwner) {
    return requestedOwner != null && !requestedOwner.isEmpty() && requestedOwner.equals(currentOwner);
  }

  public static void showUnavailable(Context context) {
    renderAll(context, statusValues("Dati non disponibili", "error"));
  }

  private static void renderAll(Context context, String[] values) {
    renderProvider(context, new ComponentName(context, SmallWidgetProvider.class), false, values);
    renderProvider(context, new ComponentName(context, LargeWidgetProvider.class), true, values);
    renderProvider(context, new ComponentName(context, MediumWidgetProvider.class), false, values);
    renderProvider(context, new ComponentName(context, WideWidgetProvider.class), true, values);
    renderProvider(context, new ComponentName(context, CompactWidgetProvider.class), false, true, values);
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
    refresh(context);
    if (pendingResult != null) pendingResult.finish();
  }

  private static void renderProvider(Context context, ComponentName provider, boolean large, String[] values) {
    renderProvider(context, provider, large, false, values);
  }

  private static void renderProvider(Context context, ComponentName provider, boolean large, boolean compact, String[] values) {
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    for (int id : manager.getAppWidgetIds(provider)) manager.updateAppWidget(id, views(context, values, large, compact, id));
  }

  static boolean hasSession(Context context) {
    try {
      JSONObject session = readSession(context);
      return session.optString("accessToken").length() > 0
          && session.optString("refreshToken").length() > 0;
    } catch (Exception error) {
      return false;
    }
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
          .remove(WidgetConfigureActivity.HIDE_TITLE_KEY + id)
          .remove(WidgetConfigureActivity.HIDE_SENSITIVE_KEY + id);
    }
    editor.apply();
  }

  private static String[] fetch(Context context) throws Exception {
    JSONObject session = readSession(context);
    String accessToken = session.optString("accessToken", "");
    String refreshToken = session.optString("refreshToken", "");
    if (accessToken.isEmpty() || refreshToken.isEmpty()) return statusValues("Accedi a VOTO", "signed_out");
    long expiresAt = session.optLong("expiresAt", 0L);
    if (expiresAt <= System.currentTimeMillis() / 1000L + 60L) {
      session = refreshSession(context, refreshToken);
      accessToken = session.optString("accessToken", "");
    }
    String owner = jwtUserId(accessToken);
    if (owner.isEmpty()) throw new Exception("Sessione VOTO non valida.");
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String previousOwner = prefs.getString(OWNER_KEY, "");
    if (!owner.equals(previousOwner)) {
      prefs.edit().putString(OWNER_KEY, owner).apply();
      renderAll(context, statusValues("Caricamento account VOTO…", "loading"));
    }
    try {
      JSONObject root = requestJson(SCHOOL_DATA_URL, "GET", null, accessToken);
      String[] values = summarize(root);
      values[11] = "authenticated";
      return values;
    } catch (HttpError error) {
      if (error.status == 401) {
        JSONObject refreshed = refreshSession(context, refreshToken);
        String[] values = summarize(requestJson(
            SCHOOL_DATA_URL, "GET", null, refreshed.optString("accessToken", "")
        ));
        values[11] = "authenticated";
        return values;
      }
      throw error;
    }
  }

  private static JSONObject readSession(Context context) throws Exception {
    Class<?> bridge = Class.forName("it.voto.school.WidgetSessionBridge");
    return (JSONObject) bridge.getMethod("getSession", Context.class).invoke(null, context);
  }

  private static JSONObject refreshSession(Context context, String refreshToken) throws Exception {
    JSONObject body = new JSONObject();
    body.put("refresh_token", refreshToken);
    JSONObject response = requestJson(AUTH_TOKEN_URL + "?grant_type=refresh_token", "POST", body.toString(), null);
    long expiresAt = response.optLong("expires_at", 0L);
    if (expiresAt == 0L) expiresAt = System.currentTimeMillis() / 1000L + response.optLong("expires_in", 3600L);
    String accessToken = response.optString("access_token", "");
    String nextRefreshToken = response.optString("refresh_token", refreshToken);
    Class<?> bridge = Class.forName("it.voto.school.WidgetSessionBridge");
    bridge.getMethod("saveSession", Context.class, String.class, String.class, long.class)
        .invoke(null, context, accessToken, nextRefreshToken, expiresAt);
    JSONObject session = new JSONObject();
    session.put("accessToken", accessToken);
    session.put("refreshToken", nextRefreshToken);
    session.put("expiresAt", expiresAt);
    return session;
  }

  private static String ownerId(Context context) {
    try {
      JSONObject session = readSession(context);
      String token = session.optString("accessToken", "");
      return jwtUserId(token);
    } catch (Exception error) {
      return "";
    }
  }

  static String jwtUserId(String token) {
    try {
      String[] parts = token.split("\\.");
      if (parts.length != 3) return "";
      byte[] decoded = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
      return new JSONObject(new String(decoded, StandardCharsets.UTF_8)).optString("sub", "");
    } catch (Exception error) {
      return "";
    }
  }

  private static String[] statusValues(String message, String state) {
    String[] values = new String[12];
    java.util.Arrays.fill(values, "");
    values[0] = message;
    values[7] = message;
    values[11] = state;
    return values;
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
    JSONArray assignments = root.optJSONArray("assignments"); int openAssignments = 0; String nextAssignment = "Nessun compito in scadenza"; String nextDate = "9999-99-99"; String today = new SimpleDateFormat("yyyy-MM-dd", Locale.ITALIAN).format(new Date());
    if (assignments != null) for (int i = 0; i < assignments.length(); i++) { JSONObject a = assignments.optJSONObject(i); if (a == null || a.optBoolean("completed", false)) continue; openAssignments++; String due = a.optString("dueDate", ""); if (due.length() > 0 && due.compareTo(today) >= 0 && due.compareTo(nextDate) < 0) { nextDate = due; nextAssignment = a.optString("title", "Compito") + (a.optString("subject", "").length() > 0 ? " · " + a.optString("subject") : "") + " · " + due; } }
    JSONObject student = root.optJSONObject("student"); String studentText = student == null ? "Studente" : student.optString("name", "Studente") + (student.optString("className", "").length() > 0 ? " · " + student.optString("className") : "");
    return new String[]{"Media " + average, latest.length() == 0 ? "Nessun voto" : latest + " — " + latestSubject, formatUpdated(root.optString("updatedAt", "")), attendanceText, "Note: " + notes, "Circolare: " + latestCircular, "Compiti aperti: " + openAssignments, nextAssignment, "Non lette: " + unread, studentText, "Materie valutate: " + subjectCount, "authenticated"};
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
      case 30: return Color.rgb(18, 42, 68);
      case 31: return Color.rgb(72, 42, 78);
      case 32: return Color.rgb(74, 15, 30);
      default: return Color.rgb(23, 32, 51);
    }
  }

  private static int themeBackgroundResource(int theme) {
    switch (theme) {
      case 1: return R.drawable.theme_soccer;
      case 2: return R.drawable.theme_lavender;
      case 3: return R.drawable.theme_terminal;
      case 4: return R.drawable.theme_academia;
      case 5: return R.drawable.theme_autumn;
      case 6: return R.drawable.theme_diamond;
      case 7: return R.drawable.theme_blood;
      case 8: return R.drawable.theme_academia;
      case 9: return R.drawable.theme_glassmorphism;
      case 10: return R.drawable.theme_gold;
      case 11: return R.drawable.theme_diamond;
      case 12: return R.drawable.theme_autumn;
      case 13: return R.drawable.theme_lavender;
      case 14: return R.drawable.theme_cyber;
      case 15: return R.drawable.theme_brutalist;
      case 16: return R.drawable.theme_windows98;
      case 17: return R.drawable.theme_windows98;
      case 18: return R.drawable.theme_windows7;
      case 19: return R.drawable.theme_academia;
      case 20: return R.drawable.theme_glassmorphism;
      case 21: return R.drawable.theme_casino;
      case 22: return R.drawable.theme_soccer;
      case 23: return R.drawable.theme_terminal;
      case 24: return R.drawable.theme_pixel;
      case 25: return R.drawable.theme_y2k;
      case 26: return R.drawable.theme_spring;
      case 27: return R.drawable.theme_summer;
      case 28: return R.drawable.theme_autumn;
      case 29: return R.drawable.theme_winter;
      case 30: return R.drawable.theme_glassmorphism;
      case 31: return R.drawable.theme_summer;
      case 32: return R.drawable.theme_blood;
      default: return R.drawable.theme_winter;
    }
  }

  private static double grade(String value) { try { String s = value.trim().replace(',', '.').replace("½", ".5"); double delta = 0; if (s.endsWith("+")) { delta = .15; s = s.substring(0, s.length() - 1).trim(); } else if (s.endsWith("-")) { delta = -.15; s = s.substring(0, s.length() - 1).trim(); } if (s.contains("/")) { String[] parts = s.split("/"); return (Double.parseDouble(parts[0].trim()) + Double.parseDouble(parts[1].trim())) / 2 + delta; } return Double.parseDouble(s) + delta; } catch (Exception e) { return -1; } }

  private static RemoteViews views(Context context, String[] values, boolean large, boolean compact, int id) {
    int layout = compact ? R.layout.widget_compact : (large ? R.layout.widget_large : R.layout.widget_small);
    RemoteViews views = new RemoteViews(context.getPackageName(), layout);
    android.content.SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    int mode = prefs.getInt(WidgetConfigureActivity.MODE_KEY + id, compact ? prefs.getInt(WidgetConfigureActivity.COMPACT_MODE_KEY, 7) : prefs.getInt(large ? WidgetConfigureActivity.LARGE_MODE_KEY : WidgetConfigureActivity.SMALL_MODE_KEY, 7));
    int theme = prefs.getInt(WidgetConfigureActivity.THEME_KEY + id, prefs.getInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, 0));
    int interfaceTheme = prefs.getInt(WidgetConfigureActivity.INTERFACE_THEME_KEY + id, prefs.getInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, 0));
    int textSize = prefs.getInt(WidgetConfigureActivity.TEXT_SIZE_KEY + id, 1);
    boolean showUpdated = prefs.getBoolean(WidgetConfigureActivity.SHOW_UPDATED_KEY + id, true);
    boolean glassBackground = prefs.getBoolean(WidgetConfigureActivity.GLASS_BACKGROUND_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, false));
    boolean transparentBackground = prefs.getBoolean(WidgetConfigureActivity.TRANSPARENT_BACKGROUND_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, false));
    boolean hideTitle = prefs.getBoolean(WidgetConfigureActivity.HIDE_TITLE_KEY + id, prefs.getBoolean(WidgetConfigureActivity.DEFAULT_HIDE_TITLE_KEY, true));
    boolean hideSensitive = prefs.getBoolean(WidgetConfigureActivity.HIDE_SENSITIVE_KEY + id, true);
    String text = WidgetContent.select(mode, values, hideSensitive);
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
    else views.setInt(R.id.widget_root, "setBackgroundResource", themeBackgroundResource(theme));
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
    views.setTextViewText(R.id.summary, text); views.setTextViewText(R.id.updated, values[2]); if (large) views.setTextViewText(R.id.details, mode == 5 ? WidgetContent.select(5, values, hideSensitive) : "");
    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClassName("it.voto.school", "it.voto.school.MainActivity");
    int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, intent, flags));
    return views;
  }

  private static final class HttpError extends Exception { final int status; HttpError(int status, String body) { super(body); this.status = status; } }
}
