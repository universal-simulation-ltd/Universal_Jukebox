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
        return true
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

    func applicationWillResignActive(_ application: UIApplication) {
        print("[jukebox:native] applicationWillResignActive \(AudioReport.now())")
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("[jukebox:native] applicationDidEnterBackground \(AudioReport.now())")
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        print("[jukebox:native] applicationWillEnterForeground \(AudioReport.now())")
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        print("[jukebox:native] applicationDidBecomeActive \(AudioReport.now())")
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
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
