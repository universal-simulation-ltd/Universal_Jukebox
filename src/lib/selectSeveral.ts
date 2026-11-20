// Select several, then act (the suite rule for every list; @unisim/sdk's
// useSelection, SelectCheckbox and SelectionBar, since 0.227.0) — the
// website's library and shelves.
//
// ⚠️ THE WEBSITE ONLY. The phone screens share TrackList, AlbumGrid and the
// Jukebox tab, and there a song, album or artist goes from its long-press sheet
// (`RemoveRow`); a row of tick boxes over a phone's record shelves is not that
// app. So every list asks `selectSeveral()` before it draws a tick box.
//
// ⚠️ AND THE CONFIRM IS OURS, NOT THE BAR'S. The SDK asks "Delete 3 songs? This
// cannot be undone." Here nothing is deleted and everything can be undone:
// Delete selected in the library is Remove from Jukebox (`lib/hidden.ts`; the
// files stay put and Tune this app ▸ Your library puts them back), on the
// Jukebox tab it deletes the shelves and never their songs, and in Fine-tune it
// takes songs off one shelf. So each list passes `confirm` with words that say
// which.

import { phoneConfirm } from '@unisim/sdk'
import { phoneScreens } from '../native/shell'
import { removeFromJukebox } from './removeFromJukebox'
import type { HiddenKind } from './hidden'

/** Whether this screen shows the tick boxes — the website and the Windows app, never the phone screens. */
export function selectSeveral(): boolean {
  return !phoneScreens()
}

/** Ask before Delete selected, in the list's own words. */
export function askFirst(question: string, explain: string | undefined, confirmLabel: string): Promise<boolean> {
  return phoneConfirm({ message: explain ? `${question}\n\n${explain}` : question, confirmLabel, danger: true })
}

/**
 * Several removed from Jukebox at once, each through the one way in that the
 * long-press sheet's "Remove from Jukebox" uses, so each also leaves Up next.
 */
export function removeManyFromJukebox(kind: HiddenKind, keys: readonly string[]): void {
  for (const key of keys) removeFromJukebox(kind, key)
}
