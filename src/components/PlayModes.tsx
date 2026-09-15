import { ShuffleGlyph } from './AlbumView'
import { AboutToggle } from './AboutTrack'
import AddToShelf from './AddToShelf'
import { ModeButton } from './ModeButton'
import OutputButton from './OutputButton'
import { currentTrack, usePlayerStore, type Repeat } from '../stores/playerStore'

// The row of round buttons under the records waiting to go on: shuffle and the
// two repeats (James, 2026-09-11: "repeat: add three buttons, centred, under
// the x more records for repeat and shuffle"), then this song onto a shelf and
// About this track (2026-09-13: "move (i) and (add to shelf) to the line of
// shuffle, repeat etc to make ui cleaner up top").
//
// ⚠️ TWO GROUPS IN ONE ROW, not one group of five. The first three are the PLAY
// ORDER, and a screen reader is told so; the other two are about the song on
// the deck. Five fit across a phone (`ModeButton` narrows there); on anything
// narrower the second pair wraps as a pair rather than splitting.
//
// Repeat all and repeat one are either/or: tapping the one that is on turns
// repeat off. (The mini player no longer has a repeat button at all; shuffle is
// in its queue popup.)

export default function PlayModes() {
  const queued = usePlayerStore((s) => s.queue.length)
  const track = usePlayerStore(currentTrack)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const setRepeat = usePlayerStore((s) => s.setRepeat)
  if (queued === 0) return null
  const pick = (mode: Exclude<Repeat, 'off'>) => setRepeat(repeat === mode ? 'off' : mode)

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-5">
      <div role="group" aria-label="Play order" className="flex gap-x-1 sm:gap-x-5">
        <ModeButton label="Shuffle" on={shuffle} onClick={() => toggleShuffle()}>
          <ShuffleGlyph />
        </ModeButton>
        <ModeButton label="Repeat all" on={repeat === 'all'} onClick={() => pick('all')}>
          <RepeatGlyph />
        </ModeButton>
        <ModeButton label="Repeat one" on={repeat === 'one'} onClick={() => pick('one')}>
          <RepeatOneGlyph />
        </ModeButton>
      </div>
      {track && (
        <div className="flex gap-x-1 sm:gap-x-5">
          <AddToShelf tracks={[track]} variant="mode" />
          <AboutToggle />
        </div>
      )}
      {/* ⚠️ A THIRD GROUP, and so a second line on a phone — deliberately. The
          note at the top says five fit across a 390px screen, and this is a
          sixth; squeezing it in would take every button in the row below the
          size a thumb can aim at. Its own group because it is neither the play
          ORDER nor about the SONG — it is about the room you are in. Absent
          entirely where the engine has no picker to show (`OutputButton`). */}
      <div role="group" aria-label="Sound" className="flex gap-x-1 sm:gap-x-5">
        <OutputButton />
      </div>
    </div>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function RepeatGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" />
      <path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5" />
    </svg>
  )
}

function RepeatOneGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" />
      <path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5M10 8.2l1.2-.7V12.5" />
    </svg>
  )
}
