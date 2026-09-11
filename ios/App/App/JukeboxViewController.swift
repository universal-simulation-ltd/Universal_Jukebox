import UIKit
import Capacitor

/// The app's root view controller — Capacitor's own, plus the plugins that live
/// in this app rather than in an npm package.
///
/// ⚠️ WHY A SUBCLASS AND NOT `capacitor.config.json`. The generated config's
/// plugin list is rewritten by every `npx cap sync` and only ever lists npm
/// packages, so an app-local plugin declared there by hand silently vanishes on
/// the next sync. Android has the same trap and solves it the same way, in
/// `MainActivity`.
///
/// ⚠️ `capacitorDidLoad()` runs BEFORE the web view loads the page
/// (`CAPBridgeViewController.loadView`), which is what makes this safe:
/// `registerPluginInstance` pushes the plugin into `Capacitor.PluginHeaders` as a
/// document-start script, and `usesChosenFolder()` in `src/lib/nativeFile.ts`
/// reads those headers synchronously on the very first render. Registering any
/// later would leave the first render believing there was no folder plugin.
class JukeboxViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MusicFolderPlugin())
        // The iPhone's own music library (songs synced from a Mac) and the
        // native audio-file importer. Same timing rule as above: registered here
        // so both are in `PluginHeaders` before the first render reads them.
        bridge?.registerPluginInstance(AppleMusicPlugin())
        bridge?.registerPluginInstance(FileImportPlugin())
        // The lock screen's own picture — iOS 26's turning record.
        bridge?.registerPluginInstance(NowPlayingPlugin())
        // The Home Screen's Shuffle songs / albums / artists.
        bridge?.registerPluginInstance(ShortcutsPlugin())
        // How loud a song is, for "Stable volume".
        bridge?.registerPluginInstance(LoudnessPlugin())

        // ⚠️ THE EDGE SWIPE BACK (James, 2026-09-10: "Mobile should also have
        // the edge of screen side swipe to go back instead of having to use
        // navigation"). WKWebView ships the gesture and leaves it OFF; Capacitor
        // never turns it on. It walks the web view's own history — and every
        // screen change in this app is a `history.pushState` (`lib/route.ts`),
        // so a swipe is exactly the browser's Back: it pops the entry, the page
        // hears `popstate`, and `useRoute` in `App.tsx` moves the screen. No
        // gesture code of our own, and the on-screen "Back to your library"
        // links still work as before.
        // Set here because `loadView` has created the web view by now.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
