// Select several, then act (the suite rule for every list; @unisim/sdk's
// useSelection, SelectCheckbox and SelectionBar, since 0.227.0) — the
// website's library and shelves.
//
// ⚠️ TICK BOXES ON THE WEBSITE ONLY. The phone screens share TrackList,
// AlbumGrid and the Jukebox tab, and a row of tick boxes over a phone's record
// shelves is not that app. So every shared list asks `selectSeveral()` before
// it draws a tick box. The phone's own lists (`native/`) select on a hold
// instead (BRANDING.md, "Press and hold selects"): a song row's hold ticks it,
// an album's or artist's hold sheet has Select, and the same `RemoveBar` then
// comes in over the list.
//
// ⚠️ AND THE CONFIRM IS OURS, NOT THE BAR'S. The SDK asks "Delete 3 songs? This
// cannot be undone." Here nothing is deleted and everything can be undone. The
// bar's button says Remove selected wherever rows only leave a list
// (`action="remove"`, SDK 0.228.0; `components/RemoveBar`), and Delete selected
// only for shelves, which really go. Remove selected in the library is Remove from Jukebox (`lib/hidden.ts`; the
// files stay put and Tune this app ▸ Your library puts them back), on the
// Jukebox tab it deletes the shelves and never their songs, and in Fine-tune it
// takes songs off one shelf. So each list passes `confirm` with words that say
// which.

import { phoneConfirm } from '@unisim/sdk'
import { phoneScreens } from '../native/shell'
import { removeFromJukebox } from './removeFromJukebox'
import type { HiddenKind } from './hidden'
import type { Track } from './types'

/** Whether this screen shows the tick boxes — the website and the Windows app, never the phone screens. */
export function selectSeveral(): boolean {
  return !phoneScreens()
}

/** Ask before Delete / Remove selected, in the list's own words. A removal can be undone, so its button is not red. */
export function askFirst(question: string, explain: string | undefined, confirmLabel: string, danger = true): Promise<boolean> {
  return phoneConfirm({ message: explain ? `${question}\n\n${explain}` : question, confirmLabel, danger })
}

/**
 * Several removed from Jukebox at once, each through the one way in that the
 * long-press sheet's "Remove from Jukebox" uses, so each also leaves Up next.
 */
export function removeManyFromJukebox(kind: HiddenKind, keys: readonly string[]): void {
  for (const key of keys) removeFromJukebox(kind, key)
}

/**
 * Ticked songs of a page's list (an album, an artist's songs) removed from
 * Jukebox — by PATH, the key a song is removed by (`lib/hidden.ts`). `emptied`
 * runs when that was every song on the page, which then has nothing to show.
 */
export function removeSongsFromJukebox(songs: readonly Track[], ids: readonly string[], emptied?: () => void): void {
  const chosen = new Set(ids)
  removeManyFromJukebox('tracks', songs.filter((track) => chosen.has(track.id)).map((track) => track.path))
  if (emptied && songs.every((track) => chosen.has(track.id))) emptied()
}
