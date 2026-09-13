// Scroll so an element sits at the top of the screen, just under the navbar —
// the "Show lyrics" button as the lyrics open (James, 2026-09-10: "I want it to
// scroll down further when it does so the hide lyrics is right at the top of
// the page"), and the "i" as About this track opens (2026-09-13: "When clicked
// scroll down so that the 'i' is at the top of the screen (below navbar)").
//
// ⚠️ By hand, not with the SDK's `revealExpanded`: that brings a box INTO view —
// the least movement that shows it — which stops short of the top. And the
// bar is measured rather than assumed, because the SDK's navbar is sticky and
// its height is its own business.

export function scrollBelowBar(el: Element | null, reduced: boolean): void {
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - navBarBottom() - 12
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
}

/** Where the navbar ends, in the viewport — 0 if there is none. */
export function navBarBottom(): number {
  const bar = document.querySelector('header')?.closest('[style*="sticky"]') ?? document.querySelector('header')
  return bar ? bar.getBoundingClientRect().bottom : 0
}
