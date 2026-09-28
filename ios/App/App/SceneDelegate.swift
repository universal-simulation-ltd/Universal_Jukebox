import UIKit
import Capacitor

/// The window's owner under the **UIScene life cycle**, which iOS requires of
/// an app built against the iOS 27 SDK.
///
/// ⚠️ WHY THIS FILE EXISTS. An app built against that SDK that still uses the
/// old `UIApplicationDelegate` window life cycle — a `window` property on the
/// app delegate and no scene manifest — is **killed the moment it launches**,
/// with `UIScene life cycle is required for apps built with this SDK` in the
/// device log. There is no in-app symptom to debug: the process is gone before
/// any of our code, or the web view, runs. A build made against an older SDK
/// (Xcode 26), or run on an older OS, launches perfectly well, which is why it
/// cannot be seen until the day the Mac moves to Xcode 27.
///
/// Capacitor adopted scenes in 8.5; this app is on an earlier version, so the
/// adoption is written out by hand here, ported from Universal PDF (the suite's
/// reference copy). It mirrors Capacitor's own `SceneDelegate` template, with
/// the one difference that Capacitor 8.5's `SceneDelegateProxy` does not exist
/// here — the launch payload is forwarded to `ApplicationDelegateProxy`
/// instead, which is what `@capacitor/app`'s `getLaunchUrl()` and `appUrlOpen`
/// read on this version.
///
/// ⚠️ Under the scene life cycle iOS stops calling `AppDelegate`'s
/// `application(_:open:options:)`, `application(_:continue:…)` and the four
/// `applicationDid…`/`applicationWill…` activity methods, AND
/// `application(_:performActionFor:…)` — and `launchOptions` no longer carries
/// the Home Screen shortcut that launched the app. Everything Jukebox had in
/// them is re-implemented below:
///
/// - the `unisim-jukebox://` suite link and Universal Links;
/// - the Home Screen shortcuts (Shuffle songs / albums / artists), cold launch
///   and while running, into `ShortcutsBridge` exactly as before;
/// - the `[jukebox:native]` lifecycle log lines with `AudioReport`, which are
///   what a report from the phone reads to see what iOS did to the audio
///   session on the way into and out of the background.
///
/// ⚠️ LOG ONLY. Per the note on `AppDelegate`, this app must never set a
/// category on, or activate, its own `AVAudioSession` — WebKit plays the music
/// from its own process with its own session, and a second non-mixable one
/// stops the music the moment the app is minimised. `UIBackgroundModes: audio`
/// in Info.plist is still all the background play needs, and it is untouched.
/// The scene callbacks below are the natural place someone would "restore the
/// session on foreground"; don't.
///
/// **Do not put new logic in those AppDelegate methods — it will never run.**
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // ⚠️ JukeboxViewController, NOT CAPBridgeViewController: it is what
        // registers the app-local plugins (music folder, Apple Music, Now
        // Playing, shortcuts, …) in `capacitorDidLoad()`. It used to be named
        // by Main.storyboard; with a scene delegate that builds its own window
        // the storyboard is not used, so a plain bridge here would launch fine
        // and have no route to a single song.
        let root = JukeboxViewController()
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = root
        window?.makeKeyAndVisible()

        // ⚠️ Load-bearing. A cold start that was STARTED BY a link delivers it
        // in `connectionOptions`, not through `scene(_:openURLContexts:)`.
        // Forwarding it before the bridge exists would drop it on the floor:
        // the notifications the Capacitor plugins listen for are posted to
        // nobody until `CapacitorBridge` has registered them, which happens
        // inside the view controller's `loadView()`. `loadViewIfNeeded()` makes
        // that ordering explicit rather than a side effect of
        // `makeKeyAndVisible()`.
        root.loadViewIfNeeded()

        if !connectionOptions.urlContexts.isEmpty {
            self.scene(scene, openURLContexts: connectionOptions.urlContexts)
        }
        for userActivity in connectionOptions.userActivities {
            self.scene(scene, continue: userActivity)
        }
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

    /// A `unisim-jukebox://` link (another suite app opening this one) handed over
    /// while the app is already running.
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared,
                open: context.url,
                options: Self.openURLOptions(from: context.options)
            )
        }
    }

    /// A Universal Link.
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared,
            continue: userActivity,
            restorationHandler: { _ in }
        )
    }

    /// `UIScene.OpenURLOptions` and `UIApplication.OpenURLOptionsKey` carry the
    /// same three values under different types. Capacitor only speaks the
    /// application form, so they are translated rather than dropped.
    private static func openURLOptions(
        from sceneOptions: UIScene.OpenURLOptions
    ) -> [UIApplication.OpenURLOptionsKey: Any] {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
        if let sourceApplication = sceneOptions.sourceApplication {
            options[.sourceApplication] = sourceApplication
        }
        if let annotation = sceneOptions.annotation {
            options[.annotation] = annotation
        }
        options[.openInPlace] = sceneOptions.openInPlace
        return options
    }
}
