import Foundation
import os

/// Simulator runs only (DEBUG builds; Release has none of it): open on a given
/// screen, for the store screenshots, and run a script of the same calls the
/// buttons make, so a paired-simulator test needs no taps.
///
///   -JukeboxWatchScreen nowPlaying|albums|artists|shelves
///   -JukeboxWatchScript "album:1;wait:4;toggle;wait:3;toggle;next;prev;artist:0:shuffle;shelf:0;songs"
enum DebugRun {
    static var initialPath: [Route] {
        #if DEBUG
        switch UserDefaults.standard.string(forKey: "JukeboxWatchScreen") {
        case "nowPlaying": return [.nowPlaying]
        case "albums": return [.albums]
        case "artists": return [.artists]
        case "shelves": return [.shelves]
        default: return []
        }
        #else
        return []
        #endif
    }

    #if DEBUG
    private static let log = Logger(subsystem: "uk.co.unisim.jukebox.watchkitapp", category: "script")

    @MainActor
    static func start(_ link: PhoneLink) {
        guard let script = UserDefaults.standard.string(forKey: "JukeboxWatchScript") else { return }
        Task { @MainActor in
            // The library first: it comes from the phone.
            for _ in 0..<60 where link.library == nil || !link.reachable { try? await Task.sleep(nanoseconds: 500_000_000) }
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            for step in script.split(separator: ";").map(String.init) {
                let parts = step.split(separator: ":").map(String.init)
                log.info("step \(step, privacy: .public)")
                switch parts.first {
                case "wait": try? await Task.sleep(nanoseconds: UInt64((Double(parts.last ?? "1") ?? 1) * 1e9))
                case "toggle": link.playPause()
                case "next": link.transport("nexttrack")
                case "prev": link.transport("previoustrack")
                case "songs": link.play(WatchPick(.shortcut, "shuffle-songs")) {}
                case "album", "artist", "shelf":
                    let index = Int(parts.count > 1 ? parts[1] : "0") ?? 0
                    let shuffle = parts.count > 2 && parts[2] == "shuffle"
                    let id: String?
                    switch parts[0] {
                    case "album": id = link.library?.albums[safe: index]?.id
                    case "artist": id = link.library?.artists[safe: index]?.id
                    default: id = link.library?.shelves[safe: index]?.id
                    }
                    if let id = id, let kind = WatchPick.Kind(rawValue: parts[0]) {
                        link.play(WatchPick(kind, id, shuffle: shuffle)) {}
                    }
                default: break
                }
                let np = link.nowPlaying
                log.info("now \(np.has ? np.title : "-", privacy: .public) playing=\(np.playing) notice=\(String(describing: link.notice), privacy: .public)")
            }
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            let np = link.nowPlaying
            log.info("end \(np.has ? np.title : "-", privacy: .public) playing=\(np.playing) library=\(link.library?.albums.count ?? -1)")
        }
    }
    #endif
}

extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}
