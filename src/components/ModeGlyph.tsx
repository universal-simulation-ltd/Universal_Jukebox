import { ShuffleGlyph } from './AlbumView'
import { InfoGlyph } from './AboutTrack'
import { ShelfGlyph } from './AddToShelf'
import { BedsideGlyph } from './Bedside'
import { AwakeGlyph } from './KeepAwakeButton'
import { LoudGlyph, QuietGlyph } from './LevelButton'
import { OutputGlyph } from './OutputButton'
import { RepeatGlyph, RepeatOneGlyph } from './PlayModes'
import { MoonGlyph } from './SleepButton'
import { HeartGlyph } from './LoveButton'
import { DeckMiniature } from './Deck'
import { useSettingsStore } from '../stores/settingsStore'
import type { ModeKey } from '../stores/settingsStore'

/**
 * The icon a button in the row under the song wears — the SAME drawing the
 * button itself uses, imported from it, so Settings ▸ Buttons under the song
 * shows each one as it looks on the player (James, 2026-09-29: "show the button
 * icon as well as its name to match how it looks on the player").
 */
export default function ModeGlyph({ mode }: { mode: ModeKey }) {
  switch (mode) {
    case 'shuffle':
      return <ShuffleGlyph />
    case 'repeatAll':
      return <RepeatGlyph />
    case 'repeatOne':
      return <RepeatOneGlyph />
    case 'love':
      return <HeartGlyph />
    case 'shelf':
      return <ShelfGlyph />
    case 'about':
      return <InfoGlyph />
    case 'output':
      return <OutputGlyph away={false} />
    case 'quiet':
      return <QuietGlyph />
    case 'loud':
      return <LoudGlyph />
    case 'keepAwake':
      return <AwakeGlyph />
    case 'sleep':
      return <MoonGlyph />
    case 'bedside':
      return <BedsideGlyph />
    case 'player':
      return <PlayerGlyph />
  }
}

/** The machine on now, as the Player button shows it. */
function PlayerGlyph() {
  const deck = useSettingsStore((s) => s.deck)
  return <DeckMiniature setting={deck} box={20} />
}
