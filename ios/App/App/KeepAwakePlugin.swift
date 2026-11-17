import UIKit
import Capacitor

/// "Keep awake" on Now Playing: the screen neither dims nor locks while it is
/// on, so the lyrics can be read along to. See `src/lib/keepAwake.ts`, which
/// turns it on for that page and off again on leaving it.
///
/// ⚠️ THE IDLE TIMER, NOT `navigator.wakeLock`. A WKWebView can report the web
/// API and still let the phone lock; this is the switch iOS itself honours. It
/// only ever applies while the app is in front, so there is nothing to undo when
/// it goes to the background.
///
/// ⚠️ SETTING IT ONCE IS NOT ENOUGH. iOS can put the idle timer back on behind
/// the app's back once the app stops being active — Siri, Control Centre, the
/// notification shade, a call, the app switcher — and the page is never told.
/// James saw it (2026-11-17): Keep awake still showed on and the phone locked
/// after the usual Auto-Lock time. So the wanted state lives here, and
/// `SceneDelegate.sceneDidBecomeActive` calls `reassert()` every time the app
/// comes back to the front.
@objc(KeepAwakePlugin)
public class KeepAwakePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeepAwakePlugin"
    public let jsName = "JukeboxKeepAwake"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    /// What the page last asked for. Main thread only.
    private static var wanted = false

    @objc func set(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            KeepAwakePlugin.wanted = on
            KeepAwakePlugin.apply(on)
            CommandLog.note("keep awake \(on ? "on" : "off")")
            call.resolve()
        }
    }

    /// Puts the idle timer back the way the page asked for it. Main thread.
    static func reassert() {
        guard wanted else { return }
        apply(true)
        CommandLog.note("keep awake reasserted")
    }

    /// ⚠️ OFF, THEN ON. If iOS has re-enabled the timer while the property still
    /// reads `true`, setting `true` again is a no-op; the toggle makes iOS take it.
    private static func apply(_ on: Bool) {
        if on { UIApplication.shared.isIdleTimerDisabled = false }
        UIApplication.shared.isIdleTimerDisabled = on
    }
}
