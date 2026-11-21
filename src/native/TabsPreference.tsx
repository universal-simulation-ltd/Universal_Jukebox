import { TabEyeIcon, useTabOrderList } from '@unisim/sdk'
import { useT, type MessageKey } from '../i18n'
import { setTabHidden } from '../lib/tabs'
import { useSettingsStore, type HomeTab } from '../stores/settingsStore'

const NAME: Record<HomeTab, MessageKey> = {
  artists: 'native.tab_artists',
  albums: 'native.tab_albums',
  tracks: 'native.tab_tracks',
  jukebox: 'native.tab_shelves',
  mix: 'native.tab_mix',
}

const button = 'h-10 w-10 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-800'

/**
 * Tune this app ▸ Your library ▸ Tabs (James, 2026-11-02: "do like Blackbook
 * - drag to change order, ability to hide a tab"; BlackBook's
 * TabOrderPreference). The order the phone's tab bar takes from a hold and a
 * drag, for anybody who can't drag there: each shown row has a grip to drag
 * and Move up / Move down. Tune itself is always last on the bar.
 *
 * The eye (James, 2026-11-20, the suite rule "Show and hide tabs with an eye,
 * in Tab order", in place of the Hide tick box each row had): open = shown,
 * struck through = hidden. A hidden tab drops to the greyed Hidden group at
 * the bottom, in the order they were hidden, and leaves the bar; shown again
 * it comes back at the bottom of the shown tabs, at the end of the bar beside
 * Tune. Every tab has an eye (Jukebox has no tab that must stay), but the
 * last one shown keeps a disabled eye. The eye writes the hidden list and the
 * order together, as the bin on the bar does (`setTabHidden`), so the two
 * always agree. Reset to defaults puts the order back and shows them all. The
 * logic is the SDK phone kit's `useTabOrderList` (eye since 0.236.0); the look
 * is Jukebox's.
 */
export function TabsPreference() {
  const t = useT()
  const order = useSettingsStore((s) => s.tabOrder)
  const hidden = useSettingsStore((s) => s.hiddenTabs)
  const set = useSettingsStore((s) => s.set)
  const patch = useSettingsStore((s) => s.patch)
  const list = useTabOrderList<HomeTab>(order, (next) => set('tabOrder', next), {
    hidden: (tab) => hidden.includes(tab),
    onHiddenChange: (tab, hide) => {
      // From the store as it is now, not this render's copy.
      const s = useSettingsStore.getState()
      patch(setTabHidden(s.tabOrder, s.hiddenTabs, tab, hide))
    },
  })

  const eye = (tab: HomeTab) => (
    <button
      {...list.eyeProps(tab)}
      className={button}
      aria-label={t(list.isHidden(tab) ? 'native.tab_show' : 'native.tab_hide', { name: t(NAME[tab]) })}
    >
      <span className="mx-auto block h-[18px] w-[18px] [&>svg]:h-full [&>svg]:w-full">
        <TabEyeIcon off={list.isHidden(tab)} />
      </span>
    </button>
  )

  return (
    <fieldset className="px-5 py-4">
      <legend className="sr-only">{t('native.tabs_title')}</legend>
      <span aria-hidden className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">{t('native.tabs_title')}</span>
      <span className="mt-0.5 mb-3 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t('native.tabs_note', { tune: t('native.tab_tune') })}
      </span>
      <ol ref={list.listRef} className="space-y-1.5">
        {list.shown.map((tab, i) => {
          const name = t(NAME[tab])
          return (
            <li
              key={tab}
              data-tab-row={tab}
              className={`flex min-h-[48px] items-center gap-1.5 rounded-xl border px-1.5 ${
                list.held === tab ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <span {...list.gripProps(tab)} aria-hidden className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
                  <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
                  <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-slate-900 dark:text-slate-100">{name}</span>
              <button type="button" className={button} aria-label={t('native.tab_up', { name })} disabled={i === 0} onClick={() => list.move(tab, i - 1)}>
                <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className={button} aria-label={t('native.tab_down', { name })} disabled={i === list.shown.length - 1} onClick={() => list.move(tab, i + 1)}>
                <svg viewBox="0 0 16 16" className="mx-auto h-4 w-4 rotate-180" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M8 13V3M4 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {eye(tab)}
            </li>
          )
        })}
      </ol>
      {list.hiddenTabs.length > 0 && (
        <>
          <span aria-hidden className="mt-4 mb-1.5 block text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">{t('native.tabs_hidden')}</span>
          <ol aria-label={t('native.tabs_hidden')} className="space-y-1.5">
            {list.hiddenTabs.map((tab) => (
              <li
                key={tab}
                data-tab-row={tab}
                data-hidden=""
                className="flex min-h-[48px] items-center gap-1.5 rounded-xl border border-dashed border-slate-200 pl-[2.75rem] pr-1.5 dark:border-slate-800"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-slate-400 dark:text-slate-500">{t(NAME[tab])}</span>
                {eye(tab)}
              </li>
            ))}
          </ol>
        </>
      )}
    </fieldset>
  )
}
