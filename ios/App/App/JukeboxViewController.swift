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
    }
}
