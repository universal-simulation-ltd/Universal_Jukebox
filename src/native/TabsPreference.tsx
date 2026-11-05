import { useRef, useState } from 'react'
import { useT, type MessageKey } from '../i18n'
import { moveTab, shownTabs } from '../lib/tabs'
import { useSettingsStore, type HomeTab } from '../stores/settingsStore'

const NAME: Record<HomeTab, MessageKey> = {
  artists: 'native.tab_artists',
  albums: 'native.tab_albums',
  tracks: 'native.tab_tracks',
  jukebox: 'native.tab_shelves',
  mix: 'native.tab_mix',
}

/**
 * Tune this app ▸ Your library ▸ Tabs (James, 2026-11-02: "do like Blackbook
 * - drag to change order, ability to hide a tab"; BlackBook's
 * TabOrderPreference). The order the phone's tab bar takes from a hold and a
 * drag, for anybody who can't drag there: each row has a grip to drag, Move
 * up / Move down, and a Hide tick box (unticked to start, the suite's rule).
 * Hidden tabs keep their place in the list, so one shown again goes back
 * where it was. The last tab shown can't be hidden. Tune itself is always
 * last on the bar. Reset to defaults puts the order back and shows them all.
 */
export function TabsPreference() {
  const t = useT()
  const order = useSettingsStore((s) => s.tabOrder)
  const hidden = useSettingsStore((s) => s.hiddenTabs)
  const set = useSettingsStore((s) => s.set)
  const list = useRef<HTMLOListElement>(null)
  const [held, setHeld] = useState<HomeTab | null>(null)
  const move = (tab: HomeTab, to: number) => set('tabOrder', moveTab(order, tab, to))
  const lastShown = shownTabs(order, hidden).length <= 1

  const grip = (tab: HomeTab) => ({
    onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setHeld(tab)
    },
    onPointerMove: (e: React.PointerEvent<HTMLSpanElement>) => {
      if (held !== tab) return
      const rows = [...(list.current?.children ?? [])] as HTMLElement[]
      const at = rows.findIndex((r) => {
        const b = r.getBoundingClientRect()
        return e.clientY >= b.top && e.clientY <= b.bottom
      })
      if (at >= 0 && order[at] !== tab) move(tab, at)
    },
    onPointerUp: () => setHeld(null),
    onPointerCancel: () => setHeld(null),
  })

  const arrow = 'h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800'
  return (
    <fieldset className="px-5 py-4">
      <legend className="sr-only">{t('native.tabs_title')}</legend>
      <span aria-hidden className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">{t('native.tabs_title')}</span>
      <span className="mt-0.5 mb-3 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t('native.tabs_note', { tune: t('native.tab_tune') })}
      </span>
      <ol ref={list} className="space-y-1.5">
        {order.map((tab, i) => {
          const name = t(NAME[tab])
          const off = hidden.includes(tab)
          return (
            <li
              key={tab}
              data-tab-row={tab}
              className={`flex min-h-[48px] items-center gap-1.5 rounded-xl border px-1.5 ${
                held === tab ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <span {...grip(tab)} aria-hidden className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
                  <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
                  <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
                </svg>
              </span>
              <span className={`min-w-0 flex-1 truncate text-[14px] ${off ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{name}</span>
              <label className={`flex shrink-0 items-center gap-1.5 px-1 text-[13px] text-slate-600 dark:text-slate-300 ${!off && lastShown ? 'opacity-40' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-orange-600"
                  checked={off}
                  disabled={!off && lastShown}
                  aria-label={`${t('native.tab_hide')}: ${name}`}
                  onChange={(e) => set('hiddenTabs', e.target.checked ? [...hidden, tab] : hidden.filter((x) => x !== tab))}
                />
                {t('native.tab_hide')}
              </label>
              <button type="button" className={arrow} aria-label={t('native.tab_up', { name })} disabled={i === 0} onClick={() => move(tab, i - 1)}>
                <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className={arrow} aria-label={t('native.tab_down', { name })} disabled={i === order.length - 1} onClick={() => move(tab, i + 1)}>
                <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          )
        })}
      </ol>
    </fieldset>
  )
}
