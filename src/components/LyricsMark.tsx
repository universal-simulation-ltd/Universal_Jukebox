import { useT } from '../i18n'

/**
 * The lyric-sheet mark after a song's or an album's name: words are to hand
 * for it (`lib/lyricMarks.ts`). A speech bubble with two lines of writing —
 * not the singing mic, which is the button that SHOWS them.
 */
export default function LyricsMark({ className = '' }: { className?: string }) {
  const t = useT()
  const label = t('library.lyrics_available')
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={label}
      className={`lyrics-mark inline-block shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{label}</title>
      <path d="M3.2 2.5h9.6a1.7 1.7 0 0 1 1.7 1.7v5.6a1.7 1.7 0 0 1-1.7 1.7H7.4L4.3 14v-2.5H3.2a1.7 1.7 0 0 1-1.7-1.7V4.2a1.7 1.7 0 0 1 1.7-1.7Z" />
      <path d="M4.6 5.7h6.8M4.6 8.3h4.4" />
    </svg>
  )
}
