package it.voto.widget;
import android.appwidget.AppWidgetManager; import android.appwidget.AppWidgetProvider; import android.content.Context;
public class SmallWidgetProvider extends AppWidgetProvider { @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids){ WidgetData.update(c,new android.content.ComponentName(c,SmallWidgetProvider.class),false); } }
