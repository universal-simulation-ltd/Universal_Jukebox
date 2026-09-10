// Is a native plugin of this name registered in the shell?
//
// Read from `Capacitor.PluginHeaders`, which the native bridge injects before
// any page script runs — so it can be answered SYNCHRONOUSLY on the first
// render, the same reason `isNativeShell` exists. `Capacitor.isPluginAvailable`
// cannot: it comes from `@capacitor/core`, which need not have loaded yet.
//
// ⚠️ The app-local iOS plugins (`ios/App/App/*Plugin.swift`) are registered in
// `JukeboxViewController.capacitorDidLoad()` for exactly this reason: that runs
// before the web view loads the page, so their headers are already here.

export function pluginRegistered(name: string): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; PluginHeaders?: { name?: string }[] } })
      .Capacitor
    if (cap?.isNativePlatform?.() !== true) return false
    const headers = cap.PluginHeaders
    return Array.isArray(headers) && headers.some((h) => h?.name === name)
  } catch {
    return false
  }
}
