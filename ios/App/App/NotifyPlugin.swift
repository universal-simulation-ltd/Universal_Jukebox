import Foundation
import UserNotifications
import Capacitor

/// A notification each time a new song starts — one, replaced every time, never
/// a stack (James, 2026-09-13: "replace each notification and don't stack
/// them"). The page decides when; this only shows it. See
/// `src/lib/trackNotify.ts`.
///
/// ⚠️ ONE FIXED IDENTIFIER is what stops the stack. A request under the
/// identifier of a notification already delivered takes that notification's
/// place — and alerts again, at the top of the list — instead of adding another.
///
/// ⚠️ NO SOUND, and `.alert` is all that is ever asked for: it arrives while
/// music is playing.
///
/// ⚠️ THE BANNER WHILE THE APP IS OPEN needs this plugin to be the bridge's
/// LOCAL-notification handler. With none, iOS files a notification that arrives
/// in the foreground straight into Notification Centre, with no banner.
/// Capacitor's own router is already the notification centre's delegate, so
/// taking its local slot — not the delegate itself — is the way in that leaves
/// push alone.
@objc(NotifyPlugin)
public class NotifyPlugin: CAPPlugin, CAPBridgedPlugin, NotificationHandlerProtocol {
    public let identifier = "NotifyPlugin"
    public let jsName = "JukeboxNotify"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "permission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    private static let card = "uk.co.unisim.jukebox.now-playing"
    private let centre = UNUserNotificationCenter.current()

    override public func load() {
        bridge?.notificationRouter.localNotificationHandler = self
    }

    @objc func permission(_ call: CAPPluginCall) {
        state { call.resolve(["state": $0]) }
    }

    @objc func request(_ call: CAPPluginCall) {
        centre.requestAuthorization(options: [.alert]) { _, _ in
            self.state { call.resolve(["state": $0]) }
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        let content = UNMutableNotificationContent()
        content.title = call.getString("title") ?? ""
        content.body = call.getString("body") ?? ""
        content.sound = nil
        if let image = call.getString("image"), let cover = Self.attachment(image) {
            content.attachments = [cover]
        }
        let request = UNNotificationRequest(identifier: Self.card, content: content, trigger: nil)
        centre.add(request) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        centre.removeDeliveredNotifications(withIdentifiers: [Self.card])
        centre.removePendingNotificationRequests(withIdentifiers: [Self.card])
        call.resolve()
    }

    public func willPresent(notification: UNNotification) -> UNNotificationPresentationOptions {
        return [.banner, .list]
    }

    public func didReceive(response: UNNotificationResponse) {
        // A tap has already brought the app forward, which is all it is for.
    }

    private func state(_ done: @escaping (String) -> Void) {
        centre.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: done("granted")
            case .denied: done("denied")
            default: done("prompt")
            }
        }
    }

    /// The cover, as a file iOS can attach. `add` moves it into the system's
    /// own store, so nothing is left behind in tmp.
    private static func attachment(_ base64: String) -> UNNotificationAttachment? {
        guard let data = Data(base64Encoded: base64) else { return nil }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("now-playing-\(UUID().uuidString).png")
        do {
            try data.write(to: url)
            return try UNNotificationAttachment(identifier: "cover", url: url, options: nil)
        } catch {
            return nil
        }
    }
}
