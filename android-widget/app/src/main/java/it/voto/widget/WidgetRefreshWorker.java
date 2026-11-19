package it.voto.widget;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public final class WidgetRefreshWorker extends Worker {
  public WidgetRefreshWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
    super(context, parameters);
  }

  @NonNull
  @Override public Result doWork() {
    try {
      WidgetData.refreshNow(getApplicationContext());
      return Result.success();
    } catch (Exception error) {
      Context context = getApplicationContext();
      android.util.Log.w(
          "VOTO.WidgetRefresh",
          "Widget refresh failed: " + error.getClass().getSimpleName()
      );
      if (WidgetData.isPermanentSessionError(error)) {
        // I token presenti nel vault possono essere formalmente presenti ma
        // non più validi. Non lasciare un OneTimeWorkRequest in retry infinito.
        WidgetData.showSessionRequired(context);
        return Result.success();
      }
      if (WidgetData.hasSession(context)) WidgetData.showUnavailable(context);
      else WidgetData.clearForLogout(context);
      return WidgetData.hasSession(context) ? Result.retry() : Result.success();
    }
  }
}
