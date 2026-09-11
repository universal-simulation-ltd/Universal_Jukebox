import { pluginRegistered } from './nativePlugins'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'

// The iPhone's Home Screen shortcuts — long-press the icon for Shuffle songs,
// Shuffle albums or Shuffle artists (James, 2026-09-11). The items and the tap
// are native (`ios/App/App/ShortcutsPlugin.swift`); the playing is here.
//
// ⚠️ The library may still be loading when the tap arrives — a shortcut is
// usually a cold launch — so the action waits for it to be ready.

const NAME = 'JukeboxShortcuts'

export function installShortcuts(): void {
  if (!pluginRegistered(NAME)) return
  void (async () => {
    const { registerPlugin } = await import('@capacitor/core')
    const plugin = registerPlugin<{
      addListener(event: 'shortcut', fn: (data: { action?: string }) => void): Promise<unknown>
    }>(NAME)
    await plugin.addListener('shortcut', (data) => {
      const action = data.action
      if (action) whenLibraryReady(() => runShortcut(action))
    })
  })()
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
}
