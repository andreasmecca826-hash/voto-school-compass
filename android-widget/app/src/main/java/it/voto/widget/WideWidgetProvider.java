package it.voto.widget;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
public class WideWidgetProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    WidgetData.update(context, new ComponentName(context, WideWidgetProvider.class), true);
  }
}
