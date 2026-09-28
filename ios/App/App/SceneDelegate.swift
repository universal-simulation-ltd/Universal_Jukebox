import UIKit
import Capacitor

/// The window's owner under the **UIScene life cycle**, which iOS requires of
/// an app built against the iOS 27 SDK: without it the process is killed at
/// launch ("UIScene life cycle is required for apps built with this SDK"),
/// before any of our code or the web view runs.
///
/// This is Capacitor 8.5's own `SceneDelegate` template — the window built in
/// code, and every URL callback handed to Capacitor's `SceneDelegateProxy`,
/// which posts what `@capacitor/app`'s `appUrlOpen` and `getLaunchUrl()` read
/// (the `unisim-jukebox://` suite link and Universal Links), and holds a
/// cold-start URL back until the bridge's plugins are listening. Jukebox adds
/// three things the template does not have:
///
/// - `JukeboxViewController` as the root, not a plain `CAPBridgeViewController`;
/// - the Home Screen shortcuts (Shuffle songs / albums / artists), cold launch
///   and while running, into `ShortcutsBridge` — the proxy knows nothing of
///   quick actions;
/// - the `[jukebox:native]` lifecycle log lines with `AudioReport`, which are
///   what a report from the phone reads to see what iOS did to the audio
///   session on the way into and out of the background.
///
/// ⚠️ LOG ONLY. Per the note on `AppDelegate`, this app must never set a
/// category on, or activate, its own `AVAudioSession` — WebKit plays the music
/// from its own process with its own session, and a second non-mixable one
/// stops the music the moment the app is minimised. `UIBackgroundModes: audio`
/// in Info.plist is still all the background play needs. The scene callbacks
/// below are the natural place someone would "restore the session on
/// foreground"; don't.
///
/// ⚠️ Under the scene life cycle iOS never calls `AppDelegate`'s
/// `application(_:open:options:)`, `application(_:continue:…)`,
/// `application(_:performActionFor:…)` or the `applicationDid…`/
/// `applicationWill…` activity methods, and `launchOptions` no longer carries
/// the shortcut that launched the app. Anything that has to happen on a URL,
/// a shortcut or a foreground change belongs here.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // ⚠️ JukeboxViewController, NOT CAPBridgeViewController: it is what
        // registers the app-local plugins (music folder, Apple Music, Now
        // Playing, shortcuts, …) in `capacitorDidLoad()`. A plain bridge here
        // would launch fine and have no route to a single song.
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = JukeboxViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // A Home Screen shortcut that launched the app. Under scenes it is
        // here, not in `didFinishLaunchingWithOptions`'s `launchOptions`.
        // `ShortcutsBridge` keeps it pending until `ShortcutsPlugin` and the
        // page are ready, so the order against the bridge does not matter.
        if let item = connectionOptions.shortcutItem {
            ShortcutsBridge.receive(item.type)
        }
    }

    /// A Home Screen shortcut tapped while the app was already running.
    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        ShortcutsBridge.receive(shortcutItem.type)
        completionHandler(true)
    }

    // The `[jukebox:native]` lifecycle log — see the note at the top. Log only.

    func sceneWillResignActive(_ scene: UIScene) {
        print("[jukebox:native] sceneWillResignActive \(AudioReport.now())")
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        print("[jukebox:native] sceneDidEnterBackground \(AudioReport.now())")
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        print("[jukebox:native] sceneWillEnterForeground \(AudioReport.now())")
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        print("[jukebox:native] sceneDidBecomeActive \(AudioReport.now())")
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
