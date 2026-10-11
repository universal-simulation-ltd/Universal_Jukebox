// Shared collators for the library's sort orders.
//
// `a.localeCompare(b, undefined, options)` builds a collator for every call;
// sorting 5,000 tracks is ~60,000 comparisons, so that set-up dominated the
// sort. One `Intl.Collator` per option set, made once, gives the identical
// order (same locale, same options) at a fraction of the cost.

const base = new Intl.Collator(undefined, { sensitivity: 'base' })
const baseNumeric = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const numeric = new Intl.Collator(undefined, { numeric: true })

/** Case- and accent-insensitive: "abba" sorts with "ABBA". */
export const compareBase = base.compare
/** As `compareBase`, with digits compared as numbers: "Track 2" before "Track 10". */
export const compareBaseNumeric = baseNumeric.compare
/** Digits as numbers, case and accents significant — file paths. */
export const compareNumeric = numeric.compare

// Apple's rule for names (James, 2026-10-12: "organise like Apple so that The
// Beatles is organised under b"): a leading "The", "A" or "An" is skipped when
// sorting, so The Beatles files under B and A Tribe Called Quest under T. The
// name shown is untouched. A name that is ONLY the article ("The", the band
// "A") keeps it, and the full name breaks a tie, so "The Band" and "Band"
// still sit in a fixed order.
const ARTICLE = /^(?:the|a|an)\s+(?=\S)/i

/** The name as it sorts: without a leading English article. */
export function sortName(name: string): string {
  return name.replace(ARTICLE, '')
}
/** As `compareBase`, ignoring a leading "The", "A" or "An" — artists, albums, songs. */
export function compareName(a: string, b: string): number {
  return base.compare(sortName(a), sortName(b)) || base.compare(a, b)
}
/** As `compareName`, with digits compared as numbers. */
export function compareNameNumeric(a: string, b: string): number {
  return baseNumeric.compare(sortName(a), sortName(b)) || baseNumeric.compare(a, b)
}
