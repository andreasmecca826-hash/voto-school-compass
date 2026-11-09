package it.voto.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;

public class CompactWidgetProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    WidgetData.update(context, new ComponentName(context, CompactWidgetProvider.class), false, true, goAsync());
  }
}
