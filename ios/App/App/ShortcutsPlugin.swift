import Foundation
import UIKit
import Capacitor

/// The Home Screen shortcuts (James, 2026-09-11: "Long tap the app icon on
/// iPhone home I would like it to have options for; shuffle songs, shuffle
/// albums, shuffle artists. Like how the Claude app works").
///
/// The three items are static, in Info.plist (`UIApplicationShortcutItems`).
/// `AppDelegate` hands each tap to `ShortcutsBridge`, this plugin tells the page,
/// and the page does the playing (`src/lib/shortcuts.ts`).
///
/// ⚠️ A COLD LAUNCH REACHES `AppDelegate` BEFORE THIS PLUGIN OR THE PAGE EXISTS.
/// So the tap is kept (`pending`) and sent with `retainUntilConsumed`, which
/// holds the event until the page adds its listener — the page's library
/// loads first, and a shortcut that fired into nothing would be a dead icon.
extension Notification.Name {
    static let jukeboxShortcut = Notification.Name("JukeboxShortcut")
}

enum ShortcutsBridge {
    /// Main thread only.
    static var pending: String?
    private static var last: (action: String, at: Date)?

    /// `uk.co.unisim.jukebox.shuffle-albums` → `shuffle-albums`.
    static func receive(_ type: String) {
        let action = type.components(separatedBy: ".").last ?? type
        // A cold launch can report one tap twice: the launch options, then
        // `performActionFor`.
        if let last = last, last.action == action, Date().timeIntervalSince(last.at) < 2 { return }
        last = (action, Date())
        pending = action
        NotificationCenter.default.post(name: .jukeboxShortcut, object: nil)
    }
}

@objc(ShortcutsPlugin)
public class ShortcutsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShortcutsPlugin"
    public let jsName = "JukeboxShortcuts"
    public let pluginMethods: [CAPPluginMethod] = []

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(deliver), name: .jukeboxShortcut, object: nil)
        deliver()
    }

    @objc private func deliver() {
        DispatchQueue.main.async {
            guard let action = ShortcutsBridge.pending else { return }
            ShortcutsBridge.pending = nil
            print("[jukebox:native] home screen shortcut: \(action)")
            self.notifyListeners("shortcut", data: ["action": action], retainUntilConsumed: true)
        }
    }
}
