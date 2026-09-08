import { useEffect } from 'react'
import { DropRing } from '@unisim/sdk'
import { plural } from '../lib/format'
import { goHome } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { proposalKey, useTidyStore } from '../stores/tidyStore'

// The tidy-up: what the app thinks it can put right, and a button.
//
// ⚠️ A REVIEW SCREEN, not a "fix everything" button, and that shape is the
// feature rather than caution about it. `keys.ts` and `tidy.ts` both say why: a
// wrongly merged album cannot be told apart afterwards. So every proposal shows
// the album, the picture it wants to use, where that picture came from, and one
// sentence saying why it is safe — and it is ticked, not done.

export default function Tidy() {
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
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        Back to your library
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        Tidy up your library
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
        Missing covers found on your own disk, and records that have been split in two by
        inconsistent tags. Nothing is looked up online and{' '}
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          your music files are never changed
        </strong>{' '}
        — this only corrects the library here.
      </p>

      {status === 'looking' && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <DropRing size={34} motion="busy" aria-hidden />
          <span>Looking through your library…</span>
        </div>
      )}

      {status === 'unavailable' && (
        <Note>
          The tidy-up reads your files to find artwork, so it needs access to your music
          folder. Choose it again from the banner on your library and come back.
        </Note>
      )}

      {status === 'done' && applied > 0 && (
        <Note>
          Done — {plural(applied, 'change')} applied. They will survive rescanning, because
          they are stored separately from the library.{' '}
          <button
            type="button"
            onClick={() => void look()}
            className="font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
          >
            Look again
          </button>
        </Note>
      )}

      {status === 'done' && applied === 0 && proposals.length === 0 && (
        <Note>
          Nothing to do — {checked === 0
            ? 'every album already has its artwork'
            : `checked ${plural(checked, 'album')} with no artwork and found nothing on disk to use`}
          , and no records look like they have been split in two.
          <span className="mt-2 block text-slate-500 dark:text-slate-400">
            The app only uses artwork that is already in your files or sitting in the folder
            beside them — it never asks the internet, which is also why it can’t invent a
            cover that isn’t there.
          </span>
        </Note>
      )}

      {proposals.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-slate-600 dark:text-slate-300">
              {plural(proposals.length, 'suggestion')} · {chosen.size} selected
            </p>
            <div className="flex gap-3 text-[12.5px]">
              <button
                type="button"
                onClick={() => chooseAll(true)}
                className="text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => chooseAll(false)}
                className="text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
              >
                Select none
              </button>
            </div>
          </div>

          {covers.length > 0 && (
            <Section title={`Artwork found on your disk (${covers.length})`}>
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
                        {p.title}
                      </span>
                      <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">
                        {p.artist}
                      </span>
                      <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                        {p.source === 'folder'
                          ? <>Found <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{p.sourceLabel}</code> in the album’s folder.</>
                          : <>Taken from the artwork already inside <em>{p.sourceLabel}</em>.</>}
                      </span>
                    </span>
                  </label>
                )
              })}
            </Section>
          )}

          {merges.length > 0 && (
            <Section title={`Records split in two (${merges.length})`}>
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
                        Move {plural(p.trackIds.length, 'track')} into “{p.intoTitle}”
                      </span>
                      <span className="block text-[12.5px] text-slate-500 dark:text-slate-400">
                        {p.intoArtist}
                      </span>
                      <span className="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                        {p.reason}
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
              Apply {chosen.size > 0 ? plural(chosen.size, 'change') : 'changes'}
            </button>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Your files are not touched. To undo, forget the library and scan again.
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
