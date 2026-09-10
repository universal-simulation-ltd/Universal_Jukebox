import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        // A phone call, Siri, an alarm: iOS takes the audio session away and
        // hands it back when the interruption ends. Take it back as `.playback`
        // then, rather than trusting whatever category it comes back as.
        NotificationCenter.default.addObserver(
            self, selector: #selector(audioInterrupted(_:)),
            name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(routeChanged(_:)),
            name: AVAudioSession.routeChangeNotification, object: nil)
        return true
    }

    /// The other half of background audio, and the half that is easy to miss.
    ///
    /// `UIBackgroundModes: audio` in Info.plist declares that this app INTENDS to
    /// keep playing; it does not grant it. The grant comes from the audio
    /// session's category, and the default a Capacitor WebView gets is not one
    /// that survives the lock screen — so with the plist key alone the music
    /// still stops the moment the screen goes off, and nothing anywhere reports
    /// an error. `.playback` is the category that says "this app's audio IS the
    /// point of it": it plays with the screen locked and it does NOT go silent
    /// on the ring/silent switch, which is right for a music player and wrong
    /// for almost anything else.
    ///
    /// ⚠️ Deliberately NOT `.mixWithOthers`. Without that option iOS stops
    /// whatever else is playing when this app starts, which is what a person
    /// expects of a music player — two players layered over each other is never
    /// what was wanted. It also means the lock-screen and Control Centre
    /// transport belongs to us, which is what makes the app's existing Media
    /// Session metadata (`lib/mediaSession.ts`) show up where a phone user
    /// looks for it.
    ///
    /// A failure here is logged and swallowed: an audio session that cannot be
    /// configured still plays in the foreground, so this must never stop launch.
    @objc private func audioInterrupted(_ note: Notification) {
        let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt ?? 99
        let reason = note.userInfo?[AVAudioSessionInterruptionReasonKey] as? UInt ?? 99
        print("[jukebox:native] audio interruption type=\(raw) reason=\(reason) \(AudioReport.now())")
        guard AVAudioSession.InterruptionType(rawValue: raw) == .ended else { return }
        configureAudioSession()
    }

    @objc private func routeChanged(_ note: Notification) {
        let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt ?? 99
        print("[jukebox:native] audio route change reason=\(reason) \(AudioReport.now())")
    }

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
        } catch {
            NSLog("[Jukebox] Could not configure the audio session for background playback: \(error)")
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        print("[jukebox:native] applicationWillResignActive \(AudioReport.now())")
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("[jukebox:native] applicationDidEnterBackground \(AudioReport.now())")
        // ⚠️ Re-asserted on the way into the background (James, 2026-09-10: the
        // music stopped when the app was minimised). WebKit manages the session
        // for its own media and can leave it in a category that does not
        // survive the app leaving the screen; `.playback` is the one that does.
        configureAudioSession()
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
