package uk.co.unisim.jukebox;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import com.getcapacitor.JSObject;

/**
 * Keeps the music going with the screen off, and gives it controls outside the
 * app: the lock screen, the notification shade, Bluetooth and headset buttons.
 * Driven by {@link NowPlayingPlugin}; see there for why it exists.
 *
 * ⚠️ IT PLAYS NOTHING. The sound is the page's `<audio>`, in the WebView. This
 * is a foreground service of type mediaPlayback so Android keeps the process
 * alive, plus a MediaSession for the controls. Every button is handed to the
 * page as a `command`, exactly like the iPhone's lock screen, and the page's
 * own Media Session handlers decide what it means.
 *
 * ⚠️ IT NEVER ASKS FOR AUDIO FOCUS, and must not. The WebView already holds
 * focus for the page's `<audio>` and pauses it when focus is lost — calls and
 * other music apps are handled there. The first build of this service asked
 * for focus itself, and the WebView, losing it to us, paused every song 2ms
 * after it started (seen on the Nothing Phone, 2026-09-27). What it does add
 * is headphones pulled out (becoming noisy): `pause`, as on iOS.
 */
public class MediaPlaybackService extends Service {

    /** The running service, or null. Read on the main thread only. */
    static MediaPlaybackService running;

    private static final String CHANNEL = "playback";
    private static final int NOTIFICATION = 2;
    private static final String ACTION_PREVIOUS = "uk.co.unisim.jukebox.PREVIOUS";
    private static final String ACTION_TOGGLE = "uk.co.unisim.jukebox.TOGGLE";
    private static final String ACTION_NEXT = "uk.co.unisim.jukebox.NEXT";

    private MediaSessionCompat session;
    private boolean inForeground;
    private int shownVersion = -1;

    private final BroadcastReceiver noisy = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) return;
            audioEvent("route", "device out");
            NowPlayingPlugin.emitCommand("pause", null);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        running = this;
        makeChannel();

        session = new MediaSessionCompat(this, "UniversalJukebox");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { NowPlayingPlugin.emitCommand("play", null); }
            @Override public void onPause() { NowPlayingPlugin.emitCommand("pause", null); }
            @Override public void onSkipToNext() { NowPlayingPlugin.emitCommand("nexttrack", null); }
            @Override public void onSkipToPrevious() { NowPlayingPlugin.emitCommand("previoustrack", null); }
            @Override public void onSeekTo(long pos) { NowPlayingPlugin.emitCommand("seekto", pos / 1000.0); }
            @Override public void onStop() { NowPlayingPlugin.emitCommand("pause", null); }
        });
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) {
            session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE));
        }
        session.setActive(true);

        ContextCompat.registerReceiver(this, noisy, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
            ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // ⚠️ startForeground FIRST, whatever the intent: a service started with
        // startForegroundService that has not called it within a few seconds
        // is killed and the app with it.
        refresh(true);
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PREVIOUS.equals(action)) NowPlayingPlugin.emitCommand("previoustrack", null);
        else if (ACTION_NEXT.equals(action)) NowPlayingPlugin.emitCommand("nexttrack", null);
        else if (ACTION_TOGGLE.equals(action)) NowPlayingPlugin.emitCommand(NowPlaying.state.playing ? "pause" : "play", null);
        return START_NOT_STICKY;
    }

    /** Put the state on the session and the notification. `track` also re-sends the metadata. */
    void refresh(boolean track) {
        NowPlaying.State state = NowPlaying.state;
        if (track || state.version != shownVersion) {
            shownVersion = state.version;
            MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, state.title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, state.artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, state.album)
                .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (long) (state.duration * 1000));
            if (state.artwork != null) meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, state.artwork);
            session.setMetadata(meta.build());
        }
        session.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS | PlaybackStateCompat.ACTION_SEEK_TO
                | PlaybackStateCompat.ACTION_STOP)
            .setState(state.playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                (long) (state.elapsed * 1000), state.playing ? 1f : 0f)
            .build());

        Notification notification = buildNotification(state);
        if (!inForeground) {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
            ServiceCompat.startForeground(this, NOTIFICATION, notification, type);
            inForeground = true;
        } else {
            NotificationManager system = getSystemService(NotificationManager.class);
            if (system != null) system.notify(NOTIFICATION, notification);
        }
    }

    /** The queue is over: take the notification down and stop. */
    void finish() {
        stopSelf();
    }

    private Notification buildNotification(NowPlaying.State state) {
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_jukebox)
            .setContentTitle(state.title)
            .setContentText(state.artist)
            .setSubText(state.album)
            .setLargeIcon(state.artwork)
            .setContentIntent(session.getController().getSessionActivity())
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(state.playing)
            .addAction(android.R.drawable.ic_media_previous, "Previous", pending(ACTION_PREVIOUS, 1))
            .addAction(state.playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                state.playing ? "Pause" : "Play", pending(ACTION_TOGGLE, 2))
            .addAction(android.R.drawable.ic_media_next, "Next", pending(ACTION_NEXT, 3))
            .setStyle(new MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2))
            .build();
    }

    private PendingIntent pending(String action, int code) {
        Intent intent = new Intent(this, MediaPlaybackService.class).setAction(action);
        return PendingIntent.getService(this, code, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void audioEvent(String kind, String reason) {
        JSObject data = new JSObject();
        data.put("kind", kind);
        data.put("reason", reason);
        NowPlayingPlugin.emitAudio(data);
    }

    private void makeChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager system = getSystemService(NotificationManager.class);
        if (system == null || system.getNotificationChannel(CHANNEL) != null) return;
        // LOW: it sits in the shade with the controls and never makes a sound
        // or drops down over the screen — the per-song card is NotifyPlugin's.
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Playback controls", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("The song that is playing, with play, pause and skip.");
        channel.setShowBadge(false);
        system.createNotificationChannel(channel);
    }

    /** Swiped out of recents: the page is gone, so the controls go too. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
    }

    @Override
    public void onDestroy() {
        running = null;
        try { unregisterReceiver(noisy); } catch (IllegalArgumentException ignored) { /* never registered */ }
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
