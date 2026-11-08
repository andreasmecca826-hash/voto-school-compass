package it.voto.widget;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.Spinner;
import android.widget.TextView;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
  private TextView status;
  private Spinner small;
  private Spinner large;
  private Spinner defaultTheme;
  private Spinner defaultInterfaceTheme;
  private CheckBox defaultGlassBackground;
  private CheckBox defaultTransparentBackground;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setContentView(R.layout.activity_main);
    bindViews();
    handleOAuthIntent(getIntent());
  }

  private void bindViews() {
    status = (TextView) findViewById(R.id.status);
    small = (Spinner) findViewById(R.id.small_mode);
    large = (Spinner) findViewById(R.id.large_mode);
    defaultTheme = (Spinner) findViewById(R.id.default_theme);
    defaultInterfaceTheme = (Spinner) findViewById(R.id.default_interface_theme);
    defaultGlassBackground = (CheckBox) findViewById(R.id.default_glass_background);
    defaultTransparentBackground = (CheckBox) findViewById(R.id.default_transparent_background);
    final Button refresh = (Button) findViewById(R.id.refresh_button);
    final Button github = (Button) findViewById(R.id.github_button);
    final Button logout = (Button) findViewById(R.id.logout_button);
    android.content.SharedPreferences prefs = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE);
    small.setSelection(prefs.getInt(WidgetConfigureActivity.SMALL_MODE_KEY, 0));
    large.setSelection(prefs.getInt(WidgetConfigureActivity.LARGE_MODE_KEY, 5));
    defaultTheme.setSelection(prefs.getInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, 0));
    defaultInterfaceTheme.setSelection(prefs.getInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, 0));
    defaultGlassBackground.setChecked(prefs.getBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, false));
    defaultTransparentBackground.setChecked(prefs.getBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, false));
    defaultGlassBackground.setOnCheckedChangeListener((button, checked) -> { if (checked) defaultTransparentBackground.setChecked(false); });
    defaultTransparentBackground.setOnCheckedChangeListener((button, checked) -> { if (checked) defaultGlassBackground.setChecked(false); });
    refresh.setOnClickListener(v -> {
      refresh.setEnabled(false);
      status.setText("Aggiornamento dei widget in corso…");
      savePreferences();
      WidgetData.refresh(this);
      refresh.postDelayed(() -> {
        refresh.setEnabled(true);
        status.setText("Widget aggiornati. Se non cambia subito, attendi qualche secondo.");
      }, 1200);
    });
    github.setOnClickListener(v -> {
      String redirect = Uri.encode("it.voto.widget://auth-callback");
      Uri auth = Uri.parse(WidgetData.SUPABASE_URL + "/auth/v1/authorize?provider=github&redirect_to=" + redirect);
      startActivity(new Intent(Intent.ACTION_VIEW, auth));
      status.setText("Completa l'accesso GitHub nel browser…");
    });
    logout.setOnClickListener(v -> {
      WidgetData.logout(this); WidgetData.refresh(this); status.setText("Sessione rimossa dal dispositivo.");
    });
  }

  private void savePreferences() {
    getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
        .putInt(WidgetConfigureActivity.SMALL_MODE_KEY, small.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.LARGE_MODE_KEY, large.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, defaultTheme.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, defaultInterfaceTheme.getSelectedItemPosition())
        .putBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, defaultGlassBackground.isChecked())
        .putBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, defaultTransparentBackground.isChecked())
        .apply();
    WidgetData.refresh(this);
  }

  @Override protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleOAuthIntent(intent);
  }

  private void handleOAuthIntent(Intent intent) {
    Uri data = intent == null ? null : intent.getData();
    if (data == null || !"it.voto.widget".equals(data.getScheme())) return;
    try {
      Map<String, String> values = parseParams(data.getFragment());
      String error = values.get("error_description");
      if (error == null) error = values.get("error");
      if (error != null) { status.setText("Login GitHub non riuscito: " + error); return; }
      String access = values.get("access_token");
      String refresh = values.get("refresh_token");
      if (access == null || refresh == null) throw new Exception("La sessione GitHub non è stata restituita.");
      long expires = parseLong(values.get("expires_in"), 3600L);
      WidgetData.saveOAuthSession(this, access, refresh, expires);
      savePreferences();
      status.setText("Accesso GitHub riuscito. Widget aggiornati.");
    } catch (Exception e) {
      status.setText("Login GitHub non riuscito: " + e.getMessage());
    }
  }

  private static Map<String, String> parseParams(String fragment) {
    Map<String, String> values = new HashMap<>();
    if (fragment == null) return values;
    for (String part : fragment.split("&")) {
      int equals = part.indexOf('=');
      String key = equals >= 0 ? part.substring(0, equals) : part;
      String value = equals >= 0 ? part.substring(equals + 1) : "";
      values.put(Uri.decode(key), Uri.decode(value));
    }
    return values;
  }

  private static long parseLong(String value, long fallback) {
    try { return Long.parseLong(value); } catch (Exception ignored) { return fallback; }
  }
}
