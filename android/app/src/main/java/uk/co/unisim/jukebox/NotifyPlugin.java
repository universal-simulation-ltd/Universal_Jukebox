package uk.co.unisim.jukebox;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * A notification each time a new song starts — one, replaced every time, never
 * a stack (James, 2026-09-13: "replace each notification and don't stack
 * them"). The page decides when; this only shows it. See
 * src/lib/trackNotify.ts, and NotifyPlugin.swift for the iPhone's half.
 *
 * ⚠️ ONE FIXED ID is what stops the stack: notify() under an id already showing
 * replaces that notification, and — without setOnlyAlertOnce — alerts again.
 *
 * ⚠️ ITS OWN CHANNEL, high importance with the sound and vibration taken off.
 * High is what makes each song's card drop down over whatever is on screen;
 * the silence is because it arrives while music is playing. A channel's
 * settings are the user's once it exists, so this only ever creates it.
 */
@CapacitorPlugin(
    name = "JukeboxNotify",
    permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class NotifyPlugin extends Plugin {

    private static final String CHANNEL = "now_playing";
    private static final int CARD = 1;

    @PluginMethod
    public void permission(PluginCall call) {
        answer(call);
    }

    @PluginMethod
    public void request(PluginCall call) {
        // Android 13 made posting a notification a runtime permission; before
        // it, there is nothing to ask — only whether the user switched them off.
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "permissionAnswered");
            return;
        }
        answer(call);
    }

    @PermissionCallback
    private void permissionAnswered(PluginCall call) {
        answer(call);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void show(PluginCall call) {
        Context context = getContext();
        if (!"granted".equals(state())) {
            call.reject("Notifications are not allowed.", "NOT_ALLOWED");
            return;
        }
        ensureChannel(context);
        NotificationCompat.Builder card = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_jukebox)
            .setContentTitle(call.getString("title", ""))
            .setContentText(call.getString("body", ""))
            // Before Android 8 there are no channels; this is the same wish.
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setContentIntent(openTheApp(context));
        Bitmap cover = decode(call.getString("image"));
        if (cover != null) card.setLargeIcon(cover);
        try {
            NotificationManagerCompat.from(context).notify(CARD, card.build());
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Notifications are not allowed.", "NOT_ALLOWED");
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(CARD);
        call.resolve();
    }

    private void answer(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", state());
        call.resolve(result);
    }

    /**
     * granted, denied or prompt — the same three words the iPhone and the web
     * answer with.
     *
     * ⚠️ "Notifications off" in the system's app settings is DENIED even with
     * the runtime permission held: the permission says the app may post, that
     * switch says nothing it posts is shown.
     */
    private String state() {
        boolean enabled = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        if (Build.VERSION.SDK_INT >= 33) {
            PermissionState held = getPermissionState("notifications");
            if (held == PermissionState.GRANTED) return enabled ? "granted" : "denied";
            if (held == PermissionState.DENIED) return "denied";
            return "prompt";
        }
        return enabled ? "granted" : "denied";
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager system = context.getSystemService(NotificationManager.class);
        if (system == null || system.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Now playing", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("A notification as each new song starts.");
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
        system.createNotificationChannel(channel);
    }

    /** The running player, brought forward — MainActivity is singleTask. */
    private static PendingIntent openTheApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Bitmap decode(String base64) {
        if (base64 == null || base64.isEmpty()) return null;
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
