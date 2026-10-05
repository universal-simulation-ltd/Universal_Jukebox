package uk.co.unisim.jukebox;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ⚠️ Before super.onCreate: the bridge is built there, and a plugin
        // registered afterwards does not exist to the web layer. See
        // MusicFolderPlugin for why this is how Android gets its music.
        registerPlugin(MusicFolderPlugin.class);
        // A notification for each new song — see NotifyPlugin.
        registerPlugin(NotifyPlugin.class);
        // "Keep awake" on Now Playing — see KeepAwakePlugin.
        registerPlugin(KeepAwakePlugin.class);
        // Background play, lock-screen and notification controls, audio
        // focus — see NowPlayingPlugin and MediaPlaybackService.
        registerPlugin(NowPlayingPlugin.class);
        // Launcher shortcuts and "Hey Google, play … on Jukebox" — see
        // ShortcutsPlugin.
        registerPlugin(ShortcutsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
