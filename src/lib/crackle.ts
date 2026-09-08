// The tonearm landing: a low thunk, then surface noise fading under the music.
//
// Both are SYNTHESISED — no asset to ship, no licence to think about, about
// thirty lines together. The thunk is a falling sine with a fast decay; the
// crackle is filtered white noise plus a scattering of pops.
//
// ⚠️ FOUR RULES, and they are not stylistic (§22.9 of next-products.md):
//
//   1. This is sound the user did not ask for. It rides the app volume, it is
//      off in one click, and the setting persists. It also has its own level
//      slider — which is what earns the louder default below, because the way
//      to answer "too much" is now a control rather than a bug report.
//   2. It never plays before a user gesture. Browsers forbid it anyway — an
//      `AudioContext` created without one starts `suspended` — but the reason
//      it matters is that a page that makes a noise on load is a page people
//      close.
//   3. It lasts under a second and sits under the first bar of music. That is
//      the ONLY thing that makes "default on" defensible.
//   4. `prefers-reduced-motion` drops the whole ceremony, and this with it.
//
// The context is created lazily and shared, because a browser will refuse to
// open more than a handful and one per play is a leak with a hard ceiling.

let context: AudioContext | null = null

function ctx(): AudioContext | null {
  if (context) return context
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
    return context
  } catch {
    return null
  }
}

/**
 * The arm landing on the record.
 *
 * `volume` is the app's own volume, passed in rather than read, so the effect
 * can never be louder than the music it introduces — the complaint that would
 * otherwise arrive first.
 *
 * `level` is the user's own multiplier for this effect alone (Settings →
 * "Needle-drop volume"), and it is deliberately allowed ABOVE 1. The point of
 * the control is that the crackle was too easy to miss under a loud first bar,
 * and a slider that can only ever make it quieter would not fix that. It still
 * rides `volume`, so it cannot outlive turning the music down.
 */
export function playNeedleDrop(volume = 0.8, level = 1): void {
  const audio = ctx()
  if (!audio) return
  // A context created before any gesture starts suspended; resuming inside the
  // click that started playback is what makes it audible at all.
  if (audio.state === 'suspended') void audio.resume().catch(() => {})

  const now = audio.currentTime
  // ⚠️ The PRODUCT is not clamped to 1 — see the note above. Each part is
  // clamped on its own so a corrupt stored setting cannot produce a bang.
  const gain = Math.max(0, Math.min(1, volume)) * Math.max(0, Math.min(MAX_LEVEL, level))
  if (gain <= 0) return

  thunk(audio, now, gain)
  surfaceNoise(audio, now + 0.04, gain)
}

/**
 * The loudest the multiplier may be, enforced here as well as in the store.
 *
 * Duplicated rather than imported because this file is the synth and knows
 * nothing about settings — and because the clamp that stops a hand-edited
 * localStorage blob from blowing someone's ears out belongs next to the gains
 * it protects, not two files away.
 */
const MAX_LEVEL = 2

/** 120 → 46 Hz over 0.3s: the body of the arm meeting the record. */
function thunk(audio: AudioContext, at: number, level: number): void {
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, at)
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.3)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.34 * level, at + 0.012)
    // An exponential ramp cannot reach zero — it is undefined at 0 — so it runs
    // to a floor and the node is stopped. Ramping to 0 silently does nothing in
    // some engines and throws in others.
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34)
    osc.connect(gain).connect(audio.destination)
    osc.start(at)
    osc.stop(at + 0.36)
  } catch {
    /* an engine that refuses the ramp — the ceremony survives without it */
  }
}

/**
 * Surface noise: filtered white noise with sparse pops, fading out under the
 * first bar.
 *
 * The buffer is built once per play rather than cached, because it is 0.9s of
 * mono at the context's own rate — about 40 KB — and caching it would mean
 * holding a buffer tied to a context that may have been closed.
 */
function surfaceNoise(audio: AudioContext, at: number, level: number): void {
  try {
    const seconds = 0.9
    const frames = Math.floor(audio.sampleRate * seconds)
    const buffer = audio.createBuffer(1, frames, audio.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < frames; i++) {
      // Base hiss.
      data[i] = (Math.random() * 2 - 1) * 0.22
      // Pops: short, and much louder than the hiss. Roughly 55 a second.
      //
      // ⚠️ Was 25/s at half this gain, and the honest verdict after living with
      // it was that you had to already know it was there. The failure mode in
      // the other direction is "broken speaker", and what separates the two is
      // DENSITY rather than loudness — so this doubles the count and lets the
      // user's own multiplier do the loudness.
      if (Math.random() < 0.0012) {
        const length = 40 + Math.floor(Math.random() * 90)
        const amplitude = 0.5 + Math.random() * 0.5
        for (let j = 0; j < length && i + j < frames; j++) {
          data[i + j] += amplitude * Math.exp(-j / 18) * (Math.random() * 2 - 1)
        }
      }
    }

    const source = audio.createBufferSource()
    source.buffer = buffer

    // A band-pass keeps it off both ends: the low end would fight the music's
    // bass, the top end is what makes noise sound like static rather than vinyl.
    const filter = audio.createBiquadFilter()
    filter.type = 'bandpass'
    // 2600/0.7 sat entirely in the region a first bar of music fills, which is
    // most of why it went unheard. Lower and wider leaves it some body of its
    // own without reaching the bass it must not fight.
    filter.frequency.value = 1900
    filter.Q.value = 0.5

    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.42 * level, at + 0.05)
    // Fades out under the music rather than stopping — the point is that it
    // hands over, not that it ends.
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.88)

    source.connect(filter).connect(gain).connect(audio.destination)
    source.start(at)
    source.stop(at + 0.9)
  } catch {
    /* ignore */
  }
}

/** Close the shared context — on teardown, so a hot reload doesn't stack them. */
export function closeAudioContext(): void {
  try {
    void context?.close()
  } catch {
    /* ignore */
  }
  context = null
}
