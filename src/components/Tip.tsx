import { useSettingsStore, type TipId } from '../stores/settingsStore'

// First-run tips (James, 2026-09-10): "Tap here" on the record, and on the
// album cover, so somebody new finds that the two open each other. A tip goes
// for good the first time its target is tapped (`markTipSeen` in `lib/tips.ts`,
// called by the target's own handler), and only "Show the tips again" in the
// Actions menu brings it back.

/**
 * The bubble: straddling the bottom edge of its target, pointing up into it.
 *
 * ⚠️ `pointer-events-none`, so a tap on the bubble IS a tap on the target — the
 * one handler both does the thing and retires the tip. A bubble that caught
 * taps itself would need tapping away before the thing it points at worked.
 *
 * ⚠️ Centred by a full-width flex row, not `left-1/2 -translate-x-1/2`: the bob
 * is a `transform`, and on the same element it would replace the centring.
 */
export default function Tip({ id, detail }: { id: TipId; detail: string }) {
  const seen = useSettingsStore((s) => s.tipsSeen.includes(id))
  if (seen) return null
  return (
    <span className="pointer-events-none absolute inset-x-0 -bottom-3 z-10 flex justify-center">
      <span role="note" className="flex flex-col items-center motion-safe:animate-[jb-tip-bob_1.6s_ease-in-out_infinite]">
        <span className="h-0 w-0 border-x-[7px] border-b-[8px] border-x-transparent border-b-orange-600" aria-hidden />
        <span className="rounded-full bg-orange-600 px-3.5 py-1 text-center text-[12.5px] leading-tight font-semibold whitespace-nowrap text-white shadow-lg">
          Tap here
          <span className="block text-[10.5px] font-medium opacity-90">{detail}</span>
        </span>
      </span>
    </span>
  )
}
