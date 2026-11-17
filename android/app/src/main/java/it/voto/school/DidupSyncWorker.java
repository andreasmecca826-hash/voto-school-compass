package it.voto.school;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.PeriodicWorkRequestBuilder;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.Data;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import org.json.JSONObject;

import java.util.concurrent.TimeUnit;

public final class DidupSyncWorker extends Worker {
    private static final String PERIODIC_NAME = "voto-didup-periodic-sync";
    private static final String IMMEDIATE_NAME = "voto-didup-manual-sync";

    public DidupSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        boolean manual = getInputData().getBoolean("manual", false);
        if (!manual && !DidupSyncVault.isEnabled(context)) return Result.success();
        if (!DidupSyncVault.hasCredentials(context)) {
            recordLocalError(context, "credentials_required", "Inserisci le credenziali DidUP per attivare la sincronizzazione.");
            return Result.failure();
        }
        if (!DidupSyncVault.hasSession(context)) {
            recordLocalError(context, "session_required", "Apri VOTO e accedi per autorizzare la sincronizzazione sicura.");
            return Result.failure();
        }

        try {
            JSONObject input = DidupSyncVault.buildInput(context);
            if (!Python.isStarted()) Python.start(new AndroidPlatform(context));
            PyObject module = Python.getInstance().getModule("didup_sync");
            String output = module.callAttr("sync", input.toString()).toString();
            JSONObject result = new JSONObject(output);
            DidupSyncVault.updateFromWorker(context, result);
            if (result.optBoolean("retry", false)) return Result.retry();
            if (result.optBoolean("ok", false)) return Result.success();
            return Result.failure();
        } catch (Throwable error) {
            recordLocalError(context, "sync_error", "Sincronizzazione non riuscita. Riproverò quando le condizioni lo consentiranno.");
            return Result.retry();
        }
    }

    private static void recordLocalError(Context context, String code, String message) {
        try {
            JSONObject result = new JSONObject();
            result.put("ok", false);
            result.put("code", code);
            result.put("message", message);
            DidupSyncVault.updateFromWorker(context, result);
        } catch (Exception ignored) {
        }
    }

    static void configurePeriodic(Context context) {
        Context app = context.getApplicationContext();
        if (!DidupSyncVault.isEnabled(app)
                || !DidupSyncVault.hasCredentials(app)
                || !DidupSyncVault.hasSession(app)) {
            WorkManager.getInstance(app).cancelUniqueWork(PERIODIC_NAME);
            return;
        }
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        long interval = Math.max(1, Math.min(24, DidupSyncVault.intervalHours(app)));
        PeriodicWorkRequest request = new PeriodicWorkRequestBuilder<DidupSyncWorker>(interval, TimeUnit.HOURS)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();
        WorkManager.getInstance(app).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
        );
    }

    static void cancelPeriodic(Context context) {
        WorkManager.getInstance(context.getApplicationContext()).cancelUniqueWork(PERIODIC_NAME);
    }

    static boolean enqueueImmediate(Context context) {
        Context app = context.getApplicationContext();
        if (!DidupSyncVault.hasCredentials(app) || !DidupSyncVault.hasSession(app)) return false;
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(DidupSyncWorker.class)
                .setInputData(new Data.Builder().putBoolean("manual", true).build())
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();
        DidupSyncVault.setQueued(app);
        WorkManager.getInstance(app).enqueueUniqueWork(IMMEDIATE_NAME, ExistingWorkPolicy.REPLACE, request);
        return true;
    }

    static void cancelAll(Context context) {
        WorkManager.getInstance(context.getApplicationContext()).cancelUniqueWork(PERIODIC_NAME);
        WorkManager.getInstance(context.getApplicationContext()).cancelUniqueWork(IMMEDIATE_NAME);
    }
}
