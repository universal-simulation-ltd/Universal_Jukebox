// mixDeck.worklet.js — one turntable of the Mix tab, inside the audio thread.
//
// ⚠️ PLAIN JAVASCRIPT ON PURPOSE. `lib/mixer.ts` loads this file with
// `audioWorklet.addModule(new URL('./mixDeck.worklet.js', import.meta.url))`,
// and Vite copies a file referenced that way as-is: there is no TypeScript
// step in front of it, and an `import` here would not resolve inside the
// worklet's scope. Keep it self-contained.
//
// Why a worklet and not an `AudioBufferSourceNode`: a source node plays one
// way only, and Safari refuses a negative `playbackRate`. A record held under a
// finger goes backwards, stops dead and lurches forwards again, so the deck
// reads its own samples at whatever speed the platter is turning — a position
// in samples (`pos`) moved by a velocity (`v`, 1 = normal speed) every sample.
//
//   run  — `v` eases towards `speed + bend` while playing, or 0 when stopped,
//          so a start spins up and a stop spins down like a platter does.
//   hold — a finger is on the record: `v` chases the position the finger has
//          turned it to, so the music follows the hand (a scratch).
//
// Messages in (from `lib/mixer.ts`): load, unload, play, speed, bend, seek,
// hold, turn, release. Out: `pos` about sixty times a second, `ended` once.

/* global sampleRate, registerProcessor, AudioWorkletProcessor */

/** How fast a running deck reaches its speed: a time constant, in seconds. */
const SPIN_UP_SEC = 0.09
/** …and comes to rest when stopped — slower, as a heavy platter does. */
const SPIN_DOWN_SEC = 0.22
/** How tightly a held record follows the finger. Short, or it feels rubbery. */
const HOLD_SEC = 0.006
/** The fastest a hand can throw a record, as a multiple of normal speed. */
const MAX_V = 12
/** Below this speed the sound fades out, so a still record makes no click. */
const QUIET_V = 0.04
/** Position reports per second, for the drawing on the main thread. */
const REPORTS_PER_SEC = 60

function ease(sec) {
  return 1 - Math.exp(-1 / (sec * sampleRate))
}

class MixDeck extends AudioWorkletProcessor {
  constructor() {
    super()
    this.left = null
    this.right = null
    this.length = 0
    this.pos = 0
    this.v = 0
    this.playing = false
    this.speed = 1
    this.bend = 0
    this.holding = false
    this.holdAt = 0
    this.sinceReport = 0
    this.reportEvery = Math.round(sampleRate / REPORTS_PER_SEC)
    this.upAlpha = ease(SPIN_UP_SEC)
    this.downAlpha = ease(SPIN_DOWN_SEC)
    this.holdAlpha = ease(HOLD_SEC)
    this.port.onmessage = (e) => this.message(e.data)
  }

  message(m) {
    switch (m.type) {
      case 'load':
        this.left = m.left
        this.right = m.right || m.left
        this.length = this.left.length
        this.pos = 0
        this.v = 0
        this.playing = false
        this.holding = false
        break
      case 'unload':
        this.left = this.right = null
        this.length = 0
        this.pos = this.v = 0
        this.playing = false
        break
      case 'play':
        this.playing = Boolean(m.on)
        break
      case 'speed':
        this.speed = m.value
        break
      case 'bend':
        this.bend = m.value
        break
      case 'seek':
        this.pos = this.clampPos(m.sec * sampleRate)
        this.holdAt = this.pos
        break
      case 'hold':
        this.holding = true
        this.holdAt = this.pos
        break
      case 'turn':
        // Relative, so it never fights the lag between the audio and the
        // drawing: the finger says "this much further", not "here".
        if (this.holding) this.holdAt = this.clampPos(this.holdAt + m.sec * sampleRate)
        break
      case 'release':
        this.holding = false
        break
    }
  }

  clampPos(p) {
    return Math.max(0, Math.min(this.length - 1, p))
  }

  process(_inputs, outputs) {
    const out = outputs[0]
    const L = out[0]
    const R = out[1] || out[0]
    const n = L.length
    if (!this.left || this.length < 2) {
      L.fill(0)
      if (R !== L) R.fill(0)
      return true
    }
    const left = this.left
    const right = this.right
    const last = this.length - 1
    // Over a whole block, how fast the held record must move to be where the
    // finger has put it two blocks from now.
    const chase = this.holding ? Math.max(-MAX_V, Math.min(MAX_V, (this.holdAt - this.pos) / (n * 2))) : 0
    const want = this.holding ? chase : this.playing ? this.speed + this.bend : 0
    const alpha = this.holding ? this.holdAlpha : Math.abs(want) >= Math.abs(this.v) ? this.upAlpha : this.downAlpha
    let ended = false
    for (let i = 0; i < n; i++) {
      this.v += (want - this.v) * alpha
      this.pos += this.v
      if (this.pos <= 0) {
        this.pos = 0
        if (this.v < 0) this.v = 0
      } else if (this.pos >= last) {
        this.pos = last
        this.v = 0
        if (this.playing && !this.holding) {
          this.playing = false
          ended = true
        }
      }
      const i0 = this.pos | 0
      const f = this.pos - i0
      const i1 = i0 < last ? i0 + 1 : i0
      const amp = Math.min(1, Math.abs(this.v) / QUIET_V)
      L[i] = (left[i0] + (left[i1] - left[i0]) * f) * amp
      if (R !== L) R[i] = (right[i0] + (right[i1] - right[i0]) * f) * amp
    }
    this.sinceReport += n
    if (ended || this.sinceReport >= this.reportEvery) {
      this.sinceReport = 0
      this.port.postMessage({ type: 'pos', sec: this.pos / sampleRate, v: this.v, playing: this.playing })
    }
    if (ended) this.port.postMessage({ type: 'ended' })
    return true
  }
}

registerProcessor('mix-deck', MixDeck)
