import Foundation
import AppIntents
import Intents

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

// MARK: - "Hey Siri, play Mika on Jukebox"

/// Play anything by name (James, 2026-10-17, a screenshot of Siri answering
/// "Sorry, Jukebox hasn't added support for that with Siri").
///
/// App Shortcuts can't do this: their phrases take no free text, only values
/// the app lists in advance. Naming an artist, album or song to a music app is
/// SiriKit's media intent, `INPlayMediaIntent`, handled here in the app
/// (`AppDelegate.application(_:handlerFor:)`, iOS 14+) rather than in an
/// extension. Siri hands over what it heard as an `INMediaSearch`; this turns
/// it into the same `search` event Android's assistant sends, and
/// `src/lib/voiceSearch.ts` finds it in the library.
///
/// ⚠️ IT ANSWERS `.continueInApp`, so Siri opens the app — for the same reason
/// every App Shortcut above has `openAppWhenRun`. The library lives in the
/// page, and Siri runs this handler in a background launch with no scene and
/// no web view. The event waits in `ShortcutsBridge` until the page listens.
///
/// ⚠️ THE NATIVE SIDE CAN'T TELL WHETHER THE LIBRARY HAS IT. So the item
/// resolved back to Siri is only what was asked for, and "nothing found" is
/// the page's to show (`app.voice_not_found`).
///
/// Wiring: `INIntentsSupported` + `INSupportedMediaCategories` in Info.plist,
/// `com.apple.developer.siri` in App.entitlements (the App ID's Siri
/// capability, which automatic signing turns on).
final class PlayMediaHandler: NSObject, INPlayMediaIntentHandling {
    func resolveMediaItems(
        for intent: INPlayMediaIntent,
        with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void
    ) {
        let search = intent.mediaSearch
        let item = INMediaItem(
            identifier: "search",
            title: search?.mediaName ?? search?.albumName ?? search?.artistName,
            type: search?.mediaType ?? .music,
            artwork: nil,
            artist: search?.artistName)
        completion([.success(with: item)])
    }

    func handle(intent: INPlayMediaIntent, completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        SiriMedia.receive(intent)
        completion(INPlayMediaIntentResponse(code: .continueInApp, userActivity: nil))
    }
}

enum SiriMedia {
    /// Also called from `SceneDelegate` with the intent the activity carries,
    /// in case Siri opened the app without running the handler in this
    /// process. `ShortcutsBridge` drops the second copy.
    static func receive(_ intent: INPlayMediaIntent) {
        let event = event(for: intent)
        DispatchQueue.main.async {
            if let event = event { ShortcutsBridge.receive("search", event) }
            else { ShortcutsBridge.receive("play") }
        }
    }

    static func receive(_ activity: NSUserActivity) {
        if let intent = activity.interaction?.intent as? INPlayMediaIntent { receive(intent) }
    }

    /// `voiceSearch.ts`'s `VoiceRequest`, plus `shuffle` for "shuffle … on
    /// Jukebox". nil when nothing was named ("play Jukebox").
    static func event(for intent: INPlayMediaIntent) -> [String: Any]? {
        var event: [String: Any] = [:]
        if intent.playShuffled == true { event["shuffle"] = true }
        guard let search = intent.mediaSearch else { return event.isEmpty ? nil : event }
        let name = tidy(search.mediaName)
        switch search.mediaType {
        case .song:
            event["focus"] = "song"
            event["title"] = name
        case .album:
            event["focus"] = "album"
            event["album"] = name ?? tidy(search.albumName)
        case .artist:
            event["focus"] = "artist"
            event["artist"] = name ?? tidy(search.artistName)
        case .genre:
            event["focus"] = "genre"
            event["genre"] = name ?? tidy(search.genreNames?.first)
        default:
            break
        }
        if event["artist"] == nil, let artist = tidy(search.artistName) { event["artist"] = artist }
        if event["album"] == nil, let album = tidy(search.albumName) { event["album"] = album }
        if event["genre"] == nil, let genre = tidy(search.genreNames?.first) { event["genre"] = genre }
        let query = name
            ?? event["title"] as? String ?? event["album"] as? String
            ?? event["artist"] as? String ?? event["genre"] as? String
        if let query = query { event["query"] = query }
        if event["query"] == nil && event["shuffle"] == nil { return nil }
        return event
    }

    private static func tidy(_ text: String?) -> String? {
        let text = text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return text.isEmpty ? nil : text
    }
}
