import { useEffect, useRef, useState } from 'react'

// The state behind `components/DoneBubble` — see there.

/** How long the tick and its words stay before the button is itself again. */
export const DONE_MS = 2400

/** `say(text)` shows the bubble; `said` is its text, or null. */
export function useDone(): { said: string | null; say(text: string): void } {
  const [said, setSaid] = useState<string | null>(null)
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )
  return {
    said,
    say(text) {
      setSaid(text)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSaid(null), DONE_MS)
    },
  }
}
