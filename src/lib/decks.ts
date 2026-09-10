import type { DeckSetting, DeckStyle } from '../stores/settingsStore'

// The decks, as words.
//
// Every user-facing string that changes with the deck lives here, in one map,
// rather than as conditionals scattered through the Settings page. The reason
// is not tidiness: this app's copy is FULL of vinyl — "the arm", "the needle",
// "putting a record on" — and the failure mode of a skin setting is a cassette
// on screen while the page still talks about a tonearm. One map means adding a
// fifth deck is a row here plus a face in `components/decks/`, with nothing
// anywhere else to hunt for.
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
  label: string
  /** The line under it, saying what you would be looking at. */
  hint: string
  /** The medium, bare, for "a ___" and "___-changing": record, disc, cassette. */
  noun: string
  /**
   * What pressing play does, following "…goes to the deck and".
   *
   * ⚠️ Describe the MACHINE, not the user. "presses play" was the first draft
   * and it made the sentence eat its own tail: "any play … goes to the deck and
   * presses play".
   */
  verb: string
  /** The heading over the animation controls. */
  startTitle: string
  /** The line under that heading. */
  startNote: string
  /** The start-up sound's settings row label. */
  soundLabel: string
  /** What that sound actually is. */
  soundHint: string
  /**
   * What lands on the medium: the needle, the laser, the tape head.
   *
   * ⚠️ A field rather than the `noun === 'record' ? 'needle' : 'pickup'` test
   * this used to be, because that test asks the wrong question — it happens to
   * be right for three decks, and the jukebox (whose noun IS 'record', and
   * which does have a needle) would be right by luck too. A machine's pickup is
   * a fact about the machine, so it belongs in the machine's row.
   */
  pickup: string
}

export const DECKS: Record<DeckSetting, DeckCopy> = {
  vinyl: {
    label: 'Vinyl',
    hint: 'A record turning at 33⅓ with the album art as its centre label, and a tonearm creeping in towards the middle as the track plays.',
    noun: 'record',
    verb: 'cues the arm',
    startTitle: 'Putting a record on',
    startNote: 'The turntable animation, the countdown, and the sound of the needle landing.',
    soundLabel: 'Needle-drop sound',
    soundHint:
      'A low thunk and a second of surface noise as the arm lands — putting a record on, changing track, and previewing one. Rides your volume, and never plays on its own.',
    pickup: 'needle',
  },
  cd: {
    label: 'CD',
    hint: 'A portable CD player with the lid open, the disc in its well, and the laser tracking outwards from the middle — the direction a CD is actually read.',
    noun: 'disc',
    verb: 'spins the disc up',
    startTitle: 'Putting a disc in',
    startNote: 'The disc animation, the countdown, and the sound of it spinning up.',
    soundLabel: 'Disc spin-up sound',
    soundHint:
      'The lid click and the whirr of a disc coming up to speed — starting a disc, changing track, and previewing one. Rides your volume, and never plays on its own.',
    pickup: 'laser',
  },
  cassette: {
    label: 'Cassette',
    hint: 'A Walkman-style shell with the tape spooling from the left reel to the right, so how far through you are is how full the reels are.',
    noun: 'cassette',
    verb: 'clunks the play key down',
    startTitle: 'Putting a cassette in',
    startNote: 'The cassette animation, the countdown, and the sound of the play key.',
    soundLabel: 'Play-key sound',
    soundHint:
      'The clunk of the play key latching and a moment of tape hiss — putting a cassette in, changing track, and previewing one. Rides your volume, and never plays on its own.',
    pickup: 'tape head',
  },
  jukebox: {
    label: 'Jukebox',
    hint: 'The cabinet the app is named after — the 45 swung out of the rack by the gripper, laid on the platter under the lit arch, and played.',
    noun: 'record',
    verb: 'sends the gripper out',
    startTitle: 'Pulling a record from the rack',
    startNote: 'The selection mechanism, the countdown, and the sound of the record being loaded.',
    soundLabel: 'Loading-mechanism sound',
    soundHint:
      'The clack of the gripper, the swing of the record across to the platter, and the needle landing on it — selecting a record, changing track, and previewing one. Rides your volume, and never plays on its own.',
    pickup: 'needle',
  },
  // ⚠️ The one entry that is not a machine. Every sentence here has to stay
  // true whichever of the four is currently up, so none of them names a
  // mechanism — `noun` is 'record' because that is what a jukebox holds and
  // what two of the four play, and it is the least wrong word available for a
  // sentence that has to be readable before you know what came up.
  pocket: {
    label: 'Pocket player',
    hint: 'A pocket music player with the album art on its screen, a click wheel under it, and the progress bar filling as the track plays.',
    noun: 'album',
    verb: 'wakes the screen',
    startTitle: 'Picking an album',
    startNote: 'The player waking up, the countdown, and the click of the wheel.',
    soundLabel: 'Click-wheel sound',
    soundHint:
      'The tick of the wheel and the centre button pressed — starting an album, changing track, and previewing one. Rides your volume, and never plays on its own.',
    pickup: 'playhead',
  },
  automatic: {
    label: 'Automatic',
    hint: 'Each album on the machine of its day, by the year on the album — a jukebox for the oldest, then vinyl, cassette, CD and a pocket player. You choose the years each one takes over.',
    noun: 'record',
    verb: 'starts the machine of the album’s day',
    startTitle: 'Putting something on',
    startNote: 'The loading animation, the countdown, and the sound of whichever machine the album belongs to.',
    soundLabel: 'Start-up sound',
    soundHint:
      'The machine starting: a jukebox gripper, a needle landing, a play key, a disc spinning up or a click wheel, depending on the album’s year. Rides your volume, and never plays on its own.',
    pickup: 'pickup',
  },
}

/** The copy for a chosen setting. The store validates, so this always hits. */
export function deckCopy(setting: DeckSetting): DeckCopy {
  return DECKS[setting] ?? DECKS.vinyl
}

/**
 * The machines in the order of their day — what `automatic` walks through as
 * the years go by. The Settings miniature for Automatic draws the last four.
 */
export const ERA_ORDER: DeckStyle[] = ['jukebox', 'vinyl', 'cassette', 'cd', 'pocket']

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
  if (year >= eras.pocket) return 'pocket'
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
