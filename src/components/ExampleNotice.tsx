import { EXAMPLE_ROOT_ID } from '../lib/exampleLibrary'
import { goHome } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'

// "This is the demo" — said once you are INSIDE it, where the landing page that
// explained it is no longer on screen.
//
// ⚠️ The sleeves are drawn to look like real records, on purpose (see
// `drawSleeve`), and the artists have plausible names. Somebody who loaded the
// example, wandered off and came back later — the library survives a reload —
// had nothing on the page to tell them these were not their albums.
//
// ⚠️ TWO DEMOS, AND ONLY ONE OF THEM HAS A DOOR BACK.
//
//   • Loaded from the landing page, the example IS the library — there was
//     nothing before it to go back to. This is then a label: it names the demo
//     and says how it ends (your own music takes its place — `runScan` removes
//     it), and offers nothing to press.
//   • TRIED from Tune this app (`libraryStore.tryExample`), it stands in for a
//     real library that is set aside, untouched, until you come back. Then this
//     is the way back, and it says so with a button — on every page, not only
//     the library's, because the trial is a state of the whole app and the one
//     thing nobody in it should have to hunt for is the exit. The same button
//     is in the menu, in the library's place (`AppMenu`).

export default function ExampleNotice({ onLibraryPage }: { onLibraryPage: boolean }) {
  // Booleans, so plain selectors are safe: each compares equal to its last result.
  const isExample = useLibraryStore((s) => s.roots.some((r) => r.id === EXAMPLE_ROOT_ID))
  const trying = useLibraryStore((s) => s.trying)
  const leaveExample = useLibraryStore((s) => s.leaveExample)

  if (trying) {
    return (
      <div
        role="status"
        className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-2.5 text-[12.5px] leading-relaxed text-orange-950 dark:border-orange-800/70 dark:bg-orange-950/30 dark:text-orange-100"
      >
        <p className="min-w-0 flex-1 basis-56">
          <strong className="font-semibold">You’re trying the example library.</strong>{' '}
          Your own music is set aside exactly as it was, and nothing you do here is saved to it.
        </p>
        <button
          type="button"
          onClick={() => {
            leaveExample()
            // The page you were on may be one of the demo's records.
            goHome()
          }}
          className="shrink-0 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          Back to my music
        </button>
      </div>
    )
  }

  if (!isExample || !onLibraryPage) return null
  return (
    <p className="mb-5 inline-flex max-w-full flex-wrap items-baseline gap-x-2 rounded-2xl border border-dashed border-orange-300 bg-orange-50/70 px-4 py-2 text-[12.5px] leading-relaxed text-orange-950 dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-orange-100">
      <strong className="font-semibold">Example library</strong>
      <span>
        Four made-up artists, with music and sleeves generated on this device. To play your own
        music instead, open Actions → Your complete library, and this steps aside.
      </span>
    </p>
  )
}
