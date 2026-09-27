package uk.co.unisim.jukebox;

import android.graphics.Bitmap;

/** What is playing, shared between {@link NowPlayingPlugin} and {@link MediaPlaybackService}. */
final class NowPlaying {

    static final class State {
        String title = "";
        String artist = "";
        String album = "";
        Bitmap artwork;
        double elapsed;
        double duration;
        boolean playing;
        /** Bumped by every `show`, so the service can tell a new track from a tick. */
        int version;
    }

    static final State state = new State();

    private NowPlaying() {}
}
