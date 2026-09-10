import type { DeckStyle } from '../stores/settingsStore'

// The moment the pickup engages: a low thunk, then noise fading under the music.
//
// FOUR cues, one per deck (Settings ▸ What you're playing on):
//
//   vinyl     the needle landing — a thunk, then surface noise and pops
//   cd        the lid clicking shut, then a servo spinning the disc up
//   cassette  the play key latching, then tape hiss
//   jukebox   the gripper clacking, the carriage swinging across, then vinyl
//
// ⚠️ They are all the same SHAPE — an impact, then a bed of filtered noise
// fading out under the first bar — and that is deliberate. The four rules below
// are what make a sound the user did not ask for defensible, and a cue that
// runs longer or louder because the medium "deserves" it breaks them. Two
// primitives (`tone` and `noise`) and a table of numbers, so a fifth deck is a
// row rather than a new synth.
//
// All of it is SYNTHESISED — no asset to ship, no licence to think about, and
// two functions between the four of them. The impacts are swept oscillators
// with a fast decay; the beds are band-passed white noise, with a scattering of
// pops on the two that end in a needle — vinyl and jukebox.
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
 * The pickup engaging, in whichever deck is showing.
 *
 * `volume` is the app's own volume, passed in rather than read, so the effect
 * can never be louder than the music it introduces — the complaint that would
 * otherwise arrive first.
 *
 * `level` is the user's own multiplier for this effect alone (Settings → the
 * start-up sound's volume), and it is deliberately allowed ABOVE 1. The point
 * of the control is that the crackle was too easy to miss under a loud first
 * bar, and a slider that can only ever make it quieter would not fix that. It
 * still rides `volume`, so it cannot outlive turning the music down.
 *
 * ⚠️ `style` is typed against the settings union but this file imports it as a
 * TYPE ONLY, which compiles away entirely: the synth still knows nothing about
 * settings at run time and is still callable with a literal from a test. What
 * it buys is that adding a deck breaks the build HERE, at the table below,
 * rather than silently giving the new deck the vinyl needle drop.
 */
export function playTransportCue(style: DeckStyle, volume = 0.8, level = 1): void {
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

  const cue = CUES[style] ?? CUES.vinyl
  for (const part of cue) {
    if (part.kind === 'tone') tone(audio, now + part.at, gain, part)
    else noise(audio, now + part.at, gain, part)
  }
  idleAfter(Math.max(...cue.map((part) => part.at + part.seconds)))
}

/**
 * The four cues, as numbers.
 *
 * ⚠️ Every one of them finishes inside a second (rule 3 above) — check the
 * largest `at + seconds` in a row before adding to it. The vinyl row is the
 * original needle drop unchanged, to the decimal: it is the one people have
 * already set a volume for, and "we improved it slightly" is not a thing to do
 * to a sound somebody has already tuned to their taste.
 */
const CUES: Record<DeckStyle, CuePart[]> = {
  // The arm meeting the record, then the groove noise it lands in.
  vinyl: [
    { kind: 'tone', at: 0, wave: 'sine', from: 120, to: 46, peak: 0.34, seconds: 0.34 },
    { kind: 'noise', at: 0.04, freq: 1900, q: 0.5, peak: 0.42, seconds: 0.9, pops: 0.0012 },
  ],
  // The lid clicking shut, then the servo bringing the disc up to speed. The
  // whirr RISES where the needle drop falls — that contrast is most of what
  // makes this read as a different machine rather than a quieter one.
  cd: [
    { kind: 'noise', at: 0, freq: 3200, q: 1.6, peak: 0.3, seconds: 0.05, pops: 0 },
    { kind: 'tone', at: 0.05, wave: 'triangle', from: 70, to: 190, peak: 0.2, seconds: 0.5 },
    { kind: 'noise', at: 0.06, freq: 5200, q: 0.9, peak: 0.1, seconds: 0.7, pops: 0 },
  ],
  // The play key latching — two clacks a hair apart, because one is a button
  // and two is a mechanism — then the hiss of tape moving.
  cassette: [
    { kind: 'noise', at: 0, freq: 520, q: 1.1, peak: 0.4, seconds: 0.06, pops: 0 },
    { kind: 'noise', at: 0.07, freq: 900, q: 1.4, peak: 0.28, seconds: 0.05, pops: 0 },
    { kind: 'tone', at: 0, wave: 'sine', from: 96, to: 52, peak: 0.26, seconds: 0.22 },
    { kind: 'noise', at: 0.1, freq: 4600, q: 0.7, peak: 0.3, seconds: 0.8, pops: 0 },
  ],
  // The one cue with TWO impacts a third of a second apart, because a jukebox
  // is the one machine that does two things: the gripper takes the record out
  // of the rack (a solenoid clack and a carriage running across) and then the
  // needle lands on it. The gap between them is the whole character of the
  // sound — close them up and it is a noisier needle drop.
  //
  // ⚠️ Its landing is the vinyl cue's, deliberately near-identical: it IS a
  // record being played by a needle, and giving it a different landing would
  // say the jukebox plays some other format. The pops are the same too.
  jukebox: [
    { kind: 'noise', at: 0, freq: 760, q: 1.3, peak: 0.34, seconds: 0.05, pops: 0 },
    { kind: 'tone', at: 0.02, wave: 'sawtooth', from: 58, to: 132, peak: 0.11, seconds: 0.3 },
    { kind: 'noise', at: 0.06, freq: 2400, q: 0.8, peak: 0.09, seconds: 0.3, pops: 0 },
    { kind: 'tone', at: 0.38, wave: 'sine', from: 120, to: 46, peak: 0.3, seconds: 0.3 },
    { kind: 'noise', at: 0.42, freq: 1900, q: 0.5, peak: 0.34, seconds: 0.5, pops: 0.0013 },
  ],
  // The pocket player: three ticks of the click wheel under a thumb, then the
  // centre button — small, dry sounds, because the machine is.
  pocket: [
    { kind: 'noise', at: 0, freq: 4200, q: 3, peak: 0.2, seconds: 0.04, pops: 0 },
    { kind: 'noise', at: 0.07, freq: 4400, q: 3, peak: 0.18, seconds: 0.04, pops: 0 },
    { kind: 'noise', at: 0.14, freq: 4600, q: 3, peak: 0.16, seconds: 0.04, pops: 0 },
    { kind: 'tone', at: 0.26, wave: 'sine', from: 980, to: 760, peak: 0.14, seconds: 0.09 },
  ],
}

interface ToneSpec {
  kind: 'tone'
  /** Seconds after the cue starts. */
  at: number
  wave: OscillatorType
  from: number
  to: number
  peak: number
  seconds: number
}

interface NoiseSpec {
  kind: 'noise'
  at: number
  /** Band-pass centre, Hz. */
  freq: number
  q: number
  peak: number
  seconds: number
  /** Chance per sample of a pop starting. 0 for a clean bed. */
  pops: number
}

type CuePart = ToneSpec | NoiseSpec

/**
 * The loudest the multiplier may be, enforced here as well as in the store.
 *
 * Duplicated rather than imported because this file is the synth and knows
 * nothing about settings — and because the clamp that stops a hand-edited
 * localStorage blob from blowing someone's ears out belongs next to the gains
 * it protects, not two files away.
 */
const MAX_LEVEL = 2

/**
 * One swept tone: the body of an impact, or a motor coming up to speed.
 *
 * Falling (120 → 46) it is the arm meeting the record; rising (70 → 190) it is
 * a disc spinning up. Same six lines either way.
 */
function tone(audio: AudioContext, at: number, level: number, spec: ToneSpec): void {
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = spec.wave
    osc.frequency.setValueAtTime(spec.from, at)
    osc.frequency.exponentialRampToValueAtTime(spec.to, at + spec.seconds * 0.88)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(spec.peak * level, at + 0.012)
    // An exponential ramp cannot reach zero — it is undefined at 0 — so it runs
    // to a floor and the node is stopped. Ramping to 0 silently does nothing in
    // some engines and throws in others.
    gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.seconds)
    osc.connect(gain).connect(audio.destination)
    osc.start(at)
    osc.stop(at + spec.seconds + 0.02)
  } catch {
    /* an engine that refuses the ramp — the ceremony survives without it */
  }
}

/**
 * A bed of band-passed noise: surface noise, tape hiss, or a single click when
 * `seconds` is short enough.
 *
 * The buffer is built per call rather than cached, because it is under a second
 * of mono at the context's own rate — about 40 KB — and caching it would mean
 * holding a buffer tied to a context that may have been closed.
 */
function noise(audio: AudioContext, at: number, level: number, spec: NoiseSpec): void {
  try {
    const frames = Math.max(1, Math.floor(audio.sampleRate * spec.seconds))
    const buffer = audio.createBuffer(1, frames, audio.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < frames; i++) {
      // The bed itself.
      data[i] = (Math.random() * 2 - 1) * 0.22
      // Pops: short, and much louder than the hiss. Roughly 55 a second on
      // vinyl, and none at all on the other two — a CD that crackles is a
      // scratched CD, and the whole appeal of tape hiss is that it is smooth.
      //
      // ⚠️ Was 25/s at half this gain, and the honest verdict after living with
      // it was that you had to already know it was there. The failure mode in
      // the other direction is "broken speaker", and what separates the two is
      // DENSITY rather than loudness — so this doubles the count and lets the
      // user's own multiplier do the loudness.
      if (spec.pops > 0 && Math.random() < spec.pops) {
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
    // bass, the top end is what makes noise sound like static rather than
    // vinyl. It is also the only thing separating the three beds from each
    // other — 1900 Hz is a groove, 4600 is tape, 520 is a plastic key.
    //
    // ⚠️ Vinyl's 2600/0.7 sat entirely in the region a first bar of music fills,
    // which is most of why it went unheard. Lower and wider leaves it some body
    // of its own without reaching the bass it must not fight.
    const filter = audio.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = spec.freq
    filter.Q.value = spec.q

    // A click has to arrive; a bed has to fade. The attack is a twentieth of
    // the length either way, which for 50ms is an edge and for 900ms is a swell.
    const attack = Math.min(0.05, spec.seconds * 0.06)
    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(spec.peak * level, at + attack)
    // Fades out under the music rather than stopping — the point is that it
    // hands over, not that it ends.
    gain.gain.exponentialRampToValueAtTime(0.0001, at + spec.seconds * 0.98)

    source.connect(filter).connect(gain).connect(audio.destination)
    source.start(at)
    source.stop(at + spec.seconds)
  } catch {
    /* ignore */
  }
}

/** Close the shared context — on teardown, so a hot reload doesn't stack them. */
/**
 * The countdown's tick — a metronome's wooden click, once on the 2 and once on
 * the 1 (James, 2026-09-10: "Have a sound on 2, 1 — is it called a metronome").
 *
 * Two short tones rather than a noise burst: a woodblock is a pitched knock
 * with a hard front edge, and a band of noise reads as a hiss. The 1 is a
 * little higher, the way a metronome marks the downbeat, so the ear hears "and
 * — GO" rather than two identical clicks. Well under a second, like every cue.
 */
const TICK: ToneSpec[] = [
  { kind: 'tone', at: 0, wave: 'sine', from: 1650, to: 1480, peak: 0.3, seconds: 0.07 },
  { kind: 'tone', at: 0, wave: 'triangle', from: 3300, to: 2900, peak: 0.1, seconds: 0.03 },
]

export function playCountTick(volume = 0.8, level = 1, downbeat = false): void {
  const audio = ctx()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume().catch(() => {})
  const gain = Math.max(0, Math.min(1, volume)) * Math.max(0, Math.min(MAX_LEVEL, level))
  if (gain <= 0) return
  const pitch = downbeat ? 1.26 : 1
  const now = audio.currentTime
  for (const part of TICK) tone(audio, now + part.at, gain, { ...part, from: part.from * pitch, to: part.to * pitch })
  idleAfter(0.12)
}

/**
 * Put this file's `AudioContext` to sleep once a cue has finished.
 *
 * ⚠️ BECAUSE A RUNNING ONE MAY BE WHAT STOPS THE MUSIC IN THE BACKGROUND. iOS
 * treats Web Audio as something that may not play with the app off screen and
 * interrupts it as the app goes — and on 2026-09-10 the music (a plain `<audio>`
 * element, which iOS does let play on) was found already paused at the moment
 * the app was hidden, with no graph of our own built. This context was the one
 * piece of Web Audio still alive: created for the first needle drop and then
 * left running, making silence, for the rest of the session. It is only needed
 * for the second or so a cue lasts; the next cue resumes it (see the
 * `suspended` check in each player above).
 */
let idleTimer: ReturnType<typeof setTimeout> | null = null

function idleAfter(seconds: number): void {
  if (idleTimer !== null) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (!musicPlaying) sleep()
  }, (seconds + 0.25) * 1000)
}

/**
 * ⚠️ WHILE THE MUSIC PLAYS, THE CONTEXT STAYS AWAKE. WebKit counts this
 * context as one of the page's players, and iOS shows the page as PAUSED when
 * it is put to sleep — on the iPhone (2026-09-10) Control Centre showed the
 * play triangle over a song that was playing, because the context was
 * suspended a moment after the countdown and again on every trip to the
 * background. So it sleeps only when the music stops (`followMusic`, fed from
 * the player), and wakes when the music starts.
 */
let musicPlaying = false

export function followMusic(playing: boolean): void {
  if (playing === musicPlaying) return
  musicPlaying = playing
  if (!context) return
  if (playing) {
    if (context.state === 'suspended') void context.resume().catch(() => {})
  } else if (idleTimer === null) {
    sleep()
  }
}

function sleep(): void {
  if (context && context.state === 'running') void context.suspend().catch(() => {})
}

/** For the iPhone diagnostics: `none`, `running`, `suspended` or `closed`. */
export function effectsState(): string {
  return context ? context.state : 'none'
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !musicPlaying) sleep()
  })
}

export function closeAudioContext(): void {
  try {
    void context?.close()
  } catch {
    /* ignore */
  }
  context = null
}
