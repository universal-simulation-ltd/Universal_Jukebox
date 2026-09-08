// Small formatting helpers, kept pure so they can be reasoned about (and tested)
// without a browser.

/**
 * Seconds → "3:07", or "1:02:44" once an hour is involved.
 *
 * ⚠️ Returns an em dash, not "0:00", for an unknown duration. Durations are not
 * in the tags — a track that has never been played has none (see
 * `Track.durationSec`) — and printing "0:00" for "we don't know yet" is a
 * number that looks measured. A dash is honest and reads as pending.
 */
export function clock(seconds: number | undefined | null): string {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—'
  const whole = Math.floor(seconds)
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

/**
 * A total for a list of tracks — "48 min", "1 hr 12 min".
 *
 * Says how many are still unknown rather than quietly counting them as zero: an
 * album showing "31 min" when four of its tracks have never been played is a
 * wrong number presented as a right one.
 */
export function totalTime(tracks: { durationSec?: number }[]): string {
  const known = tracks.filter((t) => typeof t.durationSec === 'number' && Number.isFinite(t.durationSec))
  if (known.length === 0) return ''
  const seconds = known.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
  const minutes = Math.round(seconds / 60)
  const text = minutes >= 60
    ? `${Math.floor(minutes / 60)} hr${minutes % 60 > 0 ? ` ${minutes % 60} min` : ''}`
    : `${minutes} min`
  const missing = tracks.length - known.length
  return missing > 0 ? `${text}+` : text
}

/** "12 tracks", "1 track". */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}

/**
 * Fold a string for searching: lower case, accents stripped, punctuation
 * flattened to spaces.
 *
 * Accents ARE folded here even though `albumKey` deliberately does not fold
 * them. The two are doing opposite jobs: a key must never merge two records
 * that are genuinely different, while a search box must find "Bjork" when the
 * tag says "Björk". Being wrong costs a duplicate album in one case and a
 * missed result in the other, and only one of those is recoverable.
 */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    // Escaped rather than written as literal combining marks: the class is
    // invisible in an editor and does not survive every copy-paste intact.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
