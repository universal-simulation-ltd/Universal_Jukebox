// mixer.ts — the Mix tab's sound: two records playing over each other, each
// one spun by hand (James, 2026-11-05, after Apple's 4.3 review: "a navigation
// tab for mixing — two records you choose, they play over each other and you
// can spin the discs to change their position and control speed").
//
//   deck A (worklet) ──▶ gain A ─┐
//                                ├──▶ destination
//   deck B (worklet) ──▶ gain B ─┘        (gains = the crossfader)
//
// ⚠️ ITS OWN AudioContext, NOT `audioGraph.ts`'s, and not the player's
// elements. Everything the main player does — the iPhone's AVPlayer engine,
// background play, the lock screen — is left exactly as it is; the mixer is a
// second, foreground-only instrument beside it. Starting a deck pauses the
// main player, and the main player starting pauses the decks (`MixScreen`),
// so the two are never heard over each other by accident.
//
// ⚠️ IN THE FOREGROUND ONLY, AND THAT IS FINE. iOS suspends an AudioContext
// when the app leaves the screen (`audioGraph.ts`'s header). Mixing is done
// with a finger on the record, so the screen pauses the decks when it goes
// away rather than pretending otherwise.
//
// ⚠️ A DECK HOLDS ITS WHOLE SONG DECODED IN MEMORY — the only way a record can
// be turned backwards under a finger. About 10 MB a stereo minute, so songs
// longer than `MAX_MIX_SEC` are refused before decoding, never half-loaded.

import { create } from 'zustand'
import { requestPlaybackSession } from './audioGraph'
import { noteEvent } from './bgLog'
import { crossfadeGains, clampSpeed } from './mixMath'
import { quickTimeMp3Frames } from './quickTimeMp3'
import type { Track } from './types'
import { useLibraryStore } from '../stores/libraryStore'

/** Longer than this cannot go on a deck: two of them would be too much memory for a phone. */
export const MAX_MIX_SEC = 15 * 60

export type DeckId = 0 | 1
export type DeckStatus = 'empty' | 'loading' | 'ready' | 'error'
export type DeckError = 'unplayable' | 'too_long' | 'unsupported'

export interface DeckState {
  track: Track | null
  status: DeckStatus
  error?: DeckError
  duration: number
  playing: boolean
  speed: number
}

interface MixState {
  decks: [DeckState, DeckState]
  /** -1 = all deck A, 1 = all deck B. */
  fader: number
}

const EMPTY: DeckState = { track: null, status: 'empty', duration: 0, playing: false, speed: 1 }

export const useMixStore = create<MixState>(() => ({
  decks: [{ ...EMPTY }, { ...EMPTY }],
  fader: 0,
}))

function patch(id: DeckId, change: Partial<DeckState>): void {
  useMixStore.setState((s) => {
    const decks = [...s.decks] as [DeckState, DeckState]
    decks[id] = { ...decks[id], ...change }
    return { decks }
  })
}

// ── The audio side ──────────────────────────────────────────────────────────

interface Engine {
  ctx: AudioContext
  nodes: [AudioWorkletNode, AudioWorkletNode]
  gains: [GainNode, GainNode]
}

/** Where each deck's record is, as last reported from the audio thread. */
const where = [
  { sec: 0, v: 0, at: 0 },
  { sec: 0, v: 0, at: 0 },
]

let engine: Promise<Engine | null> | null = null

/** Can this browser / WebView mix at all? */
export function mixSupported(): boolean {
  if (typeof window === 'undefined') return false
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return Boolean(Ctor && 'audioWorklet' in Ctor.prototype)
}

function startEngine(): Promise<Engine | null> {
  if (engine) return engine
  engine = (async () => {
    if (!mixSupported()) return null
    // Before the context exists, or the iPhone's ringer switch silences it.
    requestPlaybackSession()
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    await ctx.audioWorklet.addModule(new URL('./mixDeck.worklet.js', import.meta.url))
    const make = (id: DeckId) => {
      const node = new AudioWorkletNode(ctx, 'mix-deck', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
      const gain = ctx.createGain()
      node.connect(gain).connect(ctx.destination)
      node.port.onmessage = (e: MessageEvent) => {
        const m = e.data as { type: string; sec?: number; v?: number; playing?: boolean }
        if (m.type === 'pos') {
          where[id] = { sec: m.sec ?? 0, v: m.v ?? 0, at: performance.now() }
        } else if (m.type === 'ended') {
          patch(id, { playing: false })
        }
      }
      return { node, gain }
    }
    const a = make(0)
    const b = make(1)
    const built: Engine = { ctx, nodes: [a.node, b.node], gains: [a.gain, b.gain] }
    applyFader(built, useMixStore.getState().fader)
    return built
  })().catch((err) => {
    console.error('[jukebox] The mixer could not start:', err)
    engine = null
    return null
  })
  return engine
}

function applyFader(e: Engine, x: number): void {
  const [ga, gb] = crossfadeGains(x)
  const t = e.ctx.currentTime
  e.gains[0].gain.setTargetAtTime(ga, t, 0.01)
  e.gains[1].gain.setTargetAtTime(gb, t, 0.01)
}

function send(id: DeckId, message: Record<string, unknown>, transfer: Transferable[] = []): void {
  void startEngine().then((e) => e?.nodes[id].port.postMessage(message, transfer))
}

/** Each deck's newest load, so a slow decode never lands on top of a newer choice. */
const loads = [0, 0]

/** Put a song on a deck. Stops what was on it. */
export async function loadDeck(id: DeckId, track: Track): Promise<void> {
  const ticket = ++loads[id]
  const stale = () => ticket !== loads[id]
  patch(id, { track, status: 'loading', error: undefined, playing: false, duration: track.durationSec ?? 0 })
  where[id] = { sec: 0, v: 0, at: performance.now() }
  if (track.durationSec && track.durationSec > MAX_MIX_SEC) return patch(id, { status: 'error', error: 'too_long' })
  const e = await startEngine()
  if (stale()) return
  if (!e) return patch(id, { status: 'error', error: 'unsupported' })
  e.nodes[id].port.postMessage({ type: 'unload' })
  /** How far a load got, for the console and the saved background log when it fails. */
  let stage = 'prepare'
  try {
    // A Music-library song needs its copy made first; every other source
    // answers at once (`libraryStore.prepare`).
    const file = await useLibraryStore.getState().prepare(track)
    if (!file) throw new Error('no file')
    // ⚠️ A RANGE READ OF THE WHOLE FILE (`file.slice`), NEVER `fetch(trackUrl)`.
    // In the iPhone app a song is served by Capacitor's local file handler,
    // which answers a plain request for a media file (.m4a, .mp3, .mov…) with
    // a bare URLResponse rather than an HTTP one, so `fetch` saw no status and
    // EVERY song came back "can't be mixed" (James, 2026-11-05) — while the
    // `<audio>` player, which doesn't care, played them all. Asked for with a
    // Range it answers 206 like any server (`WebViewAssetHandler.swift`), and
    // that is the read the library scan already makes on the iPhone.
    // `NativeFile.slice` does exactly that; on the web it is `File.slice`.
    stage = 'read'
    const bytes = await file.slice(0, file.size).arrayBuffer()
    if (bytes.byteLength === 0) throw new Error('empty file')
    if (stale()) return
    stage = 'decode'
    // A Music-library MP3 arrives as MP3-in-QuickTime (.mov), which WebKit's
    // decoder refuses; its bare MP3 frames decode fine (`quickTimeMp3.ts`).
    const audio = await e.ctx.decodeAudioData(quickTimeMp3Frames(bytes) ?? bytes)
    if (stale()) return
    if (audio.duration > MAX_MIX_SEC) return patch(id, { status: 'error', error: 'too_long' })
    // Copies, so the AudioBuffer can be let go of once they are handed over.
    const left = new Float32Array(audio.getChannelData(0))
    const right = audio.numberOfChannels > 1 ? new Float32Array(audio.getChannelData(1)) : null
    e.nodes[id].port.postMessage({ type: 'load', left, right }, right ? [left.buffer, right.buffer] : [left.buffer])
    e.nodes[id].port.postMessage({ type: 'speed', value: useMixStore.getState().decks[id].speed })
    patch(id, { status: 'ready', duration: audio.duration })
  } catch (err) {
    if (stale()) return
    console.error(`[jukebox] Could not put “${track.title}” on a deck (${stage}):`, err)
    noteEvent('mix-load-failed', { stage, ext: track.ext, error: String(err) })
    patch(id, { status: 'error', error: 'unplayable' })
  }
}

/** Take the record off. */
export function clearDeck(id: DeckId): void {
  loads[id]++
  patch(id, { ...EMPTY, speed: useMixStore.getState().decks[id].speed })
  send(id, { type: 'unload' })
}

/** Start or stop a deck — the platter, so it spins up and down. */
export function setDeckPlaying(id: DeckId, on: boolean): void {
  const deck = useMixStore.getState().decks[id]
  if (on && deck.status !== 'ready') return
  // A record played to its end starts again from the top.
  if (on && deck.duration > 0 && deckSec(id) >= deck.duration - 0.05) send(id, { type: 'seek', sec: 0 })
  patch(id, { playing: on })
  void startEngine().then((e) => {
    if (!e) return
    if (on && e.ctx.state !== 'running') void e.ctx.resume()
    e.nodes[id].port.postMessage({ type: 'play', on })
  })
}

/** Stop both decks (the screen going away, or the main player starting). */
export function stopAllDecks(): void {
  for (const id of [0, 1] as const) if (useMixStore.getState().decks[id].playing) setDeckPlaying(id, false)
}

export function setDeckSpeed(id: DeckId, speed: number): void {
  const value = clampSpeed(speed)
  patch(id, { speed: value })
  send(id, { type: 'speed', value })
}

export function setFader(x: number): void {
  const fader = Math.max(-1, Math.min(1, x))
  useMixStore.setState({ fader })
  void startEngine().then((e) => e && applyFader(e, fader))
}

/** A finger lands on the record: it stops under it. */
export function holdDeck(id: DeckId): void {
  void startEngine().then((e) => {
    if (e && e.ctx.state !== 'running') void e.ctx.resume()
  })
  send(id, { type: 'hold' })
}

/** The held record turned by `sec` of music (negative = backwards). */
export function turnDeck(id: DeckId, sec: number): void {
  send(id, { type: 'turn', sec })
}

/** The finger lifts: the record picks up speed again, or carries on spinning down. */
export function releaseDeck(id: DeckId): void {
  send(id, { type: 'release' })
}

/** Turning the edge: a temporary push or drag on the speed (0 = none). */
export function bendDeck(id: DeckId, bend: number): void {
  send(id, { type: 'bend', value: bend })
}

/** Where a deck's record is now, in seconds — extrapolated between reports. */
export function deckSec(id: DeckId): number {
  const w = where[id]
  // No further than a few reports ahead: a suspended context stops reporting,
  // and the drawing must stop with it rather than spin on alone.
  const ahead = Math.min(0.08, (performance.now() - w.at) / 1000)
  return Math.max(0, w.sec + w.v * ahead)
}
