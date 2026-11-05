// MixScreen.tsx — the Mix tab: two turntables and a crossfader (James,
// 2026-11-05, after Apple's 4.3 review: "a navigation tab for mixing — you
// have two records you choose, they play over each other and you can spin the
// discs to change their position and control speed").
//
// Each deck:
//   - tap the empty platter (or the song's name) to choose a record;
//   - put a finger on the record and it stops under it; turn it and the music
//     goes with your hand, backwards too — a scratch, or finding your spot;
//   - turn the EDGE while it plays and it runs faster or slower for as long as
//     you turn (a DJ's jog wheel), to line the beats up by hand;
//   - the speed slider sets its speed (±25%); tap the readout for normal.
// The crossfader between them decides how much of each you hear, and Record
// under it takes down what you hear as a new song on the "Mixes" album
// (`lib/mixRecorder.ts`; the iPhone only for now).
//
// The sound is `lib/mixer.ts`; the drawing reads the decks' positions from it
// every frame and writes the angle straight onto the record (no re-render).

import { useEffect, useMemo, useRef, useState } from 'react'
import Cover from '../components/Cover'
import { clock, shownName } from '../lib/format'
import { haptic } from '../lib/haptics'
import {
  MAX_MIX_SEC,
  bendDeck,
  clearDeck,
  deckSec,
  holdDeck,
  loadDeck,
  mixSupported,
  recordingSec,
  releaseDeck,
  setDeckPlaying,
  setDeckSpeed,
  setFader,
  startRecording,
  stopAllDecks,
  stopRecording,
  turnDeck,
  useMixStore,
  type DeckId,
} from '../lib/mixer'
import { SPEED_RANGE, angleDelta, bendFromTurn, discAngleDeg, onRim, pointerAngle, speedPercent, turnToSec } from '../lib/mixMath'
import { MAX_RECORD_SEC, recordingSupported } from '../lib/mixRecorder'
import { matchTracks } from '../lib/search'
import type { Track } from '../lib/types'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useT } from '../i18n'
import { IconClose, IconPause, IconPlay } from './icons'

const DECK_NAMES = ['A', 'B'] as const

export function MixScreen() {
  const t = useT()
  const [picking, setPicking] = useState<DeckId | null>(null)
  const fader = useMixStore((s) => s.fader)

  // The main player and the decks are never heard over each other by
  // accident: the player starting stops the decks (a deck starting pauses the
  // player — `play` below). Leaving the tab, or the app, stops them too:
  // mixing is done with a finger on the record.
  useEffect(() => {
    const off = usePlayerStore.subscribe((now, before) => {
      if (now.playing && !before.playing) stopAllDecks()
    })
    // A recording under way is saved, not lost, when the app is put away.
    const away = () => {
      if (document.visibilityState !== 'hidden') return
      stopAllDecks()
      void stopRecording()
    }
    document.addEventListener('visibilitychange', away)
    return () => {
      off()
      document.removeEventListener('visibilitychange', away)
      stopAllDecks()
      void stopRecording()
    }
  }, [])

  if (!mixSupported()) {
    return (
      <div className="jx-page">
        <h1 className="jx-h1">{t('native.mix_heading')}</h1>
        <p className="jx-mix-hint">{t('native.mix_unsupported')}</p>
      </div>
    )
  }

  return (
    <div className="jx-page jx-mix">
      <h1 className="jx-h1">{t('native.mix_heading')}</h1>
      <p className="jx-mix-hint">{t('native.mix_hint')}</p>
      <div className="jx-mix-decks">
        <Deck id={0} onPick={() => setPicking(0)} />
        <Deck id={1} onPick={() => setPicking(1)} />
      </div>
      <div className="jx-mix-fader">
        <span aria-hidden>A</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={fader}
          onChange={(e) => {
            const x = Number(e.target.value)
            // A little catch in the middle, where both play equally.
            setFader(Math.abs(x) < 0.04 ? 0 : x)
          }}
          onDoubleClick={() => setFader(0)}
          aria-label={t('native.mix_crossfader')}
        />
        <span aria-hidden>B</span>
      </div>
      {recordingSupported() && <RecordButton />}
      {picking !== null && <MixPicker deck={picking} onClose={() => setPicking(null)} />}
    </div>
  )
}

function play(id: DeckId, on: boolean) {
  if (on) {
    const player = usePlayerStore.getState()
    if (player.playing) player.toggle()
  }
  setDeckPlaying(id, on)
}

/** How long after the last turn of the edge the speed goes back to the slider's. */
const BEND_IDLE_MS = 90

function Deck({ id, onPick }: { id: DeckId; onPick(): void }) {
  const t = useT()
  const deck = useMixStore((s) => s.decks[id])
  const albums = useLibraryStore((s) => s.albums)
  const album = useMemo(() => (deck.track ? albums.find((a) => a.id === deck.track!.albumId) : undefined), [albums, deck.track])
  const discRef = useRef<HTMLDivElement>(null)
  const vinylRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const grip = useRef<{ pointer: number; mode: 'hold' | 'nudge'; angle: number; at: number; idle: number } | null>(null)
  const ready = deck.status === 'ready'

  // Every frame: the record's angle from where the music is, the time, the ring.
  useEffect(() => {
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const sec = deckSec(id)
      if (vinylRef.current) vinylRef.current.style.transform = `rotate(${discAngleDeg(sec).toFixed(2)}deg)`
      const { duration } = useMixStore.getState().decks[id]
      if (timeRef.current) timeRef.current.textContent = duration > 0 ? `${clock(sec)} / ${clock(duration)}` : ''
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(duration > 0 ? 1 - Math.min(1, sec / duration) : 1)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [id])

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready || grip.current) return
    const box = discRef.current!.getBoundingClientRect()
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const r = Math.hypot(e.clientX - cx, e.clientY - cy)
    if (r > box.width / 2 + 8) return
    e.currentTarget.setPointerCapture(e.pointerId)
    // The edge of a playing record nudges it; anywhere else (or a still
    // record) holds it under the finger.
    const mode = deck.playing && onRim(r, box.width / 2) ? 'nudge' : 'hold'
    grip.current = { pointer: e.pointerId, mode, angle: pointerAngle(cx, cy, e.clientX, e.clientY), at: performance.now(), idle: 0 }
    if (mode === 'hold') holdDeck(id)
    haptic('tick')
  }
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grip.current
    if (!g || g.pointer !== e.pointerId) return
    const box = discRef.current!.getBoundingClientRect()
    const a = pointerAngle(box.left + box.width / 2, box.top + box.height / 2, e.clientX, e.clientY)
    const d = angleDelta(g.angle, a)
    const now = performance.now()
    if (g.mode === 'hold') {
      turnDeck(id, turnToSec(d))
    } else {
      bendDeck(id, bendFromTurn(d, Math.max(8, now - g.at)))
      window.clearTimeout(g.idle)
      g.idle = window.setTimeout(() => bendDeck(id, 0), BEND_IDLE_MS)
    }
    g.angle = a
    g.at = now
  }
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = grip.current
    if (!g || g.pointer !== e.pointerId) return
    grip.current = null
    window.clearTimeout(g.idle)
    if (g.mode === 'hold') releaseDeck(id)
    else bendDeck(id, 0)
  }

  const name = DECK_NAMES[id]
  const errorText =
    deck.error === 'too_long' ? t('native.mix_too_long', { minutes: MAX_MIX_SEC / 60 })
      : deck.error === 'unsupported' ? t('native.mix_unsupported')
        : deck.error ? t('native.mix_unplayable') : null

  return (
    <section className={`jx-mix-deck${deck.playing ? ' on' : ''}`} aria-label={t('native.mix_deck', { deck: name })}>
      {deck.track ? (
        <div
          ref={discRef}
          className={`jx-mix-disc${ready ? '' : ' wait'}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label={t('native.mix_record_aria', { title: deck.track.title })}
        >
          <svg className="jx-mix-ring" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="48.5" pathLength={1} ref={ringRef} />
          </svg>
          <div ref={vinylRef} className="jx-mix-vinyl">
            <div className="jx-mix-label">
              <Cover album={album} className="jx-mix-cover" rounded={false} />
            </div>
            <i className="jx-mix-mark" aria-hidden />
          </div>
          <i className="jx-mix-spindle" aria-hidden />
          {deck.status === 'loading' && <span className="jx-mix-status">{t('native.mix_loading')}</span>}
          {errorText && <span className="jx-mix-status err">{errorText}</span>}
        </div>
      ) : (
        <button type="button" className="jx-mix-disc empty" onClick={onPick}>
          <span>
            <b>{name}</b>
            {t('native.mix_choose')}
          </span>
        </button>
      )}

      <div className="jx-mix-meta">
        <button type="button" className="jx-mix-title" onClick={onPick} disabled={!deck.track}>
          <b>{deck.track ? deck.track.title : t('native.mix_deck', { deck: name })}</b>
          <small>{deck.track ? shownName(deck.track.artist ?? deck.track.albumArtist) || ' ' : t('native.mix_empty')}</small>
        </button>
        {deck.track && (
          <button type="button" className="jx-mix-x" onClick={() => clearDeck(id)} aria-label={t('native.mix_clear', { deck: name })}>
            <IconClose />
          </button>
        )}
      </div>

      <div className="jx-mix-row">
        <button
          type="button"
          className="jx-mix-play"
          disabled={!ready}
          onClick={() => play(id, !deck.playing)}
          aria-label={deck.playing ? t('native.mix_pause', { deck: name }) : t('native.mix_play', { deck: name })}
        >
          {deck.playing ? <IconPause /> : <IconPlay />}
        </button>
        <span ref={timeRef} className="jx-mix-time" />
      </div>

      <label className="jx-mix-speed">
        <input
          type="range"
          min={1 - SPEED_RANGE}
          max={1 + SPEED_RANGE}
          step={0.001}
          value={deck.speed}
          onChange={(e) => setDeckSpeed(id, Number(e.target.value))}
          aria-label={t('native.mix_speed', { deck: name })}
        />
        <button
          type="button"
          className={deck.speed === 1 ? '' : 'off'}
          onClick={() => setDeckSpeed(id, 1)}
          title={t('native.mix_speed_reset')}
        >
          {speedPercent(deck.speed)}
        </button>
      </label>
    </section>
  )
}

/** Record: takes down the mix as you hear it, then saves it as a new song. */
function RecordButton() {
  const t = useT()
  const phase = useMixStore((s) => s.record)
  const note = useMixStore((s) => s.recordNote)
  const clockRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (phase !== 'recording') return
    const tick = () => { if (clockRef.current) clockRef.current.textContent = clock(recordingSec()) }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [phase])

  const press = () => {
    haptic('tap')
    if (phase === 'idle') void startRecording()
    else if (phase === 'recording') void stopRecording()
  }

  const said =
    phase === 'recording' ? t('native.mix_rec_hint', { minutes: MAX_RECORD_SEC / 60 })
      : note?.kind === 'saved' ? t('native.mix_rec_saved', { title: note.title })
        : note?.kind === 'short' ? t('native.mix_rec_short')
          : note?.kind === 'failed' ? t('native.mix_rec_failed')
            : t('native.mix_rec_hint', { minutes: MAX_RECORD_SEC / 60 })

  return (
    <div className={`jx-mix-rec ${phase}`}>
      <button type="button" onClick={press} disabled={phase === 'saving'} aria-pressed={phase === 'recording'}>
        <i aria-hidden />
        <span>
          {phase === 'recording' ? t('native.mix_rec_stop') : phase === 'saving' ? t('native.mix_rec_saving') : t('native.mix_rec_start')}
        </span>
        {phase === 'recording' && <span ref={clockRef} className="jx-mix-rec-clock" />}
      </button>
      <p className={`jx-mix-hint${note?.kind === 'failed' && phase === 'idle' ? ' err' : ''}`} aria-live="polite">{said}</p>
    </div>
  )
}

/** How many songs the picker draws at once; typing narrows it. */
const PICKER_ROWS = 200

/** Choosing a record for a deck: a page of its own over the tab, with search. */
function MixPicker({ deck, onClose }: { deck: DeckId; onClose(): void }) {
  const t = useT()
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const albumOf = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums])
  const [query, setQuery] = useState('')
  const found = useMemo(() => matchTracks(tracks, query), [tracks, query])
  const shown = found.slice(0, PICKER_ROWS)

  useEffect(() => {
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = prev }
  }, [])

  const choose = (track: Track) => {
    haptic('tap')
    void loadDeck(deck, track)
    onClose()
  }

  return (
    <div className="jx-mix-picker" role="dialog" aria-modal="true" aria-label={t('native.mix_pick_title', { deck: DECK_NAMES[deck] })}>
      <div className="jx-mix-picker-top">
        <b>{t('native.mix_pick_title', { deck: DECK_NAMES[deck] })}</b>
        <button type="button" className="jx-mix-x" onClick={onClose} aria-label={t('common.close')}>
          <IconClose />
        </button>
      </div>
      <input
        className="jx-mix-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('native.mix_search')}
        aria-label={t('native.mix_search')}
      />
      <ul className="jx-list jx-mix-songs">
        {shown.map((track) => (
          <li key={track.id}>
            <button type="button" className="jx-row" onClick={() => choose(track)}>
              <Cover album={albumOf.get(track.albumId)} className="jx-thumb" />
              <span>
                <b>{track.title}</b>
                <small>{[shownName(track.artist ?? track.albumArtist), track.durationSec ? clock(track.durationSec) : null].filter(Boolean).join(' · ')}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {found.length > PICKER_ROWS && <p className="jx-mix-hint">{t('native.mix_more', { count: found.length - PICKER_ROWS })}</p>}
      {found.length === 0 && <p className="jx-mix-hint">{t('native.mix_none')}</p>}
    </div>
  )
}
