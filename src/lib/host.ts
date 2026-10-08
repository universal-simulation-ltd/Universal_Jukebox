// What the app is running INSIDE, for the sentences that have to name it.
//
// ⚠️ "THE BROWSER" IS WRONG IN THE WINDOWS APP (James, 2026-10-08: "it says
// 'browser' which is confusing on desktop"). Electron is Chromium, so every
// web-path message — folder permission, a file it can't decode — fires there
// too, and someone who installed a program has no browser to go and look at.
// Anything that says "browser" to the person reading it goes through here.

/** The Windows/desktop app — Electron's preload exposes this and nothing else does. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && 'unisimDesktop' in window
}

/**
 * The thing that grants permissions and decodes files, as a sentence names it:
 * `the` / `this` mid-sentence, `This` to open one.
 */
export function host(): { the: string; this: string; This: string } {
  return isDesktopApp()
    ? { the: 'the app', this: 'the app', This: 'The app' }
    : { the: 'the browser', this: 'this browser', This: 'This browser' }
}
