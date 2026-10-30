import Foundation
import UserNotifications
import UIKit
import Capacitor

/// A notification each time a new song starts — one, replaced every time, never
/// a stack (James, 2026-09-13: "replace each notification and don't stack
/// them"). The page decides when; this only shows it. See
/// `src/lib/trackNotify.ts`. With the page away (a locked phone) the engine
/// decides instead and posts the same card through `post`.
///
/// ⚠️ ONE FIXED IDENTIFIER is what stops the stack. A request under the
/// identifier of a notification already delivered takes that notification's
/// place — and alerts again, at the top of the list — instead of adding another.
///
/// ⚠️ NO SOUND, and `.alert` is all that is ever asked for: it arrives while
/// music is playing.
///
/// ⚠️ A SECOND CARD, `tag: "hits"`: the Hits shelf's lookups, paused while the
/// app is away (James, 2026-10-30, `src/stores/hitsStore.ts`). Its own fixed
/// identifier, so it replaces only itself and never the song's card.
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

    static let card = "uk.co.unisim.jukebox.now-playing"
    static let hits = "uk.co.unisim.jukebox.hits"

    /// The card a call is about: the song's, unless it names the Hits one.
    private static func cardId(for call: CAPPluginCall) -> String {
        call.getString("tag") == "hits" ? hits : card
    }
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
        let cover = call.getString("image").flatMap { Self.attachment($0) }
        Self.add(id: Self.cardId(for: call), title: call.getString("title") ?? "", body: call.getString("body") ?? "", cover: cover) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    /// The engine's way in (`JukeboxEngine.announce`): the same card, from a
    /// cover it already holds. Not allowed to post? `add` just fails, quietly.
    static func post(title: String, body: String, image: UIImage?) {
        let cover = image.flatMap { attachment(thumbnail($0)) }
        add(id: card, title: title, body: body, cover: cover) { _ in }
    }

    private static func add(id: String, title: String, body: String, cover: UNNotificationAttachment?, done: @escaping (Error?) -> Void) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = nil
        if let cover = cover { content.attachments = [cover] }
        let request = UNNotificationRequest(identifier: id, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request, withCompletionHandler: done)
    }

    /// 192 px square, as the page sends (`THUMB` in `trackNotify.ts`), as PNG.
    private static func thumbnail(_ image: UIImage) -> Data? {
        let side: CGFloat = 192
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).pngData { _ in
            image.draw(in: CGRect(x: 0, y: 0, width: side, height: side))
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        let id = Self.cardId(for: call)
        centre.removeDeliveredNotifications(withIdentifiers: [id])
        centre.removePendingNotificationRequests(withIdentifiers: [id])
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
        Data(base64Encoded: base64).flatMap { attachment($0) }
    }

    private static func attachment(_ data: Data?) -> UNNotificationAttachment? {
        guard let data = data else { return nil }
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
