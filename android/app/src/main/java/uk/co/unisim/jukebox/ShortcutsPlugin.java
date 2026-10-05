package uk.co.unisim.jukebox;

import android.app.SearchManager;
import android.content.Intent;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The Android half of the shortcuts and the voice assistant (James, 2026-10-05:
 * "is there an android equiv?" of the iPhone's Siri shortcuts).
 *
 * Two ways in, both handed to the page as the {@code shortcut} event:
 * <ul>
 *   <li>The launcher shortcuts — long-press the icon for Shuffle songs, Shuffle
 *   albums or Shuffle artists ({@code res/xml/shortcuts.xml}), as on the iPhone.</li>
 *   <li>"Hey Google, play Radiohead on Jukebox": the assistant sends
 *   {@code MEDIA_PLAY_FROM_SEARCH} to the activity (the intent filter in the
 *   manifest) or, while the app is running, {@code onPlayFromSearch} to the
 *   media session ({@link MediaPlaybackService}). Either becomes
 *   {@code {action: "search", query, focus, artist, album, title, genre}}, and
 *   {@code src/lib/voiceSearch.ts} finds it in the library.</li>
 * </ul>
 *
 * ⚠️ SAME NAME AND EVENT AS THE iOS PLUGIN ({@code ios/App/App/ShortcutsPlugin.swift})
 * ON PURPOSE, so {@code src/lib/shortcuts.ts} drives both unchanged.
 *
 * ⚠️ A COLD LAUNCH ARRIVES BEFORE THE PAGE IS LISTENING, so every event is sent
 * with {@code retainUntilConsumed}, which holds it until the page adds its
 * listener — as on iOS. And Android re-delivers the launching intent when the
 * app is reopened from Recents, so that case is ignored, or a recents tap would
 * shuffle all over again.
 */
@CapacitorPlugin(name = "JukeboxShortcuts")
public class ShortcutsPlugin extends Plugin {

    static final String ACTION_PREFIX = "uk.co.unisim.jukebox.SHORTCUT.";

    /** The one loaded instance, so the media session can reach the page. */
    private static ShortcutsPlugin instance;

    @Override
    public void load() {
        instance = this;
        handle(getActivity().getIntent());
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handle(intent);
    }

    /** The media session's play-from-search, while the app is running. */
    static void search(String query, Bundle extras) {
        ShortcutsPlugin plugin = instance;
        if (plugin == null) return;
        plugin.emit(searchEvent(query, extras));
    }

    private void handle(Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        String action = intent.getAction();
        JSObject data = null;
        if (MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH.equals(action)) {
            data = searchEvent(intent.getStringExtra(SearchManager.QUERY), intent.getExtras());
        } else if (action.startsWith(ACTION_PREFIX)) {
            // ….SHORTCUT.SHUFFLE_SONGS → shuffle-songs, the iOS names.
            data = new JSObject();
            data.put("action", action.substring(ACTION_PREFIX.length()).toLowerCase().replace('_', '-'));
        }
        if (data == null) return;
        // Handled once: an activity re-created later must not replay it.
        intent.setAction(Intent.ACTION_MAIN);
        emit(data);
    }

    private void emit(JSObject data) {
        Log.i("Jukebox", "shortcut: " + data);
        getActivity().runOnUiThread(() -> notifyListeners("shortcut", data, true));
    }

    private static JSObject searchEvent(String query, Bundle extras) {
        JSObject data = new JSObject();
        data.put("action", "search");
        data.put("query", query == null ? "" : query);
        if (extras == null) return data;
        String focus = focusOf(extras.getString(MediaStore.EXTRA_MEDIA_FOCUS));
        if (focus != null) data.put("focus", focus);
        put(data, "artist", extras.getString(MediaStore.EXTRA_MEDIA_ARTIST));
        put(data, "album", extras.getString(MediaStore.EXTRA_MEDIA_ALBUM));
        put(data, "title", extras.getString(MediaStore.EXTRA_MEDIA_TITLE));
        put(data, "genre", extras.getString(MediaStore.EXTRA_MEDIA_GENRE));
        return data;
    }

    private static void put(JSObject data, String key, String value) {
        if (value != null && !value.isEmpty()) data.put(key, value);
    }

    /** The content type the assistant names, as `voiceSearch.ts`'s focus. */
    private static String focusOf(String type) {
        if (type == null) return null;
        if (type.equals(MediaStore.Audio.Artists.ENTRY_CONTENT_TYPE)) return "artist";
        if (type.equals(MediaStore.Audio.Albums.ENTRY_CONTENT_TYPE)) return "album";
        if (type.equals(MediaStore.Audio.Media.ENTRY_CONTENT_TYPE)) return "song";
        if (type.equals(MediaStore.Audio.Genres.ENTRY_CONTENT_TYPE)) return "genre";
        return "any";
    }
}
