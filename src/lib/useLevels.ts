import { createRef, useEffect, useMemo, type RefObject } from 'react'
import { mediaElements } from './audio'
import { ensureGraph, ensureRunning } from './audioGraph'

// A level meter you can point at any element: it writes a `--jb-level` custom
// property, 0 → 1, onto each element it is given, sixty times a second, from a
// REAL `AnalyserNode`.
//
// ⚠️ IT WRITES TO THE DOM RATHER THAN RETURNING STATE, and that is the whole
// reason it is a hook of this shape. A meter is a per-frame value; returning it
// as React state would re-render the deck — the cabinet, the record, the arm,
// the SVG — on every animation frame, to move two coloured bars. The elements
// take a ref, the loop sets one property on them, and React never hears about
// it. Same argument as `Visualiser.tsx`, which owns a canvas for the same
// reason.
//
// ⚠️ THE GRAPH IS NOT OWNED HERE. `lib/audioGraph.ts` owns the one graph, and a
// null from it means "this browser will not give us an analyser" — never an
// error worth showing over the music. Every consumer must draw something
// sensible without one, which is what the `var(--jb-level, …)` FALLBACK in the
// CSS is for: the property is removed, not zeroed, when the meter stops, so the
// element falls back to its own resting appearance rather than to an empty one.
//
// ⚠️ Real, not a sine, for the reason the visualiser gives: a fake meter looks
// alive during a silent passage and keeps moving after the track ends, which is
// the tell that turns the whole app into a toy.

/**
 * How fast a band may FALL, per frame, once the sound under it has gone.
 *
 * ⚠️ Only the fall is limited — a rise is instant. That asymmetry is what makes
 * a meter read as a meter rather than as a wobble: it snaps up to a beat and
 * sinks back between them. The analyser's own `smoothingTimeConstant` (0.78,
 * set in `audioGraph.ts`) already softens both directions; this is on top of it
 * and is the part you actually see.
 */
const FALL_PER_FRAME = 0.045

/**
 * The floor, so a lit tube never goes completely dark mid-track.
 *
 * A quiet passage genuinely does read near zero, and a light that goes out
 * entirely looks like the machine has been switched off rather than like the
 * music has gone quiet.
 */
const FLOOR = 0.12

/**
 * The top of the spectrum is silent on nearly every recording, so the bands are
 * taken from the bottom `USED` of the bins. Drawing the whole range gives an
 * upper band that never moves — which reads as a broken light, not as an honest
 * one.
 */
const USED = 0.62

/**
 * Each band up the spectrum is quieter than the one below it — that is what
 * music is — so a straight average would give a bass tube at full height and a
 * treble tube that barely twitches. The gain per band index compensates, and
 * the exponent lifts the quiet end of every band's own range.
 *
 * ⚠️ These are for LOOKING at, not for measuring with. This is a cabinet light,
 * not an instrument, and the honest version of it is the one where both tubes
 * move to the music.
 */
const BAND_GAIN = (index: number) => 0.6 + index * 1.15
const CURVE = 0.7

/**
 * Where one band ends and the next begins, in bins.
 *
 * ⚠️ GEOMETRIC, not equal slices, and it is the difference between a meter and
 * an ornament. The analyser's bins are LINEAR in frequency — with `fftSize:
 * 128` each one is about 345 Hz — so cutting the range in half puts everything
 * a listener would call bass, and most of what they would call the tune, in the
 * FIRST band, and gives the second one 7 kHz upwards, where music is nearly
 * silent. Split that way the upper tube sat on its floor through whole tracks.
 * Spacing the edges geometrically is much closer to how the ear divides the
 * same range, and both tubes then have something to show.
 */
function edge(band: number, bands: number, top: number): number {
  if (band === 0) return 0
  if (band === bands) return top
  return Math.round(top ** (band / bands))
}

/**
 * One ref per band, low frequencies first.
 *
 * `active` is the caller's "there is sound to meter" — playback running, and
 * not `prefers-reduced-motion`. When it goes false the property is REMOVED from
 * each element (see above), so the CSS fallback takes over on the same frame.
 */
export function useLevels<T extends HTMLElement>(bands: number, active: boolean): RefObject<T>[] {
  // ⚠️ Created once per band count, not per render. A fresh array of refs every
  // render would detach and reattach every element, and the effect below —
  // which depends on it — would tear down and rebuild the loop with it.
  const refs = useMemo(
    () => Array.from({ length: bands }, () => createRef<T>()),
    [bands],
  )

  useEffect(() => {
    const clear = () => {
      for (const ref of refs) ref.current?.style.removeProperty('--jb-level')
    }
    if (!active) {
      clear()
      return
    }

    // Asking for the graph BUILDS one if none exists yet — a meter on screen is
    // a legitimate reason to have one, exactly like the visualiser.
    const graph = ensureGraph(mediaElements())
    if (!graph) return
    // An element routed through a source node makes NO SOUND while the context
    // is suspended, so this line is about the music rather than about the meter.
    ensureRunning()

    const node = graph.analyser
    const bins = new Uint8Array(node.frequencyBinCount)
    const level = new Array<number>(refs.length).fill(0)
    const top = Math.max(refs.length, Math.floor(bins.length * USED))
    let frame = 0

    const tick = () => {
      frame = requestAnimationFrame(tick)
      node.getByteFrequencyData(bins)

      for (let band = 0; band < refs.length; band++) {
        const from = edge(band, refs.length, top)
        const to = Math.max(from + 1, edge(band + 1, refs.length, top))
        let sum = 0
        for (let i = from; i < to; i++) sum += bins[i]
        const mean = sum / (to - from) / 255
        const shaped = Math.min(1, Math.pow(mean, CURVE) * BAND_GAIN(band))
        const value = Math.max(FLOOR + (1 - FLOOR) * shaped, level[band] - FALL_PER_FRAME)
        level[band] = value
        // ⚠️ Rounded to three places rather than written raw. The value is a
        // string every frame either way, and an unrounded double is a
        // seventeen-character one — for a property whose visible resolution is
        // a fraction of a pixel.
        refs[band].current?.style.setProperty('--jb-level', value.toFixed(3))
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      clear()
    }
  }, [refs, active])

  return refs
}
