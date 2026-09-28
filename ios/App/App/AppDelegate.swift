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

    /// Hands every scene to `SceneDelegate`.
    ///
    /// ⚠️ This method, and the `UIApplicationSceneManifest` in Info.plist, are
    /// what make this app launch at all once it is built against the iOS 27
    /// SDK: an app that has not adopted the scene life cycle is terminated
    /// immediately. Both halves are required — a manifest alone does not
    /// satisfy it, because the runtime checks that the app delegate answers
    /// this call. See `SceneDelegate.swift`; `npm run check:ios-launch`
    /// guards all three pieces.
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

    // ⚠️ THE FIVE METHODS BELOW ARE NEVER CALLED under the scene life cycle —
    // iOS sends the equivalents to the scene delegate instead. Their
    // `[jukebox:native]` lifecycle log lines now live on `SceneDelegate`'s
    // `sceneWillResignActive`/`sceneDidEnterBackground`/… (same prefix, same
    // `AudioReport`). They are kept empty only because they are Capacitor's
    // template and their absence would read as a deletion; put nothing in
    // them. And per the note above, nothing on either side may touch the
    // audio session.

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    // ⚠️ Also never called under the scene life cycle. `SceneDelegate` takes
    // all three — a Home Screen shortcut tapped while running
    // (`windowScene(_:performActionFor:completionHandler:)`), a
    // `unisim-jukebox://` link and a Universal Link — and forwards them the
    // same way. Kept as the pre-scene fallback.

    /// A Home Screen shortcut tapped while the app was already running.
    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        ShortcutsBridge.receive(shortcutItem.type)
        completionHandler(true)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
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
