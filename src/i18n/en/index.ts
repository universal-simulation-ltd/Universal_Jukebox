// English (en-GB): the source, and the shape every other language follows. One
// file per namespace; a key is `<namespace>.<key>` everywhere else.
import common from './common.ts'
import app from './app.ts'
import native from './native.ts'
import landing from './landing.ts'
import library from './library.ts'
import player from './player.ts'
import decks from './decks.ts'
import settings from './settings.ts'
import lyrics from './lyrics.ts'
import about from './about.ts'
import shelves from './shelves.ts'
import tidy from './tidy.ts'

export const en = { common, app, native, landing, library, player, decks, settings, lyrics, about, shelves, tidy }

/** The shape every language must match exactly, once it is finished. */
export type Messages = {
  [N in keyof typeof en]: { [K in keyof (typeof en)[N]]: string }
}

/**
 * A language being translated: every namespace, any subset of its keys. A key
 * left out shows in English (runtime.ts falls back key by key), so the app
 * builds and runs while a translation is part done. A misspelt or stale key is
 * still a `tsc` error — an object literal typed as this rejects keys English
 * does not have. Completeness is checked by `npm run i18n:check` (see
 * i18n.test.ts), which is the gate before a release.
 */
export type Draft = {
  [N in keyof Messages]: Partial<Messages[N]>
}
