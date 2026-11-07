package it.voto.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.Spinner;

public class WidgetConfigureActivity extends Activity {
  public static final String MODE_KEY = "mode_";
  public static final String THEME_KEY = "theme_";
  public static final String TEXT_SIZE_KEY = "text_size_";
  public static final String SHOW_UPDATED_KEY = "show_updated_";
  public static final String INTERFACE_THEME_KEY = "interface_theme_";
  public static final String SMALL_MODE_KEY = "small_mode";
  public static final String LARGE_MODE_KEY = "large_mode";
  public static final String SMALL_THEME_KEY = "small_theme";
  public static final String LARGE_THEME_KEY = "large_theme";
  public static final String DEFAULT_THEME_KEY = "default_theme";
  public static final String DEFAULT_INTERFACE_THEME_KEY = "default_interface_theme";

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    setContentView(R.layout.widget_configure);
    final int id = getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
        AppWidgetManager.INVALID_APPWIDGET_ID);
    if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

    final Spinner mode = (Spinner) findViewById(R.id.mode_spinner);
    final Spinner theme = (Spinner) findViewById(R.id.theme_spinner);
    final Spinner interfaceTheme = (Spinner) findViewById(R.id.interface_theme_spinner);
    final Spinner textSize = (Spinner) findViewById(R.id.text_size_spinner);
    final CheckBox showUpdated = (CheckBox) findViewById(R.id.show_updated_check);
    android.content.SharedPreferences prefs = getSharedPreferences(WidgetData.PREFS, MODE_PRIVATE);
    mode.setSelection(prefs.getInt(MODE_KEY + id, 0));
    theme.setSelection(prefs.getInt(THEME_KEY + id, 0));
    interfaceTheme.setSelection(prefs.getInt(INTERFACE_THEME_KEY + id, 0));
    textSize.setSelection(prefs.getInt(TEXT_SIZE_KEY + id, 1));
    showUpdated.setChecked(prefs.getBoolean(SHOW_UPDATED_KEY + id, true));

    ((Button) findViewById(R.id.config_save)).setOnClickListener(v -> {
      prefs.edit()
          .putInt(MODE_KEY + id, mode.getSelectedItemPosition())
          .putInt(THEME_KEY + id, theme.getSelectedItemPosition())
          .putInt(INTERFACE_THEME_KEY + id, interfaceTheme.getSelectedItemPosition())
          .putInt(TEXT_SIZE_KEY + id, textSize.getSelectedItemPosition())
          .putBoolean(SHOW_UPDATED_KEY + id, showUpdated.isChecked())
          .apply();
      WidgetData.refresh(this);
      Intent result = new Intent();
      result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
      setResult(RESULT_OK, result);
      finish();
    });
  }
}
