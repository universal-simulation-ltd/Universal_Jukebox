// Tier T6 — the narrowest layout, where the player bar IS the app — as ONE rule.
//
// ⚠️ THIS FILE EXISTS BECAUSE THE RULE WAS WRITTEN TWICE, AND ONLY ONE COPY WAS
// FIXED. `useMiniMode` in `App.tsx` decides whether Now Playing renders at all;
// `showTheDeck` in `stores/playerStore.ts` decides whether pressing play takes
// you there. When phones were let out of T6 (2026-09-10 — see `App.tsx`), only
// App's copy learned about `(pointer: fine)`. The store's copy still said
// "anything under 430px", so on a 393px iPhone pressing play on an album never
// went to the record: the screen existed, and the one route to it was shut.
// James reported it the same day. Both now read this constant.
//
// ⚠️ A narrow window on a DESKTOP only. The tier was settled as "simplified view
// as the WINDOW gets smaller"; a phone is not a thin window, and gets the stage.

export const MINI_QUERY = '(max-width: 429px) and (pointer: fine)'

/** Is the app in the mini-player tier right now? False wherever it cannot tell. */
export function isMiniMode(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(MINI_QUERY).matches
  } catch {
    return false
  }
}
