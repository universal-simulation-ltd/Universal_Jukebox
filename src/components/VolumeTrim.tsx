import { useEffect, useRef, useState } from 'react'
import { graphUnavailable } from '../lib/audioGraph'
import { getDeviceVolume, hasDeviceVolume, onDeviceVolume, setDeviceVolume } from '../lib/deviceVolume'
import { TRIM_MAX, TRIM_MIN, formatTrim } from '../lib/volumeTrim'
import { useSettingsStore } from '../stores/settingsStore'

// The "−50 to +50" volume, in the row under the records (James, 2026-09-27) —
// the rules, and why the minus side is in decibels, are `lib/volumeTrim.ts`.
// Where the audio graph can't be used (the iPhone app) the plus side isn't
// offered, and the slider stops at 0.

export default function VolumeTrim() {
  // ⚠️ The iPhone app plays no quieter for the trim (James, 2026-09-27:
  // "Turning down not working on iPhone"), so there this is the PHONE's volume,
  // set finer than its buttons — `lib/deviceVolume.ts`.
  if (hasDeviceVolume()) return <DeviceVolume />
  return <Trim />
}

/** How often a drag may set the phone's volume — each set is a native round trip. */
const SET_EVERY_MS = 80

function DeviceVolume() {
  const [volume, setVolume] = useState<number | null>(null)
  const pending = useRef<number | null>(null)
  const timer = useRef<number | null>(null)
  /** Set by our own drag: the button-follower ignores the echo of it. */
  const dragging = useRef(false)

  useEffect(() => {
    void getDeviceVolume().then((v) => { if (v !== null) setVolume(v) })
    const stop = onDeviceVolume((v) => { if (!dragging.current) setVolume(v) })
    return () => {
      stop()
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const push = (v: number) => {
    pending.current = v
    if (timer.current !== null) return
    timer.current = window.setTimeout(() => {
      timer.current = null
      if (pending.current !== null) void setDeviceVolume(pending.current)
      pending.current = null
    }, SET_EVERY_MS)
  }

  if (volume === null) return null
  const shown = Math.round(volume * 100)
  return (
    <div className="mx-auto mt-2 w-full max-w-sm px-4">
      <div className="flex items-center gap-3">
        <span className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={shown}
          onPointerDown={() => { dragging.current = true }}
          onPointerUp={() => { dragging.current = false }}
          onPointerCancel={() => { dragging.current = false }}
          onChange={(e) => {
            const v = Number(e.target.value) / 100
            setVolume(v)
            push(v)
          }}
          aria-label="The phone’s volume"
          aria-valuetext={`${shown} of 100`}
          className="jb-scrub h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
        />
        <span className="w-8 shrink-0 text-center text-[12.5px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{shown}</span>
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
        The phone’s own volume, finer than its buttons — one button step is about 6.
      </p>
    </div>
  )
}

function Trim() {
  const trim = useSettingsStore((s) => s.volumeTrim)
  const set = useSettingsStore((s) => s.set)
  const max = graphUnavailable() ? 0 : TRIM_MAX
  const shown = Math.min(trim, max)
  const span = max - TRIM_MIN
  /** Where zero sits along the track, for its tick. */
  const zeroAt = ((0 - TRIM_MIN) / span) * 100

  return (
    <div className="mx-auto mt-2 w-full max-w-sm px-4">
      <div className="flex items-center gap-3">
        <span className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400">Volume</span>
        <div className="relative flex-1">
          <input
            type="range"
            min={TRIM_MIN}
            max={max}
            step={1}
            value={shown}
            onChange={(e) => set('volumeTrim', Number(e.target.value))}
            aria-label="Volume, from −50 to +50"
            aria-valuetext={formatTrim(shown)}
            className="jb-scrub relative z-10 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
          />
          {max > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400 dark:bg-slate-500"
              style={{ left: `${zeroAt}%` }}
            />
          )}
        </div>
        {/* Tap the number to go back to 0. */}
        <button
          type="button"
          onClick={() => set('volumeTrim', 0)}
          disabled={shown === 0}
          title={shown === 0 ? 'As loud as the song and your device make it' : 'Tap to go back to 0'}
          className={`w-10 shrink-0 rounded-full py-0.5 text-center text-[12.5px] font-semibold tabular-nums ${
            shown === 0 ? 'text-slate-500 dark:text-slate-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
          }`}
        >
          {formatTrim(shown)}
        </button>
      </div>
      {max === 0 && (
        <p className="mt-1 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Turns it down below your phone’s own lowest step.
        </p>
      )}
    </div>
  )
}
