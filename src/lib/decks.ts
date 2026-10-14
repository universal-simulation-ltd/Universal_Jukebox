import type { DeckSetting, DeckStyle } from '../stores/settingsStore'
import { getT, type MessageKey } from '../i18n/runtime.ts'
import { barsPocketPlayer } from './nativeFile'

// The decks, as words.
//
// Every user-facing string that changes with the deck lives here, in one map,
// rather than as conditionals scattered through the Settings page. The reason
// is not tidiness: this app's copy is FULL of vinyl — "the arm", "the needle",
// "putting a record on" — and the failure mode of a skin setting is a cassette
// on screen while the page still talks about a tonearm. One map means adding a
// machine is a row here, its sentences in `i18n/en/decks.ts` (the compiler
// lists any it lacks) and a face in `components/decks/`, with nothing anywhere
// else to hunt for.
//
// ⚠️ Only the strings that MUST change are in here. Plenty of the ceremony's
// copy was reworded to be true of all of them instead ("a different album", "no
// pause between them"), which is better than four versions of a sentence: a
// map entry is a thing that can drift, and a neutral sentence cannot.
//
// ⚠️ Keyed by `DeckSetting`, not `DeckStyle`, so `automatic` gets copy too. It is
// the one entry that has to be true of every machine at once — the Settings
// page is read while the rotation is somewhere else entirely — which is why its
// sentences name no single mechanism.

export interface DeckCopy {
  /** The chooser's own option label. */
  readonly label: string
  /** The line under it, saying what you would be looking at. */
  readonly hint: string
  /** The heading over the animation controls. */
  readonly startTitle: string
  /** The line under that heading. */
  readonly startNote: string
  /** The start-up sound's settings row label. */
  readonly soundLabel: string
  /** What that sound actually is. */
  readonly soundHint: string
  /**
   * The "Every track" stop on the animation ladder: what any play does on this
   * machine — the MACHINE's action, then what lands back on the medium (the
   * needle, the laser, the tape head).
   *
   * ⚠️ Describe the MACHINE, not the user. "presses play" was the first draft
   * and it made the sentence eat its own tail: "any play … goes to the deck and
   * presses play".
   */
  readonly everyTrackHint: string
  /** The "When the album changes" stop: "Only when a different record goes on…". */
  readonly albumChangeHint: string
  /** The ladder's own label: "Show the record-changing animation". */
  readonly animationLabel: string
  /** The line under the ladder, naming this machine's sound. */
  readonly animationHint: string
  /** The tick box that silences the sound: "Mute the needle-drop sound". */
  readonly muteLabel: string
  /** The line under it: a lead-in, then `soundHint`. */
  readonly muteHint: string
  /** The loudness slider's label: "Needle-drop sound volume". */
  readonly volumeLabel: string
  /** That slider's line while the sound is muted. */
  readonly volumeOffHint: string
}

// ⚠️ WHOLE SENTENCES, NOT FRAGMENTS. This map used to hold `noun` ("record"),
// `verb` ("cues the arm") and `pickup` ("needle"), and the Settings page
// slotted them into its own sentences: "a different ___ goes on", "Show the
// ___-changing animation", "Mute the ${soundLabel.toLowerCase()}". That is
// English-only — a translated noun needs its own article, gender and case, and
// lower-casing a German noun is a spelling mistake — so every sentence that
// mentions the machine is now one key per machine in `i18n/en/decks.ts`
// (`decks.<deck>_<field>`), and nothing is assembled here or downstream.
// Do not bring a fragment field back to build a sentence with.
//
// ⚠️ GETTERS, read at the moment of use, so the words follow a language change
// in Tune this app; a value copied out at import time would stay English. The
// map keeps its old shape (`DECKS[setting].label`) so its readers did not
// change.
const FIELDS = {
  label: 'label',
  hint: 'hint',
  startTitle: 'start_title',
  startNote: 'start_note',
  soundLabel: 'sound_label',
  soundHint: 'sound_hint',
  everyTrackHint: 'every_track_hint',
  albumChangeHint: 'album_change_hint',
  animationLabel: 'animation_label',
  animationHint: 'animation_hint',
  muteLabel: 'mute_label',
  volumeLabel: 'volume_label',
  volumeOffHint: 'volume_off_hint',
} as const satisfies Record<Exclude<keyof DeckCopy, 'muteHint'>, string>

type Field = (typeof FIELDS)[keyof typeof FIELDS]

/** `decks.<deck>_<field>` — a compile error if any machine is missing any field. */
function key(deck: DeckSetting, field: Field | 'summary_off' | 'summary_on' | 'summary_at'): MessageKey {
  return `decks.${deck}_${field}` as const
}

function copyFor(deck: DeckSetting): DeckCopy {
  const copy = {} as DeckCopy
  for (const [name, field] of Object.entries(FIELDS) as [keyof typeof FIELDS, Field][]) {
    // Automatic's sentence lists the machines it picks from: without the pocket
    // player on iPhone/iPad (`barsPocketPlayer`).
    const which = (): MessageKey =>
      deck === 'automatic' && field === 'hint' && barsPocketPlayer() ? 'decks.automatic_hint_no_pocket' : key(deck, field)
    Object.defineProperty(copy, name, { enumerable: true, get: () => getT()(which()) })
  }
  Object.defineProperty(copy, 'muteHint', {
    enumerable: true,
    get: () => getT()('decks.mute_hint', { sound_hint: copy.soundHint }),
  })
  return copy
}

export const DECKS: Record<DeckSetting, DeckCopy> = {
  vinyl: copyFor('vinyl'),
  cd: copyFor('cd'),
  cassette: copyFor('cassette'),
  // ⚠️ `reel`, the setting, is the reel-to-reel — not the row of records
  // waiting to go on, which the code also calls a reel (`UpNextReel`). The
  // stored word had to be short and one word like the others; the copy says
  // "reel-to-reel" wherever the two could be confused.
  reel: copyFor('reel'),
  jukebox: copyFor('jukebox'),
  // The pocket player says "album" where the others say record, disc or reel:
  // what changes on it is the album on its screen.
  pocket: copyFor('pocket'),
  // ⚠️ The one entry that is not a machine. Every sentence in its keys has to
  // stay true whichever machine is currently up, so none of them names a
  // mechanism — they say "record" because that is what a jukebox holds and
  // what two of the machines play, the least wrong word for a sentence that has
  // to be readable before you know what came up, and "pickup" for whatever
  // lands on it.
  automatic: copyFor('automatic'),
}

/**
 * The start-up section's one-line summary when it is folded shut: the
 * animation ladder's setting (`mode`, a label such as "Every track"), then the
 * machine's sound — off, on at its usual level, or at `level` (a step such as
 * "+2"). One sentence per machine and state, for the reason at `DECKS`.
 */
export function startSummary(setting: DeckSetting, mode: string, sound: 'off' | 'on' | 'at', level = ''): string {
  return getT()(key(DECKS[setting] ? setting : 'vinyl', `summary_${sound}`), { mode, level })
}

/** The copy for a chosen setting. The store validates, so this always hits. */
export function deckCopy(setting: DeckSetting): DeckCopy {
  return DECKS[setting] ?? DECKS.vinyl
}

/**
 * The machines in the order of their day — what `automatic` walks through as
 * the years go by. The Settings miniature for Automatic draws the last four.
 *
 * ⚠️ THE REEL-TO-REEL IS NOT IN IT, and that is a decision rather than an
 * omission. `automatic` puts an album on the machine most people bought it for,
 * and nobody's record collection was on open reel: pre-recorded reels were a
 * hi-fi niche that never had an era of its own, and giving it one would take
 * a slice of somebody's vinyl or cassette years for a machine they never
 * owned. It is a deck you choose, never one the rotation chooses for you.
 * `ERA_ORDER` is a `DeckStyle[]` rather than a `Record`, so the compiler does
 * not ask about this — the test in `decks.test.ts` does.
 */
export const ERA_ORDER: DeckStyle[] = ['jukebox', 'vinyl', 'cassette', 'cd', 'pocket']

/** `ERA_ORDER` as this app has it: no pocket player on iPhone/iPad (`barsPocketPlayer`). */
export function eraOrder(): DeckStyle[] {
  return barsPocketPlayer() ? ERA_ORDER.filter((style) => style !== 'pocket') : ERA_ORDER
}

/**
 * The first year each later machine takes over, for `automatic`. Anything
 * before `vinyl` goes on the jukebox.
 *
 * ⚠️ Chosen by the person, not fixed (James, 2026-09-10: "you can choose some
 * years that correspond"). The defaults are roughly when each became the way
 * most people bought an album.
 */
export interface DeckEras {
  vinyl: number
  cassette: number
  cd: number
  pocket: number
}

export const DEFAULT_ERAS: DeckEras = { vinyl: 1963, cassette: 1983, cd: 1991, pocket: 2004 }

const ERA_KEYS: (keyof DeckEras)[] = ['vinyl', 'cassette', 'cd', 'pocket']
const FIRST_YEAR = 1900
const LAST_YEAR = 2100

/**
 * A stored or typed-in set of years, made usable: whole numbers, in range, and
 * never going BACKWARDS — a later machine cannot take over before an earlier
 * one, so each is pushed to at least the year of the one before it. Anything
 * missing or unreadable falls back to its default.
 */
export function sanitiseEras(value: unknown): DeckEras {
  const given = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const out = { ...DEFAULT_ERAS }
  let floor = FIRST_YEAR
  for (const key of ERA_KEYS) {
    const raw = Number(given[key])
    const year = Number.isFinite(raw) ? Math.round(raw) : DEFAULT_ERAS[key]
    out[key] = Math.max(floor, Math.min(LAST_YEAR, year))
    floor = out[key]
  }
  return out
}

/** The machine for an album of this year. No year at all goes on vinyl. */
export function deckForYear(year: number | undefined, eras: DeckEras = DEFAULT_ERAS): DeckStyle {
  if (!year || !Number.isFinite(year)) return 'vinyl'
  // Where there is no pocket player (`barsPocketPlayer`), the CD carries on.
  if (year >= eras.pocket && !barsPocketPlayer()) return 'pocket'
  if (year >= eras.cd) return 'cd'
  if (year >= eras.cassette) return 'cassette'
  if (year >= eras.vinyl) return 'vinyl'
  return 'jukebox'
}

/**
 * The machine to draw and to sound, for an album (or a track, where no album is
 * to hand — both carry `year`).
 *
 * ⚠️ The RETURN type is `DeckStyle`, never `DeckSetting`. This function is the
 * only crossing between what the user chose and what gets drawn, and the faces,
 * frames and cues downstream are all keyed on the narrower type, so none of them
 * can be reached with `automatic` by accident.
 *
 * ⚠️ Pass the ALBUM wherever there is one. A compilation's tracks can carry
 * their own original years, and the machine is a property of the record on the
 * deck — the whole album goes on one machine, not a different one per track.
 */
export function resolveDeck(
  setting: DeckSetting,
  dated: { year?: number } | null | undefined,
  eras: DeckEras = DEFAULT_ERAS,
): DeckStyle {
  if (setting !== 'automatic') return setting
  return deckForYear(dated?.year, eras)
}
