// The three ways the library can be laid out, and nothing else.
//
// ⚠️ A LEAF ON PURPOSE — THIS FILE IMPORTS NOTHING AND MUST NOT START.
// `settingsStore` stores the choice and so has to name the valid values;
// `libraryView` (which is where the rest of the ordering lives) already imports
// `settingsStore` for the column cycle. Putting these two lines in
// `libraryView` therefore made a cycle, and an ESM cycle does not fail loudly:
// `ORDER_KINDS` was simply `undefined` at the moment the store read its
// settings, and every test that touched the store died on `.includes` of
// undefined. One leaf breaks it for good.

/** The three the one pill cycles through, in the order it cycles them. */
export const ORDER_KINDS = ['az', 'random', 'genre'] as const

export type OrderKind = (typeof ORDER_KINDS)[number]
