import { useEffect, useRef, useState } from 'react'
import type { MicPhase } from '../lib/singing'

// The microphone above the lyrics (James, 2026-09-10: "a microphone emoji-type
// that's slightly moving and lines animated out of it to give the impression of
// singing. Have a pick up and sing animation at the start of the song and a mic
// drop animation when lyrics finish").
//
// It lies on its side through the intro, is PICKED UP when the first line is
// sung, bobs with sound radiating from its head while a line is being sung, is
// held still through a gap or a pause, and is DROPPED — a flourish, a fall, a
// bounce — when the last line is done. `lib/singing.ts` decides which; this
// file only draws it.
//
// ⚠️ The two one-off moves (pick-up, drop) are TRANSITIONS between phases, not
// phases of their own, so they are worked out here from the previous phase and
// cleared when their animation ends. `micPhase` stays a pure function of where
// the song is, and a seek backwards past the drop just becomes a pick-up.
//
// ⚠️ Decoration, so `prefers-reduced-motion` gets the still poses and nothing
// else — the mic upright while there are words to sing, down on the table
// otherwise. The global rule in `index.css` would only freeze an animation
// mid-flight; a mic stopped halfway through falling is worse than a still one.

type Move = 'pickup' | 'drop' | null

const POSE: Record<MicPhase, string> = {
  resting: 'translateY(12px) rotate(-90deg)',
  singing: 'rotate(-15deg)',
  holding: 'rotate(-15deg)',
  dropped: 'translateY(12px) rotate(92deg)',
}

export default function SingingMic({ phase, reduced }: { phase: MicPhase; reduced: boolean }) {
  const previous = useRef<MicPhase>(phase)
  const [move, setMove] = useState<Move>(null)

  useEffect(() => {
    const was = previous.current
    previous.current = phase
    if (reduced || was === phase) return
    const down = was === 'resting' || was === 'dropped'
    const up = phase === 'singing' || phase === 'holding'
    if (down && up) setMove('pickup')
    else if (phase === 'dropped' && !down) setMove('drop')
  }, [phase, reduced])

  const animation = reduced
    ? undefined
    : move === 'pickup'
      ? 'jb-mic-pickup 650ms cubic-bezier(.3,1.35,.5,1) both'
      : move === 'drop'
        ? 'jb-mic-drop 950ms ease-out both'
        : phase === 'singing'
          ? 'jb-mic-sing 900ms ease-in-out infinite alternate'
          : undefined
  const waves = !reduced && move === null && phase === 'singing'

  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0 overflow-visible" aria-hidden>
      <g
        style={{ transform: POSE[phase], transformOrigin: '24px 27px', animation }}
        onAnimationEnd={(e) => {
          if (e.animationName === 'jb-mic-pickup' || e.animationName === 'jb-mic-drop') setMove(null)
        }}
      >
        {/* Sound, coming off the head. Three arcs, staggered, so there is
            always one on its way out. */}
        {waves &&
          [0, 0.3, 0.6].map((delay) => (
            <path
              key={delay}
              d="M35 6 Q41 14 35 22"
              fill="none"
              stroke="#E05504"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{
                transformOrigin: '24px 14px',
                animation: `jb-mic-wave 900ms ease-out ${delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}
        {/* The handle. */}
        <rect x="20.5" y="22" width="7" height="19" rx="3.5" className="fill-slate-800 dark:fill-slate-300" />
        {/* The collar — the one splash of the app's orange. */}
        <rect x="19" y="20.5" width="10" height="3.5" rx="1.5" fill="#E05504" />
        {/* The grille: a ball with a mesh on it, which is what makes it read as
            🎤 rather than as a lollipop. */}
        <circle cx="24" cy="13" r="9" className="fill-slate-300 dark:fill-slate-500" />
        <path
          d="M17 10h14M16 14h16M17.5 18h13M20 5.5v15M24 4v18M28 5.5v15"
          stroke="currentColor"
          strokeWidth="0.9"
          className="text-slate-500 dark:text-slate-700"
          opacity="0.7"
        />
        <circle cx="21" cy="9.5" r="2.2" fill="#fff" opacity="0.55" />
      </g>
      {/* The thud: two short lines where it lands, once, after the drop. */}
      {move === 'drop' && (
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-slate-400">
          <path d="M10 45h6" style={{ transformOrigin: '13px 45px', animation: 'jb-mic-thud 950ms ease-out both' }} />
          <path d="M32 45h6" style={{ transformOrigin: '35px 45px', animation: 'jb-mic-thud 950ms ease-out both' }} />
        </g>
      )}
    </svg>
  )
}
