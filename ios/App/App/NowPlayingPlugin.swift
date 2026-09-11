import Foundation
import UIKit
import AVFoundation
import MediaPlayer
import Capacitor

/// The lock screen's picture of what is playing, and — on iOS 26 — the record
/// in it TURNING (James, 2026-09-10: "make the lockscreen player more 'us'").
///
/// `MPMediaItemAnimatedArtwork` takes a short looping video file. `lockArt.ts`
/// draws the disc (the cover as its label) and this plugin spins it through one
/// revolution into a video, at whatever size the system asks for, and caches it.
///
/// ⚠️ WEBKIT ALREADY PUBLISHES A NOW-PLAYING ENTRY for the page's `<audio>`.
/// The first `show` looks at this app's `MPNowPlayingInfoCenter` before touching
/// it, and picks a mode it reports back to the page:
///   - `merge` — the center already holds WebKit's entry, so only the animated
///     artwork is added to it, and a timer puts it back whenever WebKit's next
///     update replaces the dictionary. The buttons stay WebKit's.
///   - `own` — the center is empty, so WebKit publishes somewhere else. The
///     entry here is complete (title, progress, artwork), its progress is fed by
///     `update`, and its buttons are answered by sending `command` events to the
///     page, which runs the same handlers as the Media Session.
@objc(NowPlayingPlugin)
public class NowPlayingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NowPlayingPlugin"
    public let jsName = "JukeboxNowPlaying"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    private enum Mode: String { case unknown, merge, own }

    // All main thread.
    private var mode: Mode = .unknown
    private var ours: [String: Any] = [:]
    private var keeper: Timer?
    private var commandsOn = false

    /// Headphones in or out, and interruptions, for the page's saved log
    /// (James, 2026-09-11: "still random issues with the lockscreen controls -
    /// not sure if it was when i put headphone in"). OBSERVED only: this app
    /// must never touch its own audio session — see `AppDelegate`.
    override public func load() {
        let centre = NotificationCenter.default
        centre.addObserver(self, selector: #selector(routeChanged(_:)),
                           name: AVAudioSession.routeChangeNotification, object: nil)
        centre.addObserver(self, selector: #selector(interrupted(_:)),
                           name: AVAudioSession.interruptionNotification, object: nil)
    }

    @objc private func routeChanged(_ note: Notification) {
        let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 0
        let reason: String
        switch AVAudioSession.RouteChangeReason(rawValue: raw) ?? .unknown {
        case .newDeviceAvailable: reason = "device in"
        case .oldDeviceUnavailable: reason = "device out"
        case .categoryChange: reason = "category"
        case .override: reason = "override"
        case .wakeFromSleep: reason = "wake"
        case .noSuitableRouteForCategory: reason = "no route"
        case .routeConfigurationChange: reason = "configuration"
        default: reason = "other \(raw)"
        }
        let outputs = AVAudioSession.sharedInstance().currentRoute.outputs
            .map { $0.portType.rawValue }.joined(separator: ",")
        DispatchQueue.main.async {
            self.notifyListeners("audio", data: ["kind": "route", "reason": reason, "outputs": outputs])
        }
    }

    @objc private func interrupted(_ note: Notification) {
        let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 99
        let type = raw == AVAudioSession.InterruptionType.began.rawValue ? "began"
            : raw == AVAudioSession.InterruptionType.ended.rawValue ? "ended" : "other \(raw)"
        DispatchQueue.main.async {
            self.notifyListeners("audio", data: ["kind": "interruption", "type": type])
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        guard let artworkId = call.getString("artworkId"),
              let stillData = call.getString("still").flatMap({ Data(base64Encoded: $0) }),
              let still = UIImage(data: stillData) else {
            call.reject("No artwork was sent.", "BAD_ARGS")
            return
        }
        let disc = call.getString("disc").flatMap { Data(base64Encoded: $0) }.flatMap { UIImage(data: $0) }
        let ground = call.getArray("ground", String.self) ?? ["#1e293b", "#020617"]
        let spin = call.getDouble("spinSeconds")
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let album = call.getString("album") ?? ""
        let elapsed = call.getDouble("elapsed") ?? 0
        let duration = call.getDouble("duration") ?? 0
        let rate = call.getDouble("rate") ?? 0

        DispatchQueue.main.async {
            let center = MPNowPlayingInfoCenter.default()
            if self.mode == .unknown {
                self.mode = (center.nowPlayingInfo?.isEmpty == false) ? .merge : .own
                print("[jukebox:native] now playing: mode=\(self.mode.rawValue) existingKeys=\(center.nowPlayingInfo?.keys.sorted() ?? [])")
            }

            var info: [String: Any] = [:]
            if self.mode == .own {
                info[MPMediaItemPropertyTitle] = title
                info[MPMediaItemPropertyArtist] = artist
                info[MPMediaItemPropertyAlbumTitle] = album
                if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
                info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
                info[MPNowPlayingInfoPropertyPlaybackRate] = rate
                info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: still.size) { _ in still }
            }

            var animated = false
            var supported: [String] = []
            if #available(iOS 26.0, *) {
                supported = MPNowPlayingInfoCenter.supportedAnimatedArtworkKeys
                if let disc = disc, let spin = spin, spin > 0, !supported.isEmpty {
                    let art = SpinArt(id: artworkId, disc: disc, ground: ground, seconds: spin)
                    let artwork = MPMediaItemAnimatedArtwork(
                        artworkID: artworkId,
                        previewImageRequestHandler: { size, done in done(art.preview(size)) },
                        videoAssetFileURLRequestHandler: { size, done in art.video(size, done) })
                    for key in supported { info[key] = artwork }
                    animated = true
                }
            }

            self.ours = info
            self.apply()
            if self.mode == .own {
                self.enableCommands()
                if #available(iOS 13.0, *) { center.playbackState = rate > 0 ? .playing : .paused }
            } else {
                self.keepMerged()
            }
            call.resolve(["animated": animated, "supportedKeys": supported, "mode": self.mode.rawValue])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        let elapsed = call.getDouble("elapsed") ?? 0
        let duration = call.getDouble("duration") ?? 0
        let rate = call.getDouble("rate") ?? 0
        DispatchQueue.main.async {
            guard self.mode == .own, !self.ours.isEmpty else { call.resolve(); return }
            self.ours[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
            self.ours[MPNowPlayingInfoPropertyPlaybackRate] = rate
            if duration > 0 { self.ours[MPMediaItemPropertyPlaybackDuration] = duration }
            self.apply()
            if #available(iOS 13.0, *) {
                MPNowPlayingInfoCenter.default().playbackState = rate > 0 ? .playing : .paused
            }
            call.resolve()
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.keeper?.invalidate()
            self.keeper = nil
            if self.mode == .own {
                MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            } else if var info = MPNowPlayingInfoCenter.default().nowPlayingInfo {
                for key in self.ours.keys { info.removeValue(forKey: key) }
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
            }
            self.ours = [:]
            call.resolve()
        }
    }

    /// `own` replaces the entry; `merge` lays our keys over WebKit's.
    private func apply() {
        let center = MPNowPlayingInfoCenter.default()
        var info: [String: Any] = mode == .merge ? (center.nowPlayingInfo ?? [:]) : [:]
        for (key, value) in ours { info[key] = value }
        center.nowPlayingInfo = info
    }

    /// WebKit rewrites its whole dictionary on its own updates, dropping ours.
    private func keepMerged() {
        keeper?.invalidate()
        guard !ours.isEmpty else { return }
        keeper = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: true) { [weak self] _ in
            guard let self = self, let key = self.ours.keys.first else { return }
            let current = MPNowPlayingInfoCenter.default().nowPlayingInfo?[key] as AnyObject?
            if current !== (self.ours[key] as AnyObject?) { self.apply() }
        }
    }

    /// `own` only: the lock screen's buttons, handed to the page.
    private func enableCommands() {
        guard !commandsOn else { return }
        commandsOn = true
        let center = MPRemoteCommandCenter.shared()
        let forward: [(MPRemoteCommand, String)] = [
            (center.playCommand, "play"),
            (center.pauseCommand, "pause"),
            (center.togglePlayPauseCommand, "toggle"),
            (center.nextTrackCommand, "nexttrack"),
            (center.previousTrackCommand, "previoustrack")
        ]
        for (command, action) in forward {
            command.isEnabled = true
            command.addTarget { [weak self] _ in
                self?.notifyListeners("command", data: ["action": action])
                return .success
            }
        }
        center.changePlaybackPositionCommand.isEnabled = true
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let seek = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.notifyListeners("command", data: ["action": "seekto", "position": seek.positionTime])
            return .success
        }
        // A music player's side buttons are the tracks, not ±10 s.
        center.skipForwardCommand.isEnabled = false
        center.skipBackwardCommand.isEnabled = false
    }
}

/// One revolution of a disc as a looping video, over the album's ground.
///
/// Frame 0 is the preview image, so the still and the video meet. Videos are
/// cached in Caches by artwork id and size — the system re-asks for them.
final class SpinArt {
    private let id: String
    private let disc: CGImage?
    private let top: CGColor
    private let bottom: CGColor
    private let seconds: Double
    private let queue = DispatchQueue(label: "uk.co.unisim.jukebox.spin-art")

    init(id: String, disc: UIImage, ground: [String], seconds: Double) {
        self.id = id
        self.disc = disc.cgImage
        self.top = SpinArt.color(ground.first ?? "#1e293b")
        self.bottom = SpinArt.color(ground.count > 1 ? ground[1] : "#020617")
        self.seconds = seconds
    }

    func preview(_ size: CGSize) -> UIImage? {
        print("[jukebox:native] spin art: preview asked for \(Int(size.width))x\(Int(size.height))")
        let (w, h) = SpinArt.pixels(size)
        guard let ctx = SpinArt.context(w, h, data: nil, bytesPerRow: 0) else { return nil }
        draw(ctx, w, h, angle: 0)
        return ctx.makeImage().map { UIImage(cgImage: $0) }
    }

    func video(_ size: CGSize, _ done: @escaping (URL?) -> Void) {
        queue.async {
            let (w, h) = SpinArt.pixels(size)
            let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("jukebox-lock-art", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let safe = self.id.replacingOccurrences(of: "[^A-Za-z0-9._-]", with: "_", options: .regularExpression)
            let url = dir.appendingPathComponent("\(safe)-\(w)x\(h).mov")
            if FileManager.default.fileExists(atPath: url.path) {
                print("[jukebox:native] spin art: video asked for \(w)x\(h) — cached")
                done(url)
                return
            }
            let started = Date()
            let ok = self.write(w, h, to: url)
            print("[jukebox:native] spin art: video asked for \(w)x\(h) — written=\(ok) in \(Int(Date().timeIntervalSince(started) * 1000))ms")
            done(ok ? url : nil)
        }
    }

    private func write(_ w: Int, _ h: Int, to url: URL) -> Bool {
        let temp = url.deletingLastPathComponent().appendingPathComponent(UUID().uuidString + ".mov")
        guard let writer = try? AVAssetWriter(outputURL: temp, fileType: .mov) else { return false }
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: w,
            AVVideoHeightKey: h
        ])
        input.expectsMediaDataInRealTime = false
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: w,
            kCVPixelBufferHeightKey as String: h
        ])
        guard writer.canAdd(input) else { return false }
        writer.add(input)
        guard writer.startWriting() else { return false }
        writer.startSession(atSourceTime: .zero)

        let fps: Int32 = 30
        // ⚠️ SEVERAL WHOLE TURNS, at least six seconds a loop. One turn was a
        // 1.8-second video, and nobody saw it move on the lock screen
        // (2026-09-11); the system's own animated covers run for many seconds.
        // Whole turns keep the loop seamless.
        let turns = max(1, Int((6.0 / seconds).rounded(.up)))
        let frames = max(12, Int((seconds * Double(turns) * Double(fps)).rounded()))
        for i in 0..<frames {
            while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
            guard let pool = adaptor.pixelBufferPool else { return false }
            var made: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &made)
            guard let buffer = made else { return false }
            CVPixelBufferLockBaseAddress(buffer, [])
            if let ctx = SpinArt.context(w, h, data: CVPixelBufferGetBaseAddress(buffer),
                                         bytesPerRow: CVPixelBufferGetBytesPerRow(buffer)) {
                draw(ctx, w, h, angle: 2 * .pi * CGFloat(turns) * CGFloat(i) / CGFloat(frames))
            }
            CVPixelBufferUnlockBaseAddress(buffer, [])
            guard adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps)) else { return false }
        }
        input.markAsFinished()
        let finished = DispatchSemaphore(value: 0)
        writer.finishWriting { finished.signal() }
        finished.wait()
        guard writer.status == .completed else { return false }
        try? FileManager.default.removeItem(at: url)
        return (try? FileManager.default.moveItem(at: temp, to: url)) != nil
    }

    /// The ground, then the disc turned clockwise by `angle`, with its shadow.
    private func draw(_ ctx: CGContext, _ w: Int, _ h: Int, angle: CGFloat) {
        let width = CGFloat(w)
        let height = CGFloat(h)
        if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [top, bottom] as CFArray, locations: [0, 1]) {
            // A bitmap context's origin is bottom-left: the top colour starts at y = height.
            ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: height), end: .zero, options: [])
        }
        guard let disc = disc else { return }
        let size = min(width, height) * 0.86
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -size * 0.017), blur: size * 0.045,
                      color: UIColor(white: 0, alpha: 0.45).cgColor)
        ctx.translateBy(x: width / 2, y: height / 2)
        ctx.rotate(by: -angle)
        ctx.draw(disc, in: CGRect(x: -size / 2, y: -size / 2, width: size, height: size))
        ctx.restoreGState()
    }

    /// Even pixel sizes (H.264 needs them), and no bigger than 1600 on the long
    /// side — the same aspect ratio is all the system asks for.
    private static func pixels(_ size: CGSize) -> (Int, Int) {
        var w = max(64, size.width)
        var h = max(64, size.height)
        let longest = max(w, h)
        if longest > 1600 { w = w * 1600 / longest; h = h * 1600 / longest }
        return (Int(w) & ~1, Int(h) & ~1)
    }

    private static func context(_ w: Int, _ h: Int, data: UnsafeMutableRawPointer?, bytesPerRow: Int) -> CGContext? {
        CGContext(data: data, width: w, height: h, bitsPerComponent: 8, bytesPerRow: bytesPerRow,
                  space: CGColorSpaceCreateDeviceRGB(),
                  bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
    }

    private static func color(_ hex: String) -> CGColor {
        var value: UInt64 = 0
        Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))).scanHexInt64(&value)
        return UIColor(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255,
                       blue: CGFloat(value & 0xff) / 255, alpha: 1).cgColor
    }
}
