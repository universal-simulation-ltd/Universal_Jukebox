// A small, SAVED log of what happens to the music around the app leaving the
// screen — inside the native shell only.
//
// ⚠️ SAVED, BECAUSE THE LIVE LOG DIES AT THE WORST MOMENT. The first attempt at
// seeing why background playback stops (2026-09-10) streamed console lines off
// the phone, and the phone's connection to the Mac dropped the instant the app
// was minimised — one line survived: the music was ALREADY paused as the page
// went hidden. This keeps the last few dozen events in localStorage and prints
// them when the app comes back to the front, so a dropped connection loses
// nothing.

const KEY = 'jukebox:bglog'
const MAX = 60
let enabled = false

export interface BgEvent {
  t: number
  kind: string
  vis: DocumentVisibilityState
  [detail: string]: unknown
}

function read(): BgEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Record one event. A no-op until `installLifecycleLog` has run. */
export function noteEvent(kind: string, detail: Record<string, unknown> = {}): void {
  if (!enabled) return
  try {
    const list = read()
    list.push({ t: Date.now(), kind, vis: document.visibilityState, ...detail })
    while (list.length > MAX) list.shift()
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch { /* storage full or disabled — the log is best effort */ }
}

/** The saved events, oldest first, as compact text for a console line. */
export function describeEvents(since = 0): string {
  const list = read().filter((e) => e.t >= since)
  if (list.length === 0) return '(none)'
  const t0 = list[0].t
  return list
    .map(({ t, kind, vis, ...rest }) => {
      const extra = Object.entries(rest).map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round(v * 10) / 10 : v}`)
      return `+${((t - t0) / 1000).toFixed(1)}s ${kind}(${vis}${extra.length ? ' ' + extra.join(' ') : ''})`
    })
    .join(' | ')
}

/** Start recording the page's own lifecycle, and report it on the way back. */
export function installLifecycleLog(): void {
  if (enabled || typeof document === 'undefined') return
  enabled = true
  let hiddenAt = 0
  for (const type of ['pagehide', 'pageshow', 'freeze', 'resume', 'blur', 'focus']) {
    window.addEventListener(type, () => noteEvent(type))
    document.addEventListener(type, () => noteEvent(type))
  }
  document.addEventListener('visibilitychange', () => {
    noteEvent('visibility')
    if (document.hidden) {
      hiddenAt = Date.now() - 5000
    } else if (hiddenAt) {
      console.log(`[jukebox:bg] events around the last trip to the background: ${describeEvents(hiddenAt)}`)
    }
  })
}
