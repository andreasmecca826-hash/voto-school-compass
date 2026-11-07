package it.voto.widget;

import android.app.Activity;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;

public class MainActivity extends Activity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setContentView(R.layout.activity_main);
    final EditText email = (EditText) findViewById(R.id.email_input);
    final EditText password = (EditText) findViewById(R.id.password_input);
    final TextView status = (TextView) findViewById(R.id.status);
    final Spinner small = (Spinner) findViewById(R.id.small_mode);
    final Spinner large = (Spinner) findViewById(R.id.large_mode);
    final Button save = (Button) findViewById(R.id.save_button);
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
        getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE).edit()
            .putString(WidgetData.EMAIL_KEY, emailText)
            .putInt(WidgetConfigureActivity.SMALL_MODE_KEY, small.getSelectedItemPosition())
            .putInt(WidgetConfigureActivity.LARGE_MODE_KEY, large.getSelectedItemPosition()).apply();
        WidgetData.refresh(this);
        password.setText("");
        status.setText("Accesso riuscito. Widget aggiornati.");
      });
    });
    logout.setOnClickListener(v -> {
      WidgetData.logout(this);
      WidgetData.refresh(this);
      status.setText("Sessione rimossa dal dispositivo.");
    });
  }
}
