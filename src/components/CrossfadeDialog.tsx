import { useEffect, useState } from 'react'
import { fadeLevel, LEAD_OUT, STAGGER, type FadeCurve } from '../lib/fadeCurve'
import {
  CROSSFADE_LIMITS,
  CROSSFADE_SHAPES,
  useSettingsStore,
  type CrossfadeShape,
} from '../stores/settingsStore'
import { useDialogFocus } from '../lib/useDialogFocus'

// Settings ▸ the crossfade's Advanced… sheet (James, 2026-09-28: "these are
// the controls I want the user to be able to customise. Maybe we could have an
// 'Advanced' button next to the crossfade option and popup with these
// controls"). "These" are the numbers on the crossfade explainer page: the
// three lengths, the quiet-opening hold, the silent-ending skip, and the shape.
// The preview draws the same curves `audio.crossfade` plays (`fadeCurve.ts`).

const SHAPE_COPY: Record<CrossfadeShape, { label: string; hint: string }> = {
  staggered: {
    label: 'Staggered',
    hint: 'The next song waits a moment, then rises as the old one falls. Never both loud at once.',
  },
  'equal-power': {
    label: 'Even',
    hint: 'Both move together and stay as loud as one song all the way across.',
  },
  linear: {
    label: 'Straight',
    hint: 'A plain straight-line fade. Dips a little in the middle.',
  },
}

type Preview = 'track' | 'record' | 'skip'

export default function CrossfadeDialog({ onClose }: { onClose(): void }) {
  const dialogRef = useDialogFocus()
  const s = useSettingsStore()
  const [preview, setPreview] = useState<Preview>('track')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const reset = () => {
    s.set('xfTrackSec', 1.8)
    s.set('xfRecordSec', 4.5)
    s.set('xfSkipSec', 1.2)
    s.set('xfIntroMax', 6)
    s.set('xfOutroMax', 8)
    s.set('xfShape', 'staggered')
  }

  const seconds = preview === 'track' ? s.xfTrackSec : preview === 'record' ? s.xfRecordSec : s.xfSkipSec
  const curve: FadeCurve = preview === 'skip' ? 'lead-out' : s.xfShape

  return (
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label="Tune crossfade"
      className="outline-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">Crossfade</p>
        <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
          How one song hands over to the next. The preview shows the song ending and the song arriving.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Preview">
          {(
            [
              ['track', 'Same record'],
              ['record', 'New record'],
              ['skip', 'Next pressed'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={preview === key}
              onClick={() => setPreview(key)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${
                preview === key
                  ? 'bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white'
                  : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <CurvePreview seconds={seconds} curve={curve} />

        <div className="mt-4 space-y-4">
          <SecondsSlider
            id="xf-track"
            label="Same record"
            hint="Between two songs on one album, at the end of a song."
            value={s.xfTrackSec}
            range={CROSSFADE_LIMITS.track}
            onChange={(v) => {
              s.set('xfTrackSec', v)
              setPreview('track')
            }}
          />
          <SecondsSlider
            id="xf-record"
            label="New record"
            hint="When the next song is on a different album. Unused if “No crossfade between records” is ticked."
            value={s.xfRecordSec}
            range={CROSSFADE_LIMITS.record}
            onChange={(v) => {
              s.set('xfRecordSec', v)
              setPreview('record')
            }}
          />
          <SecondsSlider
            id="xf-skip"
            label="When you press Next"
            hint="Starts the moment you press. A little longer across records."
            value={s.xfSkipSec}
            range={CROSSFADE_LIMITS.skip}
            onChange={(v) => {
              s.set('xfSkipSec', v)
              setPreview('skip')
            }}
          />
          <SecondsSlider
            id="xf-intro"
            label="Wait for a quiet opening"
            hint="If the next song starts softly, the ending song keeps playing at full for up to this long, until the music arrives."
            value={s.xfIntroMax}
            range={CROSSFADE_LIMITS.intro}
            off
            onChange={(v) => s.set('xfIntroMax', v)}
          />
          <SecondsSlider
            id="xf-outro"
            label="Skip silence at the end"
            hint="If a song ends on silence, the crossfade starts up to this much earlier so the silence isn’t played."
            value={s.xfOutroMax}
            range={CROSSFADE_LIMITS.outro}
            off
            onChange={(v) => s.set('xfOutroMax', v)}
          />
          <fieldset>
            <legend className="text-[14px] font-medium text-slate-900 dark:text-slate-100">Shape</legend>
            <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
              At the end of a song. Pressing Next always brings the next song in at once.
            </p>
            <div className="mt-2 space-y-2">
              {CROSSFADE_SHAPES.map((shape) => (
                <label key={shape} className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="radio"
                    name="xf-shape"
                    checked={s.xfShape === shape}
                    onChange={() => {
                      s.set('xfShape', shape)
                      if (preview === 'skip') setPreview('track')
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-600"
                  />
                  <span>
                    <span className="block text-[13.5px] text-slate-800 dark:text-slate-200">{SHAPE_COPY[shape].label}</span>
                    <span className="block text-[12px] text-slate-500 dark:text-slate-400">{SHAPE_COPY[shape].hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          On iPhone the fades may not be heard yet: the phone ignores the app’s volume changes, so the two songs can overlap at full volume for this long.
        </p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={reset} className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-1.5 text-[14px] font-semibold text-white shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function SecondsSlider({
  id, label, hint, value, range, off = false, onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  range: readonly [number, number]
  /** Show 0 as "Off". */
  off?: boolean
  onChange(value: number): void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
          {label}
        </label>
        <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
          {off && value === 0 ? 'Off' : `${value.toFixed(1)} s`}
        </span>
      </div>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
      <input
        id={id}
        type="range"
        min={range[0]}
        max={range[1]}
        step={0.1}
        value={value}
        aria-valuetext={off && value === 0 ? 'Off' : `${value.toFixed(1)} seconds`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[#E05504]"
      />
    </div>
  )
}

/** Both songs' levels across the blend, drawn from `fadeLevel` itself. */
function CurvePreview({ seconds, curve }: { seconds: number; curve: FadeCurve }) {
  const W = 320
  const H = 110
  const pad = { l: 6, r: 6, t: 8, b: 20 }
  // A second of steady music either side, so the blend reads as a change.
  const before = 1
  const total = before + seconds + 1
  const x = (t: number) => pad.l + (t / total) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b)
  let a = ''
  let b = ''
  const N = 120
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * total
    const p = (t - before) / seconds
    const va = p <= 0 ? 1 : fadeLevel(1, 0, p, curve)
    const vb = p <= 0 ? 0 : fadeLevel(0, 1, p, curve)
    a += `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(va).toFixed(1)}`
    b += `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(vb).toFixed(1)}`
  }
  const note =
    curve === 'staggered'
      ? `next song silent for the first ${(seconds * STAGGER).toFixed(1)} s`
      : curve === 'lead-out'
        ? `old song gone after ${(seconds * (1 - LEAD_OUT)).toFixed(1)} s`
        : null
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`A ${seconds.toFixed(1)} second crossfade`}>
        <rect x={x(before)} y={pad.t} width={x(before + seconds) - x(before)} height={H - pad.t - pad.b} className="fill-orange-500/10" />
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="stroke-slate-300 dark:stroke-slate-700" />
        <path d={a} fill="none" strokeWidth={2.2} className="stroke-slate-500 dark:stroke-slate-300" />
        <path d={b} fill="none" strokeWidth={2.2} className="stroke-orange-600 dark:stroke-orange-400" />
        <text x={x(before)} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">
          start
        </text>
        <text x={x(before + seconds)} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">
          {seconds.toFixed(1)} s
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-[11.5px] text-slate-500 dark:text-slate-400">
        <span><span className="mr-1 inline-block h-0.5 w-3 bg-slate-500 align-middle dark:bg-slate-300" />Song ending</span>
        <span><span className="mr-1 inline-block h-0.5 w-3 bg-orange-600 align-middle dark:bg-orange-400" />Next song</span>
        {note && <span>{note}</span>}
      </figcaption>
    </figure>
  )
}
