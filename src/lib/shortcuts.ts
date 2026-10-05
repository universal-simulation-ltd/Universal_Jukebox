import { pluginRegistered } from './nativePlugins'
import { planVoice, type VoiceFocus, type VoiceRequest } from './voiceSearch'
import { sortAlbumTracks, useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

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

/** `search` carries what the Android assistant asked for (`MEDIA_PLAY_FROM_SEARCH`). */
interface ShortcutEvent extends VoiceRequest {
  action?: string
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
  const player = usePlayerStore.getState()
  if (action === 'shuffle-songs') player.shuffleSongs()
  else if (action === 'shuffle-albums') player.shuffleAlbums()
  else if (action === 'shuffle-artists') player.shuffleArtists()
  else if (action === 'play') playMusic()
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

const FOCUSES: readonly VoiceFocus[] = ['artist', 'album', 'song', 'genre', 'any']

/** "Hey Google, play Radiohead on Jukebox" — see `voiceSearch.ts`. */
export function playFromSearch(request: VoiceRequest): void {
  const focus = FOCUSES.includes(request.focus as VoiceFocus) ? request.focus : undefined
  const plan = planVoice({ ...request, focus }, useLibraryStore.getState().tracks, sortAlbumTracks)
  const player = usePlayerStore.getState()
  switch (plan.kind) {
    case 'play':
      playMusic()
      return
    case 'shuffle':
      runShortcut(`shuffle-${plan.what}`)
      return
    case 'mix':
      player.shuffleSongs(plan.tracks)
      return
    case 'inOrder':
      // An album is asked for in its own order, whatever shuffle was left at.
      if (player.shuffle) player.toggleShuffle()
      player.playTracks(plan.tracks, plan.at)
      return
    case 'none':
      // Shown only with Settings › "Show error messages" ticked, like every error.
      usePlayerStore.setState({ error: `Nothing called “${plan.asked}” in your library.` })
  }
}
