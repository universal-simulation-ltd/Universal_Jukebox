// The backup's side effects: reading the stores, writing them back, the file,
// and the Universal ID slot. What a backup IS, and why it looks like that, is
// in `backup.ts`; this file only moves it about.

import type { useUniversal } from '@unisim/sdk'
import {
  backupFileName, buildBackup, fitBackup, matchSongs, mergeRequests, mergeShelves, parseBackup,
  type JukeboxBackup, type LeftOut,
} from './backup'
import { putLyricRecord, uploadedLyrics } from './library'
import { CACHE_VERSION } from './lrclib'
import { isNativeShell } from './nativeFile'
import { useLibraryStore } from '../stores/libraryStore'
import { useRequestsStore } from '../stores/requestsStore'
import { settingsBlob, useSettingsStore } from '../stores/settingsStore'
import { useShelvesStore } from '../stores/shelvesStore'

/** The SDK's client, typed through the SDK rather than a package this app doesn't depend on. */
type SupabaseClient = ReturnType<typeof useUniversal>['supabase']

/** `app_settings_backups.app` — the SDK product code, as migration 0050 asks. */
const APP = 'jukebox'

export async function gatherBackup(): Promise<JukeboxBackup> {
  const library = useLibraryStore.getState()
  // ⚠️ Not while the example library is being tried: the shelves on screen are
  // the demo's, and a backup of them would overwrite the real ones' copy.
  if (library.trying) throw new Error('Go back to your own music first — the example library is being tried.')
  return buildBackup({
    settings: { ...settingsBlob(useSettingsStore.getState()) },
    shelves: useShelvesStore.getState().shelves,
    requests: useRequestsStore.getState().requests,
    lyrics: await uploadedLyrics(),
    tracks: library.tracks,
    now: Date.now(),
  })
}

export interface RestoreResult {
  /** Songs put back on shelves. */
  found: number
  /** Songs on the backup's shelves this library does not have (yet). */
  missing: number
  requests: number
  lyrics: number
}

export async function applyBackup(backup: JukeboxBackup): Promise<RestoreResult> {
  const library = useLibraryStore.getState()
  if (library.trying) throw new Error('Go back to your own music first — the example library is being tried.')
  if (library.status !== 'ready') throw new Error('Wait for your library to finish loading, then restore.')

  useSettingsStore.getState().restore(backup.settings)

  const shelves = mergeShelves(useShelvesStore.getState().shelves, backup.shelves, library.tracks)
  useShelvesStore.getState().replaceAll(shelves.shelves)

  const before = useRequestsStore.getState().requests
  const requests = mergeRequests(before, backup.requests)
  useRequestsStore.getState().replaceAll(requests)

  let lyrics = 0
  const songs = matchSongs(backup.lyrics.map((l) => l.song), library.tracks)
  for (const [i, track] of songs.entries()) {
    if (!track) continue
    try {
      await putLyricRecord({ id: track.id, raw: backup.lyrics[i].raw, at: Date.now(), source: 'upload', v: CACHE_VERSION })
      lyrics++
    } catch { /* storage off — the rest still restore */ }
  }

  return {
    found: shelves.found,
    missing: shelves.missing,
    requests: requests.filter((r) => !before.some((b) => b.id === r.id)).length,
    lyrics,
  }
}

// ── A file ───────────────────────────────────────────────────────────────────

/**
 * Save the backup as a file, and say where it went.
 *
 * ⚠️ IN THE PHONE APPS IT IS WRITTEN TO `Directory.Documents`, because neither
 * web view saves a download. On iOS that is the app's own folder in Files (On
 * My iPhone › Universal Jukebox) — the one the library already scans, which
 * ignores a .json. On Android it is the shared Documents folder, where an app
 * may write (and see) its own files under scoped storage — see the note on
 * `usesChosenFolder` in `nativeFile.ts`. From either, Files can move it to
 * Proton Drive or anywhere else. Everywhere else, an ordinary download.
 */
export async function saveBackupFile(backup: JukeboxBackup): Promise<string> {
  const name = backupFileName(backup.savedAt)
  const text = JSON.stringify(backup, null, 1)
  if (isNativeShell()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: name, data: text, directory: Directory.Documents, encoding: Encoding.UTF8 })
    return name
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // After the click has been handled; revoking at once can cancel it.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  return name
}

export async function readBackupFile(file: File): Promise<JukeboxBackup> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file isn’t a Jukebox backup.')
  }
  const backup = parseBackup(parsed)
  if (!backup) throw new Error('That file isn’t a Jukebox backup, or it was made by a newer version of the app.')
  return backup
}

// ── Your Universal ID ────────────────────────────────────────────────────────

export interface OnlineSaved {
  savedAt: number
  left: LeftOut
}

/** Back up to the signed-in account. Null when even the bare backup is too big for the slot. */
export async function saveOnline(supabase: SupabaseClient, userId: string, backup: JukeboxBackup): Promise<OnlineSaved | null> {
  const fitted = fitBackup(backup)
  if (!fitted) return null
  const { error } = await supabase
    .from('app_settings_backups')
    .upsert({ user_id: userId, app: APP, data: fitted.backup }, { onConflict: 'user_id,app' })
  if (error) throw new Error(`Couldn’t back up: ${error.message}`)
  return { savedAt: fitted.backup.savedAt, left: fitted.left }
}

/** The account's backup, or null when it has none. */
export async function loadOnline(supabase: SupabaseClient): Promise<JukeboxBackup | null> {
  const { data, error } = await supabase.from('app_settings_backups').select('data').eq('app', APP).maybeSingle()
  if (error) throw new Error(`Couldn’t read your backup: ${error.message}`)
  return data ? parseBackup((data as { data: unknown }).data) : null
}

/** Remove the account's backup — the honest answer to "delete what you hold". */
export async function deleteOnline(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from('app_settings_backups').delete().eq('app', APP)
  if (error) throw new Error(`Couldn’t delete your backup: ${error.message}`)
}
