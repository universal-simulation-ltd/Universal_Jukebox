// MiniPlayer.tsx — what's playing, docked above the tab bar. Tap it for the
// record full screen; play/pause and next without leaving the library. The
// website's player bar gestures too: swipe left for the next song, right for
// the one before, up for the record.

import { useRef } from 'react'
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
  const previous = usePlayerStore((s) => s.previous)
  const touch = useRef<{ x: number; y: number; swiped: boolean } | null>(null)
  const album = useLibraryStore((s) => (track ? s.albums.find((a) => a.id === track.albumId) : undefined))

  if (!track) return null
  const progress = durationSec > 0 ? Math.min(1, currentSec / durationSec) : 0

  return (
    <div className="jx-mini">
      <div className="jx-mini-line" style={{ transform: `scaleX(${progress})` }} aria-hidden />
      <button
        type="button"
        className="jx-mini-open"
        onClick={() => {
          // The tap a swipe ends with is not also a tap.
          if (touch.current?.swiped) return void (touch.current = null)
          navigate({ view: 'playing' })
        }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          touch.current = { x: t.clientX, y: t.clientY, swiped: false }
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          const t = e.changedTouches[0]
          if (!start || !t) return
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            start.swiped = true
            if (dx < 0) next()
            else previous()
          } else if (dy < -40 && Math.abs(dy) > Math.abs(dx)) {
            start.swiped = true
            navigate({ view: 'playing' })
          }
        }}
        aria-label={`Now playing: ${track.title}. Open the record`}
      >
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
