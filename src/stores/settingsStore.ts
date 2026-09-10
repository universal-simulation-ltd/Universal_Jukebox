import { DEFAULT_ERAS, sanitiseEras, type DeckEras } from '../lib/decks'
import { create } from 'zustand'

// Everything on the Settings page, in one store, persisted to localStorage.
//
// ⚠️ This is deliberately a SETTINGS store and not a pile of independent keys.
// `crackle` used to live in `playerStore` under its own key, and by the time
// there were four preferences that pattern would have meant four readers, four
// writers, four try/catch blocks and four chances to forget one. Adding a
// setting here should be: a field, a default, and a control on the page.
//
// Every read and write is wrapped, because storage genuinely throws: a private
// window, "block all cookies", a full disk. A player that will not start
// because it could not read a preference has its priorities backwards — the
// defaults below are all "behave the way the app did before this setting
// existed".

/**
 * How often the record-changing animation runs.
 *
 * - `always` — every time you press play, and every track change (the default).
 * - `album`  — only when the RECORD changes.
 * - `artist` — only when the ARTIST changes.
 * - `first`  — once per session, on the first play, and never again.
 * - `off`    — never.
 *
 * ⚠️ A FREQUENCY LADDER, most often to least, and the order matters: it is what
 * the Settings slider slides along (James asked for a slider rather than a set
 * of radios, 2026-09-09). Each rung includes the ones below it, because every
 * artist change is also an album change. `first` sits between `artist` and
 * `off` because once per visit is rarer than either.
 *
 * ⚠️ It governs TWO things that used to be one: the ceremony on an explicit
 * play (`lib/ceremony.ts`) and the change-over between two tracks in a running
 * queue (`lib/transition.ts`). `artist` was added for the second — "only when
 * the artist changes" is meaningless for a play the user just asked for by name.
 *
 * ⚠️ `always` is the default as of 2026-09-08 (James). Putting a record on is
 * what this app IS, so pressing play anywhere — the tracks list, a search
 * result, an album — takes you to the deck and cues the arm. The others remain
 * because somebody who finds it too much has to be able to say so, and
 * "Don't show this again" on the animation itself still writes `off`.
 */
export type CeremonyMode = 'always' | 'album' | 'artist' | 'first' | 'off'

/**
 * The ladder as an ARRAY, least often first, so a slider can index it.
 *
 * ⚠️ The single source of the order. The Settings slider reads it, and so does
 * anything else that has to put the modes in a line — a second hand-written
 * copy of this order is how a slider ends up going the wrong way after somebody
 * adds a mode.
 */
export const CEREMONY_LADDER: CeremonyMode[] = ['off', 'first', 'artist', 'album', 'always']

/** Which library tab the front door opens on. */
export type HomeTab = 'albums' | 'artists' | 'tracks'

/**
 * What the thing turning on Now Playing is.
 *
 * - `vinyl`    — a record, a tonearm creeping inward (the default, and what the
 *                app was before this setting existed).
 * - `cd`       — a disc under a Discman-style laser sled, tracking outward.
 * - `cassette` — a Walkman-style shell, the tape spooling left to right.
 * - `jukebox`  — the cabinet the app is named after: a 45 lifted out of the
 *                rack by a gripper, laid on the platter, and played.
 *
 * ⚠️ This changes the PICTURE and the start-up sound, and nothing else. The
 * ceremony's beats, the progress it is driven by, and every rule in
 * `lib/ceremony.ts` are identical for all four — see `components/Deck.tsx`.
 * The temptation with a setting like this is to let each medium have its own
 * timing "because a CD is quicker"; don't. One timeline, four skins, or the
 * ceremony tests stop covering three quarters of the app.
 *
 * ⚠️ This is a MACHINE, always one of these four. What the user may have
 * chosen is a `DeckSetting`, which has one more value — see below.
 */
export type DeckStyle = 'vinyl' | 'cd' | 'cassette' | 'jukebox' | 'pocket'

/**
 * What the user picked, which is not quite the same thing.
 *
 * `automatic` is the one value that is not a machine: it means "the machine of
 * the album's day", and `lib/decks.ts` resolves it against the album's YEAR
 * (James, 2026-09-10: "Instead of random, let's do automatic which gives each
 * album a device based on its year"). A stored `automatic` from before loads as
 * `automatic`.
 *
 * ⚠️ The two types are deliberately separate rather than one union with a
 * `automatic` member, and the split is what keeps the rest of the app honest.
 * `FACES`, `SHAPES` and `CUES` are all `Record<DeckStyle, …>`, so nothing that
 * has to DRAW or SOUND a deck can be handed `automatic` — it has to go through
 * `resolveDeck()` first, which is the only place the rotation exists. The
 * version of this that made `automatic` a `DeckStyle` compiled fine and rendered
 * nothing.
 */
export type DeckSetting = DeckStyle | 'automatic'

/**
 * Every value `deck` may hold, in the order the chooser lists them.
 *
 * ⚠️ The validator reads THIS rather than a hand-written chain of `===`. The
 * chain is what was here, and adding the jukebox to it meant remembering a
 * fourth clause in a file that has nothing else to do with decks — miss it and
 * the setting saves, then silently reverts to vinyl on the next load, which is
 * the hardest kind of bug to see because the app looks like it is working.
 *
 * ⚠️ `automatic` is LAST on purpose: it is the option that is not a machine, and
 * putting it at the end of the radio list keeps the four real ones together.
 */
export const DECK_SETTINGS: DeckSetting[] = ['vinyl', 'cd', 'cassette', 'jukebox', 'pocket', 'automatic']

export interface Settings {
  ceremonyMode: CeremonyMode
  /**
   * The tab starred in the library nav.
   *
   * ⚠️ Only applies to HOME (`#/`) — an explicit `#/albums` is still albums, or
   * starring Tracks would make the Albums tab unreachable by its own button.
   */
  homeTab: HomeTab
  /**
   * Which player the deck draws, and which start-up sound it makes — or
   * `automatic`, for a different one per track.
   *
   * ⚠️ Vinyl is the default and must stay it: an existing user's stored blob
   * has no `deck` key, and the field-by-field fallback below has to give them
   * back exactly the app they had.
   */
  deck: DeckSetting
  /** Where each machine's day starts, for `automatic` — see `DeckEras`. */
  deckEras: DeckEras
  /** The synthesised start-up sound: the needle landing, the disc spinning up,
   *  or the play key latching, whichever deck is showing. */
  needleDrop: boolean
  /**
   * How loud that thunk and crackle are, 0.25–2× the synth's own level.
   *
   * ⚠️ Separate from `volume` on purpose. It multiplies the app volume rather
   * than replacing it, so the effect can never be heard over music that has
   * been turned down — but it is allowed ABOVE 1, because the complaint that
   * produced this control was that the crackle was too quiet to notice, and a
   * slider that only attenuates would not have answered it.
   */
  needleDropLevel: number
  /**
   * Extra gain ABOVE the volume slider, 1–4×.
   *
   * ⚠️ The `<audio>` element's own `volume` is hard-capped at 1.0 by the HTML
   * spec, so anything above unity has to go through a Web Audio `GainNode` —
   * which means routing the element through an `AudioContext`. That is a real
   * cost (see `lib/audioGraph.ts`), so it happens ONLY when this is above 1.
   */
  volumeBoost: number
  /** Seconds of fade at the start of a track. 0 = straight in. */
  fadeInSec: number
  /** Seconds of fade before the end of a track. 0 = straight out. */
  fadeOutSec: number
  /**
   * Whether a track with no lyrics in its own tags may be looked up on
   * lrclib.net.
   *
   * ⚠️ FALSE BY DEFAULT AND THE ONLY SETTING THAT REACHES THE NETWORK. The app
   * says "nothing is uploaded" on its front page and means it; this is the one
   * qualification, and it is a qualification precisely because it is off until
   * somebody reads the sentence beside it and turns it on. Every rule that
   * follows from that is written down in `lib/lrclib.ts` — read that file
   * before changing this one.
   */
  lyricsOnline: boolean
}

export const DEFAULTS: Settings = {
  ceremonyMode: 'always',
  homeTab: 'albums',
  deck: 'vinyl',
  deckEras: DEFAULT_ERAS,
  needleDrop: true,
  needleDropLevel: 1,
  volumeBoost: 1,
  fadeInSec: 0,
  fadeOutSec: 0,
  lyricsOnline: false,
}

/** The longest fade either control offers. Also the clamp used when reading. */
export const MAX_FADE_SEC = 8
/** The loudest boost offered. Past ~4x almost everything clips audibly. */
export const MAX_BOOST = 4
/**
 * The needle-drop level's range, as a multiplier.
 *
 * The floor is deliberately NOT zero: silencing the effect is what the toggle
 * beside it is for, and a slider that can reach silence gives two controls that
 * both mean "off" — and then a toggle that says "on" over an effect nobody can
 * hear, which is indistinguishable from a broken app.
 *
 * ⚠️ The floor moved from 0.25 to 0.5 when the control became a ±5 scale
 * (below). A stored 0.25 clamps up to 0.5 on read, which is a change of about
 * six decibels to a sound that lasts under a second — and the alternative was a
 * slider whose bottom end was twice as far from centre as its top end.
 */
export const MIN_NEEDLE_LEVEL = 0.5
export const MAX_NEEDLE_LEVEL = 2

/**
 * The same control as a ±5 scale, which is how it is presented (James asked for
 * "0 as default with slider from -5 to +5 to boost or silent", 2026-09-09).
 *
 * ⚠️ The STORED value stays a multiplier and the scale is presentation only.
 * `lib/crackle.ts` is a synth that knows nothing about settings and multiplies
 * a gain by this number; teaching it about steps, or storing steps and
 * converting at four call sites, would put the same arithmetic in more places
 * than one. Steps are what the slider speaks; multipliers are what the audio
 * speaks; this is the one place they meet.
 *
 * Geometric, not linear: each step is a fifth of an octave, so -5 is half as
 * loud, +5 is twice, and 0 is exactly the level everyone already has. A linear
 * scale over the same range would put ten of its eleven stops above unity.
 */
export const NEEDLE_STEP_MIN = -5
export const NEEDLE_STEP_MAX = 5

/** A ±5 step as the multiplier the synth wants. */
export function stepToLevel(step: number): number {
  const clamped = Math.max(NEEDLE_STEP_MIN, Math.min(NEEDLE_STEP_MAX, step))
  return Math.max(MIN_NEEDLE_LEVEL, Math.min(MAX_NEEDLE_LEVEL, 2 ** (clamped / NEEDLE_STEP_MAX)))
}

/** A stored multiplier as the nearest ±5 step, for the slider to sit on. */
export function levelToStep(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 0
  const step = Math.round(NEEDLE_STEP_MAX * Math.log2(level))
  return Math.max(NEEDLE_STEP_MIN, Math.min(NEEDLE_STEP_MAX, step))
}

const KEY = 'unisim-jukebox-settings'
/** The single-purpose key `playerStore` used before this store existed. */
const LEGACY_CRACKLE_KEY = 'unisim-jukebox-crackle'

function clamp(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Read the stored settings, falling back field by field.
 *
 * ⚠️ Field by field, not all-or-nothing. A settings blob written by an older
 * version is missing whatever was added since, and rejecting the whole object
 * because one field is absent would silently reset every preference the user
 * has ever set. Each field validates itself and falls back on its own.
 */
function read(): Settings {
  let stored: Partial<Record<keyof Settings, unknown>> = {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') stored = parsed as typeof stored
    }
  } catch { /* storage disabled, or somebody else's JSON under our key */ }

  const mode = stored.ceremonyMode
  const tab = stored.homeTab
  const deck = stored.deck
  return {
    ceremonyMode: CEREMONY_LADDER.includes(mode as CeremonyMode)
      ? (mode as CeremonyMode)
      : DEFAULTS.ceremonyMode,
    homeTab: tab === 'albums' || tab === 'artists' || tab === 'tracks' ? tab : DEFAULTS.homeTab,
    // `automatic` was retired for `automatic` on 2026-09-10; somebody who had
    // chosen "a different machine each time" gets the closest thing to it.
    deck: deck === 'random' ? 'automatic' : DECK_SETTINGS.includes(deck as DeckSetting) ? (deck as DeckSetting) : DEFAULTS.deck,
    deckEras: sanitiseEras((stored as { deckEras?: unknown }).deckEras),
    needleDrop: typeof stored.needleDrop === 'boolean' ? stored.needleDrop : legacyNeedleDrop(),
    needleDropLevel: clamp(stored.needleDropLevel, MIN_NEEDLE_LEVEL, MAX_NEEDLE_LEVEL, DEFAULTS.needleDropLevel),
    volumeBoost: clamp(stored.volumeBoost, 1, MAX_BOOST, DEFAULTS.volumeBoost),
    fadeInSec: clamp(stored.fadeInSec, 0, MAX_FADE_SEC, DEFAULTS.fadeInSec),
    fadeOutSec: clamp(stored.fadeOutSec, 0, MAX_FADE_SEC, DEFAULTS.fadeOutSec),
    // ⚠️ `=== true`, not a truthy read. A stored value of anything other than
    // an explicit `true` — a string, a 1, a blob written by some future
    // version — has to mean off, because "off unless someone chose otherwise"
    // is the entire guarantee this setting makes.
    lyricsOnline: stored.lyricsOnline === true,
  }
}

/**
 * Honour the choice made under the old single-purpose key.
 *
 * Someone who turned the needle drop off in the first version of the app did so
 * on purpose, and having it come back on because the preference moved house
 * would be exactly the kind of small betrayal nobody reports and everybody
 * notices. Read once, on the first load after the upgrade; the value is then
 * written into the new blob by the first `set` and this never matters again.
 */
function legacyNeedleDrop(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_CRACKLE_KEY)
    if (raw !== null) return raw === '1'
  } catch { /* ignore */ }
  return DEFAULTS.needleDrop
}

interface SettingsState extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void
  reset(): void
}

export const useSettingsStore = create<SettingsState>((setState, get) => ({
  ...read(),

  set(key, value) {
    setState({ [key]: value } as Pick<SettingsState, typeof key>)
    persist(get())
  },

  reset() {
    setState({ ...DEFAULTS })
    persist(DEFAULTS)
  },
}))

function persist(state: Settings) {
  const blob: Settings = {
    ceremonyMode: state.ceremonyMode,
    homeTab: state.homeTab,
    deck: state.deck,
    deckEras: state.deckEras,
    needleDrop: state.needleDrop,
    needleDropLevel: state.needleDropLevel,
    volumeBoost: state.volumeBoost,
    fadeInSec: state.fadeInSec,
    fadeOutSec: state.fadeOutSec,
    lyricsOnline: state.lyricsOnline,
  }
  try { localStorage.setItem(KEY, JSON.stringify(blob)) } catch { /* ignore */ }
}

/** The current settings, for non-React callers (the stores and the audio layer). */
export function settings(): Settings {
  return useSettingsStore.getState()
}
