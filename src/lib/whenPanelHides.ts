import { useEffect, useRef, type RefObject } from 'react'

// Run something each time the SDK's dropdown panel that `inside` is drawn in is
// put away.
//
// ⚠️ WHY IT WATCHES RATHER THAN USING AN UNMOUNT. The SDK keeps the panel
// MOUNTED while shut — hidden by `visibility`, so that it can fade — so the rows
// inside it (our `AppMenu`) never unmount, and state in them would outlive the
// menu. The panel's own inline `visibility` is what says it is open.
//
// This used to lock the page too (`lib/pageScrollLock.ts`, 2026-09-13: "When
// scrolling anywhere on actions menu it shouldn't scroll the page behind").
// That moved into the SDK's `DropdownSurface` in 0.141.4, for every menu in the
// suite, as a trap on the panel rather than a lock on the page — the SDK menus
// open on hover, where a page lock would freeze the page.

export function useWhenPanelHides(inside: RefObject<HTMLElement | null>, onHidden: () => void): void {
  const hidden = useRef(onHidden)
  useEffect(() => {
    hidden.current = onHidden
  })
  useEffect(() => {
    // The panel: the nearest ancestor pinned to the screen.
    let surface: HTMLElement | null = inside.current
    while (surface && surface.style.position !== 'fixed') surface = surface.parentElement
    if (!surface) return
    const panel = surface
    let shown = panel.style.visibility === 'visible'
    const watch = new MutationObserver(() => {
      const now = panel.style.visibility === 'visible'
      if (shown && !now) hidden.current()
      shown = now
    })
    watch.observe(panel, { attributes: true, attributeFilter: ['style'] })
    return () => watch.disconnect()
  }, [inside])
}
