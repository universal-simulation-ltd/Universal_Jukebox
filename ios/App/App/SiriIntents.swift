import Foundation
import AppIntents

/// Siri (James, 2026-10-05: "could we add compatibility for talking to siri to
/// play music, shuffle songs etc?").
///
/// "Hey Siri, shuffle songs in Jukebox", "… shuffle albums in Jukebox",
/// "… shuffle artists in Jukebox", "… play music in Jukebox". These are App
/// Shortcuts: iOS reads them from the app at install, so they work by voice
/// with no setup and also appear in the Shortcuts app and Spotlight.
///
/// Each intent is a Home Screen shortcut said out loud. It goes through
/// `ShortcutsBridge`, which keeps it until `ShortcutsPlugin` and the page are
/// listening, and `src/lib/shortcuts.ts` does the playing.
///
/// ⚠️ EVERY INTENT OPENS THE APP (`openAppWhenRun`). The player is the web page,
/// and an intent run in the background on a cold launch has no scene and so no
/// web view to hand the action to: it would answer "Done" and play nothing.
///
/// ⚠️ PAUSE, NEXT, BACK AND "PLAY" WHILE SOMETHING IS PAUSED ARE NOT HERE.
/// Siri sends those to whichever app holds Now Playing, through the remote
/// commands `NowPlayingPlugin` already registers. A second, app-named copy
/// here would only bring the app to the front for a pause.
///
/// ⚠️ "JUKEBOX" ALONE WORKS BECAUSE OF `INAlternativeAppNames` in Info.plist.
/// `.applicationName` is otherwise only the display name, "Universal Jukebox".
///
/// iOS 16+. The app still supports 15, so AppIntents is weak-linked
/// (`-weak_framework AppIntents` in the target's OTHER_LDFLAGS). Without that,
/// an iOS 15 phone would fail to launch the app at all.

@available(iOS 16.0, *)
struct ShuffleSongsIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle songs"
    static var description = IntentDescription("Plays every song in your library in a random order.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutsBridge.receive("shuffle-songs")
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShuffleAlbumsIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle albums"
    static var description = IntentDescription("Plays whole albums, one after another, in a random order.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutsBridge.receive("shuffle-albums")
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShuffleArtistsIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle artists"
    static var description = IntentDescription("Plays your library artist by artist, in a random order.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutsBridge.receive("shuffle-artists")
        return .result()
    }
}

/// Carries on where you left off, or shuffles songs if there is nothing to
/// carry on with. `runShortcut('play')` decides which.
@available(iOS 16.0, *)
struct PlayMusicIntent: AppIntent {
    static var title: LocalizedStringResource = "Play music"
    static var description = IntentDescription("Carries on from where you left off, or shuffles your songs if there is nothing to carry on with.")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        ShortcutsBridge.receive("play")
        return .result()
    }
}

/// ⚠️ Every phrase must contain `.applicationName` exactly once, or the build's
/// App Intents metadata step rejects it. iOS caps an app at ten App Shortcuts.
@available(iOS 16.0, *)
struct JukeboxAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShuffleSongsIntent(),
            phrases: [
                "Shuffle songs in \(.applicationName)",
                "Shuffle my songs in \(.applicationName)",
                "Shuffle my music in \(.applicationName)",
                "Shuffle \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: ShuffleAlbumsIntent(),
            phrases: [
                "Shuffle albums in \(.applicationName)",
                "Shuffle my albums in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: ShuffleArtistsIntent(),
            phrases: [
                "Shuffle artists in \(.applicationName)",
                "Shuffle my artists in \(.applicationName)",
            ]
        )
        AppShortcut(
            intent: PlayMusicIntent(),
            phrases: [
                "Play music in \(.applicationName)",
                "Play my music in \(.applicationName)",
                "Play \(.applicationName)",
                "Start \(.applicationName)",
            ]
        )
    }
}
