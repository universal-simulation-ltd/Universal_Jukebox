import { useEffect, useState } from 'react'

/**
 * Whether the visitor has asked for reduced motion — read as a LIVE query, not
 * once at mount.
 *
 * Someone turning "reduce motion" on in the OS while the tab is open should stop
 * the platter immediately, and a one-shot read never notices. It is also the
 * accessibility setting most likely to be changed *because* of something on the
 * screen, which makes "only checked at startup" the worst possible time to
 * check it.
 *
 * ⚠️ This is deliberately a hook rather than a CSS media query alone, because
 * the app needs to choose a different END STATE and not just skip a transition:
 * under reduced motion the tonearm is simply DOWN and playback is immediate,
 * where CSS could only freeze it halfway across the record — which is worse
 * than no animation at all. `index.css` still neutralises the durations; this
 * decides what is rendered.
 *
 * It lives in its own file because a module that exports both components and a
 * hook breaks React Fast Refresh (and eslint's `react-refresh/only-export-components`
 * says so). It was in `Deck.tsx`.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const sync = () => setReduced(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return reduced
}
