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
