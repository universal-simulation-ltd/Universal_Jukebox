// PullDrawer.tsx — the search box, Shuffle and the list options, folded away
// above a library tab until you pull down from the top of the page (James,
// 2026-10-10: "don't show the search bar until you scroll down and it pops
// out", and the same for the playing options). No search button, to keep the
// screen clean (James, same day): pull it, or tap the tab you're already on
// (James, 2026-10-17; `LibraryScreens`' `useSearchRequests`).
//
// The gesture itself is the SDK's `PullDrawer` (@unisim/sdk ≥ 0.197, moved
// there from this file on 2026-10-19 so BlackBook and the rest of the suite
// share one): only from the very top, only a mostly vertical pull, not one
// that starts on a sideways swiper (`data-swipe-x`, the shelves); it follows
// the finger with some resistance, opens past 64px and springs shut
// otherwise; a second pull asks for the keyboard (James, 2026-10-11); and
// scrolled out of sight it folds itself away again (2026-10-10), holding the
// list still. The parent decides whether to let go: with a search typed in,
// the box stays.
//
// What is Jukebox's own: the look (`.jx-drawer` in native.css) and where the
// top bar ends (`navBarBottom`, measured the way the rest of the app does).

import type { ReactNode } from 'react'
import { PullDrawer as SuitePullDrawer } from '@unisim/sdk'
import { navBarBottom } from '../lib/scrollBelowBar'

export function PullDrawer(props: {
  shown: boolean
  onOpen(): void
  /** It has scrolled out of sight under the top bar. Left out while it must
   *  stay (a search is typed in), and then it never folds itself. */
  onScrolledAway?: () => void
  /** Pulled down AGAIN while open. Called from the finger's release, so
   *  focusing the search box there brings the keyboard up on iOS. */
  onPullAgain?: () => void
  children: ReactNode
}) {
  return <SuitePullDrawer {...props} className="jx-drawer" innerClassName="jx-drawer-inner" topBarBottom={navBarBottom} />
}
