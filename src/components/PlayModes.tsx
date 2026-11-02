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
import LoveButton from './LoveButton'
import ModeGlyph from './ModeGlyph'
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { haptic } from '../lib/haptics'
import { currentTrack, usePlayerStore, type Repeat } from '../stores/playerStore'
import { MODE_KEYS, MODE_LABELS, useSettingsStore, type ModeKey } from '../stores/settingsStore'
import { openSettingsAt } from '../lib/settingsSection'
import { useT } from '../i18n'

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
//
// ♥ (James, 2026-11-02) is about the song, so it leads that second group.
//
// ⚠️ HOLD ANY BUTTON TO EDIT THE ROW (James, 2026-11-02: "If tap and hold any
// options in the reveal then show all the other available options and if you
// tap one it adds it to the dock"). The row's buttons each get a − to take
// them off, the ones not in it are shown under it with a +, and Done puts the
// row back. It writes the same `hiddenModes` as Tune ▸ Buttons under the song.
// The hold is caught here, around the row, so no button needs to know — which
// is why the Player button no longer opens its machine picker on a hold
// (holding the record still does).

/** How long a press is held before the row goes into editing. */
const HOLD_MS = 500
/** Movement that makes a press a scroll instead. */
const HOLD_SLOP = 10

export default function PlayModes() {
  const t = useT()
  const queued = usePlayerStore((s) => s.queue.length)
  const track = usePlayerStore(currentTrack)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const setRepeat = usePlayerStore((s) => s.setRepeat)
  const hidden = useSettingsStore((s) => s.hiddenModes)
  const customiseSeen = useSettingsStore((s) => s.customiseSeen)
  const setSetting = useSettingsStore((s) => s.set)
  const [editing, setEditing] = useState(false)
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null)
  /** A hold that turned into editing: the click its release makes is eaten. */
  const held = useRef(false)
  if (queued === 0) return null
  if (editing) return <EditRow onDone={() => setEditing(false)} />
  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer)
    hold.current = null
  }
  const holdHandlers = {
    onPointerDownCapture: (e: ReactPointerEvent) => {
      if (e.button > 0 || !(e.target as Element).closest('button')) return
      cancelHold()
      held.current = false
      const timer = window.setTimeout(() => {
        hold.current = null
        held.current = true
        haptic('thunk')
        setEditing(true)
      }, HOLD_MS)
      hold.current = { timer, x: e.clientX, y: e.clientY }
    },
    onPointerMoveCapture: (e: ReactPointerEvent) => {
      const at = hold.current
      if (at && Math.hypot(e.clientX - at.x, e.clientY - at.y) > HOLD_SLOP) cancelHold()
    },
    onPointerUpCapture: cancelHold,
    onPointerCancelCapture: cancelHold,
    onClickCapture: (e: React.MouseEvent) => {
      if (!held.current) return
      held.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
  const pick = (mode: Exclude<Repeat, 'off'>) => setRepeat(repeat === mode ? 'off' : mode)
  const shows = (key: ModeKey) => !hidden.includes(key)
  const any = (...keys: ModeKey[]) => keys.some(shows)

  return (
    <div
      {...holdHandlers}
      className="mt-5 flex flex-wrap justify-center gap-x-1 gap-y-3 select-none sm:gap-x-5 [-webkit-touch-callout:none]"
    >
      {any('shuffle', 'repeatAll', 'repeatOne') && (
        <div role="group" aria-label={t('decks.group_play_order')} className="flex gap-x-1 sm:gap-x-5">
          {shows('shuffle') && (
            <ModeButton label={MODE_LABELS.shuffle} on={shuffle} onClick={() => toggleShuffle()}>
              <ShuffleGlyph />
            </ModeButton>
          )}
          {shows('repeatAll') && (
            <ModeButton label={MODE_LABELS.repeatAll} on={repeat === 'all'} onClick={() => pick('all')}>
              <RepeatGlyph />
            </ModeButton>
          )}
          {shows('repeatOne') && (
            <ModeButton label={MODE_LABELS.repeatOne} on={repeat === 'one'} onClick={() => pick('one')}>
              <RepeatOneGlyph />
            </ModeButton>
          )}
        </div>
      )}
      {track && any('love', 'shelf', 'about') && (
        <div className="flex gap-x-1 sm:gap-x-5">
          {shows('love') && <LoveButton track={track} />}
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
        <div role="group" aria-label={t('decks.group_sound')} className="flex gap-x-1 sm:gap-x-5">
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
        <div role="group" aria-label={t('decks.group_screen')} className="flex gap-x-1 sm:gap-x-5">
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
          label={t('decks.customise')}
          ariaLabel={t('decks.customise_aria')}
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

/**
 * The row being edited: what's in it, each with a − to take it off, then
 * what isn't, each with a + to add it, then Done. The last button left can't
 * be taken off — a row of nothing has nothing to hold to bring them back.
 */
function EditRow({ onDone }: { onDone(): void }) {
  const t = useT()
  const hidden = useSettingsStore((s) => s.hiddenModes)
  const setSetting = useSettingsStore((s) => s.set)
  const shown = MODE_KEYS.filter((key) => !hidden.includes(key))
  const rest = MODE_KEYS.filter((key) => hidden.includes(key))
  return (
    <div className="mt-5 flex flex-col items-center select-none [-webkit-touch-callout:none]" role="group" aria-label={t('decks.edit_title')}>
      <p className="max-w-xs px-4 text-center text-[12.5px] text-slate-600 dark:text-slate-400">{t('decks.edit_hint')}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-5">
        {shown.map((key) => (
          <EditTile
            key={key}
            mode={key}
            sign="−"
            disabled={shown.length <= 1}
            ariaLabel={t('decks.edit_remove', { button: MODE_LABELS[key] })}
            onClick={() => setSetting('hiddenModes', [...hidden, key])}
          />
        ))}
      </div>
      {rest.length > 0 && (
        <>
          <p className="mt-5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{t('decks.edit_add')}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-5">
            {rest.map((key) => (
              <EditTile
                key={key}
                mode={key}
                sign="+"
                ariaLabel={t('decks.edit_add_one', { button: MODE_LABELS[key] })}
                onClick={() => {
                  haptic('tap')
                  setSetting('hiddenModes', hidden.filter((k) => k !== key))
                }}
              />
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={onDone}
        className="mt-5 min-h-[44px] rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-6 text-[14px] font-semibold text-white shadow-sm"
      >
        {t('decks.edit_done')}
      </button>
    </div>
  )
}

function EditTile({ mode, sign, disabled = false, ariaLabel, onClick }: {
  mode: ModeKey
  sign: '−' | '+'
  disabled?: boolean
  ariaLabel: string
  onClick(): void
}) {
  const adding = sign === '+'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-mode={mode}
      className="group flex w-16 flex-col items-center gap-1.5 focus:outline-none disabled:opacity-60 sm:w-20"
    >
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-slate-600 dark:text-slate-300 ${
          adding ? 'border-dashed border-slate-400 dark:border-slate-600' : 'border-slate-300 dark:border-slate-700'
        } group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#E05504]`}
      >
        <ModeGlyph mode={mode} />
        {!disabled && (
          <span
            aria-hidden
            className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[14px] leading-none font-bold text-white shadow ${
              adding ? 'bg-[#E05504]' : 'bg-slate-600 dark:bg-slate-500'
            }`}
          >
            {sign}
          </span>
        )}
      </span>
      <span className="text-center text-[11px] leading-tight font-medium text-slate-500 sm:text-[11.5px] dark:text-slate-400">
        {MODE_LABELS[mode]}
      </span>
    </button>
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
