import { useMemo } from 'react'
import { useT, type Translator } from '../i18n'
import { worldStats, type WorldStats } from '../lib/hitsView'
import type { Track } from '../lib/types'
import { useHitsStore } from '../stores/hitsStore'

// The Hits lookups' answers as words, for any view (`lib/hitsView.ts`): an
// album's or an artist's line ("4.2M plays worldwide · ★ 4.3 · 2 awards"), and
// a song's ("2.3M plays · 1 award", short, for a row). Each is '' when nothing
// is known — the lookups are off, or the song wasn't found — so a view adds it
// only when there is something to say.

/** One compact formatter per locale ("1.2M"), shared by every row. */
const compactFormats = new Map<string, Intl.NumberFormat>()
function compact(locale: string, n: number): string {
  let format = compactFormats.get(locale)
  if (!format) compactFormats.set(locale, (format = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })))
  return format.format(n)
}

function words(t: Translator, s: WorldStats | null, short: boolean): string {
  if (!s) return ''
  return [
    ...(s.listens ? [t.plural(short ? 'shelves.hits_plays_short' : 'shelves.hits_plays', s.listens, { count: compact(t.locale, s.listens) })] : []),
    // A row has no room for the rating; the song's sheet and the pages do.
    ...(s.rating !== null && !short ? [`★ ${t.num(Math.round(s.rating * 10) / 10)}`] : []),
    ...(s.awards ? [t.plural('shelves.hits_awards', s.awards)] : []),
  ].join(' · ')
}

/** For a page: `ofSongs` (an album's, an artist's) and `ofSong`. Re-renders as answers arrive. */
export function useWorldFacts() {
  const t = useT()
  const records = useHitsStore((h) => h.records)
  return useMemo(
    () => ({
      ofSongs: (tracks: readonly Track[]) => words(t, worldStats(tracks, records), false),
      ofSong: (track: Track, short = true) => words(t, worldStats([track], records), short),
    }),
    [records, t],
  )
}

/**
 * For ONE song — a row, a sheet. Re-renders only when this song's own answer
 * changes, not every time the pass publishes a batch (a list can be thousands
 * of rows).
 */
export function useSongFacts(track: Track, short = true): string {
  const t = useT()
  const record = useHitsStore((h) => h.records.get(track.id))
  return useMemo(() => (record ? words(t, worldStats([track], new Map([[track.id, record]])), short) : ''), [t, record, track, short])
}

/** An album's, an artist's or a song's line of world facts, credited on hover; nothing when none are known. */
export function WorldLine({ facts, className }: { facts: string; className?: string }) {
  const t = useT()
  if (!facts) return null
  return (
    <p className={className} title={t('shelves.hits_credit')}>
      {facts}
    </p>
  )
}
