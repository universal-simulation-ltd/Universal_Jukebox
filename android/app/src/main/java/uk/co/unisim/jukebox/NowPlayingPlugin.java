package uk.co.unisim.jukebox;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The Android app's lock-screen entry, notification controls and background
 * play (2026-09-27, for the store launch: the Android app had no media session
 * and no foreground service, so the music had no controls anywhere outside the
 * app and nothing kept the process alive with the screen off).
 *
 * ⚠️ SAME NAME AND SHAPE AS THE iOS PLUGIN (`ios/App/App/NowPlayingPlugin.swift`)
 * ON PURPOSE, so `src/lib/nowPlayingNative.ts` drives both unchanged: `show`,
 * `update`, `artist` and `clear`, and the `command` and `audio` events. It
 * always answers `mode: "own"` — there is no WebKit entry to merge with here,
 * because Android's WebView publishes no media session of its own — which is
 * what makes the page listen for `command`.
 *
 * The music itself still plays in the page's `<audio>`. What this adds is
 * {@link MediaPlaybackService}: a foreground service of type mediaPlayback,
 * which is what keeps the process, and with it the WebView, running while the
 * screen is off. Capacitor never pauses the WebView's timers, so a live process
 * is all the page needs.
 */
@CapacitorPlugin(name = "JukeboxNowPlaying")
public class NowPlayingPlugin extends Plugin {

    /** The one loaded instance, so the service can reach the page. */
    private static NowPlayingPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    /** A lock-screen, notification or headset button, for the page's Media Session handlers. */
    static void emitCommand(String action, Double position) {
        NowPlayingPlugin plugin = instance;
        if (plugin == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        if (position != null) data.put("position", position);
        plugin.notifyListeners("command", data);
    }

    /** Something happened to the audio — the page logs it, and acts on `interruption`. */
    static void emitAudio(JSObject data) {
        NowPlayingPlugin plugin = instance;
        if (plugin == null) return;
        plugin.notifyListeners("audio", data);
    }

    @PluginMethod
    public void show(PluginCall call) {
        NowPlaying.State state = NowPlaying.state;
        state.title = call.getString("title", "");
        state.artist = call.getString("artist", "");
        state.album = call.getString("album", "");
        state.elapsed = call.getDouble("elapsed", 0.0);
        state.duration = call.getDouble("duration", 0.0);
        state.playing = call.getDouble("rate", 0.0) > 0;
        state.artwork = decode(call.getString("still"));
        state.version++;

        boolean ok = start();
        JSObject result = new JSObject();
        result.put("animated", false);
        result.put("supportedKeys", new JSArray());
        result.put("mode", ok ? "own" : "unavailable");
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        NowPlaying.State state = NowPlaying.state;
        state.elapsed = call.getDouble("elapsed", state.elapsed);
        state.duration = call.getDouble("duration", state.duration);
        state.playing = call.getDouble("rate", 0.0) > 0;
        MediaPlaybackService service = MediaPlaybackService.running;
        if (service != null) service.refresh(false);
        call.resolve();
    }

    @PluginMethod
    public void artist(PluginCall call) {
        NowPlaying.state.artist = call.getString("artist", "");
        MediaPlaybackService service = MediaPlaybackService.running;
        if (service != null) service.refresh(true);
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        MediaPlaybackService service = MediaPlaybackService.running;
        if (service != null) service.finish();
        call.resolve();
    }

    /**
     * Start the service, or tell the running one about the new track.
     *
     * ⚠️ A foreground service may not be STARTED from the background on Android
     * 12+ (ForegroundServiceStartNotAllowedException). It is started when the
     * music starts, which is in the app, and then stays up — through pauses and
     * track changes — until the queue ends (`clear`) or the app is swiped away.
     * So a track change on a locked phone only updates it.
     */
    private boolean start() {
        MediaPlaybackService service = MediaPlaybackService.running;
        if (service != null) {
            service.refresh(true);
            return true;
        }
        try {
            ContextCompat.startForegroundService(getContext(), new Intent(getContext(), MediaPlaybackService.class));
            return true;
        } catch (RuntimeException e) {
            JSObject data = new JSObject();
            data.put("kind", "service-refused");
            data.put("error", String.valueOf(e.getMessage()));
            emitAudio(data);
            return false;
        }
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
