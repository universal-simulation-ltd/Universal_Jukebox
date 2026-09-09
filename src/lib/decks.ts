import type { DeckStyle } from '../stores/settingsStore'

// The three decks, as words.
//
// Every user-facing string that changes with the deck lives here, in one map,
// rather than as conditionals scattered through the Settings page. The reason
// is not tidiness: this app's copy is FULL of vinyl — "the arm", "the needle",
// "putting a record on" — and the failure mode of a skin setting is a cassette
// on screen while the page still talks about a tonearm. One map means adding a
// fourth deck is a row here plus a face in `components/decks/`, with nothing
// anywhere else to hunt for.
//
// ⚠️ Only the strings that MUST change are in here. Plenty of the ceremony's
// copy was reworded to be true of all three instead ("a different album", "no
// pause between them"), which is better than three versions of a sentence: a
// map entry is a thing that can drift, and a neutral sentence cannot.

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
}

export const DECKS: Record<DeckStyle, DeckCopy> = {
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
  },
  cd: {
    label: 'CD',
    hint: 'A disc under a Discman-style laser, which tracks outwards from the middle — the direction a CD is actually read.',
    noun: 'disc',
    verb: 'spins the disc up',
    startTitle: 'Putting a disc in',
    startNote: 'The disc animation, the countdown, and the sound of it spinning up.',
    soundLabel: 'Disc spin-up sound',
    soundHint:
      'The lid click and the whirr of a disc coming up to speed — starting a disc, changing track, and previewing one. Rides your volume, and never plays on its own.',
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
  },
}

/** The copy for the current deck. The store validates, so this always hits. */
export function deckCopy(style: DeckStyle): DeckCopy {
  return DECKS[style] ?? DECKS.vinyl
}
