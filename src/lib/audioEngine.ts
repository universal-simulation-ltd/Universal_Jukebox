// The iPhone app's sound: `lib/audio.ts`'s interface, answered by the native
// engine (`ios/App/App/JukeboxEngine.swift`) instead of two `<audio>` elements.
//
// ⚠️ WHY (James, 2026-10-07: "build it before 1.0"). On iPhone the page's
// `<audio>` ignores `.volume` — the fades, the crossfade, Stable volume and the
// sleep fade were all inaudible, and a crossfade was two songs at full level —
// and Web Audio, the other road to a gain, stops when the app leaves the
// screen. A native player has a real gain and keeps playing locked. But probe 3
// found the page's JavaScript stops within a second of the lock, so the engine
// cannot just be a pair of native speakers this file drives: it runs the queue
// itself while the page is away, from a plan the player store keeps sending it
// (`setUpcoming`, `lib/enginePlan.ts`), and this file catches the store up on
// waking (`requestSync` → the store's `adopt`).
//
// ⚠️ ONLY IN THE iOS APP, and only when the plugin is there (`engineWanted`).
// The web and Android keep the `<audio>` decks untouched: `lib/audio.ts` asks
// `startEngine` once, gets null everywhere else, and every one of its exports
// carries on exactly as before.
//
// ⚠️ THE ENGINE IS AHEAD OF THE PAGE AFTER A LOCK, AND THIS IS WHERE THAT IS
// HANDLED. Three rules:
//   - every change of song the engine makes by itself bumps its `seq`. A state
//     report with a newer `seq` means "you missed something": nothing in it is
//     passed on, the full state is fetched instead (`requestSync`);
//   - a report about a song that is not `currentKey` — the one this file last
//     asked for — is the deck the page has already moved on from, and dropped,
//     as the web's retiring deck's events are;
//   - commands that change the song carry the `seq` they were issued from, and
//     the engine refuses one from an older view (`accepts` in the Swift): a
//     timer that fires as the page wakes must not drag the music back.
//
// ⚠️ NOTHING IN THE PAGE MAY MAKE A SOUND WHILE THIS IS ON. The engine owns the
// audio session; a WebKit player starting would take WebKit's, and two
// sessions in one app interrupt each other dozens of times a second (seen on
// the phone before the engine existed). So the preview and the start-up cues
// come here too (`startPreview`, the crackle clip sink), and the Web Audio
// graph is never built (`lib/applySettings.ts`).

import type { AudioState } from './audio'
import type { FadeCurve } from './fadeCurve'
import type { EngineEntryDraft, EnginePlanDraft, EngineTransition, LeadLimits } from './enginePlan'
import type { SourceFile } from './types'
import { NativeFile, isNativeShell, nativePlatform } from './nativeFile'
import { pluginRegistered } from './nativePlugins'
import { noteEvent } from './bgLog'
import { dispatchAction } from './mediaSession'
import { clipUrl, setClipSink } from './crackle'
import { getT } from '../i18n/runtime.ts'

export const ENGINE_PLUGIN = 'JukeboxEngine'

/** The iPhone app, with the engine compiled in. */
export function engineWanted(): boolean {
  return isNativeShell() && nativePlatform() === 'ios' && pluginRegistered(ENGINE_PLUGIN)
}

/** Where the engine says it is — `snapshot` / `fullSnapshot` in the Swift. */
export interface EngineSnapshot {
  seq: number
  key?: string | null
  trackId?: string | null
  cursor?: number | null
  playing: boolean
  loading: boolean
  currentSec: number
  durationSec: number
  crossfading?: boolean
  /** `getState` only: songs skipped as unplayable while the page was away. */
  skipped?: { trackId: string; title: string; artist?: string; reason: string }[]
  queueEnded?: boolean
  sleepEnded?: boolean
}

/** What `lib/audio.ts` lends this file: its state and its callbacks. */
export interface EngineHooks {
  set(patch: Partial<AudioState>): void
  ended(): void
  duration(seconds: number): void
  error(message: string): void
  approaching(remainingSec: number): void
  previewStopped(): void
}

/** What the player store lends it — set from `playerStore` through `audio.setEngineHandlers`. */
export interface EngineStoreHooks {
  /** The entry for the song the store's cursor is on now — `load` and `crossfade` are always about it. */
  describeCurrent(): EngineEntryDraft | null
  /** The engine moved on (or skipped, or stopped) while the page was away: catch up. */
  adopt(snapshot: EngineSnapshot, songChanged: boolean): void
}

interface WireEntry extends Omit<EngineEntryDraft, 'file' | 'cueKey'> {
  url: string | null
  cue: string | null
}

interface EnginePlugin {
  enable(): Promise<{ away: boolean }>
  configure(o: { volume?: number; muted?: boolean; fadeInSec?: number; fadeOutSec?: number; outputGain?: number }): Promise<void>
  load(o: { entry: WireEntry; autoplay: boolean; fadeInSec: number | null; startAt: number; level: number; seq: number }): Promise<void>
  crossfade(o: { entry: WireEntry; seconds: number; holdSec: number; curve: FadeCurve; level: number; seq: number }): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  stop(): Promise<void>
  seek(o: { seconds: number }): Promise<void>
  duck(o: { seconds: number; seq: number }): Promise<void>
  restart(o: { fadeInSec: number | null; seq: number }): Promise<void>
  setLevel(o: { level: number }): Promise<void>
  setUpcoming(o: {
    current: WireEntry | null
    upcoming: WireEntry[]
    previous: WireEntry | null
    repeatOne: EngineTransition | null
    wrap: boolean
    limits: LeadLimits
    stableVolume: boolean
    cueLevel: number
    notify: boolean
    seq: number
  }): Promise<void>
  setSleep(o: { endsAt: number | null; fadeSec: number }): Promise<void>
  preview(o: { url: string | null; mediaId: string | null; volume: number }): Promise<void>
  stopPreview(): Promise<void>
  setPreviewVolume(o: { volume: number }): Promise<void>
  stash(o: { name: string; base64: string }): Promise<{ uri: string }>
  playClip(o: { uri: string; volume: number }): Promise<void>
  getState(): Promise<EngineSnapshot>
  showRoutePicker(): Promise<{ shown: boolean }>
  addListener(event: string, fn: (data: Record<string, unknown>) => void): Promise<unknown>
}

export interface EngineBackend {
  load(file: SourceFile, autoplay: boolean, fadeInOverrideSec?: number): Promise<void>
  crossfade(file: SourceFile, seconds: number, holdSec: number, curve: FadeCurve): Promise<void>
  crossfading(): boolean
  play(): Promise<void>
  pause(): void
  seek(seconds: number): void
  stop(): void
  duck(seconds: number): void
  restart(fadeInOverrideSec?: number): Promise<void>
  setVolume(volume: number): void
  setMuted(muted: boolean): void
  setFades(inSec: number, outSec: number): void
  setOutputGain(gain: number): void
  setLevel(level: number): void
  setNextLevel(level: number): void
  setStartAt(seconds: number): void
  setUpcoming(plan: EnginePlanDraft): void
  setSleepEnd(endsAt: number | null, fadeSec: number): void
  setStoreHooks(hooks: EngineStoreHooks): void
  /** Write a song made in the page (the example library) to a file now, for a later plan. */
  stashAhead(trackId: string, file: SourceFile): Promise<boolean>
  hasStashed(trackId: string): boolean
  startPreview(file: SourceFile, volume: number): void
  stopPreview(): void
  setPreviewVolume(volume: number): void
  routeChanged(): void
  mediaElement(): HTMLAudioElement
  mediaElements(): [HTMLAudioElement, HTMLAudioElement]
}

/** The engine for this page, or null where there is none (web, Android, tests). */
export function startEngine(hooks: EngineHooks): EngineBackend | null {
  if (!engineWanted()) return null
  return createBackend(hooks)
}

function createBackend(hooks: EngineHooks): EngineBackend {
  let store: EngineStoreHooks | null = null

  /** The entry this page last put on — reports about any other are stale. */
  let currentKey: string | null = null
  /** The engine's `seq` as this page last saw it. */
  let lastSeq = 0
  /** A crossfade this page started, until the engine's own report says so. */
  let crossfadeUntil = 0
  let engineCrossfading = false
  let lastDuration = 0
  let pendingLevel = 1
  let pendingStart = 0
  let away = false
  let syncQueued = false
  let planGeneration = 0

  // ── The channel ──────────────────────────────────────────────────────────
  //
  // ⚠️ ONE ORDERED QUEUE FOR EVERY CALL. Some calls have to wait for a file to
  // be turned into something the engine can open (the example library's songs
  // are bytes in the page — `urlFor`), and a `play` sent while the `load` before
  // it was still waiting would reach the engine first. Each task does its
  // waiting, then makes its native call WITHOUT awaiting the reply, so the
  // queue keeps the order without paying a round trip per call.

  // ⚠️ `ready` RESOLVES TO NOTHING, and the plugin is read from `plugin`. A
  // Capacitor plugin is a Proxy that answers every property with a native
  // method — `then` included — so a promise resolved WITH it calls a native
  // "then" that never answers, and nothing after it ever runs. The browser
  // harness caught exactly that here (the same trap `loadMusicFolder` in
  // `nativeFile.ts` records).
  let plugin: EnginePlugin | null = null
  const ready: Promise<void> = (async () => {
    const { registerPlugin } = await import('@capacitor/core')
    plugin = registerPlugin<EnginePlugin>(ENGINE_PLUGIN)
  })()
  let chain: Promise<unknown> = ready

  function enqueue(task: (p: EnginePlugin) => Promise<unknown> | unknown): void {
    chain = chain
      .then(() => ready)
      .then(async () => {
        await task(plugin!)
      })
      .catch((error: unknown) => {
        noteEvent('engine-call', { failed: error instanceof Error ? error.message : String(error) })
      })
  }

  function call(fn: (p: EnginePlugin) => Promise<unknown>): void {
    enqueue((p) => {
      void fn(p).catch((error: unknown) => {
        noteEvent('engine-call', { failed: error instanceof Error ? error.message : String(error) })
      })
    })
  }

  // ── Files the engine can open ────────────────────────────────────────────

  const stashed = new Map<string, Promise<string | null>>()
  /** The same stashed files by track id, for an entry the page did not make this time (`stashAhead`). */
  const byTrack = new Map<string, Promise<string | null>>()

  /**
   * A `file://` URL for a song. A folder's file and a copied Music-library song
   * already have one (`NativeFile.uri`); the example library's are made in the
   * page, so their bytes are written to the app's Caches once (`stash`).
   */
  function urlFor(file: SourceFile | null | undefined, trackId?: string): Promise<string | null> {
    if (!file) return Promise.resolve((trackId && byTrack.get(trackId)) || null)
    if (file instanceof NativeFile) return Promise.resolve(file.uri)
    // Not `lastModified`: an example song evicted and synthesised again is the
    // same bytes in a new `File`, and must not be written out a second time.
    const name = `song-${file.size}-${file.name}`
    let made = stashed.get(name)
    if (!made) {
      made = (async () => {
        const bytes = await file.slice(0, file.size).arrayBuffer()
        return stash(name, bytes)
      })().catch(() => null)
      stashed.set(name, made)
    }
    if (trackId) byTrack.set(trackId, made)
    return made
  }

  /** A start-up cue's clip, rendered by `crackle.ts` and kept as a file. */
  function clipUri(key: string, url?: string): Promise<string | null> {
    let made = stashed.get(key)
    if (!made) {
      made = (async () => {
        const source = url ?? (await clipUrl(key))
        if (!source) return null
        const bytes = await (await fetch(source)).arrayBuffer()
        return stash(`clip-${key.replace(/[^a-z0-9]/gi, '-')}.wav`, bytes)
      })().catch(() => null)
      stashed.set(key, made)
    }
    return made
  }

  async function stash(name: string, bytes: ArrayBuffer): Promise<string | null> {
    await ready
    const { uri } = await plugin!.stash({ name, base64: toBase64(bytes) })
    return uri || null
  }

  async function wire(draft: EngineEntryDraft, file?: SourceFile | null): Promise<WireEntry> {
    const { file: own, cueKey, ...rest } = draft
    return {
      ...rest,
      url: await urlFor(file ?? own, rest.trackId),
      cue: cueKey ? await clipUri(cueKey) : null,
    }
  }

  /** The store's description of the song going on — or enough to play a file nobody described. */
  function entryFor(file: SourceFile): EngineEntryDraft {
    const described = store?.describeCurrent()
    if (described) return described
    const none: EngineTransition = {
      kind: 'cut', blendSec: 0, manualSec: 0, curve: 'linear', gapSec: 0, fadeInSec: null, duckSec: 0, cue: false, cueDelaySec: 0,
    }
    return {
      key: `file:${file.name}:${file.size}`, cursor: -1, trackId: file.name, albumId: '', file, mediaId: null,
      title: file.name, artist: '', album: '', gain: null, introSec: null, outroSec: null, auto: none, skip: none, cueKey: null,
      lines: null,
    }
  }

  // ── What the engine says ─────────────────────────────────────────────────

  function apply(s: EngineSnapshot): void {
    engineCrossfading = !!s.crossfading
    hooks.set({ playing: s.playing, loading: s.loading, currentSec: s.currentSec, durationSec: s.durationSec })
    if (s.durationSec > 0 && s.durationSec !== lastDuration) {
      lastDuration = s.durationSec
      hooks.duration(s.durationSec)
    }
    // What `timeupdate` gave the store: how close the end is, so it can start
    // its crossfade early (`maybeStartEarlyCrossfade`).
    if (s.playing && s.durationSec > 0) hooks.approaching(Math.max(0, s.durationSec - s.currentSec))
  }

  function onState(s: EngineSnapshot): void {
    if (s.seq > lastSeq) {
      requestSync()
      return
    }
    if ((s.key ?? null) !== currentKey) return
    apply(s)
  }

  /** Fetch the engine's whole state and catch up — on waking, and after any change it made alone. */
  function requestSync(): void {
    if (syncQueued) return
    syncQueued = true
    enqueue(async (p) => {
      syncQueued = false
      const s = await p.getState()
      lastSeq = Math.max(lastSeq, s.seq)
      const key = s.key ?? null
      const songChanged = key !== null && key !== currentKey
      if (songChanged) {
        noteEvent('engine-sync', { from: currentKey, to: key, playing: s.playing, sec: Math.round(s.currentSec) })
        currentKey = key
        lastDuration = 0
      }
      const skipped = s.skipped?.map((k) => ({ ...k, reason: errorText(k.reason) }))
      if (songChanged || skipped?.length || s.queueEnded || s.sleepEnded) store?.adopt({ ...s, skipped }, songChanged)
      if (key === currentKey) apply(s)
    })
  }

  void ready.then(async () => {
    const p = plugin!
    await p.addListener('state', (e) => onState(e as unknown as EngineSnapshot))
    await p.addListener('ended', (e) => {
      const s = e as unknown as EngineSnapshot
      if (s.seq > lastSeq) {
        requestSync()
        return
      }
      if ((s.key ?? null) !== currentKey) return
      hooks.set({ playing: false, currentSec: 0 })
      hooks.ended()
    })
    await p.addListener('error', (e) => {
      const s = e as unknown as EngineSnapshot & { code?: string }
      if ((s.key ?? null) !== currentKey) return
      hooks.set({ playing: false, loading: false })
      hooks.error(errorText(s.code))
    })
    await p.addListener('changed', () => requestSync())
    // The lock screen and headphones with the app open: the page's own handlers,
    // through the same gate as every other way in (`dispatchAction`).
    await p.addListener('command', (e) => dispatchAction(String(e.action ?? ''), typeof e.position === 'number' ? e.position : undefined))
    await p.addListener('route', (e) => setAway(e.away === true))
    await p.addListener('previewEnded', () => hooks.previewStopped())
    const { away: now } = await p.enable()
    setAway(now)
    noteEvent('engine', { on: true })
    requestSync()
  }).catch((error: unknown) => {
    noteEvent('engine', { on: false, why: error instanceof Error ? error.message : String(error) })
  })

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) requestSync()
    })
  }

  // ── The stand-in elements ────────────────────────────────────────────────
  //
  // Some of the app asks `lib/audio.ts` for its `<audio>` elements: the Output
  // button (`OutputButton.tsx`), the visualiser. These two are never given a
  // source and never play. The Output button's two questions are answered by
  // the engine instead — the route sheet, and whether the sound has gone to
  // AirPlay — so it works unchanged.

  let standIns: [HTMLAudioElement, HTMLAudioElement] | null = null

  function elements(): [HTMLAudioElement, HTMLAudioElement] {
    if (standIns) return standIns
    const make = (): HTMLAudioElement => {
      const el = new Audio()
      el.preload = 'none'
      el.setAttribute('data-jukebox-engine', '')
      Object.defineProperty(el, 'webkitShowPlaybackTargetPicker', {
        value: () => call((p) => p.showRoutePicker()),
        configurable: true,
      })
      Object.defineProperty(el, 'webkitCurrentPlaybackTargetIsWireless', {
        get: () => away,
        configurable: true,
      })
      return el
    }
    standIns = [make(), make()]
    return standIns
  }

  function setAway(now: boolean): void {
    if (now === away) return
    away = now
    for (const el of standIns ?? []) el.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'))
  }

  // The start-up cues: rendered by `crackle.ts`, played by the engine.
  setClipSink((key, url, volume) => {
    enqueue(async (p) => {
      const uri = await clipUri(key, url)
      if (uri) void p.playClip({ uri, volume }).catch(() => {})
    })
  })

  // ── The interface `lib/audio.ts` forwards to ────────────────────────────

  function songCommand(file: SourceFile, send: (p: EnginePlugin, entry: WireEntry, seq: number) => Promise<unknown>): void {
    const draft = entryFor(file)
    currentKey = draft.key
    lastDuration = 0
    const seq = lastSeq
    enqueue(async (p) => {
      const entry = await wire(draft, file)
      void send(p, entry, seq).catch(() => {})
    })
  }

  return {
    load(file, autoplay, fadeInOverrideSec) {
      const level = pendingLevel
      const startAt = pendingStart
      pendingStart = 0
      hooks.set({ loading: true, currentSec: 0, durationSec: 0, ...(autoplay ? { playing: true } : {}) })
      songCommand(file, (p, entry, seq) =>
        p.load({ entry, autoplay, fadeInSec: fadeInOverrideSec ?? null, startAt, level, seq }),
      )
      return Promise.resolve()
    },

    crossfade(file, seconds, holdSec, curve) {
      const level = pendingLevel
      crossfadeUntil = Date.now() + seconds * 1000
      hooks.set({ loading: true, currentSec: 0, durationSec: 0, playing: true })
      songCommand(file, (p, entry, seq) => p.crossfade({ entry, seconds, holdSec, curve, level, seq }))
      return Promise.resolve()
    },

    crossfading() {
      return Date.now() < crossfadeUntil || engineCrossfading
    },

    play() {
      if (currentKey !== null) hooks.set({ playing: true })
      call((p) => p.play())
      return Promise.resolve()
    },

    pause() {
      crossfadeUntil = 0
      hooks.set({ playing: false })
      call((p) => p.pause())
    },

    seek(seconds) {
      if (lastDuration > 0) hooks.set({ currentSec: Math.max(0, Math.min(seconds, lastDuration)) })
      call((p) => p.seek({ seconds }))
    },

    stop() {
      currentKey = null
      crossfadeUntil = 0
      lastDuration = 0
      hooks.set({ playing: false, currentSec: 0, durationSec: 0, loading: false })
      call((p) => p.stop())
    },

    duck(seconds) {
      const seq = lastSeq
      call((p) => p.duck({ seconds, seq }))
    },

    restart(fadeInOverrideSec) {
      const seq = lastSeq
      hooks.set({ currentSec: 0, playing: true })
      call((p) => p.restart({ fadeInSec: fadeInOverrideSec ?? null, seq }))
      return Promise.resolve()
    },

    setVolume(volume) {
      call((p) => p.configure({ volume }))
    },
    setMuted(muted) {
      call((p) => p.configure({ muted }))
    },
    setFades(inSec, outSec) {
      call((p) => p.configure({ fadeInSec: inSec, fadeOutSec: outSec }))
    },
    setOutputGain(gain) {
      call((p) => p.configure({ outputGain: gain }))
    },
    setLevel(level) {
      call((p) => p.setLevel({ level }))
    },
    setNextLevel(level) {
      pendingLevel = Math.max(0, Math.min(1, level))
    },
    setStartAt(seconds) {
      pendingStart = Math.max(0, seconds)
    },

    setUpcoming(plan) {
      const generation = ++planGeneration
      // The engine lines the plan up against what it is playing by this: from
      // an up-to-date page, a mismatch means the page has moved and not loaded.
      const seq = lastSeq
      enqueue(async (p) => {
        const [current, previous, ...upcoming] = await Promise.all([
          plan.current ? wire(plan.current) : null,
          plan.previous ? wire(plan.previous) : null,
          ...plan.upcoming.map((entry) => wire(entry)),
        ])
        // A newer plan was asked for while this one's files were being made.
        if (generation !== planGeneration) return
        void p
          .setUpcoming({
            current,
            upcoming: upcoming.filter((entry): entry is WireEntry => entry !== null),
            previous,
            repeatOne: plan.repeatOne,
            wrap: plan.wrap,
            limits: plan.limits,
            stableVolume: plan.stableVolume,
            cueLevel: plan.cueLevel,
            notify: plan.notify,
            seq,
          })
          .catch(() => {})
      })
    },

    setSleepEnd(endsAt, fadeSec) {
      call((p) => p.setSleep({ endsAt, fadeSec }))
    },

    setStoreHooks(next) {
      store = next
    },

    async stashAhead(trackId, file) {
      return (await urlFor(file, trackId)) !== null
    },

    hasStashed(trackId) {
      return byTrack.has(trackId)
    },

    startPreview(file, volume) {
      // Always a file by now: a Music-library song is copied out before its
      // preview starts (`whenPlayable` in `playerStore.preview`).
      enqueue(async (p) => {
        const url = await urlFor(file)
        void p.preview({ url, mediaId: null, volume }).catch(() => hooks.previewStopped())
      })
    },
    stopPreview() {
      call((p) => p.stopPreview())
    },
    setPreviewVolume(volume) {
      call((p) => p.setPreviewVolume({ volume }))
    },

    routeChanged() {
      // The engine reports its own route (`route`); iOS's notice through
      // `NowPlayingPlugin` changes nothing here.
    },

    mediaElement() {
      return elements()[0]
    },
    mediaElements() {
      return elements()
    },
  }
}

/**
 * The engine's error codes in the page's words — the same sentences the web's
 * `describeError` uses (`player.error_*`), so the iPhone app says them in
 * every suite language.
 */
export function errorText(code: string | null | undefined): string {
  const t = getT()
  switch (code) {
    case 'decode':
      return t('player.error_cant_decode_app')
    case 'damaged':
      return t('player.error_damaged')
    case 'unreadable':
      return t('player.error_unreadable')
    case 'unreachable':
      return t('player.error_unreachable')
    default:
      return t('player.error_wont_play')
  }
}

/** Bytes as base64, in slices — `String.fromCharCode` on a whole song overflows the stack. */
export function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let text = ''
  for (let i = 0; i < view.length; i += 0x8000) {
    text += String.fromCharCode(...view.subarray(i, i + 0x8000))
  }
  return btoa(text)
}
