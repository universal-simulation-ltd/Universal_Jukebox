// "Use my own music", pressed on the example library's label (`ExampleNotice`):
// the example is cleared and the landing page comes back with "Where is your
// music?" already open, since that question is what the press asked for.
// A module flag rather than state: the landing page is not mounted yet.
let openSources = false

/** Mount the landing page next time with its sources already showing. */
export function openSourcesOnLanding() {
  openSources = true
}

/**
 * Read by the landing page as it mounts, and forgotten in its mount effect —
 * not here, because StrictMode runs a state initializer twice and the second
 * run would read it already spent.
 */
export function wantsOpenSources(): boolean {
  return openSources
}

export function forgetOpenSources() {
  openSources = false
}
