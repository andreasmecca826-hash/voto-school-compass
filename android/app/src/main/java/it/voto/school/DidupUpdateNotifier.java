package it.voto.school;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;

final class DidupUpdateNotifier {
    private static final String CHANNEL_ID = "didup_updates";
    private static final int NOTIFICATION_ID = 4107;

    private DidupUpdateNotifier() {}

    static boolean canPost(Context context) {
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
            return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    static void notifyUpdates(Context context, JSONArray updateCategories) {
        if (!DidupSyncVault.areUpdateNotificationsEnabled(context) || !canPost(context)) return;
        try {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Aggiornamenti DidUP",
                        NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Avvisi locali quando VOTO rileva nuovi dati da DidUP.");
                manager.createNotificationChannel(channel);
            }

            Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent == null) return;
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(
                    context,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(context, CHANNEL_ID)
                    : new Notification.Builder(context);
            builder.setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle("Aggiornamenti DidUP")
                    .setContentText(notificationText(updateCategories))
                    .setVisibility(Notification.VISIBILITY_PRIVATE)
                    .setAutoCancel(true)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(contentIntent);
            if (Build.VERSION.SDK_INT < 26) builder.setPriority(Notification.PRIORITY_DEFAULT);
            manager.notify(NOTIFICATION_ID, builder.build());
        } catch (RuntimeException ignored) {
            // Una notifica non riuscita non deve rendere fallita la sincronizzazione dei dati.
        }
    }

    private static String notificationText(JSONArray updateCategories) {
        List<String> categories = new ArrayList<>();
        if (updateCategories != null) {
            for (int index = 0; index < updateCategories.length(); index++) {
                String category = updateCategories.optString(index, "");
                if (isKnownCategory(category) && !categories.contains(category)) {
                    categories.add(category);
                }
            }
        }
        if (categories.isEmpty()) return "Ci sono nuovi aggiornamenti da DidUP. Apri VOTO per consultarli.";
        if (categories.size() == 1) {
            String category = categories.get(0);
            if ("voti".equals(category)) return "Ci sono nuovi voti. Apri VOTO per consultarli.";
            if ("note".equals(category)) return "Ci sono nuove note. Apri VOTO per consultarle.";
            if ("promemoria".equals(category)) return "Ci sono nuovi promemoria. Apri VOTO per consultarli.";
            if ("assenze".equals(category)) return "Ci sono nuove assenze registrate. Apri VOTO per i dettagli.";
            if ("ritardi".equals(category)) return "Ci sono nuovi ritardi registrati. Apri VOTO per i dettagli.";
            if ("uscite".equals(category)) return "Ci sono nuove uscite anticipate. Apri VOTO per i dettagli.";
            if ("compiti".equals(category)) return "Ci sono nuovi compiti. Apri VOTO per consultarli.";
            if ("circolari".equals(category)) return "Ci sono nuove circolari in bacheca. Apri VOTO per leggerle.";
            if ("comunicazioni".equals(category)) return "Ci sono nuove comunicazioni in bacheca. Apri VOTO per leggerle.";
            return "Ci sono nuovi aggiornamenti nel diario. Apri VOTO per consultarli.";
        }

        StringBuilder sectionNames = new StringBuilder();
        for (int index = 0; index < categories.size(); index++) {
            if (index > 0) sectionNames.append(index == categories.size() - 1 ? " e " : ", ");
            sectionNames.append(categoryLabel(categories.get(index)));
        }
        return "Novità: " + sectionNames + ". Apri VOTO per consultarle.";
    }

    private static boolean isKnownCategory(String category) {
        return "voti".equals(category) || "note".equals(category) || "promemoria".equals(category)
                || "assenze".equals(category) || "ritardi".equals(category) || "uscite".equals(category)
                || "compiti".equals(category) || "circolari".equals(category)
                || "comunicazioni".equals(category) || "diario".equals(category);
    }

    private static String categoryLabel(String category) {
        if ("uscite".equals(category)) return "uscite anticipate";
        if ("circolari".equals(category)) return "circolari in bacheca";
        if ("comunicazioni".equals(category)) return "comunicazioni in bacheca";
        return category;
    }
}
