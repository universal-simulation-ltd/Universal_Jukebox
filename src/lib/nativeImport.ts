// "Add music from this device", through iOS's own audio-file picker.
//
// ⚠️ REPLACES the web `<input type="file" accept="audio/*">` wherever the shell
// registers `JukeboxFileImport` (iOS, `ios/App/App/FileImportPlugin.swift`).
// On iOS that input offered *Take Photo or Video* and *Photo Library* before it
// offered files — WKWebView ignores `accept` for its first menu — and what it
// did hand over had to cross the bridge as base64 to be written to disk. The
// native picker filters to audio, has no camera, and copies each file straight
// into the music folder; only a count comes back. The web input stays as the
// fallback everywhere this plugin is absent.

import { pluginRegistered } from './nativePlugins'

export const FILE_IMPORT_PLUGIN = 'JukeboxFileImport'

interface FileImportPlugin {
  importFiles(): Promise<{ imported?: number; names?: string[]; cancelled?: boolean }>
  readText(): Promise<{ name?: string; text?: string; cancelled?: boolean }>
}

let plugin: FileImportPlugin | null = null

/** Synchronous, so the first render already picks the right button. */
export function hasNativeImporter(): boolean {
  return pluginRegistered(FILE_IMPORT_PLUGIN)
}

/**
 * Registered lazily and NEVER returned through a promise: a Capacitor plugin is
 * a Proxy that answers every property — `then` included — with a native call,
 * so resolving a promise with it hangs forever. See `loadMusicFolder` in
 * `nativeFile.ts`, which found this first.
 */
async function load(): Promise<void> {
  if (plugin) return
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<FileImportPlugin>(FILE_IMPORT_PLUGIN)
}

/** How many files were copied in, or `null` when the picker was backed out of. */
export async function importWithNativePicker(): Promise<number | null> {
  await load()
  const result = await plugin!.importFiles()
  if (result.cancelled) return null
  return result.imported ?? 0
}

/**
 * One text file — a lyrics sheet — through the native picker, or `null` when
 * the picker was backed out of. iOS only; the web uses an `<input>`.
 */
export async function pickTextWithNativePicker(): Promise<{ name: string; text: string } | null> {
  await load()
  const result = await plugin!.readText()
  if (result.cancelled || typeof result.text !== 'string') return null
  return { name: result.name ?? 'lyrics', text: result.text }
}
