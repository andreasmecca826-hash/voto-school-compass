package it.voto.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.Spinner;

public class WidgetConfigureActivity extends Activity {
  public static final String MODE_KEY = "mode_";
  public static final String THEME_KEY = "theme_";
  public static final String SMALL_MODE_KEY = "small_mode";
  public static final String LARGE_MODE_KEY = "large_mode";
  public static final String SMALL_THEME_KEY = "small_theme";
  public static final String LARGE_THEME_KEY = "large_theme";

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setContentView(R.layout.widget_configure);
    final int id = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID);
    if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

    final Spinner mode = (Spinner) findViewById(R.id.mode_spinner);
    final Spinner theme = (Spinner) findViewById(R.id.theme_spinner);
    android.content.SharedPreferences prefs = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE);
    mode.setSelection(prefs.getInt(MODE_KEY + id, 0));
    theme.setSelection(prefs.getInt(THEME_KEY + id, 0));

    ((Button) findViewById(R.id.config_save)).setOnClickListener(v -> {
      prefs.edit()
          .putInt(MODE_KEY + id, mode.getSelectedItemPosition())
          .putInt(THEME_KEY + id, theme.getSelectedItemPosition())
          .apply();
      WidgetData.refresh(this);
      Intent result = new Intent();
      result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
      setResult(RESULT_OK, result);
      finish();
    });
  }
}
