// Can this platform actually change an `<audio>` element's volume?
//
// ⚠️ ON iOS THE ANSWER IS NO, AND NOTHING SAYS SO. `HTMLMediaElement.volume` is
// read-only in WKWebView and in iOS Safari: the assignment does not throw, it
// simply has no effect, and reading the property back gives 1. Volume there
// belongs to the hardware buttons and to nothing else. Every other current
// engine — desktop Safari included — honours it.
//
// That matters here more than it would in most apps, because `lib/audio.ts`
// puts FOUR features through `element.volume`: the slider, mute, the fade in and
// out, and the crossfade. On a phone all four silently stop working, and three
// of them merely stop being heard.
//
// ⚠️ THE FOURTH ONE GETS WORSE, NOT ABSENT, WHICH IS WHY THIS FILE EXISTS. A
// crossfade starts the incoming track UNDER the outgoing one and ramps the pair
// past each other. With no working gain, "under" is full volume: both tracks
// play at once, at full level, for the length of the crossfade. That is not a
// missing feature, it is a bad noise — and it would arrive precisely when
// somebody turned on the feature that was supposed to make the seam disappear.
//
// ⚠️ CAPABILITY, NOT PLATFORM. This asks the engine rather than sniffing for
// iOS, which is the shape the rest of the suite already uses for a capability
// gap (see the header of `components/Landing.tsx`). It costs one detached
// element once, it cannot be wrong about a platform it has never heard of, and
// if a future iOS starts honouring `volume` the app picks the fades back up on
// its own with nothing to change.

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
