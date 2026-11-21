import Foundation
import UIKit
import AVFoundation
import WatchConnectivity

/// The iPhone's end of the Apple Watch remote (`ios/App/JukeboxWatch`; the
/// protocol and a map of the whole thing are in `Shared/WatchProtocol.swift`).
///
/// ⚠️ THE WATCH TALKS TO A PHONE WHOSE PAGE IS USUALLY ASLEEP. The phone is in
/// a pocket, locked: the page's JavaScript stopped within a second of the lock
/// (probe 3, 2026-10-07), and a message from the watch can even launch the app
/// in the background with no scene and no web view at all. So nothing here
/// waits on the page:
///   - the LIBRARY the watch browses is the copy the page last sent
///     (`WatchPlugin.setLibrary`), kept on disk and handed to the watch as one
///     file whenever it changes;
///   - NOW PLAYING comes from the native engine, which is what is playing
///     (`JukeboxEngine.watchNowPlaying`), as the application context;
///   - TRANSPORT (play, pause, next, previous) is a lock-screen press
///     (`JukeboxEngine.remote`): the page's handlers while the app is on
///     screen, the engine's own while it is not;
///   - PLAYING an album, artist or shelf takes Siri's road. With the app on
///     screen the page plays it (`ShortcutsBridge`, action `collection`), with
///     its animations; with the app away, Siri's locked-phone player does
///     (`SiriPlayer`): the page's own rules, run by JavaScriptCore over the
///     library it wrote down for Siri, and the engine plays the queue. The page
///     takes the queue over when it next wakes (`adoptNativeQueue`).
///
/// ⚠️ WHAT THE BACKGROUND CANNOT DO. iOS lets an app in the background start
/// sound only while its audio session is still live (it was playing, or
/// paused only a little while ago). From cold — the app long suspended, or
/// launched by the watch — `setActive` is refused, so the watch is told
/// `needsPhone` ("Open Jukebox on your iPhone") rather than shown a play that
/// never sounds. The example library's songs are made in the page, so they
/// also need the app open. Siri has `AudioPlaybackIntent` for this; a watch
/// message has no equivalent.
///
/// All main thread; WatchConnectivity's callbacks hop onto it.
final class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()

    /// The page's listener for `status` (`WatchPlugin`).
    var onStatus: (([String: Bool]) -> Void)?

    private var session: WCSession? { WCSession.isSupported() ? WCSession.default : nil }
    private var library: WatchLibrary?
    private var lastSent: WatchNowPlaying?
    private var lastArtAlbum: String?
    private var lastArt: Data?
    private var pushQueued = false

    // MARK: - Starting

    func start() {
        guard let session = session, session.delegate == nil else { return }
        library = Self.readLibrary()
        session.delegate = self
        session.activate()
    }

    /// What the page reads (`watchSync.ts`): a paired watch, with the app on it.
    var status: [String: Bool] {
        guard let s = session, s.activationState == .activated else {
            return ["paired": false, "installed": false, "reachable": false]
        }
        return ["paired": s.isPaired, "installed": watchListening, "reachable": s.isReachable]
    }

    /// A paired watch with the app on it. ⚠️ ALSO TRUE ONCE THE WATCH APP HAS
    /// SPOKEN: a paired simulator reports `isWatchAppInstalled` false for a
    /// watch app installed with `simctl` even while its messages arrive (seen
    /// 2026-11-21, Xcode 27.2), and a message from it is proof enough. Forgotten
    /// when the watch is unpaired.
    private var watchListening: Bool {
        guard let s = session, s.activationState == .activated, s.isPaired else { return false }
        return s.isWatchAppInstalled || watchSeen
    }

    private var watchSeen: Bool {
        get { UserDefaults.standard.bool(forKey: "uk.co.unisim.jukebox.watchSeen") }
        set { UserDefaults.standard.set(newValue, forKey: "uk.co.unisim.jukebox.watchSeen") }
    }

    private func tellPage() {
        let now = status
        onStatus?(now)
    }

    // MARK: - The library, from the page

    /// `json` is `src/lib/watchLibrary.ts`'s `WatchLibrary`; `thumbs` are
    /// base64 JPEGs by album id. Any thread.
    func setLibrary(json: String, thumbs: [String: String]) -> Bool {
        guard let decoded = try? JSONDecoder().decode(WatchLibrary.self, from: Data(json.utf8)) else { return false }
        let package = WatchPackage(library: decoded, thumbs: thumbs)
        guard let data = try? JSONEncoder().encode(package), let dir = Self.dir else { return false }
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try Data(json.utf8).write(to: dir.appendingPathComponent("library.json"), options: .atomic)
            try data.write(to: Self.packageURL(decoded.rev)!, options: .atomic)
        } catch {
            CommandLog.note("watch: could not keep the library \(error.localizedDescription)")
            return false
        }
        DispatchQueue.main.async {
            let changed = self.library?.rev != decoded.rev
            self.library = decoded
            if changed { self.sendLibrary() }
        }
        return true
    }

    /// The library file for `rev`, to the watch — once: a transfer of the same
    /// library already on its way is left alone, older ones are called off.
    private func sendLibrary() {
        guard watchListening, let s = session, let rev = library?.rev, let url = Self.packageURL(rev),
              FileManager.default.fileExists(atPath: url.path) else { return }
        var already = false
        for transfer in s.outstandingFileTransfers {
            if transfer.file.metadata?[WatchMessage.rev] as? String == rev { already = true }
            else { transfer.cancel() }
        }
        guard !already else { return }
        s.transferFile(url, metadata: [WatchMessage.rev: rev])
        CommandLog.note("watch: library \(rev) sent")
    }

    // MARK: - Now playing

    /// Something about the song on the deck changed (`publishNowPlaying`).
    /// Coalesced: the engine publishes in bursts.
    func engineChanged() {
        guard !pushQueued else { return }
        pushQueued = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            self?.pushQueued = false
            self?.push(force: false)
        }
    }

    private func nowPlayingContext() -> [String: Any] {
        let np = JukeboxEngine.shared.watchNowPlaying()
        var context: [String: Any] = [WatchMessage.rev: library?.rev ?? ""]
        if let data = np.data { context[WatchMessage.nowPlaying] = data }
        if np.has {
            if lastArtAlbum != np.albumId || lastArt == nil {
                lastArt = JukeboxEngine.shared.watchArtwork(side: 136)?.jpegData(compressionQuality: 0.7)
                lastArtAlbum = lastArt == nil ? nil : np.albumId
            }
            if let art = lastArt, lastArtAlbum == np.albumId { context[WatchMessage.art] = art }
        }
        return context
    }

    private func push(force: Bool) {
        guard watchListening, let s = session else { return }
        let np = JukeboxEngine.shared.watchNowPlaying()
        if !force, let last = lastSent, last.sameAs(np), (lastArtAlbum == np.albumId || !np.has) { return }
        lastSent = np
        do {
            try s.updateApplicationContext(nowPlayingContext())
        } catch {
            CommandLog.note("watch: context not sent \(error.localizedDescription)")
        }
    }

    // MARK: - Requests from the watch

    private func handle(_ message: [String: Any], reply: @escaping ([String: Any]) -> Void) {
        if !watchSeen {
            watchSeen = true
            tellPage()
        }
        switch message[WatchMessage.type] as? String {
        case WatchMessage.hello:
            var answer = nowPlayingContext()
            if message[WatchMessage.rev] as? String != library?.rev, let rev = library?.rev {
                // A small library rides in the reply at once; the file still
                // goes (it is what carries a big one, in the background).
                sendLibrary()
                if let data = Self.packageForReply(rev) {
                    // Without the picture: both together overflow a reply
                    // ("Message reply failed"). The next hello brings it.
                    answer[WatchMessage.package] = data
                    answer[WatchMessage.art] = nil
                }
            }
            reply(answer)
        case WatchMessage.transport:
            let action = message[WatchMessage.action] as? String ?? ""
            CommandLog.note("watch: \(action) app=\(UIApplication.shared.applicationState.rawValue)")
            let starts = action == "play" || (action == "toggle" && !JukeboxEngine.shared.playingNow)
            if starts && UIApplication.shared.applicationState != .active && !Self.canStartSound() {
                reply([WatchMessage.result: WatchResult.needsPhone.rawValue])
                return
            }
            let ok = JukeboxEngine.shared.remote(action)
            reply([WatchMessage.result: (ok ? WatchResult.sent : WatchResult.needsPhone).rawValue])
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.push(force: true) }
        case WatchMessage.play:
            guard let pick = WatchPick(message: message) else {
                reply([WatchMessage.result: WatchResult.notFound.rawValue])
                return
            }
            let result = perform(pick)
            CommandLog.note("watch: play \(pick.kind.rawValue) shuffle=\(pick.shuffle) → \(result.rawValue)")
            reply([WatchMessage.result: result.rawValue])
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { self.push(force: true) }
        default:
            reply([:])
        }
    }

    private func perform(_ pick: WatchPick) -> WatchResult {
        guard let (action, request) = WatchRequest.resolve(pick, in: library) else { return .notFound }
        if UIApplication.shared.applicationState == .active {
            // The page plays it, as if its own button had been pressed. The
            // query only tells `ShortcutsBridge` one pick from another.
            var extras = request ?? [:]
            if request != nil { extras["query"] = "watch:\(pick.kind.rawValue):\(pick.id):\(pick.shuffle)" }
            ShortcutsBridge.receive(action, extras)
            return .played
        }
        if library?.example == true || !SiriLibrary.exists || !Self.canStartSound() { return .needsPhone }
        switch SiriPlayer.run(action: action, request: request) {
        case .played: return .played
        case .notFound: return .notFound
        case .cannot: return .needsPhone
        }
    }

    /// Whether sound may start from here — see "WHAT THE BACKGROUND CANNOT DO".
    /// Taking the session is what starting would do anyway.
    private static func canStartSound() -> Bool {
        if JukeboxEngine.shared.playingNow { return true }
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
            return true
        } catch {
            CommandLog.note("watch: no sound from the background \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.tellPage()
            self.push(force: true)
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    /// A different watch was paired: start again for it.
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            if !session.isPaired { self.watchSeen = false }
            self.tellPage()
            if self.watchListening {
                self.sendLibrary()
                self.push(force: true)
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.tellPage() }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { self.handle(message, reply: replyHandler) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.handle(message, reply: { _ in }) }
    }

    func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
        if let error = error { CommandLog.note("watch: library transfer failed \(error.localizedDescription)") }
        DispatchQueue.main.async { self.tidyPackages() }
    }

    // MARK: - On disk

    /// Application Support, not Caches: a watch asking while the page is
    /// asleep must find it. It can be made again, so it is kept out of backups.
    private static var dir: URL? {
        guard var url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("jukebox-watch", isDirectory: true) else { return nil }
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        try? url.setResourceValues(values)
        return url
    }

    private static func packageURL(_ rev: String) -> URL? {
        let safe = rev.replacingOccurrences(of: "[^A-Za-z0-9]", with: "", options: .regularExpression)
        return dir?.appendingPathComponent("package-\(safe).json")
    }

    private static func readLibrary() -> WatchLibrary? {
        guard let url = dir?.appendingPathComponent("library.json"), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WatchLibrary.self, from: data)
    }

    /// The library for a reply: whole if it fits, else with only the covers
    /// that fit — the file brings the rest (`WatchPackage.trimmed`).
    private static func packageForReply(_ rev: String) -> Data? {
        guard let url = packageURL(rev), let data = try? Data(contentsOf: url) else { return nil }
        if data.count <= WatchMessage.packageInReplyMax { return data }
        return (try? JSONDecoder().decode(WatchPackage.self, from: data))?.trimmed(to: WatchMessage.packageInReplyMax)
    }

    /// Every package file but the current library's and those still going.
    private func tidyPackages() {
        guard let dir = Self.dir, let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
        var keep = Set<String>()
        if let rev = library?.rev, let url = Self.packageURL(rev) { keep.insert(url.lastPathComponent) }
        for transfer in session?.outstandingFileTransfers ?? [] { keep.insert(transfer.file.fileURL.lastPathComponent) }
        for file in files where file.lastPathComponent.hasPrefix("package-") && !keep.contains(file.lastPathComponent) {
            try? FileManager.default.removeItem(at: file)
        }
    }
}
