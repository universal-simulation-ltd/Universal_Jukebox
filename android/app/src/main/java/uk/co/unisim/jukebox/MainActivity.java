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
        super.onCreate(savedInstanceState);
    }
}
