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
 * When the record-changing ceremony runs.
 *
 * - `always` — every time you press play on anything (the default).
 * - `album`  — only when you deliberately start a DIFFERENT album.
 * - `first`  — once per session, on the first play, and never again.
 * - `off`    — never.
 *
 * ⚠️ `always` is the default as of 2026-09-08 (James). Putting a record on is
 * what this app IS, so pressing play anywhere — the tracks list, a search
 * result, an album — takes you to the deck and cues the arm. The other three
 * remain because somebody who finds it too much has to be able to say so, and
 * "Don't show this again" on the animation itself still writes `off`.
 */
export type CeremonyMode = 'always' | 'album' | 'first' | 'off'

/** Which library tab the front door opens on. */
export type HomeTab = 'albums' | 'artists' | 'tracks'

/**
 * What the thing turning on Now Playing is.
 *
 * - `vinyl`    — a record, a tonearm creeping inward (the default, and what the
 *                app was before this setting existed).
 * - `cd`       — a disc under a Discman-style laser sled, tracking outward.
 * - `cassette` — a Walkman-style shell, the tape spooling left to right.
 *
 * ⚠️ This changes the PICTURE and the start-up sound, and nothing else. The
 * ceremony's beats, the progress it is driven by, and every rule in
 * `lib/ceremony.ts` are identical for all three — see `components/Deck.tsx`.
 * The temptation with a setting like this is to let each medium have its own
 * timing "because a CD is quicker"; don't. One timeline, three skins, or the
 * ceremony tests stop covering two thirds of the app.
 */
export type DeckStyle = 'vinyl' | 'cd' | 'cassette'

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
   * Which player the deck draws, and which start-up sound it makes.
   *
   * ⚠️ Vinyl is the default and must stay it: an existing user's stored blob
   * has no `deck` key, and the field-by-field fallback below has to give them
   * back exactly the app they had.
   */
  deck: DeckStyle
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
}

export const DEFAULTS: Settings = {
  ceremonyMode: 'always',
  homeTab: 'albums',
  deck: 'vinyl',
  needleDrop: true,
  needleDropLevel: 1,
  volumeBoost: 1,
  fadeInSec: 0,
  fadeOutSec: 0,
}

/** The longest fade either control offers. Also the clamp used when reading. */
export const MAX_FADE_SEC = 8
/** The loudest boost offered. Past ~4x almost everything clips audibly. */
export const MAX_BOOST = 4
/**
 * The needle-drop level's range.
 *
 * The floor is deliberately NOT zero: silencing the effect is what the toggle
 * beside it is for, and a slider that can reach silence gives two controls that
 * both mean "off" — and then a toggle that says "on" over an effect nobody can
 * hear, which is indistinguishable from a broken app.
 */
export const MIN_NEEDLE_LEVEL = 0.25
export const MAX_NEEDLE_LEVEL = 2

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
    ceremonyMode:
      mode === 'always' || mode === 'album' || mode === 'first' || mode === 'off'
        ? mode
        : DEFAULTS.ceremonyMode,
    homeTab: tab === 'albums' || tab === 'artists' || tab === 'tracks' ? tab : DEFAULTS.homeTab,
    deck: deck === 'vinyl' || deck === 'cd' || deck === 'cassette' ? deck : DEFAULTS.deck,
    needleDrop: typeof stored.needleDrop === 'boolean' ? stored.needleDrop : legacyNeedleDrop(),
    needleDropLevel: clamp(stored.needleDropLevel, MIN_NEEDLE_LEVEL, MAX_NEEDLE_LEVEL, DEFAULTS.needleDropLevel),
    volumeBoost: clamp(stored.volumeBoost, 1, MAX_BOOST, DEFAULTS.volumeBoost),
    fadeInSec: clamp(stored.fadeInSec, 0, MAX_FADE_SEC, DEFAULTS.fadeInSec),
    fadeOutSec: clamp(stored.fadeOutSec, 0, MAX_FADE_SEC, DEFAULTS.fadeOutSec),
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
    needleDrop: state.needleDrop,
    needleDropLevel: state.needleDropLevel,
    volumeBoost: state.volumeBoost,
    fadeInSec: state.fadeInSec,
    fadeOutSec: state.fadeOutSec,
  }
  try { localStorage.setItem(KEY, JSON.stringify(blob)) } catch { /* ignore */ }
}

/** The current settings, for non-React callers (the stores and the audio layer). */
export function settings(): Settings {
  return useSettingsStore.getState()
}
