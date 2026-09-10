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
        super.onCreate(savedInstanceState);
    }
}
