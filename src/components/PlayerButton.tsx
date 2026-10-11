import { useState } from 'react'
import { DECKS } from '../lib/decks'
import { DECK_SETTINGS, useSettingsStore } from '../stores/settingsStore'
import { DeckMiniature } from './Deck'
import DeckPicker from './DeckPicker'
import { ModeButton } from './ModeButton'
import { useT } from '../i18n'

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
  const t = useT()
  const next = DECK_SETTINGS[(DECK_SETTINGS.indexOf(deck) + 1) % DECK_SETTINGS.length]
  // Tap: the next machine. Hold: every machine to choose from (James,
  // 2026-10-11) — the same picker as holding the deck itself.
  const [picking, setPicking] = useState(false)
  return (
    <>
      <ModeButton
        label={DECKS[deck].label}
        ariaLabel={t('player.player_aria', { deck: DECKS[deck].label, next: DECKS[next].label })}
        mode="player"
        onClick={() => set('deck', next)}
        onLongPress={() => setPicking(true)}
      >
        <DeckMiniature setting={deck} box={26} />
      </ModeButton>
      {picking && <DeckPicker onClose={() => setPicking(false)} />}
    </>
  )
}
