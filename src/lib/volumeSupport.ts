// Can this platform actually change an `<audio>` element's volume?
//
// ⚠️ MEASURED ON A DEVICE, 2026-09-10, AND THE ANSWER WAS NOT THE EXPECTED ONE.
// This file was written on the received wisdom that `HTMLMediaElement.volume` is
// read-only in an iOS WebView — the assignment doing nothing, the property
// reading back as 1, volume belonging to the hardware buttons alone. On an
// iPhone 15 Pro running iOS 26, in the Capacitor WebView, **the probe below
// answers `true`**: the assignment round-trips. So the app runs its fades and
// its real crossfade there, exactly as it does on the web.
//
// ⚠️ WHAT THE PROBE MEASURES IS THE PROPERTY, NOT THE LOUDSPEAKER. It asks
// whether the engine STORES the value it was given. Whether the audio path then
// attenuates by it is a different question and cannot be answered from
// JavaScript — nothing readable reports it, so the only instrument is an ear.
// Treat a `true` here as "this engine does not refuse the assignment", which is
// the strongest thing that can be established programmatically.
//
// It still earns its place, because of what it protects when the answer is no.
// `lib/audio.ts` puts FOUR features through `element.volume`: the slider, mute,
// the fade in and out, and the crossfade. Where volume does not work three of
// them merely stop being HEARD —
//
// ⚠️ and the fourth gets WORSE, not absent, which is the reason any of this is
// here. A crossfade starts the incoming track UNDER the outgoing one and ramps
// the pair past each other. With no working gain, "under" is full volume: both
// tracks play at once, at full level, for the length of the crossfade. That is
// not a missing feature, it is a bad noise — and it would arrive precisely when
// somebody turned on the thing meant to make the seam disappear.
//
// ⚠️ CAPABILITY, NOT PLATFORM, and that is what saved this from shipping wrong.
// Had the iOS assumption been hard-coded — `if (isIOS) noFades()` — this app
// would now be refusing to fade on a device that is perfectly willing to,
// and nothing would ever have contradicted the comment. Asking the engine costs
// one detached element once, cannot be wrong about a platform it has never heard
// of, and moves with the platform in both directions. It is the shape the rest
// of the suite already uses for a capability gap (see the header of
// `components/Landing.tsx`).

/** Memoised: the probe is cheap but it is the same answer every time. */
let cached: boolean | null = null

/**
 * True when assigning to `element.volume` actually changes it.
 *
 * ⚠️ Probes with a value that is neither 0 nor 1. Testing with 0 cannot tell a
 * working setter apart from an element that happens to be muted, and 1 is the
 * value iOS reports anyway — either would make the probe agree with a broken
 * platform.
 */
export function canSetElementVolume(): boolean {
  if (cached !== null) return cached
  cached = probe()
  return cached
}

function probe(): boolean {
  if (typeof document === 'undefined') return true
  try {
    const el = document.createElement('audio')
    el.volume = 0.5
    // A tolerance rather than an equality: the property is a double and nothing
    // guarantees the exact bit pattern survives a round trip.
    return Math.abs(el.volume - 0.5) < 0.01
  } catch {
    // A setter that THROWS is at least honest, and the answer is still no.
    return false
  }
}

/** Test seam — forget the probe's answer so it can be taken again. */
export function resetVolumeSupportForTests(): void {
  cached = null
}
