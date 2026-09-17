// The deck that slept through a lock is REPLACED, never reused.
//
// ⚠️ The bug this stands guard over took five attempts to find, and every one
// of the first four was a plausible story about who tells the lock screen what
// (James, 2026-09-14 → 2026-09-17: "the play button shows but it goes on to
// play the next track"). The answer was WebKit's, and it is in
// `MediaElementSession::visibilityChanged`: an element that is silent when the
// page goes hidden is INTERRUPTED, and a `play()` after that makes sound
// without leaving the interrupted state — which is the state the now-playing
// entry reads. See the note on `renewDeck` in `lib/audio.ts`.
//
// None of that can be reproduced here: this repo's unit tests run in Node, and
// the interruption is iOS's. What IS testable, and what would silently rot, is
// the bookkeeping the fix rests on — which deck is marked, when it is thrown
// away, and that a discarded element can no longer speak for its deck.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeAudio {
  src: string
  paused: boolean
  volume: number
  currentTime: number
  duration: number
  ended: boolean
  hidden: boolean
  dataset: Record<string, string>
  removed: boolean
  pause(): void
  fire(type: string): void
}

const built: FakeAudio[] = []
let hidden = false
let visibilityHandlers: Array<() => void> = []

class StubAudio implements FakeAudio {
  src = ''
  paused = true
  volume = 1
  currentTime = 0
  duration = 0
  ended = false
  hidden = false
  preload = ''
  dataset: Record<string, string> = {}
  removed = false
  private listeners = new Map<string, Array<() => void>>()

  constructor() {
    built.push(this)
  }

  addEventListener(type: string, fn: () => void) {
    const list = this.listeners.get(type) ?? []
    list.push(fn)
    this.listeners.set(type, list)
  }

  removeEventListener() {}
  setAttribute(name: string, value: string) {
    if (name === 'data-jukebox-audio') this.dataset.jukeboxAudio = value
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
  getAttribute(name: string) {
    return name === 'src' ? this.src || null : null
  }
  load() {}
  remove() {
    this.removed = true
  }
  async play() {
    this.paused = false
    this.fire('play')
    this.fire('playing')
  }
  pause() {
    if (this.paused) return
    this.paused = true
    this.fire('pause')
  }
  fire(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn()
  }
}

/** The file `audio.load`/`audio.crossfade` are given. Only its identity matters here. */
const file = {
  name: 'a.wav',
  size: 1,
  lastModified: 0,
  slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
} as never

function setHidden(value: boolean): void {
  hidden = value
  for (const fn of visibilityHandlers) fn()
}

async function loadAudioModule() {
  built.length = 0
  visibilityHandlers = []
  hidden = false
  vi.resetModules()
  vi.stubGlobal('Audio', StubAudio)
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:one', revokeObjectURL: () => {} })
  vi.stubGlobal('document', {
    get hidden() {
      return hidden
    },
    get visibilityState() {
      return hidden ? 'hidden' : 'visible'
    },
    addEventListener(type: string, fn: () => void) {
      if (type === 'visibilitychange') visibilityHandlers.push(fn)
    },
    // The volume probe (`lib/volumeSupport.ts`) makes one of these, and it is
    // not a deck — it must not be counted as one.
    createElement: () => ({ volume: 0.5 }),
    body: { appendChild: () => {} },
  })
  return import('./audio')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a deck that slept through the lock', () => {
  let audio: Awaited<ReturnType<typeof loadAudioModule>>

  beforeEach(async () => {
    audio = await loadAudioModule()
  })

  it('is replaced by a fresh element the next time it is used', async () => {
    // Both decks exist — the idle one is built with the first crossfade of the
    // session, and from then on it is the one that sleeps through every lock.
    audio.mediaElements()
    await audio.load(file, true)
    expect(built[0].paused).toBe(false)

    // The phone is locked: the OTHER deck is silent, so WebKit interrupts it.
    setHidden(true)
    // …and a skip moves to exactly that deck.
    await audio.crossfade(file, 1.5)

    // Three elements: the one playing, the idle one that slept, and its
    // replacement — the one the new song is playing on.
    expect(built).toHaveLength(3)
    expect(built[1].removed).toBe(true)
    expect(built[2].paused).toBe(false)
  })

  it('is left alone when the page never hid', async () => {
    audio.mediaElements()
    await audio.load(file, true)
    await audio.crossfade(file, 1.5)
    expect(built).toHaveLength(2)
    expect(built.some((element) => element.removed)).toBe(false)
  })

  it('is left alone when it was the one making the sound', async () => {
    await audio.load(file, true)
    // Hidden while THIS deck plays: a playing element is not interrupted, so
    // there is nothing to replace and the record change stays on it.
    setHidden(true)
    await audio.load(file, true)
    expect(built).toHaveLength(1)
  })

  it('stops the replaced element from speaking for the deck', async () => {
    audio.mediaElements()
    await audio.load(file, true)
    setHidden(true)
    await audio.crossfade(file, 1.5)
    const discarded = built[1]

    // A dying event from the element nobody owns any more must not be taken
    // for the deck's — it would report the music as stopped.
    const states: boolean[] = []
    const stop = audio.subscribe((state) => states.push(state.playing))
    discarded.paused = false
    discarded.pause()
    stop()
    expect(states.every(Boolean)).toBe(true)
  })
})
