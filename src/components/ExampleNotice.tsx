import { EXAMPLE_ROOT_ID } from '../lib/exampleLibrary'
import { useLibraryStore } from '../stores/libraryStore'

// "This is the demo" — said once you are INSIDE it, where the landing page that
// explained it is no longer on screen.
//
// ⚠️ The sleeves are drawn to look like real records, on purpose (see
// `drawSleeve`), and the artists have plausible names. Somebody who loaded the
// example, wandered off and came back later — the library survives a reload —
// had nothing on the page to tell them these were not their albums.
//
// ⚠️ It is a label, not a door. There is deliberately no "load the example
// library" anywhere once there is a library, because loading it REPLACES what is
// there, and offering that from a real library would need a confirmation and a
// way back that do not exist. This names the demo and says how it ends — your
// own music takes its place (`runScan` removes it) — and offers nothing to press.

export default function ExampleNotice() {
  // A boolean, so a plain selector is safe: it compares equal to its last result.
  const isExample = useLibraryStore((s) => s.roots.some((r) => r.id === EXAMPLE_ROOT_ID))
  if (!isExample) return null
  return (
    <p className="mb-5 inline-flex max-w-full flex-wrap items-baseline gap-x-2 rounded-2xl border border-dashed border-orange-300 bg-orange-50/70 px-4 py-2 text-[12.5px] leading-relaxed text-orange-950 dark:border-orange-800/70 dark:bg-orange-950/25 dark:text-orange-100">
      <strong className="font-semibold">Example library</strong>
      <span>
        Four made-up artists, with music and sleeves generated in this tab. Add your own music
        and it steps aside.
      </span>
    </p>
  )
}
