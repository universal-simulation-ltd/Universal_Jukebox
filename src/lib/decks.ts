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
// ⚠️ Keyed by `DeckSetting`, not `DeckStyle`, so `random` gets copy too. It is
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
  random: {
    label: 'Random',
    hint: 'A different machine for each track — record, disc, cassette, jukebox, then round again. The row waiting to go on shows what each one will be played on.',
    noun: 'record',
    verb: 'starts up whatever came up',
    startTitle: 'Putting something on',
    startNote: 'The loading animation, the countdown, and the sound of whichever machine this track came up on.',
    soundLabel: 'Start-up sound',
    soundHint:
      'The machine starting: a needle landing, a disc spinning up, a play key, or a jukebox gripper, depending on what came up. Rides your volume, and never plays on its own.',
    pickup: 'pickup',
  },
}

/** The copy for a chosen setting. The store validates, so this always hits. */
export function deckCopy(setting: DeckSetting): DeckCopy {
  return DECKS[setting] ?? DECKS.vinyl
}

/**
 * The order `random` walks, and why it is a rotation rather than a roll of the
 * dice (James, 2026-09-09: "rotates each of the options on the queue e.g.
 * vinyl, cd, cassette, vinyl …").
 *
 * ⚠️ It is a CYCLE, not `Math.random()`, and the difference is the feature. A
 * real random pick repeats — three cassettes in a row is an ordinary outcome —
 * and the complaint that produces is "the random setting is broken", which it
 * would not be. A cycle also makes the choice a pure function of a POSITION,
 * which is what lets the row of records waiting to go on show the machine each
 * one is headed for. Nothing has to be remembered, so nothing can disagree with
 * itself after a reload.
 *
 * ⚠️ Deliberately NOT `DECK_SETTINGS` with `random` filtered out. This order is
 * about how the four look one after another; the chooser's order is about how
 * they read in a list. Deriving one from the other ties two unrelated decisions
 * together with a line that keeps compiling after somebody adds a fifth option
 * that is not a machine either.
 */
export const DECK_ROTATION: DeckStyle[] = ['vinyl', 'cd', 'cassette', 'jukebox']

/**
 * The machine to draw and to sound, for a given place in the queue.
 *
 * `at` is an index into `order` — the position of a track in the sequence — so
 * the current track uses the cursor and the third record waiting uses
 * `cursor + 3`. A cursor of -1 (nothing has played yet) falls to the start of
 * the rotation, which is vinyl: the app's own default, and the right thing for
 * an empty deck to be showing.
 *
 * ⚠️ The RETURN type is `DeckStyle`, never `DeckSetting`. This function is the
 * only crossing between what the user chose and what gets drawn, and everything
 * downstream of it — the faces, the frames, the cues — is keyed on the narrower
 * type, so none of them can be reached with `random` by accident.
 */
export function resolveDeck(setting: DeckSetting, at: number): DeckStyle {
  if (setting !== 'random') return setting
  const n = DECK_ROTATION.length
  const index = Number.isFinite(at) ? Math.max(0, Math.trunc(at)) : 0
  return DECK_ROTATION[index % n]
}
