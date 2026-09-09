import { useEffect, useRef } from 'react'
import { mediaElements } from '../lib/audio'
import { ensureGraph, ensureRunning } from '../lib/audioGraph'
import { usePlayerStore } from '../stores/playerStore'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

// A bar visualiser driven by a REAL `AnalyserNode`.
//
// ⚠️ Real, and not a sine, because a fake one that ignores the music is worse
// than none at all: it looks alive during a silent passage and keeps moving
// after the track ends, which is the tell that turns the whole app into a toy.
// The drifting notes on the deck are decoration and are allowed to be fake;
// this is a readout and is not.
//
// ⚠️ THE GRAPH IS NOT OWNED HERE ANY MORE. It used to be — a module-level
// AudioContext and source node built by this file — and that stopped working
// the moment the volume boost needed one too: `createMediaElementSource` throws
// on a second call for the same element, so whichever feature got there first
// would have silently disabled the other. `lib/audioGraph.ts` owns the single
// graph now and both features ask it for one.
//
// ⚠️ `mediaElements()`, plural — BOTH crossfade decks. Handing the graph only
// the element that happens to be active right now would silence the app the
// first time the other one took over.

export default function Visualiser() {
  const playing = usePlayerStore((s) => s.playing)
  const reduced = usePrefersReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!playing || reduced) return
    // Asking for the graph BUILDS one if none exists yet — the visualiser is a
    // legitimate reason to have it, same as the boost.
    const built = ensureGraph(mediaElements())
    const surface = canvas.current
    if (!built || !surface) return
    const node = built.analyser
    // An element routed through a source node makes no sound at all while the
    // context is suspended, so this is not about the visualiser — it is what
    // keeps the music audible.
    ensureRunning()

    const ctx2d = surface.getContext('2d')
    if (!ctx2d) return

    const bins = new Uint8Array(node.frequencyBinCount)
    let frame = 0

    const draw = () => {
      frame = requestAnimationFrame(draw)
      node.getByteFrequencyData(bins)

      const dpr = window.devicePixelRatio || 1
      const width = surface.clientWidth
      const height = surface.clientHeight
      if (surface.width !== width * dpr || surface.height !== height * dpr) {
        surface.width = width * dpr
        surface.height = height * dpr
      }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx2d.clearRect(0, 0, width, height)

      // The top bins are almost always empty on music — drawing all 64 gives a
      // graph that is two-thirds flat. The lower half is where the content is.
      const used = Math.floor(bins.length * 0.62)
      const gap = 2
      const barWidth = Math.max(2, width / used - gap)

      const gradient = ctx2d.createLinearGradient(0, height, 0, 0)
      gradient.addColorStop(0, '#FE8C01')
      gradient.addColorStop(1, '#E05504')
      ctx2d.fillStyle = gradient

      for (let i = 0; i < used; i++) {
        const value = bins[i] / 255
        const barHeight = Math.max(2, value * height)
        const x = i * (barWidth + gap)
        ctx2d.beginPath()
        ctx2d.roundRect(x, height - barHeight, barWidth, barHeight, 1.5)
        ctx2d.fill()
      }
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [playing, reduced])

  // Stops when playback stops, and never runs under reduced motion.
  if (reduced) return null

  return (
    <canvas
      ref={canvas}
      className={`h-10 w-full max-w-[280px] transition-opacity ${playing ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden
    />
  )
}
