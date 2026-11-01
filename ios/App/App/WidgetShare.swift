import Foundation
import UIKit
import Security
import WidgetKit

/// What the "Resume listening" widget shows (`ios/App/JukeboxWidget/`): the
/// last song this app put on the lock screen, its album, and the record on
/// the machine that played it — the same picture as the lock screen's
/// (`src/lib/lockArt.ts`).
///
/// Written from `NowPlayingPlugin.show`, which the page calls once per track
/// change, so nothing on the web side knows the widget exists.
///
/// ⚠️ THROUGH THE KEYCHAIN, NOT AN APP GROUP. The widget runs in its own
/// process, and an App Group is the usual way to hand it data — but a NEW App
/// Group cannot be registered from the command line: `xcodebuild
/// -allowProvisioningUpdates` with the ASC API key answers "Authentication
/// failed: … bearer token" (handover 2026-09-29, again 2026-11-01). A keychain
/// access group under the team prefix needs no portal change at all, because
/// every team profile already allows `ZH9C5TS86A.*`. So one keychain item holds
/// the song and a small JPEG, readable by both targets
/// (`keychain-access-groups` in `App.entitlements` + `JukeboxWidget.entitlements`).
///
/// ⚠️ THE GROUP, SERVICE AND ACCOUNT ARE SHARED with `JukeboxWidget.swift`'s
/// `ResumeStore`, and the JSON shape with its `Saved`. Change one, change both.
enum WidgetShare {
    /// ⚠️ SECOND in `App.entitlements`' list, never first: the first group is
    /// where the SDK's keychain writes land when they name no group.
    static let accessGroup = "ZH9C5TS86A.uk.co.unisim.jukebox.widget"
    static let service = "uk.co.unisim.jukebox.widget"
    static let account = "resume"

    private static var last: String?

    /// Main thread. The image work and the write go to a background queue.
    static func save(title: String, artist: String, album: String, still: UIImage) {
        let key = "\(title)|\(artist)|\(album)"
        // A track that is shown twice (the page re-sends on a change-over)
        // would spend a widget reload for nothing.
        if key == last { return }
        last = key
        DispatchQueue.global(qos: .utility).async {
            // The widget draws it at most ~150 pt, and the item is read on
            // every reload: 360 px keeps it to a few tens of KB.
            let sleeve = scaled(still, to: 360).jpegData(compressionQuality: 0.8)?.base64EncodedString()
            let saved: [String: Any] = [
                "title": title, "artist": artist, "album": album,
                "at": Date().timeIntervalSince1970,
                "sleeve": sleeve ?? "",
            ]
            guard let data = try? JSONSerialization.data(withJSONObject: saved) else { return }
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account,
                kSecAttrAccessGroup as String: accessGroup,
            ]
            var status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
            if status == errSecItemNotFound {
                var add = query
                add[kSecValueData as String] = data
                // The Lock Screen widget reloads while the phone is locked.
                add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
                status = SecItemAdd(add as CFDictionary, nil)
            }
            if status != errSecSuccess {
                print("[jukebox:native] widget: keychain write failed, OSStatus \(status)")
                return
            }
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    private static func scaled(_ image: UIImage, to side: CGFloat) -> UIImage {
        let longest = max(image.size.width, image.size.height)
        guard longest > side else { return image }
        let factor = side / longest
        let size = CGSize(width: image.size.width * factor, height: image.size.height * factor)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}
