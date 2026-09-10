// "Bring the lyrics on screen the next time they open."
//
// The Lyrics button asks; the panel answers once it has mounted (James,
// 2026-09-10: "when click show lyrics then scroll down to see the lyrics
// auto"). A flag rather than a scroll from the button itself, because the panel
// does not exist yet at the moment of the click.
//
// ⚠️ ONLY FOR THAT CLICK. Anything that mounts the panel without a person
// asking must not drag the page down to it — Now Playing opens at its top, with
// the record in view (`App.tsx`). The panel is closed by default on every song
// and every visit anyway (`shownFor` in `stores/lyricsStore.ts`).

let pending = false

export function requestLyricsReveal(): void {
  pending = true
}

/** True once per request — the caller that takes it does the scrolling. */
export function takeLyricsReveal(): boolean {
  const was = pending
  pending = false
  return was
}
