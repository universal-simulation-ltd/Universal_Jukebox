import { useState } from 'react'
import { coverUrl, fallbackHue } from '../../lib/art'
import type { Album } from '../../lib/types'
import { DEFAULT_RINGS, grooveGradient } from '../../lib/grooves'

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
export function VinylRecordFace({
  url, hue, labelFade, grooves = DEFAULT_RINGS,
}: { url: string | null; hue: number; labelFade?: string; grooves?: number }) {
  return (
    <>
      {/* Grooves — as many as the song is long (`lib/grooves.ts`). One
          gradient rather than N elements: at 420px this is one paint instead
          of forty. */}
      <div className="absolute inset-0 rounded-full opacity-[0.16]" style={{ background: grooveGradient(grooves, 0.3) }} />
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
export function VinylRecord({ album, grooves }: { album: Album | undefined; grooves?: number }) {
  const url = album ? coverUrl(album.id, album.cover) : null
  const hue = album ? fallbackHue(album.id) : 24
  return (
    <div className="relative h-full w-full rounded-full bg-slate-900 shadow-xl dark:bg-[#12192b]">
      <VinylRecordFace url={url} hue={hue} grooves={grooves} />
    </div>
  )
}

/**
 * The record's album sleeve, filling its parent (James, 2026-11-02: "Side
 * records only show their sleeve album and then on change the sleeve moves to
 * the center and then the sleeve slides out to the left"). What the records
 * either side of the turntable are drawn as (`DeckSwiper`), what the record
 * leaving turns into on its way there (`VinylDeck`), and what slides off the
 * record that has just come on.
 */
export function Sleeve({ album, url: given, hue: givenHue }: { album?: Album; url?: string | null; hue?: number }) {
  const url = given !== undefined ? given : album ? coverUrl(album.id, album.cover) : null
  const hue = givenHue ?? (album ? fallbackHue(album.id) : 24)
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[3%] bg-slate-800 shadow-xl ring-1 ring-black/10">
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <div
          className="h-full w-full"
          style={{ background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))` }}
        />
      )}
      {/* Card, not glass: a little light along the top, a little shade at the
          open edge where a record comes out. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/15" />
    </div>
  )
}

/** How long the sleeve takes to come half off the record. */
export const SLEEVE_HALF_MS = 620

/**
 * The playing record's sleeve, half off it to the left, the record turning in
 * it (James, 2026-11-02: "try the active record sleeve just coming half off
 * and the track playing inside of it"). It slides there from covering the
 * record whenever a record arrives.
 *
 * `since` is when that record arrived (`DeckSlide.sleeveAt`): the stand-in
 * `DeckSwiper` holds in the middle and the deck's own record under it each
 * draw one of these, mounted at different moments, and both run the slide
 * from that one time so the hand-over between them is unseen. Read once, at
 * mount — a later render must not move a slide already under way.
 */
export function HalfSleeve({ since, album, url, hue, reduced = false, settled = false }: {
  since?: number
  /** Already half off — a record of the same album has come in under it. */
  settled?: boolean
  album?: Album
  url?: string | null
  hue?: number
  reduced?: boolean
}) {
  // An arrival long gone (the song changed since by a button, not a swipe):
  // this record's slide is its own, from now.
  const [delay] = useState(() => {
    const ago = since ? Date.now() - since : Infinity
    return ago < 3000 ? Math.min(SLEEVE_HALF_MS, Math.max(0, ago)) : 0
  })
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={
        reduced || settled
          ? { transform: 'translateX(-50%)' }
          : { animation: `jb-sleeve-half ${SLEEVE_HALF_MS}ms cubic-bezier(.45,0,.3,1) ${-delay}ms both` }
      }
      aria-hidden
    >
      <Sleeve album={album} url={url} hue={hue} />
    </div>
  )
}
