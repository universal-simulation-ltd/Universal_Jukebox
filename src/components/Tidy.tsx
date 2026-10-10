import { useEffect } from 'react'
import { DropRing } from '@unisim/sdk'
import { useT, type Translator } from '../i18n'
import { shownName } from '../lib/format'
import { goHome } from '../lib/route'
import type { MergeProposal } from '../lib/tidy'
import { useLibraryStore } from '../stores/libraryStore'
import { proposalKey, useTidyStore } from '../stores/tidyStore'

// The tidy-up: what the app thinks it can put right, and a button.
//
// ⚠️ A REVIEW SCREEN, not a "fix everything" button, and that shape is the
// feature rather than caution about it. `keys.ts` and `tidy.ts` both say why: a
// wrongly merged album cannot be told apart afterwards. So every proposal shows
// the album, the picture it wants to use, where that picture came from, and one
// sentence saying why it is safe — and it is ticked, not done.

/**
 * Why a merge is safe, in one sentence — written here from the rule that found
 * it (`MergeProposal.rule`), so it follows the reader's language. The top of
 * the chosen folder has no path, so it has sentences of its own rather than a
 * translated phrase dropped into the brackets.
 */
function mergeReason(t: Translator, p: MergeProposal): string {
  const folder = p.folder
  if (p.rule === 'split-artists') {
    return folder ? t('tidy.reason_split_artists', { folder }) : t('tidy.reason_split_artists_root')
  }
  // "This track" or "these tracks" — one or more, not a count's grammar.
  if (p.trackIds.length === 1) return folder ? t('tidy.reason_loose_track', { folder }) : t('tidy.reason_loose_track_root')
  return folder ? t('tidy.reason_loose_tracks', { folder }) : t('tidy.reason_loose_tracks_root')
}

export default function Tidy() {
  const t = useT()
  const status = useTidyStore((s) => s.status)
  const proposals = useTidyStore((s) => s.proposals)
  const chosen = useTidyStore((s) => s.chosen)
  const checked = useTidyStore((s) => s.checked)
  const applied = useTidyStore((s) => s.applied)
  const look = useTidyStore((s) => s.look)
  const toggle = useTidyStore((s) => s.toggle)
  const chooseAll = useTidyStore((s) => s.chooseAll)
  const apply = useTidyStore((s) => s.apply)

  const hasLibrary = useLibraryStore((s) => s.tracks.length > 0)

  // Look as soon as the page opens. The whole page is "what can be fixed", so
  // making somebody press Start to find out is a click that asks nothing.
  useEffect(() => {
    if (status === 'idle' && hasLibrary) void look()
  }, [status, hasLibrary, look])

  const covers = proposals.filter((p) => p.kind === 'cover')
  const merges = proposals.filter((p) => p.kind === 'merge')

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={goHome}
        className="mb-5 hidden items-center gap-1.5 text-[13px] text-slate-600 sm:inline-flex hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        {t('tidy.back_to_library')}
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {t('tidy.title')}
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        {t.rich('tidy.intro', {
          strong: (
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              {t('tidy.intro_strong')}
            </strong>
          ),
        })}
      </p>

      {status === 'looking' && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <DropRing size={34} motion="busy" aria-hidden />
          <span>{t('tidy.looking')}</span>
        </div>
      )}

      {status === 'unavailable' && (
        <Note>{t('tidy.unavailable')}</Note>
      )}

      {status === 'done' && applied > 0 && (
        <Note>
          {t.plural('tidy.applied', applied)}{' '}
          <button
            type="button"
            onClick={() => void look()}
            className="font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
          >
            {t('tidy.look_again')}
          </button>
        </Note>
      )}

      {status === 'done' && applied === 0 && proposals.length === 0 && (
        <Note>
          {checked === 0 ? t('tidy.nothing_to_do_all_art') : t.plural('tidy.nothing_to_do_checked', checked)}
          <span className="mt-2 block text-slate-500 dark:text-slate-400">
            {t('tidy.nothing_to_do_note')}
          </span>
        </Note>
      )}

      {proposals.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-slate-600 dark:text-slate-300">
              {t.plural('tidy.suggestions', proposals.length, { selected: t.num(chosen.size) })}
            </p>
            <div className="flex gap-3 text-[12.5px]">
              <button
                type="button"
                onClick={() => chooseAll(true)}
                className="text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                {t('tidy.select_all')}
              </button>
              <button
                type="button"
                onClick={() => chooseAll(false)}
                className="text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                {t('tidy.select_none')}
              </button>
            </div>
          </div>

          {covers.length > 0 && (
            <Section title={t('tidy.section_covers', { count: t.num(covers.length) })}>
              {covers.map((p) => {
                if (p.kind !== 'cover') return null
                const key = proposalKey(p)
                return (
                  <label key={key} className="flex cursor-pointer items-start gap-3 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={chosen.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
                    />
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-900/10 dark:ring-white/10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
                        {shownName(p.title)}
                      </span>
                      <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">
                        {shownName(p.artist)}
                      </span>
                      <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                        {p.source === 'folder'
                          ? t.rich('tidy.cover_from_folder', { file: <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{p.sourceLabel}</code> })
                          : t.rich('tidy.cover_from_track', { file: <em>{p.sourceLabel}</em> })}
                      </span>
                    </span>
                  </label>
                )
              })}
            </Section>
          )}

          {merges.length > 0 && (
            <Section title={t('tidy.section_merges', { count: t.num(merges.length) })}>
              {merges.map((p) => {
                if (p.kind !== 'merge') return null
                const key = proposalKey(p)
                return (
                  <label key={key} className="flex cursor-pointer items-start gap-3 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={chosen.has(key)}
                      onChange={() => toggle(key)}
                      className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">
                        {t.plural('tidy.move_tracks_into', p.trackIds.length, { title: shownName(p.intoTitle) })}
                      </span>
                      <span className="block text-[12.5px] text-slate-500 dark:text-slate-400">
                        {shownName(p.intoArtist)}
                      </span>
                      <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                        {mergeReason(t, p)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </Section>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={chosen.size === 0}
              className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {chosen.size > 0 ? t.plural('tidy.apply_changes', chosen.size) : t('tidy.apply_changes')}
            </button>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              {t('tidy.files_not_touched')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </section>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {children}
    </div>
  )
}
