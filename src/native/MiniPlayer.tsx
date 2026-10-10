// MiniPlayer.tsx — what's playing, docked above the tab bar. Tap it for the
// record full screen; play/pause and next without leaving the library.

import Cover from '../components/Cover'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { IconNext, IconPause, IconPlay } from './icons'

export function MiniPlayer() {
  const track = usePlayerStore(currentTrack)
  const playing = usePlayerStore((s) => s.playing)
  const loading = usePlayerStore((s) => s.loading)
  const currentSec = usePlayerStore((s) => s.currentSec)
  const durationSec = usePlayerStore((s) => s.durationSec)
  const toggle = usePlayerStore((s) => s.toggle)
  const next = usePlayerStore((s) => s.next)
  const album = useLibraryStore((s) => (track ? s.albums.find((a) => a.id === track.albumId) : undefined))

  if (!track) return null
  const progress = durationSec > 0 ? Math.min(1, currentSec / durationSec) : 0

  return (
    <div className="jx-mini">
      <div className="jx-mini-line" style={{ transform: `scaleX(${progress})` }} aria-hidden />
      <button type="button" className="jx-mini-open" onClick={() => navigate({ view: 'playing' })} aria-label={`Now playing: ${track.title}. Open the record`}>
        <Cover album={album} className="jx-mini-cover" />
        <span>
          <b>{track.title}</b>
          <small>{track.artist ?? track.albumArtist ?? album?.artist}</small>
        </span>
      </button>
      <button type="button" className="jx-mini-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} aria-busy={loading || undefined}>
        {playing ? <IconPause /> : <IconPlay />}
      </button>
      <button type="button" className="jx-mini-btn" onClick={next} aria-label="Next song">
        <IconNext />
      </button>
    </div>
  )
}
