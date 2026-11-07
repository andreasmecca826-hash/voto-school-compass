package it.voto.widget;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
  private TextView status;
  private Spinner small;
  private Spinner large;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setContentView(R.layout.activity_main);
    bindViews();
    handleOAuthIntent(getIntent());
  }

  private void bindViews() {
    final EditText email = (EditText) findViewById(R.id.email_input);
    final EditText password = (EditText) findViewById(R.id.password_input);
    status = (TextView) findViewById(R.id.status);
    small = (Spinner) findViewById(R.id.small_mode);
    large = (Spinner) findViewById(R.id.large_mode);
    final Button save = (Button) findViewById(R.id.save_button);
    final Button github = (Button) findViewById(R.id.github_button);
    final Button logout = (Button) findViewById(R.id.logout_button);
    android.content.SharedPreferences prefs = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE);
    email.setText(prefs.getString(WidgetData.EMAIL_KEY, ""));
    small.setSelection(prefs.getInt(WidgetConfigureActivity.SMALL_MODE_KEY, 0));
    large.setSelection(prefs.getInt(WidgetConfigureActivity.LARGE_MODE_KEY, 5));

    save.setOnClickListener(v -> {
      String emailText = email.getText().toString().trim();
      String passwordText = password.getText().toString();
      if (!android.util.Patterns.EMAIL_ADDRESS.matcher(emailText).matches()) { status.setText("Inserisci un'email valida."); return; }
      if (passwordText.length() < 6) { status.setText("La password deve avere almeno 6 caratteri."); return; }
      save.setEnabled(false); status.setText("Accesso Supabase in corso…");
      WidgetData.login(this, emailText, passwordText, error -> {
        save.setEnabled(true);
        if (error != null) { status.setText(error); return; }
        savePreferences(emailText);
        password.setText("");
        status.setText("Accesso riuscito. Widget aggiornati.");
      });
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

  private void savePreferences(String email) {
    getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
        .putString(WidgetData.EMAIL_KEY, email)
        .putInt(WidgetConfigureActivity.SMALL_MODE_KEY, small.getSelectedItemPosition())
        .putInt(WidgetConfigureActivity.LARGE_MODE_KEY, large.getSelectedItemPosition()).apply();
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
      savePreferences("");
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
