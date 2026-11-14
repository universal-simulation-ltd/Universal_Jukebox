import Foundation
import UIKit
import AppIntents
import Intents
import JavaScriptCore

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
/// ⚠️ ON A LOCKED PHONE (iOS 17+) THEY NO LONGER OPEN THE APP (James,
/// 2026-11-03: "allow Siri so that the user doesn't have to unlock for every
/// operation even if they're playing in the app already"). They used to: the
/// player is the web page, and a locked phone's page is not running (its
/// JavaScript stops within a second of the lock), so an intent had nothing to
/// hand the action to but an app it opened — and opening an app means
/// unlocking. Now, with the app not on screen, `SiriPlayer` below plays it
/// itself: the page wrote the library down while it was awake
/// (`siriManifest` in `playerStore`), the page's own rules decide what to play
/// (`src/siri/planner.ts`, run by JavaScriptCore), and the native engine plays
/// it. The page takes the queue over when it next wakes (`adoptNativeQueue`).
///   - `AudioPlaybackIntent` (iOS 17) is what lets an intent that does not
///     open the app start the music — see `SiriShortcut.perform`.
///   - `authenticationPolicy: .alwaysAllowed`: playing music needs no unlock.
///   - It still asks to open the app (`requestToContinueInForeground`) when it
///     cannot play alone: no library written down yet, or only the example's
///     songs (which are made in the page).
///   - With the app ON screen, nothing changed: the page plays it, with its
///     animations, through `ShortcutsBridge`.
///   - iOS 16.4–16.x asks to open the app, as before, unless the engine is
///     already playing.
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
    static var openAppWhenRun: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    @MainActor
    func perform() async throws -> some IntentResult {
        try await SiriShortcut.perform("shuffle-songs", for: self)
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShuffleAlbumsIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle albums"
    static var description = IntentDescription("Plays whole albums, one after another, in a random order.")
    static var openAppWhenRun: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    @MainActor
    func perform() async throws -> some IntentResult {
        try await SiriShortcut.perform("shuffle-albums", for: self)
        return .result()
    }
}

@available(iOS 16.0, *)
struct ShuffleArtistsIntent: AppIntent {
    static var title: LocalizedStringResource = "Shuffle artists"
    static var description = IntentDescription("Plays your library artist by artist, in a random order.")
    static var openAppWhenRun: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    @MainActor
    func perform() async throws -> some IntentResult {
        try await SiriShortcut.perform("shuffle-artists", for: self)
        return .result()
    }
}

/// Carries on where you left off, or shuffles songs if there is nothing to
/// carry on with. `runShortcut('play')` decides which — and on a locked phone,
/// the same rule in `src/siri/planner.ts`.
@available(iOS 16.0, *)
struct PlayMusicIntent: AppIntent {
    static var title: LocalizedStringResource = "Play music"
    static var description = IntentDescription("Carries on from where you left off, or shuffles your songs if there is nothing to carry on with.")
    static var openAppWhenRun: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy { .alwaysAllowed }

    @MainActor
    func perform() async throws -> some IntentResult {
        try await SiriShortcut.perform("play", for: self)
        return .result()
    }
}

// Playing without opening the app (17+), and asking to open it when that can't work (16.4+).
@available(iOS 17.0, *)
extension ShuffleSongsIntent: AudioPlaybackIntent {}
@available(iOS 17.0, *)
extension ShuffleAlbumsIntent: AudioPlaybackIntent {}
@available(iOS 17.0, *)
extension ShuffleArtistsIntent: AudioPlaybackIntent {}
@available(iOS 17.0, *)
extension PlayMusicIntent: AudioPlaybackIntent {}
@available(iOS 16.4, *)
extension ShuffleSongsIntent: ForegroundContinuableIntent {}
@available(iOS 16.4, *)
extension ShuffleAlbumsIntent: ForegroundContinuableIntent {}
@available(iOS 16.4, *)
extension ShuffleArtistsIntent: ForegroundContinuableIntent {}
@available(iOS 16.4, *)
extension PlayMusicIntent: ForegroundContinuableIntent {}

@available(iOS 16.0, *)
enum SiriShortcut {
    /// ⚠️ `openAppWhenRun` IS A LITERAL `false`, not a computed "false from
    /// iOS 17": the build reads it into the App Intents metadata, so the app's
    /// coming to the front is decided here, at run time, instead.
    ///
    ///   - The app on screen: the page plays it, as it always has.
    ///   - Otherwise the engine plays it alone (`SiriPlayer`) — on iOS 17+,
    ///     where `AudioPlaybackIntent` gives a background intent leave to start
    ///     the music, or on any version while the engine is already playing
    ///     (its audio session is live, so a new song needs no new leave).
    ///   - When that can't be done, iOS 16.4+ is asked to bring the app up
    ///     (`requestToContinueInForeground` — the unlock, as before), and the
    ///     page plays it.
    ///   - Before 16.4 there is no way to ask: the page is handed it, and plays
    ///     it once the app is next opened.
    @MainActor
    static func perform<I: AppIntent>(_ action: String, for intent: I) async throws {
        if UIApplication.shared.applicationState == .active {
            ShortcutsBridge.receive(action)
            return
        }
        var alone = JukeboxEngine.shared.playingNow
        if #available(iOS 17.0, *) { alone = true }
        if alone, SiriPlayer.run(action: action) == .played { return }
        if #available(iOS 16.4, *), let continuable = intent as? any ForegroundContinuableIntent {
            try await continuable.requestToContinueInForeground()
        }
        ShortcutsBridge.receive(action)
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
/// ⚠️ WITH THE APP NOT ON SCREEN THE ENGINE PLAYS IT FROM `handle` ITSELF
/// (2026-11-14; `.handleInApp` before, which never played) with no unlock —
/// see `handle` and `SiriPlayer`. It used
/// to answer `.continueInApp` every time, so Siri opened the app: the library
/// lives in the page, and Siri runs this handler in a background launch with
/// no scene and no web view. That is still the answer with the app on screen,
/// or before the page has ever written the library down; the event then waits
/// in `ShortcutsBridge` until the page listens.
///
/// ⚠️ THE ITEM RESOLVED BACK TO SIRI IS ONLY WHAT WAS ASKED FOR. Whether the
/// library has it is the planner's to say once it runs (`SiriPlayer`), or the
/// page's (`app.voice_not_found`) with the app open.
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
        CommandLog.note("siri: resolve type=\(search?.mediaType.rawValue ?? -1) name=\(search?.mediaName ?? "-") artist=\(search?.artistName ?? "-") album=\(search?.albumName ?? "-")")
        let item = INMediaItem(
            identifier: "search",
            title: search?.mediaName ?? search?.albumName ?? search?.artistName,
            type: search?.mediaType ?? .music,
            artwork: nil,
            artist: search?.artistName)
        completion([.success(with: item)])
    }

    /// ⚠️ WITH THE APP NOT ON SCREEN IT PLAYS RIGHT HERE (2026-11-14), and
    /// answers `.success` / `.failure`. This handler runs in the app's own
    /// process (`application(_:handlerFor:)`), woken in the background with
    /// leave to play, so `SiriMedia.playLocked` can start the engine alone —
    /// no unlock, exactly as the App Intents' "shuffle songs" does.
    ///
    /// ⚠️ NOT `.handleInApp`. That answer is for an Intents EXTENSION: it asks
    /// iOS to wake the app and call `application(_:handle:completionHandler:)`,
    /// which Apple deprecated in iOS 14 and no longer calls. The 2026-11-03
    /// version answered it, nothing ever played, and Siri said "We've had a
    /// problem" (James, 2026-11-14, iPhone JPM: handled in the app's log, then
    /// silence). `.failureRequiringAppLaunch` when it can't be done from here
    /// (only the example library, or the planner can't open the songs): Siri
    /// offers to open the app. On screen: `.continueInApp`, the page plays it.
    func handle(intent: INPlayMediaIntent, completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        DispatchQueue.main.async {
            CommandLog.note("siri: handle state=\(UIApplication.shared.applicationState.rawValue) library=\(SiriLibrary.exists)")
            if UIApplication.shared.applicationState != .active && SiriLibrary.exists {
                let code: INPlayMediaIntentResponseCode
                switch SiriMedia.playLocked(intent) {
                case .played: code = .success
                case .notFound: code = .failure
                case .cannot: code = .failureRequiringAppLaunch
                }
                CommandLog.note("siri: answered \(code.rawValue)")
                completion(INPlayMediaIntentResponse(code: code, userActivity: nil))
                return
            }
            SiriMedia.receive(intent)
            completion(INPlayMediaIntentResponse(code: .continueInApp, userActivity: nil))
        }
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

    /// The app is not on screen: play it with the engine alone (`SiriPlayer`).
    /// Main thread.
    static func playLocked(_ intent: INPlayMediaIntent) -> SiriOutcome {
        if let event = event(for: intent) { return SiriPlayer.run(action: "search", request: event) }
        return SiriPlayer.run(action: "play")
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

// MARK: - Playing with the page away

/// What became of a request played without the page.
enum SiriOutcome {
    /// Playing (or already was).
    case played
    /// Nothing in the library answers to it.
    case notFound
    /// Can't be done from here — open the app and let the page do it.
    case cannot
}

/// The library as the page last wrote it down (`siriManifest` in
/// `playerStore`, sent by `JukeboxEnginePlugin.setLibrary`), and where "Resume
/// listening" would pick up (`setResume`).
///
/// ⚠️ IN APPLICATION SUPPORT, NOT CACHES: iOS may empty Caches whenever it
/// likes, and a phone that did would have Siri asking to unlock again for no
/// reason anybody could see. The file can be made again, though, so it is kept
/// out of the backup.
enum SiriLibrary {
    private static var fileURL: URL? {
        guard let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        return dir.appendingPathComponent("jukebox-siri", isDirectory: true).appendingPathComponent("library.json")
    }

    static var exists: Bool {
        guard let url = fileURL else { return false }
        return FileManager.default.fileExists(atPath: url.path)
    }

    /// Any thread.
    static func write(_ json: String) {
        guard var url = fileURL else { return }
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data(json.utf8).write(to: url, options: .atomic)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? url.setResourceValues(values)
        } catch {
            CommandLog.note("siri: could not write the library \(error.localizedDescription)")
        }
    }

    static func read() -> String? {
        guard let url = fileURL, let data = try? Data(contentsOf: url) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static let resumeKey = "uk.co.unisim.jukebox.siriResume"

    static func remember(ids: [String]?, trackId: String, sec: Double) {
        var saved = UserDefaults.standard.dictionary(forKey: resumeKey) ?? [:]
        if let ids = ids { saved["ids"] = ids }
        saved["trackId"] = trackId
        saved["sec"] = sec
        UserDefaults.standard.set(saved, forKey: resumeKey)
    }

    /// `{ ids, trackId, sec }` — `SavedPlace` in `lib/voicePlan.ts` — or nil.
    static func resume() -> [String: Any]? {
        guard let saved = UserDefaults.standard.dictionary(forKey: resumeKey),
              saved["ids"] is [String], saved["trackId"] is String else { return nil }
        return saved
    }
}

/// The page's own rules for what to play, run by JavaScriptCore:
/// `src/siri/planner.ts`, bundled by `scripts/build-planner.mjs` into the web
/// build (`public/siri-planner.js`), which `npx cap sync` copies into the app.
///
/// ⚠️ NOT A SWIFT COPY OF THEM. "Play Mika" has to find what the page would
/// find, and "shuffle albums" has to shuffle as the page does; two copies of
/// `voiceSearch.ts` would drift with nothing failing. JavaScriptCore runs
/// with the screen off — it is not the web view, which is what stops.
enum SiriPlanner {
    /// Main thread. nil if the bundle is missing or threw.
    static func plan(_ input: [String: Any]) -> [String: Any]? {
        guard let url = Bundle.main.url(forResource: "siri-planner", withExtension: "js", subdirectory: "public")
            ?? Bundle.main.url(forResource: "siri-planner", withExtension: "js"),
              let code = try? String(contentsOf: url, encoding: .utf8),
              let context = JSContext() else {
            CommandLog.note("siri: no planner in the bundle")
            return nil
        }
        context.exceptionHandler = { _, exception in
            CommandLog.note("siri: planner threw \(exception?.toString() ?? "?")")
        }
        context.evaluateScript(code)
        guard let planJSON = context.objectForKeyedSubscript("JukeboxPlanner")?.objectForKeyedSubscript("planJSON"),
              let data = try? JSONSerialization.data(withJSONObject: input),
              let text = String(data: data, encoding: .utf8),
              let answer = planJSON.call(withArguments: [text])?.toString(),
              let result = (try? JSONSerialization.jsonObject(with: Data(answer.utf8))) as? [String: Any] else {
            return nil
        }
        return result
    }
}

/// "Shuffle songs", "play music", "play Mika" — with the page away.
enum SiriPlayer {
    /// Main thread.
    static func run(action: String, request: [String: Any]? = nil) -> SiriOutcome {
        guard let text = SiriLibrary.read(),
              let manifest = (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any] else {
            return .cannot
        }
        let engine = JukeboxEngine.shared
        var input: [String: Any] = [
            "action": action,
            "seed": Int.random(in: 0..<0x7fffffff),
            "hasSong": engine.hasSong,
            "playing": engine.playingNow,
            "manifest": text,
        ]
        if let request = request { input["request"] = request }
        if let session = SiriLibrary.resume() { input["session"] = session }
        guard let answer = SiriPlanner.plan(input), let what = answer["do"] as? String else { return .cannot }
        CommandLog.note("siri: \(action) → \(what)")
        switch what {
        case "nothing":
            return .played
        case "resume":
            engine.enable()
            engine.play()
            return .played
        case "none":
            return .notFound
        case "queue":
            guard let ids = answer["ids"] as? [String] else { return .cannot }
            // The songs may be in a folder the person chose, and with no page
            // this launch nothing else has taken access to it.
            MusicFolderPlugin.takeAccessForSiri()
            let (entries, at) = SiriQueue.entries(ids: ids, at: Int(num(answer["at"]) ?? 0), manifest: manifest)
            guard !entries.isEmpty else { return .cannot }
            let started = engine.startNative(entries, at: at, startAt: num(answer["startSec"]) ?? 0,
                                             shuffle: answer["shuffle"] as? Bool ?? false, settings: manifest)
            return started ? .played : .cannot
        default:
            // `empty` (nothing the engine can open) and `error`.
            return .cannot
        }
    }
}

/// Engine entries for a queue the planner chose — what `engineEntry` in
/// `playerStore` makes, from the manifest's songs. Each song's change-over is
/// from the one before it in the queue, by the kind of change
/// (`changeBetween` in `lib/transition.ts`); the first's is from nothing,
/// which `changeBetween` calls a change of artist.
enum SiriQueue {
    static func entries(ids: [String], at: Int, manifest: [String: Any]) -> ([JukeboxEngine.Entry], Int) {
        var songs: [String: [String: Any]] = [:]
        for song in manifest["tracks"] as? [[String: Any]] ?? [] {
            if let id = song["id"] as? String { songs[id] = song }
        }
        let transitions = manifest["transitions"] as? [String: Any] ?? [:]
        let cues = manifest["cues"] as? [String: String] ?? [:]
        var entries: [JukeboxEngine.Entry] = []
        var start = 0
        var before: [String: Any]?
        for (cursor, id) in ids.enumerated() {
            guard let song = songs[id] else { continue }
            let change: String
            if let from = before {
                if (from["albumId"] as? String) == (song["albumId"] as? String) { change = "track" }
                else if (from["artistKey"] as? String) == (song["artistKey"] as? String) { change = "album" }
                else { change = "artist" }
            } else {
                change = "artist"
            }
            let pair = transitions[change] as? [String: Any] ?? [:]
            var o: [String: Any] = [
                "key": "\(cursor):\(id)",
                "cursor": cursor,
                "trackId": id,
                "albumId": song["albumId"] as? String ?? "",
                "title": song["title"] as? String ?? "",
                "artist": song["artist"] as? String ?? song["albumArtist"] as? String ?? "",
                "album": song["album"] as? String ?? "",
                "auto": pair["auto"] as? [String: Any] ?? [:],
                "skip": pair["skip"] as? [String: Any] ?? [:],
            ]
            if let url = song["url"] as? String { o["url"] = url }
            if let mediaId = song["mediaId"] as? String { o["mediaId"] = mediaId }
            for key in ["gain", "introSec", "outroSec"] { if let n = num(song[key]) { o[key] = n } }
            if let cue = song["cue"] as? String, let uri = cues[cue] { o["cue"] = uri }
            guard let entry = JukeboxEngine.Entry(o) else { continue }
            if cursor <= at { start = entries.count }
            entries.append(entry)
            before = song
        }
        return (entries, start)
    }
}

