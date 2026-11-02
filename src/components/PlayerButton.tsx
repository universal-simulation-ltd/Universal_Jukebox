import { DECKS } from '../lib/decks'
import { deckSettings, useSettingsStore } from '../stores/settingsStore'
import { DeckMiniature } from './Deck'
import { ModeButton } from './ModeButton'
import { useT } from '../i18n'

// The machine on Now Playing, one tap at a time (James, 2026-10-03: "Add a
// button to cycle through the players"): vinyl, CD, cassette, reel-to-reel,
// jukebox, pocket player, automatic, and round again.
//
// The picture and the word are the machine ON NOW, not the next one — the row's
// other buttons all say what is, and a tap is how you find out what comes after.
// The long press on the deck itself (`DeckPicker`) is the way to jump straight
// to one. (A hold on this button used to open that picker too; since
// 2026-11-02 a hold on any button in the row edits the row — `PlayModes`.)

export default function PlayerButton() {
  const deck = useSettingsStore((s) => s.deck)
  const set = useSettingsStore((s) => s.set)
  const t = useT()
  const decks = deckSettings()
  const next = decks[(decks.indexOf(deck) + 1) % decks.length]
  return (
    <ModeButton
      label={DECKS[deck].label}
      ariaLabel={t('player.player_aria', { deck: DECKS[deck].label, next: DECKS[next].label })}
      mode="player"
      onClick={() => set('deck', next)}
    >
      <DeckMiniature setting={deck} box={26} />
    </ModeButton>
  )
}
