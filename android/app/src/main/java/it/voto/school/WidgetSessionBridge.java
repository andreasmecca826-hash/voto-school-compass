package it.voto.school;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

public final class WidgetSessionBridge {
    private WidgetSessionBridge() {}

    public static JSONObject getSession(Context context) throws JSONException {
        return DidupSyncVault.getSupabaseSession(context);
    }

    public static void saveSession(Context context, String accessToken, String refreshToken,
                                   long expiresAt) throws Exception {
        DidupSyncVault.saveSession(context, accessToken, refreshToken, expiresAt);
    }
}
