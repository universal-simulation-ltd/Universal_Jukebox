import { useEffect, useRef, useState } from 'react'
import { SLEEP_MAX_MIN, SLEEP_PRESETS, nextSleep, sleepLeft } from '../lib/sleep'
import { useSleepStore } from '../stores/sleepStore'
import { ModeButton } from './ModeButton'
import { useDialogFocus } from '../lib/useDialogFocus'
import { useT } from '../i18n'

// "Sleep" in the row under the records (James, 2026-09-27): a tap steps 15,
// 30, 45, 60 minutes, then off; a hold opens a picker for any time — "e.g.
// 2h15". The clock is `stores/sleepStore`, the rules `lib/sleep.ts`.

/** A press this long is a hold, not a tap — iOS's own long-press is ~500ms. */
const HOLD_MS = 450

export default function SleepButton() {
  const endsAt = useSleepStore((s) => s.endsAt)
  const minutes = useSleepStore((s) => s.minutes)
  const leftSec = useSleepStore((s) => s.leftSec)
  const start = useSleepStore((s) => s.start)
  const [picking, setPicking] = useState(false)
  const hold = useRef<number | null>(null)
  /** The hold opened the picker, so the click that ends it must not also step. */
  const held = useRef(false)
  const on = endsAt !== null
  const t = useT()
  const next = nextSleep(minutes)

  const cancelHold = () => {
    if (hold.current !== null) window.clearTimeout(hold.current)
    hold.current = null
  }
  useEffect(() => cancelHold, [])

  return (
    <span
      // ⚠️ No text selection or iOS callout on a hold, or the hold selects the
      // word under the button instead of opening the picker.
      className="select-none [-webkit-touch-callout:none]"
      onPointerDown={() => {
        held.current = false
        cancelHold()
        hold.current = window.setTimeout(() => {
          held.current = true
          setPicking(true)
        }, HOLD_MS)
      }}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ModeButton
        label={on ? sleepLeft(leftSec) : t('player.sleep')}
        on={on}
        ariaLabel={
          on
            ? next
              ? t.plural('player.sleep_aria_next', next, { left: sleepLeft(leftSec) })
              : t('player.sleep_aria_to_off', { left: sleepLeft(leftSec) })
            : t('player.sleep_aria_off')
        }
        onClick={() => {
          if (held.current) {
            held.current = false
            return
          }
          start(next)
        }}
      >
        <MoonGlyph />
      </ModeButton>
      {picking && (
        <SleepPicker
          initial={minutes ?? 60}
          on={on}
          onChoose={(m) => {
            start(m)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </span>
  )
}

const HOURS = Array.from({ length: SLEEP_MAX_MIN / 60 + 1 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

function SleepPicker({ initial, on, onChoose, onClose }: { initial: number; on: boolean; onChoose(minutes: number | null): void; onClose(): void }) {
  const dialogRef = useDialogFocus()
  const t = useT()
  const [hours, setHours] = useState(Math.floor(initial / 60))
  const [mins, setMins] = useState(Math.round((initial % 60) / 5) * 5)
  const total = Math.min(SLEEP_MAX_MIN, hours * 60 + mins)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const select =
    'rounded-xl border border-slate-300 bg-white px-3 py-2 text-[16px] text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
  const chip =
    'rounded-full border border-slate-300 px-3 py-1 text-[13px] font-medium text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400'

  return (
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={t('player.sleep_timer')}
      className="outline-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">{t('player.sleep_timer')}</p>
        <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">{t('player.sleep_fade_note')}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label={t('player.hours')} className={select}>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {t('player.picker_hours', { hours: t.num(h) })}
              </option>
            ))}
          </select>
          <select value={mins} onChange={(e) => setMins(Number(e.target.value))} aria-label={t('player.minutes')} className={select}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {t('player.picker_minutes', { minutes: String(m).padStart(2, '0') })}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {[...SLEEP_PRESETS, 90, 120].map((m) => (
            <button key={m} type="button" onClick={() => onChoose(m)} className={chip}>
              {m < 60
                ? t('player.preset_min', { min: t.num(m) })
                : m % 60
                  ? t('player.preset_hr_min', { hr: t.num(Math.floor(m / 60)), min: t.num(m % 60) })
                  : t('player.preset_hr', { hr: t.num(m / 60) })}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          {on ? (
            <button type="button" onClick={() => onChoose(null)} className="text-[13px] font-medium text-red-700 dark:text-red-400">
              {t('player.turn_off')}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
              {t('common.cancel')}
            </button>
          )}
          <button
            type="button"
            disabled={total === 0}
            onClick={() => onChoose(total)}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-1.5 text-[14px] font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {total === 0 ? t('player.choose_a_time') : t('player.stop_in', { left: sleepLeft(total * 60) })}
          </button>
        </div>
      </div>
    </div>
  )
}

/** A crescent moon. */
export function MoonGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 12.2A6.5 6.5 0 0 1 7.8 4a6.5 6.5 0 1 0 8.2 8.2z" />
    </svg>
  )
}
