// Will this browser keep the folder for an INSTALLED copy of the app?
//
// Chrome 122 (February 2024) made File System Access permissions persistent for
// installed web apps: "Installed apps will automatically persist permissions
// once the user grants access" — no three-way prompt, no confirming again next
// visit (developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api).
// For somebody who is otherwise asked to confirm access every time they come
// back, installing the app is how that stops — and nothing on the page said so.
//
// ⚠️ SAID ONLY WHERE IT IS TRUE, which is narrower than "Chromium":
//   • It needs `showDirectoryPicker` — the stored handle IS the permission, and
//     Firefox and Safari have neither (nor does Brave by default).
//   • It is a Chrome behaviour, documented for Chrome. Edge and the other
//     Chromium browsers share the engine but not necessarily the policy, and a
//     tip that is wrong on one of them is worse than a tip that is missing, so
//     the brand has to be Google Chrome. `navigator.userAgentData` is where that
//     is readable without parsing a user-agent string; a Chrome without it is
//     older than 122 anyway.
//   • An app that is ALREADY installed has nothing to be told.
//   • The native shell is a different product with its own folder story; the
//     landing page checks that itself.
//
// The capability half is feature-detected like the rest of the suite; the
// version half cannot be — no API reports the policy — which is why it is
// asked of the brand list rather than guessed from the platform.

export interface BrowserTraits {
  brands: { brand: string; version: string }[]
  hasDirectoryPicker: boolean
  installed: boolean
}

export function keepsFolderWhenInstalled(traits: BrowserTraits = readTraits()): boolean {
  if (!traits.hasDirectoryPicker || traits.installed) return false
  const chrome = traits.brands.find((b) => b.brand === 'Google Chrome')
  return !!chrome && Number.parseInt(chrome.version, 10) >= 122
}

function readTraits(): BrowserTraits {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { brands: [], hasDirectoryPicker: false, installed: false }
  }
  const data = (navigator as Navigator & { userAgentData?: { brands?: BrowserTraits['brands'] } }).userAgentData
  const mode = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  return {
    brands: data?.brands ?? [],
    hasDirectoryPicker: typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function',
    installed: mode('(display-mode: standalone)') || mode('(display-mode: window-controls-overlay)'),
  }
}
