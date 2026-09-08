// The tonearm landing: a low thunk, then surface noise fading under the music.
//
// Both are SYNTHESISED — no asset to ship, no licence to think about, about
// thirty lines together. The thunk is a falling sine with a fast decay; the
// crackle is filtered white noise plus a scattering of pops.
//
// ⚠️ FOUR RULES, and they are not stylistic (§22.9 of next-products.md):
//
//   1. This is sound the user did not ask for. It rides the app volume, it is
//      off in one click, and the setting persists.
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
 */
export function playNeedleDrop(volume = 0.8): void {
  const audio = ctx()
  if (!audio) return
  // A context created before any gesture starts suspended; resuming inside the
  // click that started playback is what makes it audible at all.
  if (audio.state === 'suspended') void audio.resume().catch(() => {})

  const now = audio.currentTime
  const level = Math.max(0, Math.min(1, volume))
  if (level <= 0) return

  thunk(audio, now, level)
  surfaceNoise(audio, now + 0.04, level)
}

/** 120 → 46 Hz over 0.3s: the body of the arm meeting the record. */
function thunk(audio: AudioContext, at: number, level: number): void {
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, at)
    osc.frequency.exponentialRampToValueAtTime(46, at + 0.3)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.28 * level, at + 0.012)
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
      // Base hiss, quiet.
      data[i] = (Math.random() * 2 - 1) * 0.16
      // Pops: rare, short and much louder than the hiss. Roughly 25 a second,
      // which is what reads as "dusty record" rather than "broken speaker".
      if (Math.random() < 0.00055) {
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
    filter.frequency.value = 2600
    filter.Q.value = 0.7

    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.22 * level, at + 0.05)
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
