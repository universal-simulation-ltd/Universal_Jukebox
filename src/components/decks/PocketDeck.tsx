import { useId } from 'react'
import type { DeckFaceProps } from './face'

// The pocket player (James, 2026-09-10: "a 'modern' device option, maybe an
// iPod like device, or a phone"). A click-wheel player: the album art on its
// screen, a progress bar under it that fills as the track plays, and the wheel
// below with its centre button.
//
// Drawn in one SVG, portrait, 100 × 140 — which is the frame's ratio in
// `SHAPES`, so the focus ring and the hover target are the player's own outline.
//
// ⚠️ Nothing spins on this machine, which is honest: a pocket player has no
// moving part to watch. What `spinning` drives instead is the small lit arc
// travelling round the wheel, the way a thumb would, and the ♪ on the screen —
// both paused, never removed, when the music stops, for the reason the vinyl
// face gives (a removed animation snaps back to its start).

export default function PocketDeck({ progress, engaged, spinning, reduced, url, hue, labelFade }: DeckFaceProps) {
  const uid = useId().replace(/:/g, '')
  const screenClip = `jb-pocket-screen-${uid}`
  const body = `jb-pocket-body-${uid}`
  const wheel = `jb-pocket-wheel-${uid}`

  // The bar inside the screen, 8 → 92 across.
  const barWidth = Math.max(0, Math.min(1, progress)) * 84

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 100 140" className="h-full w-full drop-shadow-xl" aria-hidden>
        <defs>
          <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="0.55" stopColor="#e2e8f0" />
            <stop offset="1" stopColor="#cbd5e1" />
          </linearGradient>
          <radialGradient id={wheel} cx="0.5" cy="0.42" r="0.6">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2e8f0" />
          </radialGradient>
          <clipPath id={screenClip}>
            <rect x="10" y="10" width="80" height="62" rx="3" />
          </clipPath>
        </defs>

        {/* The body. */}
        <rect x="1.5" y="1.5" width="97" height="137" rx="12" fill={`url(#${body})`} stroke="#94a3b8" strokeWidth="1" />

        {/* The screen: bezel, then the art — the one part that fades as an
            album goes on (`labelFade`). */}
        <rect x="8" y="8" width="84" height="66" rx="4" fill="#0f172a" />
        <g clipPath={`url(#${screenClip})`}>
          <rect x="10" y="10" width="80" height="62" fill={`hsl(${hue} 44% 50%)`} />
          {url && (
            <image
              href={url}
              x="10"
              y="10"
              width="80"
              height="52"
              preserveAspectRatio="xMidYMid slice"
              style={{ animation: labelFade }}
            />
          )}
          {/* The status strip along the bottom of the screen. */}
          <rect x="10" y="62" width="80" height="10" fill="#0f172a" opacity="0.88" />
          <rect x="16" y="66" width="68" height="2.2" rx="1.1" fill="#475569" />
          <rect x="16" y="66" width={barWidth * (68 / 84)} height="2.2" rx="1.1" fill="#E05504" />
          <text
            x="12.5"
            y="69.3"
            fontSize="5"
            fill="#f8fafc"
            style={{
              animation: reduced ? undefined : 'jb-pocket-note 1.2s ease-in-out infinite alternate',
              animationPlayState: spinning ? 'running' : 'paused',
            }}
          >
            {engaged ? '♪' : '❚❚'}
          </text>
        </g>

        {/* The click wheel. */}
        <circle cx="50" cy="106" r="26" fill={`url(#${wheel})`} stroke="#cbd5e1" strokeWidth="0.8" />
        <g fill="#94a3b8" fontSize="5.5" fontWeight="600" textAnchor="middle">
          <text x="50" y="87.5">MENU</text>
          <text x="31" y="108">⏮</text>
          <text x="69" y="108">⏭</text>
          <text x="50" y="128">⏯</text>
        </g>
        {/* The lit arc a thumb would make going round. */}
        <g
          style={{
            transformOrigin: '50px 106px',
            animation: reduced ? undefined : 'jb-spin 3.6s linear infinite',
            animationPlayState: spinning ? 'running' : 'paused',
          }}
        >
          <path d="M50 81 A25 25 0 0 1 67.7 88.3" fill="none" stroke="#E05504" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
        </g>
        {/* The centre button. */}
        <circle cx="50" cy="106" r="9.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      </svg>
    </div>
  )
}
