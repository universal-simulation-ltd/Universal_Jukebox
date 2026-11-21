import { pluginRegistered } from './nativePlugins'

// The Apple Watch remote (`ios/App/JukeboxWatch`). Only the iPhone app has the
// `JukeboxWatch` plugin, and the work behind it (`watchSync.ts`) is loaded
// only there — and only starts once the phone says the watch app is installed,
// so a phone with no watch never draws a cover for one.

export function installWatch(): void {
  if (!pluginRegistered('JukeboxWatch')) return
  void import('./watchSync').then((m) => m.startWatchSync())
}
