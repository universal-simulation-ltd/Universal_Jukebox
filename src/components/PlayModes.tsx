import type { ReactNode } from 'react'
import { ShuffleGlyph } from './AlbumView'
import { usePlayerStore, type Repeat } from '../stores/playerStore'

// Shuffle and the two repeats, centred under the records waiting to go on
// (James, 2026-09-11: "repeat: add three buttons, centred, under the x more
// records for repeat and shuffle, have the word under the button because
// they're similar").
//
// ⚠️ THE WORD GOES UNDER EACH ICON because repeat-all and repeat-one differ by
// one small "1" — as icons alone they read as the same button twice. Repeat
// all and repeat one are either/or: tapping the one that is on turns repeat
// off. (The mini player no longer has a repeat button at all; shuffle is in its
// queue popup.)

export default function PlayModes() {
  const queued = usePlayerStore((s) => s.queue.length)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const setRepeat = usePlayerStore((s) => s.setRepeat)
  if (queued === 0) return null
  const pick = (mode: Exclude<Repeat, 'off'>) => setRepeat(repeat === mode ? 'off' : mode)

  return (
    <div role="group" aria-label="Play order" className="mt-5 flex justify-center gap-5">
      <Mode label="Shuffle" on={shuffle} onClick={toggleShuffle}>
        <ShuffleGlyph />
      </Mode>
      <Mode label="Repeat all" on={repeat === 'all'} onClick={() => pick('all')}>
        <RepeatGlyph />
      </Mode>
      <Mode label="Repeat one" on={repeat === 'one'} onClick={() => pick('one')}>
        <RepeatOneGlyph />
      </Mode>
    </div>
  )
}

function Mode({ label, on, onClick, children }: { label: string; on: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="group flex w-20 flex-col items-center gap-1.5 focus:outline-none">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full transition group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#E05504] ${
          on
            ? 'bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-sm'
            : 'border border-slate-300 text-slate-600 group-hover:border-orange-500 group-hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:group-hover:text-orange-400'
        }`}
      >
        {children}
      </span>
      <span className={`text-[11.5px] font-medium ${on ? 'text-orange-700 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
    </button>
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
