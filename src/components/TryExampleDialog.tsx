import { useEffect, useState } from 'react'
import { goHome } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

// Tune this app ▸ Your library ▸ "Try the example library" — the confirm.
//
// ⚠️ A CONFIRM, NOT A WARNING. The backlog asked for "a confirm and a way back"
// (2026-09-29), and the way back is what makes the confirm short: nothing here
// is being given up, so there is nothing to talk anybody out of. What the sheet
// has to say is the three things a person holding a real library wants to know
// before pressing — is my music safe, what happens to the song that is playing,
// and how do I get out — and it says each once.
//
// ⚠️ THE PLAYING LINE IS SAID ONLY WHEN SOMETHING IS PLAYING. Trying the example
// stops the queue (see the end of `playerStore`), and music of your own going
// silent without a word would read as the app breaking — but a sentence about a
// song that is not playing is one more thing to read for nothing.

export default function TryExampleDialog({ onClose }: { onClose(): void }) {
  const tryExample = useLibraryStore((s) => s.tryExample)
  const somethingLoaded = usePlayerStore((s) => s.queue.length > 0)
  const [building, setBuilding] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !building) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, building])

  const start = () => {
    setBuilding(true)
    void tryExample().finally(() => {
      onClose()
      // To the records, rather than leaving the demo behind a settings page.
      if (useLibraryStore.getState().trying) goHome()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jb-try-example-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={() => {
        if (!building) onClose()
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="jb-try-example-title" className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
          Try the example library?
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          Nine records by four artists that don’t exist — the music and the sleeves are both made on
          this device. Nothing is downloaded.
        </p>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Your library stays safe.</strong>{' '}
            It is set aside exactly as it is, and nothing you do in the example — shelves, what you
            play — is saved to it.
          </li>
          {somethingLoaded && (
            <li>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">What’s playing stops.</strong>{' '}
              When you come back, “Resume listening” carries on from the same second.
            </li>
          )}
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">To come back,</strong>{' '}
            press “Back to my music” at the top of the page, or in the menu. Closing the app brings you back
            too.
          </li>
        </ul>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={building}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:text-orange-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={start}
            disabled={building}
            autoFocus
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
          >
            {/* The landing page's words for the same wait. */}
            {building ? 'Cutting the records…' : 'Try it'}
          </button>
        </div>
      </div>
    </div>
  )
}
