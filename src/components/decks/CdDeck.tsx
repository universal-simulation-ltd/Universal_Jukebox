import type { DeckFaceProps } from './face'

// A portable CD player — the disc, the laser, and the machine around them.
//
// ⚠️ THE BODY IS THE POINT (James, 2026-09-09). This deck used to be a bare
// silver disc floating in the middle of the page with a small sled next to it,
// while the cassette next door got a whole Walkman shell. Two decks in the same
// chooser, one of which is a PLAYER and one of which is just the media, read as
// one of them being unfinished — and the one without a body was.
//
// So: a portable player seen from above, with the lid open and the disc sitting
// in its well. The buttons and the hinge do nothing and are not meant to; they
// are what makes the thing on screen a machine rather than a circle.
//
// ⚠️ It reads the SAME `progress`, `engaged` and `spinning` as the vinyl deck,
// and runs on the same ceremony timeline. The only thing this file is allowed
// to disagree with `VinylDeck.tsx` about is what those three values LOOK like.
//
// ⚠️ The DISC is the medium and the BODY is not — which is why `labelFade` (the
// record being lowered in, or lifted out for a different album) wraps only the
// disc. The player stays on the table while the disc changes, exactly as the
// tonearm stays put on the vinyl deck. See `labelFade` in `face.ts`.

/**
 * Where the laser sits, as a radius in the SVG's own units (the disc is 100
 * across, so its rim is at 50).
 *
 * ⚠️ OUTWARD, and that is the whole point of this deck existing rather than
 * being the vinyl one in silver. A CD is written as one spiral from the middle
 * out, so the pickup starts at the hub and works towards the edge — the exact
 * opposite of the tonearm next door. Anyone "fixing" this to match the vinyl
 * deck has made both decks tell the same lie about one of them.
 *
 * ⚠️ Both ends are set by the SLED, which is 12 long, not by the lens in the
 * middle of it. `START` puts its inner end clear of the printed label (which
 * ends at radius 20) and `START + TRAVEL` puts its outer end on the rim at 50.
 * Change one and check the other: a sled sitting on the artwork, or hanging off
 * the edge of the disc, reads as a bug rather than as the start or end of a
 * track. Widening the sled costs travel at both ends.
 */
const LASER = {
  /** The innermost track — where a disc starts. */
  START: 30,
  /** How far out it travels over a whole track. */
  TRAVEL: 14,
  /** The rail's angle below horizontal, degrees. Keeps the sled off the label. */
  ANGLE: 40,
}

const RAD = (LASER.ANGLE * Math.PI) / 180
const point = (r: number) => ({ x: 50 + r * Math.cos(RAD), y: 50 + r * Math.sin(RAD) })

/**
 * The disc well, as a box inside the body.
 *
 * ⚠️ `aspect-square` and NOT a percentage height. The body is taller than it is
 * wide (there is a control strip along the bottom), so a well sized in percent
 * of the frame would be an ellipse — and an elliptical CD is the kind of detail
 * that makes a whole drawing look wrong without anybody being able to say why.
 * Setting left and right fixes the width; the aspect ratio takes the height.
 */
const WELL = { left: '7.5%', right: '7.5%', top: '4.5%' }

export default function CdDeck({ progress, engaged, spinning, reduced, url, hue, labelFade }: DeckFaceProps) {
  // Parked at the start until the laser is on: a disc that has not been read
  // yet has its sled at the hub, and the seek back out is what the handover
  // between tracks looks like on this deck.
  const radius = LASER.START + (engaged ? progress * LASER.TRAVEL : 0)
  const lens = point(radius)
  const railFrom = point(LASER.START)
  const railTo = point(LASER.START + LASER.TRAVEL)

  return (
    <>
      {/* ── The body ───────────────────────────────────────────────────────
          Graphite in both themes, like the disc is silver in both — a portable
          player is a dark plastic object whatever the room is doing. The
          gradient runs top-left to bottom-right so it catches the same light as
          the disc's own sheen. */}
      <div
        className="absolute inset-0 shadow-xl ring-1 ring-slate-900/20 dark:ring-white/10"
        style={{
          borderRadius: '16%',
          background:
            'linear-gradient(150deg, #4b5563 0%, #374151 38%, #1f2937 72%, #111827 100%)',
        }}
      >
        {/* The top bevel — one highlight along the upper edge is the whole
            difference between "moulded plastic" and "grey rectangle". */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: '16%',
            background:
              'linear-gradient(180deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 18%, rgba(0,0,0,0) 82%, rgba(0,0,0,.25) 100%)',
          }}
        />

        {/* The two hinge lugs the lid would pivot on, top centre. */}
        <div className="absolute top-[1.4%] left-1/2 flex -translate-x-1/2 gap-[7%]">
          {[0, 1].map((i) => (
            <span
              key={i}
              className="block h-[7px] w-[16px] rounded-b-[3px] bg-slate-900/45 ring-1 ring-white/10"
            />
          ))}
        </div>

        {/* The control strip along the bottom: transport buttons, and a lamp
            that is lit exactly when the laser is reading. Nothing here is
            clickable — the real transport is the player bar, and a second set
            of play buttons that only some of the decks have would be a control
            you have to learn per skin. */}
        <div className="absolute right-[9%] bottom-[3.5%] left-[9%] flex items-center gap-[4%]">
          <span
            className="block h-[7px] w-[7px] shrink-0 rounded-full transition-colors"
            style={{
              background: engaged ? '#fb923c' : 'rgba(148,163,184,.45)',
              boxShadow: engaged ? '0 0 6px rgba(251,146,60,.9)' : undefined,
            }}
          />
          <span className="block h-[9px] flex-1 rounded-full bg-slate-900/40 ring-1 ring-white/5" />
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[10px] w-[10px] shrink-0 rounded-full bg-slate-500/70 ring-1 ring-white/10"
            />
          ))}
        </div>
      </div>

      {/* ── The well the disc sits in ───────────────────────────────────────
          Everything from here is positioned against the WELL, not the body, so
          the sled's SVG and the disc share one coordinate space. */}
      <div className="absolute aspect-square" style={WELL}>
        {/* The recess: a dark ring with an inner shadow, so the disc reads as
            sitting IN something rather than on top of it. */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '-3.5%',
            background: 'radial-gradient(circle at 50% 46%, #0b1220 55%, #1f2937 100%)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.08)',
          }}
        />

        {/* The disc, inside its own wrapper — it is the part that goes in
            and comes out; the body, the sled and the rail are the machine. */}
        <div className="absolute inset-0">
          {/* The disc. Silver in both themes, because a CD is silver in both. */}
          <div
            // ⚠️ KEYED ON THE RECORD, so a new one goes on at 0°, as the record that
            // flew in was drawn, instead of carrying on from wherever the last had
            // turned to (James, 2026-09-11: "the new track should also start in the
            // fixed starting position"). Same record, same key: pause still freezes it.
            key={url ?? hue}
            // What `DeckSwiper` turns upright as a swipe carries it to the side.
            data-record
            className="absolute inset-0 overflow-hidden rounded-full shadow-lg"
            style={{
              // ⚠️ 0.9s a revolution — twice the vinyl deck's 1.8s, and nowhere
              // near a real CD's 200–500 rpm. A disc turning at its true speed
              // is a grey blur: it stops reading as a disc at all, which is the
              // one thing the animation is for. Twice vinyl is the smallest
              // difference that still says "this one is quicker".
              //
              // Paused rather than removed, for the same reason as the platter —
              // taking the animation off snaps the element back to 0°.
              animation: reduced ? undefined : 'jb-spin 0.9s linear infinite',
              animationPlayState: spinning ? 'running' : 'paused',
              background: 'radial-gradient(circle at 50% 50%, #eff3f8 0%, #c6cfdc 42%, #9dabbd 74%, #808d9f 100%)',
            }}
          >
            {/* The spectral sheen, and the data spiral as fine rings. Both turn
                WITH the disc; the gloss below deliberately does not. */}
            <div
              className="absolute inset-0 rounded-full mix-blend-overlay"
              style={{
                // ⚠️ 0.3, and it was 0.55 first. At the higher value the disc
                // read as a pastel rainbow rather than as silver with a sheen on
                // it — which is the difference between a CD and a novelty
                // frisbee. The spectrum has to be the SECOND thing you notice.
                opacity: 0.3,
                background:
                  'conic-gradient(from 0deg, rgba(255,0,140,.75), rgba(255,196,0,.75), rgba(0,224,180,.75), rgba(70,120,255,.75), rgba(255,0,140,.75))',
              }}
            />
            <div
              className="absolute inset-0 rounded-full opacity-[0.14]"
              style={{
                background:
                  'repeating-radial-gradient(circle at 50% 50%, transparent 0 2px, rgba(255,255,255,.6) 2px 3px)',
              }}
            />
            {/* The printed label — the album art, the same trick as the record's
                centre label, and deliberately the same size as it: two decks
                that crop the artwork differently look like a bug in one. */}
            <div className="absolute overflow-hidden rounded-full ring-1 ring-slate-900/20" style={{ inset: '30%' }}>
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" style={{ animation: labelFade }} />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 46% 62%), hsl(${(hue + 28) % 360} 44% 44%))`,
                  }}
                />
              )}
            </div>
            {/* The clear plastic hub inside the printed area, then the hole.
                This hub is the single detail that stops the disc reading as a
                small silver record, so it is drawn as a thing — a rim and a
                highlight — rather than as a pale disc sitting on the artwork,
                which is what a flat fill looked like.

                ⚠️ It is SMALLER than a real CD's clamping area, on purpose. At
                true scale it swallows the middle of the album art, and the
                artwork is the reason any of these decks exist. */}
            <div
              className="absolute rounded-full ring-1 ring-slate-900/25"
              style={{
                inset: '42%',
                background: 'radial-gradient(circle at 38% 34%, rgba(255,255,255,.95), rgba(203,213,225,.8))',
              }}
            />
            <div
              className="absolute rounded-full bg-slate-100 ring-1 ring-slate-900/20 dark:bg-slate-900"
              style={{ inset: '47%' }}
            />
          </div>
        </div>

        {/* The spindle clamp: the machine's, not the disc's, so it does NOT
            turn and does NOT leave with the disc. It is the thing the disc is
            pressed onto, and it is what makes the well read as a mechanism. */}
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: '45.5%',
            background: 'radial-gradient(circle at 40% 34%, #94a3b8, #475569 70%, #334155 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,.5)',
          }}
          aria-hidden
        />

        {/* The fixed gloss: a reflection belongs to the room — or to the lid
            over the disc — not to the disc itself, so it sits OUTSIDE the
            rotating element and stays put while it turns. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(115deg, transparent 26%, rgba(255,255,255,.42) 44%, rgba(255,255,255,.05) 56%, transparent 72%)',
          }}
          aria-hidden
        />

        {/* The laser sled on its rail. */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <line
            x1={railFrom.x}
            y1={railFrom.y}
            x2={railTo.x}
            y2={railTo.y}
            stroke="rgba(15,23,42,.22)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <g
            style={{
              transform: `translate(${lens.x}px, ${lens.y}px) rotate(${LASER.ANGLE}deg)`,
              // Just longer than the ~250ms between `timeupdate` events, so the
              // sled creeps rather than stepping four times a second — the same
              // number as the tonearm, for the same reason.
              transition: reduced ? undefined : 'transform 0.4s linear',
            }}
          >
            <rect x="-6" y="-3.6" width="12" height="7.2" rx="2" fill="#334155" opacity="0.92" />
            <rect x="-6" y="-3.6" width="12" height="2.4" rx="1.2" fill="#64748b" opacity="0.7" />
            {/* The lens: lit only while the laser is actually reading. The glow
                is a drop-shadow rather than a filter element so it costs
                nothing. */}
            <circle
              cx="0"
              cy="0"
              r="2.5"
              fill={engaged ? '#f87171' : '#0f172a'}
              style={{
                filter: engaged ? 'drop-shadow(0 0 3px rgba(248,113,113,.95))' : undefined,
                transition: reduced ? undefined : 'fill 0.3s ease',
              }}
            />
          </g>
        </svg>
      </div>
    </>
  )
}
