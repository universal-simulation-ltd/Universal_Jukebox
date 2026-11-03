import { pluginRegistered } from './nativePlugins'
import type { VoiceRequest } from './voiceSearch'
import { decideSearch, decideShortcut, type Decision } from './voicePlan'
import { newSeed } from './shuffleQueue'
import type { Track } from './types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { getT } from '../i18n/runtime.ts'

// The Home Screen shortcuts — long-press the icon for Shuffle songs, Shuffle
// albums or Shuffle artists (James, 2026-09-11) — and the voice assistants:
// Siri's App Shortcuts, and on Android "Hey Google, play … on Jukebox". The
// native halves are `ios/App/App/ShortcutsPlugin.swift` + `SiriIntents.swift`
// and `android/…/ShortcutsPlugin.java`; the playing is here.
//
// ⚠️ The library may still be loading when the tap arrives — a shortcut is
// usually a cold launch — so the action waits for it to be ready.

const NAME = 'JukeboxShortcuts'

export function installShortcuts(): void {
  if (!pluginRegistered(NAME)) return
  void (async () => {
    const { registerPlugin } = await import('@capacitor/core')
    const plugin = registerPlugin<{
      addListener(event: 'shortcut', fn: (data: ShortcutEvent) => void): Promise<unknown>
    }>(NAME)
    await plugin.addListener('shortcut', (data) => {
      const action = data.action
      if (action === 'search') whenLibraryReady(() => playFromSearch(data))
      else if (action) whenLibraryReady(() => runShortcut(action))
    })
  })()
}

/**
 * `search` carries what the voice assistant asked for: Android's
 * `MEDIA_PLAY_FROM_SEARCH`, or Siri's `INPlayMediaIntent` (`SiriIntents.swift`'s
 * `SiriMedia`), which adds `shuffle` for "shuffle Mika on Jukebox".
 */
interface ShortcutEvent extends VoiceRequest {
  action?: string
  shuffle?: boolean
}

function whenLibraryReady(run: () => void): void {
  if (useLibraryStore.getState().status === 'ready') {
    run()
    return
  }
  const stop = useLibraryStore.subscribe((state) => {
    if (state.status === 'ready') {
      stop()
      run()
    } else if (state.status === 'empty') {
      stop()
    }
  })
}

export function runShortcut(action: string): void {
  carryOut(decideShortcut(action, useLibraryStore.getState(), newSeed()))
}

/**
 * A decision from `voicePlan.ts` — the same one a locked iPhone's Siri makes
 * without the page (`src/siri/planner.ts`) — through the player store.
 */
function carryOut(decision: Decision): void {
  const player = usePlayerStore.getState()
  switch (decision.kind) {
    case 'carryOn':
      playMusic()
      return
    case 'queue':
      if (decision.tracks.length === 0) return
      // `startShuffle`'s order: the mode first, so `playTracks` shuffles (or
      // doesn't) the queue it is given.
      if (player.shuffle !== decision.shuffle) player.toggleShuffle()
      player.playTracks(decision.tracks as Track[], decision.at)
      return
    case 'none':
      // Shown only with Settings › "Show error messages" ticked, like every error.
      usePlayerStore.setState({ error: getT()('app.voice_not_found', { asked: decision.asked }) })
  }
}

/**
 * "Hey Siri, play music in Jukebox" (`ios/App/App/SiriIntents.swift`). Carries
 * on with what is loaded, then with the session saved from last time, and
 * shuffles songs only when there is nothing to carry on with.
 */
function playMusic(): void {
  const player = usePlayerStore.getState()
  // Already playing, or the first-play ceremony is about to — a toggle would
  // pause it or skip the ceremony.
  if (player.playing || player.ceremony) return
  if (player.cursor >= 0) {
    player.toggle()
    return
  }
  player.resume()
  // `resume` loads the saved queue synchronously, or does nothing if there is none.
  if (usePlayerStore.getState().cursor < 0) player.shuffleSongs()
}

/** "Hey Google, play Radiohead on Jukebox" — see `voiceSearch.ts` and `voicePlan.ts`. */
export function playFromSearch(request: VoiceRequest & { shuffle?: boolean }): void {
  carryOut(decideSearch(request, useLibraryStore.getState(), newSeed()))
}
