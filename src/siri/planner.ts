import { decideSearch, decideShortcut, resumeQueue, type Decision, type PlanAlbum, type PlanTrack, type SavedPlace } from '../lib/voicePlan'
import type { VoiceRequest } from '../lib/voiceSearch'

// Siri on a LOCKED iPhone (James, 2026-11-03: "allow Siri so that the user
// doesn't have to unlock for every operation even if they're playing in the
// app already").
//
// The page's JavaScript stops within a second of the lock (probe 3,
// 2026-10-07), so "shuffle songs" or "play Mika" can't be handed to it. This
// file is bundled on its own (`scripts/build-planner.mjs` → `siri-planner.js`)
// and run by JavaScriptCore from `SiriIntents.swift`, against the library the
// page wrote down while it was awake (`siriManifest` in `playerStore`). It
// decides with `lib/voicePlan.ts` — the very code the page decides with — and
// answers which songs to play, in what order. The Swift side turns those into
// engine entries and starts the native engine.
//
// ⚠️ NO DOM, NO STORE, NO IMPORTS BEYOND `voicePlan.ts`. JavaScriptCore has no
// `window`, no `localStorage`, no `fetch`; `planner.test.ts` runs the built
// bundle in a bare `vm` context to keep it that way.

export interface PlannerInput {
  /** A shortcut action (`shuffle-songs`, `play`, …), or `search`. */
  action: string
  /** For `search`: what Siri heard (`SiriMedia.event` in Swift). */
  request?: VoiceRequest & { shuffle?: boolean }
  seed: number
  /** Whether the engine has a song on its deck, and whether it is playing. */
  hasSong: boolean
  playing: boolean
  /** The manifest's text — parsed here rather than handed over as an object. */
  manifest: string
  /**
   * Where "Resume listening" would pick up (`setResume`) — kept apart from the
   * manifest, which is written far less often than this changes.
   */
  session?: (SavedPlace & { sec?: number }) | null
}

export type PlannerOutput =
  /** Already playing: "play music" has nothing to do. */
  | { do: 'nothing' }
  /** Carry on with the song on the engine's deck. */
  | { do: 'resume' }
  | { do: 'queue'; ids: string[]; at: number; shuffle: boolean; startSec: number }
  | { do: 'none'; asked: string }
  /** No songs the engine can open (an empty library, or only the example). */
  | { do: 'empty' }

interface Manifest {
  tracks: PlanTrack[]
  albums: PlanAlbum[]
  session?: (SavedPlace & { sec?: number }) | null
}

export function plan(input: PlannerInput): PlannerOutput {
  const manifest = JSON.parse(input.manifest) as Manifest
  const library = { tracks: manifest.tracks ?? [], albums: manifest.albums ?? [] }
  if (library.tracks.length === 0) return { do: 'empty' }
  const decision: Decision =
    input.action === 'search'
      ? decideSearch(input.request ?? {}, library, input.seed)
      : decideShortcut(input.action, library, input.seed)

  if (decision.kind === 'none') return { do: 'none', asked: decision.asked }
  if (decision.kind === 'queue') return queue(decision.tracks, decision.at, decision.shuffle, 0)

  // "Play music" — `playMusic` in `lib/shortcuts.ts`: what is loaded, then
  // the saved session, then a shuffle of every song.
  if (input.playing) return { do: 'nothing' }
  if (input.hasSong) return { do: 'resume' }
  const session = input.session ?? manifest.session ?? null
  const saved = session ? resumeQueue(session, library.tracks) : null
  if (saved) return queue(saved.tracks, saved.at, false, session?.sec ?? 0)
  const all = decideShortcut('shuffle-songs', library, input.seed)
  return all.kind === 'queue' ? queue(all.tracks, all.at, all.shuffle, 0) : { do: 'empty' }
}

function queue(tracks: readonly PlanTrack[], at: number, shuffle: boolean, startSec: number): PlannerOutput {
  if (tracks.length === 0) return { do: 'empty' }
  return { do: 'queue', ids: tracks.map((t) => t.id), at, shuffle, startSec }
}

/** What Swift calls: JSON in, JSON out — strings are all JavaScriptCore hands across cleanly. */
export function planJSON(input: string): string {
  try {
    return JSON.stringify(plan(JSON.parse(input) as PlannerInput))
  } catch (error) {
    return JSON.stringify({ do: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
