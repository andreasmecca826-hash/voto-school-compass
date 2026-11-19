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
    private static final String ATTACHMENT_BATCH_NAME = "voto-didup-attachment-batches";

    public DidupSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        boolean manual = getInputData().getBoolean("manual", false);
        if (!manual && !DidupSyncVault.isEnabled(context)) return Result.success();
        // La pausa vale solo per i job periodici; il comando manuale resta disponibile.
        if (!manual && DidupSyncVault.isQuietHoursNow(context)) return Result.success();
        if (!DidupSyncVault.hasCredentials(context)) {
            recordLocalError(context, "credentials_required", "Inserisci le credenziali DidUP per attivare la sincronizzazione.");
            return manual ? Result.failure() : Result.success();
        }
        if (!DidupSyncVault.hasSession(context)) {
            recordLocalError(context, "session_required", "Apri VOTO e accedi per autorizzare la sincronizzazione sicura.");
            return manual ? Result.failure() : Result.success();
        }

        try {
            JSONObject input = DidupSyncVault.buildInput(context);
            if (!Python.isStarted()) Python.start(new AndroidPlatform(context));
            PyObject module = Python.getInstance().getModule("didup_sync");
            String output = module.callAttr("sync", input.toString()).toString();
            JSONObject result = new JSONObject(output);
            DidupSyncVault.updateFromWorker(context, result);
            if (result.optBoolean("updatesFound", false)) {
                DidupUpdateNotifier.notifyUpdates(context);
            }
            if (result.optBoolean("retry", false)) return Result.retry();
            if ("attachment_pending".equals(result.optString("code"))) {
                enqueueAttachmentContinuation(context);
                return Result.success();
            }
            if (result.optBoolean("ok", false)) return Result.success();
            // Result.failure() termina definitivamente un PeriodicWorkRequest.
            // Conserva lo stato di errore nel vault, ma lascia attivo il ciclo automatico.
            return manual ? Result.failure() : Result.success();
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
        long interval = Math.max(15, Math.min(1440, DidupSyncVault.intervalMinutes(app)));
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                DidupSyncWorker.class, interval, TimeUnit.MINUTES
        )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();
        WorkManager.getInstance(app).enqueueUniquePeriodicWork(
                PERIODIC_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
        );
    }

    private static void enqueueAttachmentContinuation(Context context) {
        Context app = context.getApplicationContext();
        if (!DidupSyncVault.isEnabled(app) || DidupSyncVault.isQuietHoursNow(app)) return;
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(DidupSyncWorker.class)
                .setConstraints(constraints)
                .setInitialDelay(30, TimeUnit.SECONDS)
                .build();
        WorkManager.getInstance(app).enqueueUniqueWork(
                ATTACHMENT_BATCH_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                request
        );
    }

    static void cancelAttachmentContinuations(Context context) {
        WorkManager.getInstance(context.getApplicationContext())
                .cancelUniqueWork(ATTACHMENT_BATCH_NAME);
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
        cancelAttachmentContinuations(context);
    }
}
