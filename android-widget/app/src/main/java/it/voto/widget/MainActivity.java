package it.voto.widget;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.Spinner;
import android.widget.TextView;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class MainActivity extends Activity {
  private TextView status;
  private Spinner small;
  private Spinner large;
  private Spinner compact;
  private Spinner defaultTheme;
  private Spinner defaultInterfaceTheme;
  private CheckBox defaultGlassBackground;
  private CheckBox defaultTransparentBackground;
  private CheckBox defaultHideTitle;

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
    compact = (Spinner) findViewById(R.id.compact_mode);
    defaultTheme = (Spinner) findViewById(R.id.default_theme);
    defaultInterfaceTheme = (Spinner) findViewById(R.id.default_interface_theme);
    defaultGlassBackground = (CheckBox) findViewById(R.id.default_glass_background);
    defaultTransparentBackground = (CheckBox) findViewById(R.id.default_transparent_background);
    defaultHideTitle = (CheckBox) findViewById(R.id.default_hide_title);
    final Button refresh = (Button) findViewById(R.id.refresh_button);
    final Button applyAll = (Button) findViewById(R.id.apply_all_button);
    final Button openVoto = (Button) findViewById(R.id.open_voto_button);
    final Button github = (Button) findViewById(R.id.github_button);
    final Button logout = (Button) findViewById(R.id.logout_button);
    android.content.SharedPreferences prefs = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE);
    small.setSelection(prefs.getInt(WidgetConfigureActivity.SMALL_MODE_KEY, 0));
    large.setSelection(prefs.getInt(WidgetConfigureActivity.LARGE_MODE_KEY, 5));
    compact.setSelection(prefs.getInt(WidgetConfigureActivity.COMPACT_MODE_KEY, 7));
    defaultTheme.setSelection(prefs.getInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, 0));
    defaultInterfaceTheme.setSelection(prefs.getInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, 0));
    defaultGlassBackground.setChecked(prefs.getBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, false));
    defaultTransparentBackground.setChecked(prefs.getBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, false));
    defaultHideTitle.setChecked(prefs.getBoolean(WidgetConfigureActivity.DEFAULT_HIDE_TITLE_KEY, true));
    defaultGlassBackground.setOnCheckedChangeListener((button, checked) -> { if (checked) defaultTransparentBackground.setChecked(false); });
    defaultTransparentBackground.setOnCheckedChangeListener((button, checked) -> { if (checked) defaultGlassBackground.setChecked(false); });
    status.setText(WidgetData.hasSession(this) ? "Sessione GitHub attiva. I dati restano privati." : "Nessuna sessione. Accedi con GitHub per caricare i dati.");
    refresh.setOnClickListener(v -> {
      refresh.setEnabled(false);
      status.setText("Aggiornamento dei widget in corso…");
      savePreferences();
      WidgetData.refresh(this);
      refresh.postDelayed(() -> { refresh.setEnabled(true); status.setText("Richiesta inviata. I widget si aggiorneranno appena ricevuti i dati."); }, 700);
    });
    applyAll.setOnClickListener(v -> {
      savePreferences();
      WidgetData.applyDefaultsToAllWidgets(this);
      WidgetData.refresh(this);
      status.setText("Impostazioni applicate a tutti i widget.");
    });
    openVoto.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://voto-school-compass.pages.dev/"))));
    github.setOnClickListener(v -> {
      String state = UUID.randomUUID().toString();
      String verifier = UUID.randomUUID().toString() + UUID.randomUUID().toString();
      String challenge = codeChallenge(verifier);
      getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
          .putString(WidgetData.OAUTH_STATE_KEY, state)
          .putString(WidgetData.OAUTH_VERIFIER_KEY, verifier).apply();
      String redirect = Uri.encode("it.voto.widget://auth-callback");
      Uri auth = Uri.parse(WidgetData.SUPABASE_URL + "/auth/v1/authorize?provider=github&redirect_to=" + redirect
          + "&state=" + Uri.encode(state) + "&code_challenge=" + Uri.encode(challenge)
          + "&code_challenge_method=S256");
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
        .putInt(WidgetConfigureActivity.COMPACT_MODE_KEY, compact.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.DEFAULT_THEME_KEY, defaultTheme.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.DEFAULT_INTERFACE_THEME_KEY, defaultInterfaceTheme.getSelectedItemPosition())
        .putBoolean(WidgetConfigureActivity.DEFAULT_GLASS_BACKGROUND_KEY, defaultGlassBackground.isChecked())
        .putBoolean(WidgetConfigureActivity.DEFAULT_TRANSPARENT_BACKGROUND_KEY, defaultTransparentBackground.isChecked())
        .putBoolean(WidgetConfigureActivity.DEFAULT_HIDE_TITLE_KEY, defaultHideTitle.isChecked())
        .apply();
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
      String rawParams = data.getFragment();
      if (rawParams == null || rawParams.length() == 0) rawParams = data.getQuery();
      Map<String, String> values = parseParams(rawParams);
      String error = values.get("error_description");
      if (error == null) error = values.get("error");
      if (error != null) { status.setText("Login GitHub non riuscito: " + error); return; }
      String expectedState = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE)
          .getString(WidgetData.OAUTH_STATE_KEY, "");
      String returnedState = values.get("state");
      if (expectedState.length() == 0 || !expectedState.equals(returnedState))
        throw new Exception("Callback GitHub non verificato. Avvia di nuovo il login dall'app.");
      String code = values.get("code");
      String access = values.get("access_token");
      String refresh = values.get("refresh_token");
      if (code != null && code.length() > 0) {
        String verifier = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE)
            .getString(WidgetData.OAUTH_VERIFIER_KEY, "");
        if (verifier.length() == 0) throw new Exception("Verifier PKCE mancante. Avvia di nuovo il login.");
        status.setText("Verifica del login GitHub in corso…");
        final String exchangeCode = code;
        final String exchangeVerifier = verifier;
        new Thread(() -> {
          try {
            WidgetData.exchangeOAuthCode(this, exchangeCode, exchangeVerifier);
            getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
                .remove(WidgetData.OAUTH_STATE_KEY).remove(WidgetData.OAUTH_VERIFIER_KEY).apply();
            runOnUiThread(this::completeLogin);
          } catch (Exception exchangeError) {
            runOnUiThread(() -> status.setText("Login GitHub non riuscito: " + exchangeError.getMessage()));
          }
        }).start();
        return;
      } else {
        if (access == null || refresh == null) throw new Exception("La sessione GitHub non è stata restituita.");
        long expires = parseLong(values.get("expires_in"), 3600L);
        WidgetData.saveOAuthSession(this, access, refresh, expires);
      }
      getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
          .remove(WidgetData.OAUTH_STATE_KEY).remove(WidgetData.OAUTH_VERIFIER_KEY).apply();
      savePreferences();
      WidgetData.refresh(this);
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

  private void completeLogin() {
    savePreferences();
    WidgetData.refresh(this);
    status.setText("Accesso GitHub riuscito. Widget aggiornati.");
  }

  private static String codeChallenge(String verifier) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(verifier.getBytes(StandardCharsets.US_ASCII));
      return Base64.encodeToString(digest, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    } catch (Exception error) {
      throw new IllegalStateException("Impossibile preparare il login sicuro", error);
    }
  }
}
