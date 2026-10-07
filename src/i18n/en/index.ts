import common from './common.ts'
import app from './app.ts'
import settings from './settings.ts'
import library from './library.ts'
import player from './player.ts'
import lyrics from './lyrics.ts'

export const en = { common, app, settings, library, player, lyrics }

/** The shape every language must match exactly. */
export type Messages = {
  [N in keyof typeof en]: { [K in keyof (typeof en)[N]]: string }
}
