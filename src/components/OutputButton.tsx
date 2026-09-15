import { useEffect, useState } from 'react'
import { mediaElement, mediaElements } from '../lib/audio'
import { noteEvent } from '../lib/bgLog'
import { canPickOutput, pickOutput, ROUTE_EVENTS, routedAway, type RoutableMedia } from '../lib/outputPicker'
import { ModeButton } from './ModeButton'

// "Output" in the row under the records waiting to go on — the way to send the
// sound somewhere else (James, 2026-09-15: "we need a way to select the output
// in app (speaker / headphones etc)").
//
// It opens the SYSTEM's own route sheet and nothing more; see
// `lib/outputPicker.ts` for why this app must not try to route audio itself.
//
// ⚠️ IT IS NOT THERE AT ALL WHERE THERE IS NO PICKER, rather than there and
// dead. That is the volume slider's rule too (`lib/volumeSupport.ts`): a
// control that cannot do its job is worse than an absence, because an absence
// sends people to the device's own controls and a dead button does not.
//
// ⚠️ BOTH DECKS ARE WATCHED, one asked. Which element is "the" element changes
// at every crossfade (`lib/audio.ts`), so the lit state has to come from either
// of them — but the sheet is opened on the deck that is playing now.

export default function OutputButton() {
  /** Whether this engine has a picker at all — known once the decks exist. */
  const [can, setCan] = useState(false)
  /** Whether the sound is going somewhere other than this device. */
  const [away, setAway] = useState(false)

  useEffect(() => {
    const decks = mediaElements()
    const routable = decks as unknown as RoutableMedia[]
    setCan(routable.some(canPickOutput))
    const look = () => setAway(routable.some(routedAway))
    look()
    for (const deck of decks) for (const name of ROUTE_EVENTS) deck.addEventListener(name, look)
    return () => {
      for (const deck of decks) for (const name of ROUTE_EVENTS) deck.removeEventListener(name, look)
    }
  }, [])

  if (!can) return null

  return (
    <ModeButton
      label="Output"
      on={away}
      ariaLabel={away ? 'Sound is going to another device — choose where it comes out' : 'Choose where the sound comes out'}
      // ⚠️ Called straight out of the tap. `pickOutput` runs as far as the
      // WebKit call before it awaits anything, because both APIs want a user
      // gesture and count it spent once a promise has resolved.
      onClick={() => {
        void pickOutput(mediaElement() as unknown as RoutableMedia).then((result) => noteEvent('output', { result }))
      }}
    >
      <OutputGlyph away={away} />
    </ModeButton>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** A speaker throwing sound — with the sound leaving it, once it has gone elsewhere. */
function OutputGlyph({ away }: { away: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" {...stroke} aria-hidden>
      <path d="M3 7.5h2.5L9 4.5v11L5.5 12.5H3z" />
      {away ? (
        // Gone somewhere else: the far waves become a screen with sound under it.
        <path d="M12 4.5h6v6h-6zM13 16l2-2.5 2 2.5z" />
      ) : (
        <path d="M12.5 7.2a4 4 0 0 1 0 5.6M15.5 5a7 7 0 0 1 0 10" />
      )}
    </svg>
  )
}
