// One press, one action — whichever way it reached the app.
//
// ⚠️ TWO ROUTES DELIVER THE LOCK SCREEN'S BUTTONS (James, 2026-09-11: "still
// random issues with the lockscreen controls - not sure if it was when i put
// headphone in"). WebKit publishes its own now-playing session for the <audio>
// and calls the page's Media Session handlers; the app's own entry
// (`nowPlayingNative.ts`, mode `own`) calls the same handlers through
// `dispatchAction`. Which one iOS listens to can change — a new audio route is
// exactly when it re-decides — and the phone's log caught one press arriving
// twice: two pauses in the same instant, then play, pause, play, pause at the
// same second. A repeat of the same KIND of command inside `REPEAT_WINDOW_MS`
// is the same press, and is dropped — play, pause and toggle count as one
// kind, so a pause and a toggle cannot undo each other.

export type CommandVia = 'webkit' | 'native'

const KIND: Record<string, string> = {
  play: 'transport',
  pause: 'transport',
  toggle: 'transport',
  stop: 'stop',
  nexttrack: 'next',
  previoustrack: 'previous',
}

/** Shorter than any two presses a person makes; longer than one press's echo. */
export const REPEAT_WINDOW_MS = 350

export interface GateVerdict {
  pass: boolean
  /** For a dropped command: the one it repeated. */
  after?: { action: string; via: CommandVia; ms: number }
}

export function createCommandGate(clock: () => number = () => performance.now()) {
  const last = new Map<string, { at: number; action: string; via: CommandVia }>()
  return (action: string, via: CommandVia): GateVerdict => {
    const kind = KIND[action]
    if (!kind) return { pass: true }
    const now = clock()
    const previous = last.get(kind)
    if (previous && now - previous.at < REPEAT_WINDOW_MS) {
      return { pass: false, after: { action: previous.action, via: previous.via, ms: Math.round(now - previous.at) } }
    }
    last.set(kind, { at: now, action, via })
    return { pass: true }
  }
}

/** Is this one of the commands the gate watches (and the log records)? */
export function isGatedCommand(action: string): boolean {
  return action in KIND
}
