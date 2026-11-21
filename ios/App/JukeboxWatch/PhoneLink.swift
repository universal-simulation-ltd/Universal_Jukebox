import Foundation
import SwiftUI
import WatchConnectivity
import os
import WatchKit

/// The watch's end of the remote. The phone's is `WatchBridge.swift`; the
/// protocol is `Shared/WatchProtocol.swift`.
///
/// What the watch knows comes in three ways, none of which needs the phone's
/// app on screen:
///   - the library, as a file the phone sends whenever it changes — kept here,
///     so browsing works the moment the app opens, phone or no phone;
///   - now playing, as the application context (only the latest is kept);
///   - the answer to each request it sends (`sendMessage`), which wakes the
///     phone's app in the background if need be.
@MainActor
final class PhoneLink: NSObject, ObservableObject {
    static let shared = PhoneLink()

    @Published private(set) var library: WatchLibrary?
    @Published private(set) var nowPlaying: WatchNowPlaying = .nothing
    @Published private(set) var art: UIImage?
    @Published private(set) var reachable = false
    /// A word for the person about the last thing that did not work.
    @Published var notice: Notice?

    enum Notice: Equatable {
        case needsPhone, notFound, unreachable

        var text: LocalizedStringKey {
            switch self {
            case .needsPhone: return "Open Jukebox on your iPhone to start this."
            case .notFound: return "That’s no longer in your library."
            case .unreachable: return "Your iPhone isn’t reachable."
            }
        }
    }

    private var thumbData: [String: String] = [:]
    private var thumbCache: [String: UIImage] = [:]
    private var started = false
    private let log = Logger(subsystem: "uk.co.unisim.jukebox.watchkitapp", category: "link")

    // MARK: - Starting

    func start() {
        guard !started else { return }
        started = true
        if let package = Self.readPackage() { adopt(package) }
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
        // On screen from the start: the scene's first `active` is no change.
        onScreen(true)
        #if DEBUG
        DebugRun.start(self)
        #endif
    }

    /// "Here I am" — the phone answers with now playing, and sends the library
    /// again if this watch's copy is out of date.
    func hello() {
        guard WCSession.default.activationState == .activated else { return }
        send([WatchMessage.type: WatchMessage.hello, WatchMessage.rev: library?.rev ?? ""], quiet: true) { [weak self] reply in
            self?.adoptContext(reply)
        }
    }

    /// While the app is on screen, ask now and then as well as listening: the
    /// application context can lag, and a simulator pair never delivers it.
    private var poll: Timer?

    func onScreen(_ visible: Bool) {
        poll?.invalidate()
        poll = nil
        guard visible else { return }
        poll = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { _ in
            Task { @MainActor in
                if WCSession.default.activationState == .activated, WCSession.default.isReachable { PhoneLink.shared.hello() }
            }
        }
    }

    // MARK: - Asking the phone

    /// A transport button. The picture changes at once; the phone's next
    /// context puts it right if the phone saw it differently.
    func transport(_ action: String) {
        Haptics.click()
        var np = nowPlaying
        let now = Date()
        switch action {
        case "toggle":
            np.elapsed = np.position(at: now)
            np.at = now.timeIntervalSince1970
            np.playing.toggle()
        case "previoustrack":
            if np.position(at: now) > 3 {
                np.elapsed = 0
                np.at = now.timeIntervalSince1970
            }
        default:
            break
        }
        if np.has { nowPlaying = np }
        send([WatchMessage.type: WatchMessage.transport, WatchMessage.action: action]) { [weak self] reply in
            self?.answered(reply)
            self?.helloSoon()
        }
    }

    /// Play/pause — or, with nothing on the phone's deck, "play music": carry
    /// on from last time, else shuffle songs (Siri's "play music in Jukebox").
    func playPause() {
        if nowPlaying.has { transport("toggle") }
        else { play(WatchPick(.shortcut, "play"), then: {}) }
    }

    /// Start something on the phone; `then` runs once it has.
    func play(_ pick: WatchPick, then: @escaping () -> Void) {
        Haptics.click()
        send(pick.message) { [weak self] reply in
            self?.answered(reply)
            self?.helloSoon()
            if (reply[WatchMessage.result] as? String) == WatchResult.played.rawValue { then() }
        }
    }

    /// The phone's view of things a moment after a button: the song it moved
    /// to, or the pause it really made.
    private func helloSoon() {
        Task {
            try? await Task.sleep(nanoseconds: 900_000_000)
            self.hello()
        }
    }

    private func answered(_ reply: [String: Any]) {
        switch (reply[WatchMessage.result] as? String).flatMap(WatchResult.init(rawValue:)) {
        case .needsPhone: show(.needsPhone)
        case .notFound: show(.notFound)
        default: notice = nil
        }
        if reply[WatchMessage.nowPlaying] != nil { adoptContext(reply) }
    }

    /// `quiet`: a hello, sent on its own — no notice if it goes unanswered.
    private func send(_ message: [String: Any], quiet: Bool = false, reply: @escaping ([String: Any]) -> Void) {
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else {
            if !quiet { show(.unreachable) }
            return
        }
        log.info("send \(String(describing: message[WatchMessage.type] ?? "?"), privacy: .public) \(String(describing: message[WatchMessage.action] ?? message[WatchMessage.kind] ?? ""), privacy: .public)")
        session.sendMessage(message, replyHandler: { answer in
            Task { @MainActor in
                self.log.info("reply \(String(describing: answer[WatchMessage.result] ?? "np"), privacy: .public)")
                reply(answer)
            }
        }, errorHandler: { error in
            Task { @MainActor in
                self.log.error("send failed \(error.localizedDescription, privacy: .public)")
                if !quiet { self.show(.needsPhone) }
            }
        })
    }

    func show(_ notice: Notice) {
        Haptics.failure()
        self.notice = notice
        let shown = notice
        Task {
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            if self.notice == shown { self.notice = nil }
        }
    }

    // MARK: - What the phone sends

    func adoptContext(_ context: [String: Any]) {
        if let data = context[WatchMessage.package] as? Data, let package = Self.keep(data) { adopt(package) }
        if let np = WatchNowPlaying(data: context[WatchMessage.nowPlaying] as? Data) {
            nowPlaying = np
            if let data = context[WatchMessage.art] as? Data, let image = UIImage(data: data) { art = image }
            else if !np.has || context[WatchMessage.art] == nil { art = nil }
        }
    }

    func adopt(_ package: WatchPackage) {
        library = package.library
        thumbData = package.thumbs
        thumbCache = [:]
    }

    /// The album's little cover, if the phone sent one.
    func thumb(_ albumId: String?) -> UIImage? {
        guard let id = albumId else { return nil }
        if let image = thumbCache[id] { return image }
        guard let text = thumbData[id], let data = Data(base64Encoded: text), let image = UIImage(data: data) else { return nil }
        thumbCache[id] = image
        return image
    }

    func album(_ id: String) -> WatchLibrary.Album? {
        library?.albums.first { $0.id == id }
    }

    // MARK: - Kept on the watch

    nonisolated private static var packageURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("library-package.json")
    }

    nonisolated static func readPackage() -> WatchPackage? {
        guard let url = packageURL, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WatchPackage.self, from: data)
    }

    nonisolated static func keep(_ data: Data) -> WatchPackage? {
        guard let package = try? JSONDecoder().decode(WatchPackage.self, from: data), let url = packageURL else { return nil }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
        return package
    }
}

extension PhoneLink: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        let reachable = session.isReachable
        Task { @MainActor in
            self.reachable = reachable
            self.adoptContext(context)
            self.hello()
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        let reachable = session.isReachable
        Task { @MainActor in
            self.reachable = reachable
            if reachable {
                if self.notice == .unreachable { self.notice = nil }
                self.hello()
            }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.adoptContext(applicationContext) }
    }

    /// The library file. ⚠️ Read before returning: the system deletes it after.
    nonisolated func session(_ session: WCSession, didReceive file: WCSessionFile) {
        guard let data = try? Data(contentsOf: file.fileURL), let package = PhoneLink.keep(data) else { return }
        Task { @MainActor in self.adopt(package) }
    }
}

enum Haptics {
    static func click() { WKInterfaceDevice.current().play(.click) }
    static func failure() { WKInterfaceDevice.current().play(.failure) }
}
