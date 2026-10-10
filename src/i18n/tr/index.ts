// Turkish (tr). One file per namespace, the same split as ../en.
import type { Draft } from '../en/index.ts'
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

export const tr: Draft = { common, app, native, landing, library, player, decks, settings, lyrics, about, shelves, tidy }
