import { DECKS } from '../lib/decks'
import { DECK_SETTINGS, useSettingsStore } from '../stores/settingsStore'
import { DeckMiniature } from './Deck'
import { ModeButton } from './ModeButton'

// The machine on Now Playing, one tap at a time (James, 2026-10-03: "Add a
// button to cycle through the players"): vinyl, CD, cassette, reel-to-reel,
// jukebox, pocket player, automatic, and round again.
//
// The picture and the word are the machine ON NOW, not the next one — the row's
// other buttons all say what is, and a tap is how you find out what comes after.
// The long press on the deck itself (`DeckPicker`) is still the way to jump
// straight to one.

export default function PlayerButton() {
  const deck = useSettingsStore((s) => s.deck)
  const set = useSettingsStore((s) => s.set)
  const next = DECK_SETTINGS[(DECK_SETTINGS.indexOf(deck) + 1) % DECK_SETTINGS.length]
  return (
    <ModeButton
      label={DECKS[deck].label}
      ariaLabel={`Player: ${DECKS[deck].label}. Tap for ${DECKS[next].label}`}
      onClick={() => set('deck', next)}
    >
      <DeckMiniature setting={deck} box={26} />
    </ModeButton>
  )
}
