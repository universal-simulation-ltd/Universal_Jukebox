import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Observed for the `[jukebox:native]` log only — see `audioInterrupted`.
        NotificationCenter.default.addObserver(
            self, selector: #selector(audioInterrupted(_:)),
            name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(routeChanged(_:)),
            name: AVAudioSession.routeChangeNotification, object: nil)
        // A Home Screen shortcut that launched the app — see `ShortcutsPlugin`.
        // ⚠️ Pre-scene path only: under the scene life cycle iOS leaves the
        // shortcut out of `launchOptions` and hands it to `SceneDelegate` in
        // its connection options instead. Kept for a build that runs without
        // scenes; `ShortcutsBridge` ignores a second report of one tap.
        if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
            ShortcutsBridge.receive(item.type)
        }
        return true
    }

    /// Hands every scene to `SceneDelegate` — Capacitor 8.5's template.
    ///
    /// ⚠️ This and the `UIApplicationSceneManifest` in Info.plist are both
    /// required: the runtime asks the app delegate rather than trusting the
    /// plist alone. `npm run check:ios-launch` fails the build if either goes.
    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    /// ⚠️ THIS APP DOES NOT TOUCH ITS OWN AUDIO SESSION — and must not.
    ///
    /// The music is an `<audio>` element, and WebKit plays it from its own
    /// process with its own audio session, which it sets to media playback
    /// whenever a media element is playing. Until 2026-09-10 this file also set
    /// `.playback` and activated the APP's session — at launch, after every
    /// interruption, and again on entering the background. On James's iPhone
    /// the music stopped whenever he minimised the app, and this was why:
    /// starting a
    /// song logged an interruption of the app's session with `otherAudio=true`
    /// (the "other audio" being our own song, in WebKit's process), and
    /// re-activating on the way into the background, non-mixable, cut WebKit's
    /// playback off — the `<audio>` was found paused, or stalled, as the page
    /// went hidden. Two non-mixable sessions in one app fight each other. With
    /// this code gone, the first test on the phone played on while hidden
    /// (0:05 → 0:09.8 across the trip) where every build before had stalled at
    /// once.
    ///
    /// `UIBackgroundModes: audio` in Info.plist is still what lets the app keep
    /// running while WebKit plays; WebKit holds the assertion while audible
    /// media is playing.
    ///
    /// The observers below only log (`[jukebox:native]`), so a future report
    /// from the phone says what iOS did to the session.
    @objc private func audioInterrupted(_ note: Notification) {
        let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 99
        // ⚠️ The REASON key only exists from iOS 14.5, and this app supports
        // 14.0 — reading it unguarded fails the build, not the run.
        var reason: UInt = 99
        if #available(iOS 14.5, *) {
            reason = note.userInfo?[AVAudioSessionInterruptionReasonKey] as? UInt ?? 99
        }
        print("[jukebox:native] audio interruption type=\(raw) reason=\(reason) \(AudioReport.now())")
    }

    @objc private func routeChanged(_ note: Notification) {
        let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 99
        print("[jukebox:native] audio route change reason=\(reason) \(AudioReport.now())")
    }

    // ⚠️ Capacitor's template also carries application(_:open:options:),
    // application(_:continue:restorationHandler:) and the four
    // applicationDid…/applicationWill… activity methods, and this app had
    // application(_:performActionFor:) for its Home Screen shortcuts. Under the
    // scene life cycle iOS never calls any of them, so they are not here: a
    // suite link and a Universal Link arrive at `SceneDelegate`, which hands
    // them to Capacitor's `SceneDelegateProxy`; a shortcut arrives there too
    // (`windowScene(_:performActionFor:completionHandler:)`), and the
    // `[jukebox:native]` lifecycle log lines live on its `scene…` methods. Put
    // nothing that must run on a URL, a shortcut or a foreground change in
    // this file — and per the note above, nothing on either side may touch
    // the audio session.

    func applicationWillTerminate(_ application: UIApplication) {
    }

}

/// One line about the audio session, for the `[jukebox:native]` lifecycle log —
/// the native half of the background-playback investigation (2026-09-10). What
/// iOS thinks the session is at each step is the thing that decides whether the
/// music is allowed to keep going.
enum AudioReport {
    static func now() -> String {
        let session = AVAudioSession.sharedInstance()
        return "category=\(session.category.rawValue) otherAudio=\(session.isOtherAudioPlaying) state=\(UIApplication.shared.applicationState.rawValue)"
    }
}
