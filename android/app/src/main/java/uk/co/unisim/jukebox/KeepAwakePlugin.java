package uk.co.unisim.jukebox;

import android.app.Activity;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * "Keep awake" on Now Playing: the screen neither dims nor locks while it is
 * on, so the lyrics can be read along to. See src/lib/keepAwake.ts, which turns
 * it on for that page and off again on leaving it, and KeepAwakePlugin.swift
 * for the iPhone's half.
 *
 * ⚠️ THE WINDOW FLAG, NOT A WAKE LOCK: it needs no permission and only applies
 * while this window is showing, so nothing is left holding the screen on once
 * the app goes to the background.
 */
@CapacitorPlugin(name = "JukeboxKeepAwake")
public class KeepAwakePlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            if (on) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
}
