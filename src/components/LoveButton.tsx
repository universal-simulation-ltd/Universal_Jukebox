import { useT } from '../i18n'
import { useDone } from '../lib/useDone'
import { useLoved, useShelvesStore } from '../stores/shelvesStore'
import type { Track } from '../lib/types'
import { DoneBubble } from './DoneBubble'
import { ModeButton } from './ModeButton'

// ♥ in Now Playing's row of round buttons (James, 2026-11-02: "In the reveal
// menu need an option to ♥ a song"). One tap puts the song on the Loved shelf
// (`LOVED_SHELF`, made by the first ♥) and lights the heart; another takes it
// off. Lit is the whole answer to "is it loved?", so the bubble only speaks
// when the tap ADDED it — the shelf it went to is somewhere you can't see.

export default function LoveButton({ track }: { track: Track }) {
  const t = useT()
  const loved = useLoved(track.id)
  const toggle = useShelvesStore((s) => s.toggleLoved)
  const { said, say } = useDone()
  return (
    <span className="relative inline-flex shrink-0">
      <ModeButton
        label={loved ? t('decks.loved') : t('settings.mode_love')}
        ariaLabel={loved ? t('decks.loved_aria', { title: track.title }) : t('decks.love_aria', { title: track.title })}
        on={loved}
        mode="love"
        onClick={() => {
          if (toggle(track.id)) say(t('decks.added_to_loved'))
        }}
      >
        <HeartGlyph filled={loved} />
      </ModeButton>
      <DoneBubble text={said} />
    </span>
  )
}

export function HeartGlyph({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[18px] w-[18px]"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 16.5s-6.2-3.7-6.2-8.2A3.4 3.4 0 0 1 10 6.4a3.4 3.4 0 0 1 6.2 1.9c0 4.5-6.2 8.2-6.2 8.2Z" />
    </svg>
  )
}
