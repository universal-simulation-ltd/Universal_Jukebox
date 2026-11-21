import Foundation

// The Apple Watch remote's protocol — compiled into the iPhone app, the watch
// app and the tests (James, 2026-11-21: "a Jukebox Apple Watch app that is a
// remote for the phone").
//
// HOW IT FITS TOGETHER
//
//   page (src/lib/watchSync.ts) ──JukeboxWatch plugin──▶ WatchBridge (phone)
//        the library + tiny covers                         keeps it on disk
//                                                              │ transferFile
//   engine (JukeboxEngine) ──now playing──▶ WatchBridge ──applicationContext──▶ PhoneLink (watch)
//   PhoneLink ──sendMessage: transport / play──▶ WatchBridge
//        transport → the engine's lock-screen command path (page if active, engine if not)
//        play      → the page through ShortcutsBridge (app on screen), or
//                    Siri's own locked-phone path, SiriPlayer (app away)
//
// ⚠️ EVERYTHING HERE IS SMALL ON PURPOSE. Messages carry names and ids, never
// songs. The library goes once per change, as one file; now playing goes as
// the application context, which only ever holds the latest.

enum WatchMessage {
    /// Every message's type.
    static let type = "t"
    /// Watch → phone: "here I am, with library `rev`". Answered with now playing.
    static let hello = "hello"
    /// Watch → phone: a transport button — `action` is the lock screen's own
    /// command name (`play`, `pause`, `toggle`, `nexttrack`, `previoustrack`).
    static let transport = "transport"
    /// Watch → phone: play an album, artist, shelf or shortcut (`WatchPick`).
    static let play = "play"

    static let action = "a"
    static let kind = "k"
    static let id = "id"
    static let shuffle = "s"
    static let rev = "rev"
    /// Reply: a `WatchResult`'s raw value.
    static let result = "r"
    /// Reply and application context: `WatchNowPlaying`, JSON.
    static let nowPlaying = "np"
    /// Application context: the now-playing picture, JPEG.
    static let art = "art"
    /// Reply to `hello`: the whole `WatchPackage` (JSON), when the watch's
    /// library is out of date and it is small enough to ride in a reply.
    static let package = "pkg"
    /// The most a package may weigh to ride in a reply (messages cap at 64 KB,
    /// and now playing and its picture share the reply).
    static let packageInReplyMax = 56_000
}

/// What became of a watch's request.
enum WatchResult: String {
    /// Playing, or handed to the page to play.
    case played
    /// A transport command went to the player.
    case sent
    /// Nothing in the library answers to it any more.
    case notFound
    /// The phone can't start it with Jukebox in the background — open it there.
    case needsPhone
}

/// The library as the watch shows it — `WatchLibrary` in
/// `src/lib/watchLibrary.ts`, field for field. `ios/App/JukeboxWatchTests/library.json`
/// is the fixture both sides are held to.
struct WatchLibrary: Codable, Equatable {
    struct Album: Codable, Equatable, Hashable, Identifiable {
        let id: String
        let title: String
        let artist: String
        let count: Int
        let hue: Int
        enum CodingKeys: String, CodingKey { case id, title = "t", artist = "a", count = "n", hue = "h" }
    }

    struct Artist: Codable, Equatable, Hashable, Identifiable {
        /// Their name.
        let id: String
        /// Oldest first.
        let albumIds: [String]
        let count: Int
        enum CodingKeys: String, CodingKey { case id, albumIds = "al", count = "c" }
    }

    struct Shelf: Codable, Equatable, Hashable, Identifiable {
        let id: String
        let name: String
        /// `hits`, `most`, `loved` or `shelf`.
        let kind: String
        let trackIds: [String]
        let art: String?
        enum CodingKeys: String, CodingKey { case id, name = "n", kind = "k", trackIds = "ids", art }
    }

    let v: Int
    let rev: String
    /// `artists`, `albums`, `songs`, `shelves`, in the phone's tab order.
    let sections: [String]
    let albums: [Album]
    let artists: [Artist]
    let shelves: [Shelf]
    let songs: Int
    let example: Bool
}

/// The file that carries the library to the watch: the library and a base64
/// JPEG cover for each album that has one.
struct WatchPackage: Codable {
    let library: WatchLibrary
    let thumbs: [String: String]
}

extension WatchPackage {
    /// The package cut to fit `budget` bytes of JSON: the whole library, and
    /// as many covers as fit, in the library's album order. nil if even the
    /// library alone does not fit.
    func trimmed(to budget: Int) -> Data? {
        guard let bare = try? JSONEncoder().encode(WatchPackage(library: library, thumbs: [:])), bare.count <= budget else { return nil }
        var room = budget - bare.count
        var kept: [String: String] = [:]
        for album in library.albums {
            guard let thumb = thumbs[album.id] else { continue }
            let cost = thumb.utf8.count + album.id.utf8.count + 8
            if cost > room { break }
            kept[album.id] = thumb
            room -= cost
        }
        return try? JSONEncoder().encode(WatchPackage(library: library, thumbs: kept))
    }
}

/// Something picked on the watch to play.
struct WatchPick: Equatable {
    enum Kind: String { case album, artist, shelf, shortcut }
    let kind: Kind
    let id: String
    let shuffle: Bool

    init(_ kind: Kind, _ id: String, shuffle: Bool = false) {
        self.kind = kind
        self.id = id
        self.shuffle = shuffle
    }

    init?(message: [String: Any]) {
        guard message[WatchMessage.type] as? String == WatchMessage.play,
              let kind = (message[WatchMessage.kind] as? String).flatMap(Kind.init(rawValue:)),
              let id = message[WatchMessage.id] as? String else { return nil }
        self.init(kind, id, shuffle: message[WatchMessage.shuffle] as? Bool ?? false)
    }

    var message: [String: Any] {
        [WatchMessage.type: WatchMessage.play, WatchMessage.kind: kind.rawValue, WatchMessage.id: id, WatchMessage.shuffle: shuffle]
    }
}

/// What the phone does with a pick: the action and request it hands the page
/// (`ShortcutsBridge` → `src/lib/shortcuts.ts`) or, with the page away, the
/// planner (`SiriPlayer` → `src/siri/planner.ts`). The ORDER of what plays is
/// decided there, by `decideCollection` / `decideShortcut` — this only turns the
/// watch's name for a thing into its ids.
enum WatchRequest {
    static let shortcuts: Set<String> = ["shuffle-songs", "shuffle-albums", "shuffle-artists", "play"]

    static func resolve(_ pick: WatchPick, in library: WatchLibrary?) -> (action: String, request: [String: Any]?)? {
        switch pick.kind {
        case .shortcut:
            return shortcuts.contains(pick.id) ? (pick.id, nil) : nil
        case .album:
            return ("collection", ["albums": [pick.id], "shuffle": pick.shuffle])
        case .artist:
            guard let artist = library?.artists.first(where: { $0.id == pick.id }), !artist.albumIds.isEmpty else { return nil }
            return ("collection", ["albums": artist.albumIds, "shuffle": pick.shuffle])
        case .shelf:
            guard let shelf = library?.shelves.first(where: { $0.id == pick.id }), !shelf.trackIds.isEmpty else { return nil }
            return ("collection", ["tracks": shelf.trackIds, "shuffle": pick.shuffle])
        }
    }
}

/// The song on the phone, as the watch shows it. `elapsed` was true at `at`
/// (seconds since 1970); the watch moves it on itself while `playing`.
struct WatchNowPlaying: Codable, Equatable {
    var has: Bool
    var title: String
    var artist: String
    var album: String
    var albumId: String
    var playing: Bool
    var elapsed: Double
    var duration: Double
    var at: Double

    static let nothing = WatchNowPlaying(has: false, title: "", artist: "", album: "", albumId: "",
                                         playing: false, elapsed: 0, duration: 0, at: 0)

    func position(at now: Date) -> Double {
        guard playing else { return elapsed }
        let moved = elapsed + max(0, now.timeIntervalSince1970 - at)
        return duration > 0 ? min(duration, moved) : moved
    }

    /// The same song in the same state, give or take the clock — so the phone
    /// does not resend now playing four times a second.
    func sameAs(_ other: WatchNowPlaying, now: Date = Date()) -> Bool {
        has == other.has && title == other.title && artist == other.artist && albumId == other.albumId
            && playing == other.playing && abs(duration - other.duration) < 1
            && abs(position(at: now) - other.position(at: now)) < 2
    }

    var data: Data? { try? JSONEncoder().encode(self) }

    init(has: Bool, title: String, artist: String, album: String, albumId: String,
         playing: Bool, elapsed: Double, duration: Double, at: Double) {
        self.has = has
        self.title = title
        self.artist = artist
        self.album = album
        self.albumId = albumId
        self.playing = playing
        self.elapsed = elapsed
        self.duration = duration
        self.at = at
    }

    init?(data: Data?) {
        guard let data = data, let decoded = try? JSONDecoder().decode(WatchNowPlaying.self, from: data) else { return nil }
        self = decoded
    }
}
