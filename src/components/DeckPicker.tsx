import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DECKS } from '../lib/decks'
import { DECK_SETTINGS, useSettingsStore } from '../stores/settingsStore'
import { DeckMiniature } from './Deck'

// A quick change of machine, from a long press on the one on Now Playing
// (James, 2026-09-16: "a long-press on the player device on now playing to
// quickly switch to another e.g. vinyl, disc..."). The same choice as Settings ›
// What you're playing on, drawn the same way, a thumb away from the record.
//
// ⚠️ IN A PORTAL. The deck lifts on hover with a transform, and a `fixed` sheet
// inside a transformed ancestor is positioned against that ancestor rather than
// the screen.
//
// ⚠️ THE FINGER THAT OPENED IT IS STILL DOWN. Lifting it is a click on whatever
// the sheet drew under it — and in a browser test that was the CD player, chosen
// and closed before the sheet was ever seen. So the first click is swallowed
// unless a NEW press has started since the sheet opened. Not a timer: a press
// can be held for any length of time before it lifts.

export default function DeckPicker({ onClose }: { onClose(): void }) {
  const deck = useSettingsStore((s) => s.deck)
  const set = useSettingsStore((s) => s.set)
  const armed = useRef(false)

  useEffect(() => {
    const onPress = () => {
      armed.current = true
    }
    const onClick = (e: MouseEvent) => {
      if (armed.current) return
      armed.current = true
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('pointerdown', onPress, true)
    window.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onPress, true)
      window.removeEventListener('click', onClick, true)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Play on"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Play on</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {DECK_SETTINGS.map((value) => {
            const on = value === deck
            return (
              <li key={value}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    set('deck', value)
                    onClose()
                  }}
                  className={`flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3 text-[12.5px] font-medium transition ${
                    on
                      ? 'bg-orange-50 text-orange-800 ring-2 ring-[#E05504] dark:bg-orange-950/40 dark:text-orange-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <DeckMiniature setting={value} box={56} />
                  {DECKS[value].label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
