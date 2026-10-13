import Foundation
import UIKit
import AVKit
import Capacitor

/// The page's handle on `JukeboxEngine` — `src/lib/audioEngine.ts` is the other
/// end. Every call hops onto the main thread, where the engine lives; events
/// come back as `state`, `ended`, `error`, `changed`, `command`, `route` and
/// `previewEnded` (what each means is on `JukeboxEngine`'s emitters).
@objc(JukeboxEnginePlugin)
public class JukeboxEnginePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JukeboxEnginePlugin"
    public let jsName = "JukeboxEngine"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "crossfade", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "duck", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restart", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLevel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUpcoming", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "preview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPreviewVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stash", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playClip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRoutePicker", returnType: CAPPluginReturnPromise),
    ]

    private var engine: JukeboxEngine { JukeboxEngine.shared }

    override public func load() {
        engine.emit = { [weak self] name, data in
            self?.notifyListeners(name, data: data)
        }
    }

    private func onMain(_ call: CAPPluginCall, _ work: @escaping () -> Void) {
        DispatchQueue.main.async {
            work()
            call.resolve()
        }
    }

    @objc func enable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.engine.enable()
            call.resolve(["away": JukeboxEngine.routedAway()])
        }
    }

    @objc func configure(_ call: CAPPluginCall) {
        let volume = call.getDouble("volume")
        let muted = call.getBool("muted")
        let fadeIn = call.getDouble("fadeInSec")
        let fadeOut = call.getDouble("fadeOutSec")
        let gain = call.getDouble("outputGain")
        onMain(call) { self.engine.configure(volume: volume, muted: muted, fadeIn: fadeIn, fadeOut: fadeOut, outputGain: gain) }
    }

    @objc func load(_ call: CAPPluginCall) {
        guard let entry = JukeboxEngine.Entry(call.getObject("entry")) else {
            call.reject("No song was sent.", "BAD_ARGS")
            return
        }
        let seq = call.getInt("seq")
        let autoplay = call.getBool("autoplay") ?? true
        let fadeIn = call.getDouble("fadeInSec")
        let startAt = call.getDouble("startAt") ?? 0
        let level = call.getDouble("level")
        onMain(call) {
            guard self.engine.accepts(seq: seq) else { return }
            self.engine.load(entry, autoplay: autoplay, fadeInOverride: fadeIn, startAt: startAt, level: level, fromPage: true)
        }
    }

    @objc func crossfade(_ call: CAPPluginCall) {
        guard let entry = JukeboxEngine.Entry(call.getObject("entry")) else {
            call.reject("No song was sent.", "BAD_ARGS")
            return
        }
        let seq = call.getInt("seq")
        let seconds = call.getDouble("seconds") ?? 1.8
        let hold = call.getDouble("holdSec") ?? 0
        let curve = JukeboxEngine.Curve(rawValue: call.getString("curve") ?? "") ?? .staggered
        let level = call.getDouble("level")
        onMain(call) {
            guard self.engine.accepts(seq: seq) else { return }
            self.engine.crossfade(entry, seconds: seconds, hold: hold, curve: curve, level: level, fromPage: true)
        }
    }

    @objc func play(_ call: CAPPluginCall) { onMain(call) { self.engine.play() } }
    @objc func pause(_ call: CAPPluginCall) { onMain(call) { self.engine.pause() } }
    @objc func stop(_ call: CAPPluginCall) { onMain(call) { self.engine.stop() } }

    @objc func seek(_ call: CAPPluginCall) {
        let seconds = call.getDouble("seconds") ?? 0
        onMain(call) { self.engine.seek(seconds) }
    }

    @objc func duck(_ call: CAPPluginCall) {
        let seconds = call.getDouble("seconds") ?? 0.3
        let seq = call.getInt("seq")
        onMain(call) {
            guard self.engine.accepts(seq: seq) else { return }
            self.engine.duck(seconds)
        }
    }

    @objc func restart(_ call: CAPPluginCall) {
        let fadeIn = call.getDouble("fadeInSec")
        let seq = call.getInt("seq")
        onMain(call) {
            guard self.engine.accepts(seq: seq) else { return }
            self.engine.restart(fadeInOverride: fadeIn)
        }
    }

    @objc func setLevel(_ call: CAPPluginCall) {
        let level = call.getDouble("level") ?? 1
        onMain(call) { self.engine.setLevel(level) }
    }

    @objc func setUpcoming(_ call: CAPPluginCall) {
        let current = JukeboxEngine.Entry(call.getObject("current"))
        let entries = (call.getArray("upcoming") ?? []).compactMap { JukeboxEngine.Entry($0 as? [String: Any]) }
        let previous = JukeboxEngine.Entry(call.getObject("previous"))
        let repeatOne = call.getObject("repeatOne").map { JukeboxEngine.Transition($0) }
        let wrap = call.getBool("wrap") ?? false
        let limits = JukeboxEngine.Limits(call.getObject("limits"))
        let stable = call.getBool("stableVolume") ?? true
        let cueLevel = call.getDouble("cueLevel") ?? 0.5
        let notify = call.getBool("notify") ?? false
        let pageSeq = call.getInt("seq") ?? 0
        onMain(call) {
            self.engine.setUpcoming(current: current, entries: entries, previous: previous, repeatOne: repeatOne,
                                    wrap: wrap, limits: limits, stableVolume: stable, cueLevel: cueLevel,
                                    notify: notify, pageSeq: pageSeq)
        }
    }

    @objc func setSleep(_ call: CAPPluginCall) {
        let endsAt = call.getDouble("endsAt").map { Date(timeIntervalSince1970: $0 / 1000) }
        let fade = call.getDouble("fadeSec") ?? 60
        onMain(call) { self.engine.setSleep(endsAt: endsAt, fadeSec: fade) }
    }

    @objc func preview(_ call: CAPPluginCall) {
        let url = call.getString("url").flatMap { URL(string: $0) }
        let mediaId = call.getString("mediaId").flatMap { UInt64($0) }
        let volume = call.getDouble("volume") ?? 1
        onMain(call) { self.engine.startPreview(url: url, mediaId: mediaId, volume: volume) }
    }

    @objc func stopPreview(_ call: CAPPluginCall) { onMain(call) { self.engine.stopPreview() } }

    @objc func setPreviewVolume(_ call: CAPPluginCall) {
        let volume = call.getDouble("volume") ?? 1
        onMain(call) { self.engine.setPreviewVolume(volume) }
    }

    /// A file the page has only as bytes — the example library's songs, the
    /// rendered start-up cues — written where the engine can open it.
    /// Resolves `{ uri }`. Kept in Caches: all of it can be made again.
    @objc func stash(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), let base64 = call.getString("base64") else {
            call.reject("Nothing to keep.", "BAD_ARGS")
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("jukebox-engine", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let safe = name.replacingOccurrences(of: "[^A-Za-z0-9._-]", with: "_", options: .regularExpression)
            let url = dir.appendingPathComponent(safe)
            guard let data = Data(base64Encoded: base64) else {
                call.reject("Those bytes were not readable.", "BAD_ARGS")
                return
            }
            let size = (try? FileManager.default.attributesOfItem(atPath: url.path))?[.size] as? Int
            if size != data.count {
                do {
                    try data.write(to: url, options: .atomic)
                } catch {
                    call.reject("Could not keep the file: \(error.localizedDescription)", "WRITE_FAILED")
                    return
                }
            }
            call.resolve(["uri": url.absoluteString])
        }
    }

    @objc func playClip(_ call: CAPPluginCall) {
        guard let url = call.getString("uri").flatMap({ URL(string: $0) }) else {
            call.reject("No clip was named.", "BAD_ARGS")
            return
        }
        let volume = call.getDouble("volume") ?? 0.5
        onMain(call) { self.engine.playClip(url, volume: volume) }
    }

    @objc func getState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let snapshot = self.engine.fullSnapshot()
            call.resolve(JSTypes.coerceDictionaryToJSObject(snapshot) ?? [:])
        }
    }

    /// The system's own route sheet (speaker, headphones, AirPlay) — the
    /// Output button, now that no `<audio>` element is playing to ask WebKit
    /// for one. `AVRoutePickerView` has no "show" method, so its button is
    /// tapped for it; the view is kept, invisible, in the bridge's view.
    @objc func showRoutePicker(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController?.view else {
                call.reject("No view to show it from.", "NO_VIEW")
                return
            }
            let picker = self.routePicker ?? {
                let made = AVRoutePickerView(frame: CGRect(x: host.bounds.midX, y: host.bounds.midY, width: 1, height: 1))
                made.alpha = 0.011
                made.isUserInteractionEnabled = false
                host.addSubview(made)
                self.routePicker = made
                return made
            }()
            let button = picker.subviews.compactMap { $0 as? UIButton }.first
            button?.sendActions(for: .touchUpInside)
            call.resolve(["shown": button != nil])
        }
    }

    private var routePicker: AVRoutePickerView?
}
