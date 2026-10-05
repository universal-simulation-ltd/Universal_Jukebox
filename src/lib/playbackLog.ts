// "Copy playback log" (Settings ▸ Messages, phone apps only).
//
// The lock screen's ▶-over-a-playing-song has had five fixes, each written on a
// guess, and the two logs that could settle it — the page's `jukebox:bglog`
// and the iPhone plugin's `commands.log` — could only be read with the phone
// plugged into the Mac (James, 2026-10-05: "having a playback log would be
// handy now and in future"). This puts both on the clipboard, with clock times,
// so a report can be pasted straight from the phone, minutes after it happens.
//
// ⚠️ WHAT IS IN IT: playback events (play, pause, hidden, skipped, lock-screen
// commands, route changes) and the titles the lock screen was given. It is
// copied only when the person taps the button, and goes only where they paste
// it.

import type { BgEvent } from './bgLog'

/** "14:22:07" in the phone's own clock. */
function clock(t: number): string {
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function value(v: unknown): string {
  if (typeof v === 'number') return String(Math.round(v * 10) / 10)
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function formatPlaybackLog(input: {
  now: number
  platform: string
  version: string
  events: readonly BgEvent[]
  /** The plugin's `commands.log`, or null where there is none. */
  native: string | null
}): string {
  const lines = [
    `Universal Jukebox ${input.version} · ${input.platform} · copied ${new Date(input.now).toISOString()}`,
    '',
    `── Page log (jukebox:bglog), ${input.events.length} events, phone clock ──`,
    ...(input.events.length === 0
      ? ['(none)']
      : input.events.map(({ t, kind, vis, ...rest }) => {
          const extra = Object.entries(rest).map(([k, v]) => `${k}=${value(v)}`)
          return `${clock(t)} ${kind} ${vis}${extra.length ? ' ' + extra.join(' ') : ''}`
        })),
  ]
  if (input.native !== null) {
    lines.push('', '── Native log (commands.log), UTC ──', input.native.trim() || '(none)')
  }
  return lines.join('\n') + '\n'
}
