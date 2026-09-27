// What a tap just did, said beside the button that did it (James, 2026-09-27:
// "when clicking add to queue anywhere it should show tick and 'X in queue'
// and clicking icon for add to shelf it should show tick and 'Added to shelf'
// to explain what happened when you clicked it"). An icon that turns into a
// tick and says nothing is still a button that might not have worked.

/**
 * The words, in a green bubble above the button. Inside a `relative` wrapper.
 * `align` keeps it on screen from a button at the end of a row.
 */
export function DoneBubble({ text, align = 'center' }: { text: string | null; align?: 'center' | 'end' }) {
  return (
    <span aria-live="polite" className="pointer-events-none">
      {text && (
        <span
          className={`absolute bottom-full z-20 mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-white shadow-md motion-safe:animate-[jb-added-pop_380ms_ease-out] ${
            align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          <TickGlyph />
          {text}
        </span>
      )}
    </span>
  )
}

export function TickGlyph({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}
