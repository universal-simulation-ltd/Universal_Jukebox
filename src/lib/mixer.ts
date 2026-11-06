// mixer.ts — the Mix tab's sound: two records playing over each other, each
// one spun by hand (James, 2026-11-05, after Apple's 4.3 review: "a navigation
// tab for mixing — two records you choose, they play over each other and you
// can spin the discs to change their position and control speed").
//
//   deck A (worklet) ──▶ gain A ─┐
//                                ├──▶ tap ──▶ destination
//   deck B (worklet) ──▶ gain B ─┘   (gains = the crossfader; the tap is the
//                                     Record button's ear — `mixRecorder.ts`)
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
import { MAX_RECORD_SEC, MIN_RECORD_SEC, recordedSec, saveRecording } from './mixRecorder'
import type { Track } from './types'
import { useLibraryStore } from '../stores/libraryStore'

/** Longer than this cannot go on a deck: two of them would be too much memory for a phone. */
export const MAX_MIX_SEC = 15 * 60

/**
 * Records a deck can hold: the one on it and two waiting (James, 2026-11-06:
 * "allow the user to load up to three records on each mixer and have a next
 * button to go to the next track on that mixer"). Only the one ON the deck is
 * decoded: the waiting ones are names until ⏭ puts them on, which keeps six
 * records to the memory of two.
 */
export const MAX_DECK_RECORDS = 3

export type DeckId = 0 | 1
export type DeckStatus = 'empty' | 'loading' | 'ready' | 'error'
export type DeckError = 'unplayable' | 'too_long' | 'unsupported'

export interface DeckState {
  track: Track | null
  /**
   * The records waiting behind it, next first — at most `MAX_DECK_RECORDS` − 1.
   * ⏭ (`nextOnDeck`) puts the first on and the one that was on goes to the
   * back, so the three go round and none is lost.
   */
  waiting: Track[]
  status: DeckStatus
  error?: DeckError
  duration: number
  playing: boolean
  speed: number
}

/** The Record button: off, taking down the mix, or writing it into the library. */
export type RecordPhase = 'idle' | 'recording' | 'saving'

/** What became of the last recording, said under the button until the next. */
export type RecordNote = { kind: 'saved'; title: string } | { kind: 'short' } | { kind: 'failed' }

interface MixState {
  decks: [DeckState, DeckState]
  /** -1 = all deck A, 1 = all deck B. */
  fader: number
  record: RecordPhase
  /** `performance.now()` when the recording started, for its clock. */
  recordStartedAt: number
  recordNote: RecordNote | null
}

const EMPTY: DeckState = { track: null, waiting: [], status: 'empty', duration: 0, playing: false, speed: 1 }

export const useMixStore = create<MixState>(() => ({
  decks: [{ ...EMPTY }, { ...EMPTY }],
  fader: 0,
  record: 'idle',
  recordStartedAt: 0,
  recordNote: null,
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
  tap: AudioWorkletNode
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
    // Into the saved log: a deck that "wouldn't play" (James, 2026-11-05) is
    // most likely the context suspended or interrupted under it.
    ctx.onstatechange = () => noteEvent('mix-ctx', { state: ctx.state })
    await ctx.audioWorklet.addModule(new URL('./mixDeck.worklet.js', import.meta.url))
    // Always stereo in and out, so a mono song on a deck is still L and R.
    const tap = new AudioWorkletNode(ctx, 'mix-tap', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit',
    })
    tap.connect(ctx.destination)
    tap.port.onmessage = (e: MessageEvent) => heardFromTap(e.data as { type: string; pcm?: Int16Array })
    const make = (id: DeckId) => {
      const node = new AudioWorkletNode(ctx, 'mix-deck', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
      const gain = ctx.createGain()
      node.connect(gain).connect(tap)
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
    const built: Engine = { ctx, nodes: [a.node, b.node], gains: [a.gain, b.gain], tap }
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

/**
 * Take the record off. The next one waiting goes on in its place (stopped,
 * as a record put on a deck is); with none waiting the deck is empty.
 */
export function clearDeck(id: DeckId): void {
  const { speed, waiting } = useMixStore.getState().decks[id]
  if (waiting.length > 0) {
    patch(id, { waiting: waiting.slice(1) })
    void loadDeck(id, waiting[0])
    return
  }
  loads[id]++
  patch(id, { ...EMPTY, speed })
  send(id, { type: 'unload' })
}

/**
 * A record chosen for a deck: onto it when it is empty, otherwise to the back
 * of those waiting. False when the deck already holds `MAX_DECK_RECORDS`.
 */
export function addToDeck(id: DeckId, track: Track): boolean {
  const deck = useMixStore.getState().decks[id]
  if (!deck.track) {
    void loadDeck(id, track)
    return true
  }
  if (1 + deck.waiting.length >= MAX_DECK_RECORDS) return false
  patch(id, { waiting: [...deck.waiting, track] })
  return true
}

/** Take one of the waiting records off the deck (`index` into `waiting`). */
export function unqueueFromDeck(id: DeckId, index: number): void {
  const { waiting } = useMixStore.getState().decks[id]
  patch(id, { waiting: waiting.filter((_, i) => i !== index) })
}

/**
 * ⏭: the next waiting record on, and the one that was on to the back. A deck
 * that was playing plays the new record from its start as soon as it is read
 * in; a stopped one waits, cued at the start.
 */
export async function nextOnDeck(id: DeckId): Promise<void> {
  const deck = useMixStore.getState().decks[id]
  if (!deck.track || deck.waiting.length === 0) return
  const [next, ...rest] = deck.waiting
  const wasPlaying = deck.playing
  patch(id, { waiting: [...rest, deck.track] })
  const ticket = loads[id] + 1
  await loadDeck(id, next)
  // Unless something newer has been put on meanwhile.
  if (wasPlaying && loads[id] === ticket && useMixStore.getState().decks[id].status === 'ready') setDeckPlaying(id, true)
}

/** Start or stop a deck — the platter, so it spins up and down. */
export function setDeckPlaying(id: DeckId, on: boolean): void {
  const deck = useMixStore.getState().decks[id]
  if (on && deck.status !== 'ready') return
  // A record played to its end starts again from the top.
  if (on && deck.duration > 0 && deckSec(id) >= deck.duration - 0.05) send(id, { type: 'seek', sec: 0 })
  patch(id, { playing: on })
  if (on && taking && deck.track) taking.heard.add(deck.track)
  void startEngine().then((e) => {
    if (!e) return
    noteEvent('mix-play', { deck: id, on, ctx: e.ctx.state, status: useMixStore.getState().decks[id].status })
    if (on && e.ctx.state !== 'running') {
      e.ctx.resume().catch((err) => noteEvent('mix-resume-failed', { deck: id, ctx: e.ctx.state, error: String(err) }))
    }
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

// ── Recording ───────────────────────────────────────────────────────────────

/** The recording under way: its audio so far, and the songs played into it. */
let taking: { chunks: Int16Array[]; heard: Set<Track>; at: Date; limit: number } | null = null
/** Called when the tap says the last of a stopped recording has arrived. */
let tapStopped: (() => void) | null = null

function heardFromTap(m: { type: string; pcm?: Int16Array }): void {
  if (m.type === 'chunk' && m.pcm && taking) taking.chunks.push(m.pcm)
  else if (m.type === 'stopped') tapStopped?.()
}

/** Start taking down the mix: everything the decks play from now, as heard. */
export async function startRecording(): Promise<void> {
  if (useMixStore.getState().record !== 'idle') return
  const e = await startEngine()
  if (!e || taking) return
  if (e.ctx.state !== 'running') void e.ctx.resume()
  const { decks } = useMixStore.getState()
  taking = {
    chunks: [],
    heard: new Set(decks.filter((d) => d.playing && d.track).map((d) => d.track!)),
    at: new Date(),
    limit: window.setTimeout(() => void stopRecording(), MAX_RECORD_SEC * 1000),
  }
  e.tap.port.postMessage({ type: 'record', on: true })
  useMixStore.setState({ record: 'recording', recordStartedAt: performance.now(), recordNote: null })
}

/** Stop, and save what was taken down as a new song. */
export async function stopRecording(): Promise<void> {
  const rec = taking
  const e = await startEngine()
  if (!rec || !e || useMixStore.getState().record !== 'recording') return
  window.clearTimeout(rec.limit)
  useMixStore.setState({ record: 'saving' })
  // The last part-second comes after the stop. Not forever, though: a context
  // iOS has suspended (the app put away) may never answer.
  await new Promise<void>((done) => {
    const late = window.setTimeout(done, 1500)
    tapStopped = () => { window.clearTimeout(late); done() }
    e.tap.port.postMessage({ type: 'record', on: false })
  })
  tapStopped = null
  taking = null
  if (recordedSec(rec.chunks, e.ctx.sampleRate) < MIN_RECORD_SEC) {
    useMixStore.setState({ record: 'idle', recordNote: { kind: 'short' } })
    return
  }
  try {
    const title = await saveRecording({ chunks: rec.chunks, sampleRate: e.ctx.sampleRate, heard: [...rec.heard], at: rec.at })
    useMixStore.setState({ record: 'idle', recordNote: { kind: 'saved', title } })
  } catch (err) {
    console.error('[jukebox] Could not save the recording:', err)
    noteEvent('mix-record-failed', { error: String(err) })
    useMixStore.setState({ record: 'idle', recordNote: { kind: 'failed' } })
  }
}

/** How long the recording under way has run, in seconds. */
export function recordingSec(): number {
  const { record, recordStartedAt } = useMixStore.getState()
  return record === 'recording' ? (performance.now() - recordStartedAt) / 1000 : 0
}
