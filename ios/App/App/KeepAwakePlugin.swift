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
@objc(KeepAwakePlugin)
public class KeepAwakePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeepAwakePlugin"
    public let jsName = "JukeboxKeepAwake"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    @objc func set(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = on
            call.resolve()
        }
    }
}
