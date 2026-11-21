import Foundation
import Capacitor

/// The page's handle on the Apple Watch remote — `src/lib/watchSync.ts` is the
/// other end, `WatchBridge.swift` does the work.
///
///   - `getStatus()` → `{ paired, installed, reachable }`; a `status` event
///     follows every change, so the page starts making covers only once a
///     watch has the app.
///   - `setLibrary({ json, thumbs })` — the library as the watch shows it
///     (`src/lib/watchLibrary.ts`) and a base64 JPEG cover per album id.
@objc(WatchPlugin)
public class WatchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchPlugin"
    public let jsName = "JukeboxWatch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLibrary", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        WatchBridge.shared.onStatus = { [weak self] status in
            self?.notifyListeners("status", data: status)
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(WatchBridge.shared.status) }
    }

    /// Off the main thread: with covers it can be a couple of hundred kilobytes.
    @objc func setLibrary(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("No library was sent.", "BAD_ARGS")
            return
        }
        var thumbs: [String: String] = [:]
        for (id, value) in call.getObject("thumbs") ?? [:] {
            if let text = value as? String { thumbs[id] = text }
        }
        DispatchQueue.global(qos: .utility).async {
            if WatchBridge.shared.setLibrary(json: json, thumbs: thumbs) { call.resolve() }
            else { call.reject("The library could not be kept.", "WRITE_FAILED") }
        }
    }
}
