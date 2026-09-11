/** Scroll the page back to its top — smoothly, unless reduced motion is asked for. */
export function scrollToTop(): void {
  let reduced = false
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { /* no matchMedia — animate */ }
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}
