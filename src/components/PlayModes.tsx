import { ShuffleGlyph } from './AlbumView'
import { AboutToggle } from './AboutTrack'
import AddToShelf from './AddToShelf'
import { ModeButton } from './ModeButton'
import OutputButton from './OutputButton'
import LevelButton from './LevelButton'
import KeepAwakeButton from './KeepAwakeButton'
import SleepButton from './SleepButton'
import { BedsideButton } from './Bedside'
import PlayerButton from './PlayerButton'
import { currentTrack, usePlayerStore, type Repeat } from '../stores/playerStore'
import { useSettingsStore, type ModeKey } from '../stores/settingsStore'
import { openSettingsAt } from '../lib/settingsSection'

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
// Every button can be left out in Settings ▸ Buttons under the song (James,
// 2026-09-28: "I wouldn't want shuffle there but someone else might"); a group
// with nothing left in it is not drawn, so it leaves no gap.
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
  const hidden = useSettingsStore((s) => s.hiddenModes)
  const customiseSeen = useSettingsStore((s) => s.customiseSeen)
  const setSetting = useSettingsStore((s) => s.set)
  if (queued === 0) return null
  const pick = (mode: Exclude<Repeat, 'off'>) => setRepeat(repeat === mode ? 'off' : mode)
  const shows = (key: ModeKey) => !hidden.includes(key)
  const any = (...keys: ModeKey[]) => keys.some(shows)

  return (
    <div className="mt-5 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-5">
      {any('shuffle', 'repeatAll', 'repeatOne') && (
        <div role="group" aria-label="Play order" className="flex gap-x-1 sm:gap-x-5">
          {shows('shuffle') && (
            <ModeButton label="Shuffle" on={shuffle} onClick={() => toggleShuffle()}>
              <ShuffleGlyph />
            </ModeButton>
          )}
          {shows('repeatAll') && (
            <ModeButton label="Repeat all" on={repeat === 'all'} onClick={() => pick('all')}>
              <RepeatGlyph />
            </ModeButton>
          )}
          {shows('repeatOne') && (
            <ModeButton label="Repeat one" on={repeat === 'one'} onClick={() => pick('one')}>
              <RepeatOneGlyph />
            </ModeButton>
          )}
        </div>
      )}
      {track && any('shelf', 'about') && (
        <div className="flex gap-x-1 sm:gap-x-5">
          {shows('shelf') && <AddToShelf tracks={[track]} variant="mode" />}
          {shows('about') && <AboutToggle />}
        </div>
      )}
      {/* ⚠️ A THIRD GROUP, and so a second line on a phone — deliberately. The
          note at the top says five fit across a 390px screen, and this is a
          sixth; squeezing it in would take every button in the row below the
          size a thumb can aim at. Its own group because it is neither the play
          ORDER nor about the SONG — it is about the room you are in. Absent
          entirely where the engine has no picker to show (`OutputButton`). */}
      {any('output', 'quiet', 'loud') && (
        <div role="group" aria-label="Sound" className="flex gap-x-1 sm:gap-x-5">
          {shows('output') && <OutputButton />}
          {/* Quiet and Loud (2026-09-28) — also about the room: down for bed. */}
          {shows('quiet') && <LevelButton kind="quiet" />}
          {shows('loud') && <LevelButton kind="loud" />}
        </div>
      )}
      {/* Beside Output on a phone's second line, and for the same reason it is
          its own group: it is about the SCREEN, so the lyrics can be read along
          to without the phone locking (James, 2026-09-16). */}
      {any('player', 'keepAwake', 'sleep', 'bedside') && (
        <div role="group" aria-label="Screen" className="flex gap-x-1 sm:gap-x-5">
          {/* The machine on the screen, one tap to the next (2026-10-03). */}
          {shows('player') && <PlayerButton />}
          {shows('keepAwake') && <KeepAwakeButton />}
          {/* The sleep timer (2026-09-27): about the evening, beside the screen. */}
          {shows('sleep') && <SleepButton />}
          {/* Bedside (2026-09-28): the record, the time and the sleep timer,
              dimmed, full screen — see `Bedside`. */}
          {shows('bedside') && <BedsideButton />}
        </div>
      )}
      {/* "Customise" (James, 2026-09-28): shows where the row is set up, then
          goes for good once used — "they now know where to go". It is not one
          of the row's own buttons, so it cannot be hidden from Settings. */}
      {!customiseSeen && (
        <ModeButton
          label="Customise"
          ariaLabel="Choose which buttons show here, in Settings"
          onClick={() => {
            setSetting('customiseSeen', true)
            openSettingsAt('buttons')
          }}
        >
          <SlidersGlyph />
        </ModeButton>
      )}
    </div>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function SlidersGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M3.5 6h6M13.5 6h3M3.5 14h3M10.5 14h6" />
      <circle cx="11.5" cy="6" r="2" />
      <circle cx="8.5" cy="14" r="2" />
    </svg>
  )
}

export function RepeatGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" />
      <path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5" />
    </svg>
  )
}

export function RepeatOneGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M4 8V7a3 3 0 0 1 3-3h9M16 12v1a3 3 0 0 1-3 3H4" />
      <path d="m13 1.5 3 2.5-3 2.5M7 13.5 4 16l3 2.5M10 8.2l1.2-.7V12.5" />
    </svg>
  )
}
