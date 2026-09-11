import { coverUrl, fallbackHue } from '../../lib/art'
import type { Album } from '../../lib/types'

// The record itself — grooves, label, spindle hole — drawn ONE way, for the
// deck and for everything that stands in for it beside the deck.
//
// ⚠️ James, 2026-09-11: "New disc doesn't have enough lines and then it jumps
// to correct one on play". The stand-ins were the Up next reel's 76px
// `Medium`, scaled up three times, grooves and all: a third as many lines,
// each three times as thick, on a disc that read lighter for it — and then the
// deck's own record replaced it. Drawn from here at the deck's size, and only
// then scaled, a stand-in IS the deck's record, line for line.

/** Inside a positioned, round parent: the grooves, the label, the hole. */
export function VinylRecordFace({ url, hue, labelFade }: { url: string | null; hue: number; labelFade?: string }) {
  return (
    <>
      {/* Grooves. Rendered as repeating rings in one gradient rather than N
          elements: at 420px this is one paint instead of twenty. */}
      <div
        className="absolute inset-0 rounded-full opacity-[0.16]"
        style={{
          background: 'repeating-radial-gradient(circle at 50% 50%, transparent 0 3px, rgba(255,255,255,.5) 3px 4px)',
        }}
      />
      {/* The cover IS the centre label — which is what earns the artwork all
          the extraction work bought. */}
      <div className="absolute overflow-hidden rounded-full ring-1 ring-white/10" style={{ inset: '30%', animation: labelFade }}>
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))` }}
          />
        )}
      </div>
      {/* Spindle hole. */}
      <div className="absolute rounded-full bg-slate-100 dark:bg-slate-900" style={{ inset: '48.4%' }} />
    </>
  )
}

/** A whole record, still, filling its parent — the stand-in `DeckSwiper` draws. */
export function VinylRecord({ album }: { album: Album | undefined }) {
  const url = album ? coverUrl(album.id, album.cover) : null
  const hue = album ? fallbackHue(album.id) : 24
  return (
    <div className="relative h-full w-full rounded-full bg-slate-900 shadow-xl dark:bg-[#12192b]">
      <VinylRecordFace url={url} hue={hue} />
    </div>
  )
}
