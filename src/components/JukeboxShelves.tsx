import { useEffect, useMemo, useState } from 'react'
import Record45 from './Record45'
import Requests from './Requests'
import { ShelfRow } from './Shelf'
import { ShuffleGlyph } from './AlbumView'
import { useT } from '../i18n'
import { grooveRings } from '../lib/grooves'
import { matchTracks } from '../lib/search'
import { NAME_MAX, NEW_SHELF, shelfName, shelvesToShow } from '../lib/shelves'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { starterShelfId, useShelvesStore } from '../stores/shelvesStore'
import { mostPlayed, usePlayCounts } from '../lib/playCounts'
import { useSettingsStore } from '../stores/settingsStore'
import { markTipSeen } from '../lib/tips'
import type { Album, Track } from '../lib/types'
import { compareBaseNumeric } from '../lib/collate'
import { useDialogFocus } from '../lib/useDialogFocus'

// The Jukebox tab: shelves you fill yourself, each one a playlist of songs
// standing as 45s (James, 2026-09-11: "a jukebox tab that has a jukebox view
// and an empty shelf with a (+) button for people to add a record — essentially
// a styled playlist — when they add to one shelf then add an additional empty
// shelf below it"). The rules for shelves are `lib/shelves.ts`.

/** The + tile at the end of every shelf. */
const PLUS = { plus: true } as const
type Slot = Track | typeof PLUS
const isPlus = (slot: Slot): slot is typeof PLUS => slot === PLUS

/** More than a phone's worth of songs in the picker before searching narrows it. */
const PICKER_CAP = 300

export default function JukeboxShelves() {
  const t = useT()
  const shelves = useShelvesStore((s) => s.shelves)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const byId = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks])
  const albumOf = useMemo(() => {
    const map = new Map(albums.map((a) => [a.id, a]))
    return (track: Track) => map.get(track.albumId)
  }, [albums])
  // The shelf's place, not its name: an unnamed shelf's "Shelf N" is written
  // at display time, so the picker's heading follows a language switch.
  const [picking, setPicking] = useState<{ shelfId: string; index: number } | null>(null)
  const showMostPlayed = useSettingsStore((s) => s.mostPlayedShelf)
  const setSetting = useSettingsStore((s) => s.set)
  const [removed, setRemoved] = useState(false)
  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(() => setRemoved(false), 5000)
    return () => window.clearTimeout(timer)
  }, [removed])
  const starterId = starterShelfId()

  return (
    <div className="space-y-12">
      {showMostPlayed ? (
        <MostPlayedShelf byId={byId} albumOf={albumOf} onRemove={() => { setSetting('mostPlayedShelf', false); setRemoved(true) }} />
      ) : removed ? (
        <p role="status" className="text-center text-[13px] text-slate-500 dark:text-slate-400">{t('shelves.most_played_removed')}</p>
      ) : null}
      {shelves.length === 0 && (
        <p className="text-center text-[13px] text-slate-500 dark:text-slate-400">
          {t('shelves.jukebox_intro')}
        </p>
      )}
      {shelvesToShow(shelves)
        // A song no longer in the library is left off, not shown as a blank.
        .map((shelf) => ({ shelf, songs: shelf.trackIds.map((id) => byId.get(id)).filter((track): track is Track => track !== undefined) }))
        // ⚠️ And a shelf left with NONE of its songs is not drawn, so there is
        // only ever the one empty shelf at the end (James, 2026-09-27: "If
        // there's two empty shelves then delete and only show one shelf"). Its
        // songs went with a library that was cleared or re-imported under new
        // ids. It stays stored, so it comes back if they do.
        .filter(({ shelf, songs }) => shelf.id === NEW_SHELF || songs.length > 0)
        .map(({ shelf, songs }, i, all) => {
        const name = shelfName(shelf, i)
        // ⚠️ The empty shelf at the end is a single row once there is a full
        // shelf above it (James, 2026-09-28, from the UX review): a whole
        // record's height of dashed circle under every jukebox pushed
        // Requests off the screen. The first shelf keeps the big + — it is
        // the whole of the tab until something is on it.
        if (shelf.id === NEW_SHELF && all.length > 1) {
          return (
            <button
              key={shelf.id}
              type="button"
              onClick={() => setPicking({ shelfId: shelf.id, index: i })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3.5 text-[14px] font-medium text-slate-600 transition hover:border-orange-400 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-600 dark:hover:text-orange-400"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('shelves.start_another_shelf')}
            </button>
          )
        }
        return (
          <div key={shelf.id}>
            <JukeboxShelfRow
              shelfId={shelf.id}
              name={name}
              named={shelf.id !== NEW_SHELF}
              songs={songs}
              albumOf={albumOf}
              onAdd={() => setPicking({ shelfId: shelf.id, index: i })}
            />
            {/* The shelf the app filled to show what a shelf is says so. */}
            {shelf.id === starterId && (
              <p className="mt-2 text-center text-[13px] text-slate-500 dark:text-slate-400">{t('shelves.starter_hint')}</p>
            )}
          </div>
        )
      })}
      {/* Music to get, ticked off when the library has it (James, 2026-09-26). */}
      <Requests />
      {picking && (
        <SongPicker
          shelfId={picking.shelfId}
          name={shelfName(shelves.find((s) => s.id === picking.shelfId) ?? { id: picking.shelfId, trackIds: [] }, picking.index)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}

/**
 * The shelf that fills itself: the songs played most, from `lib/playCounts`
 * (James, 2026-10-11). Not edited by hand — no +, no Fine-tune, no new name —
 * and removed with its own button; Tune this app ▸ Your library brings it back.
 */
function MostPlayedShelf({ byId, albumOf, onRemove }: { byId: ReadonlyMap<string, Track>; albumOf(t: Track): Album | undefined; onRemove(): void }) {
  const t = useT()
  const counts = usePlayCounts((s) => s.counts)
  const songs = useMemo(() => mostPlayed(counts, byId), [counts, byId])
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const name = t('shelves.most_played')
  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[12.5px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400'
  const remove = (
    <button type="button" onClick={onRemove} aria-label={t('shelves.most_played_remove_label')} className={pill}>
      {t('shelves.most_played_remove')}
    </button>
  )
  // Nothing at all until a song has been played twice (James, 2026-10-11).
  if (songs.length === 0) return null
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
          {name}
          <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">{t.plural('common.songs', songs.length)}</span>
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => playTracks(songs, 0)} className={pill}>
            ▶ {t('common.play')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!shuffle) toggleShuffle()
              playTracks(songs, Math.floor(Math.random() * songs.length))
            }}
            className={pill}
          >
            <ShuffleGlyph />
            {t('common.shuffle')}
          </button>
          {remove}
        </div>
      </div>
      <ShelfRow<Track>
        items={songs}
        label={name}
        size="record"
        verb="play_from"
        keyOf={(s) => s.id}
        nameOf={(s) => s.title}
        artOf={(s) => albumOf(s)}
        render={(s) => <Record45 album={albumOf(s)} grooves={grooveRings(s.durationSec)} />}
        open={(_, i) => playTracks(songs, i)}
        caption={(s) => ({
          title: s.title,
          detail: `${s.artist ?? s.albumArtist ?? t('common.unknown_artist')} · ${t.plural('shelves.played_times', counts[s.id]?.n ?? 0)}`,
        })}
      />
    </div>
  )
}

function JukeboxShelfRow({
  shelfId, name, named, songs, albumOf, onAdd,
}: { shelfId: string; name: string; named: boolean; songs: Track[]; albumOf(t: Track): Album | undefined; onAdd(): void }) {
  const t = useT()
  const toggle = useShelvesStore((s) => s.toggle)
  const rename = useShelvesStore((s) => s.rename)
  const move = useShelvesStore((s) => s.move)
  /** Editing: the record picked to move or take off. */
  const [picked, setPicked] = useState<string | null>(null)
  /** Renaming: the name being typed. */
  const [draft, setDraft] = useState<string | null>(null)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const [editing, setEditing] = useState(false)
  const shelfPlayLearnt = useSettingsStore((s) => s.tipsSeen.includes('shelfPlay'))
  const slots: Slot[] = [...songs, PLUS]
  const pill =
    'inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[12.5px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400'

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        {/* The name: tap it to call the shelf something (James, 2026-09-11). */}
        {draft !== null ? (
          <input
            autoFocus
            value={draft}
            maxLength={NAME_MAX}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              rename(shelfId, draft)
              setDraft(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setDraft(null)
            }}
            aria-label={t('shelves.name_for_shelf', { name })}
            className="min-w-0 flex-1 rounded-lg border border-orange-400 bg-white px-2.5 py-1 text-[14px] font-semibold text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {named ? (
              <button type="button" onClick={() => setDraft(name)} title={t('shelves.tap_to_rename')} className="inline-flex items-center gap-1.5 hover:text-orange-700 dark:hover:text-orange-400">
                {name}
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12.5 4.5l3 3L7 16H4v-3z" />
                </svg>
              </button>
            ) : (
              name
            )}
            <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">{songs.length > 0 ? t.plural('common.songs', songs.length) : t('shelves.shelf_empty')}</span>
          </p>
        )}
        {songs.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => playTracks(songs, 0)} className={pill}>
              ▶ {t('common.play')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!shuffle) toggleShuffle()
                playTracks(songs, Math.floor(Math.random() * songs.length))
              }}
              className={pill}
            >
              <ShuffleGlyph />
              {t('common.shuffle')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing((e) => !e)
                setPicked(null)
              }}
              aria-pressed={editing}
              className={pill}
            >
              {editing ? t('common.done') : t('shelves.fine_tune')}
            </button>
          </div>
        )}
      </div>
      <ShelfRow<Slot>
        items={slots}
        label={name}
        size="record"
        verb={editing ? 'pick' : 'play_from'}
        keyOf={(s) => (isPlus(s) ? 'plus' : s.id)}
        nameOf={(s) => (isPlus(s) ? name : s.title)}
        labelOf={(s) => (isPlus(s) ? t('shelves.add_song_to_shelf', { name }) : undefined)}
        artOf={(s) => (isPlus(s) ? undefined : albumOf(s))}
        render={(s) =>
          isPlus(s) ? (
            <span className="flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white/40 text-slate-400 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-500">
              <svg viewBox="0 0 24 24" className="h-1/3 w-1/3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          ) : (
            <span className={`relative block rounded-full ${editing && picked === s.id ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}>
              <Record45 album={albumOf(s)} grooves={grooveRings(s.durationSec)} />
            </span>
          )
        }
        // The + tile, and every record while taking them off, act on the first tap.
        direct={(s) => isPlus(s) || editing}
        open={(s, i) => {
          if (isPlus(s)) onAdd()
          else if (editing) setPicked((p) => (p === s.id ? null : s.id))
          else {
            markTipSeen('shelfPlay')
            playTracks(songs, i)
          }
        }}
        caption={(s) => {
          if (isPlus(s)) {
            return { title: songs.length > 0 ? t('shelves.add_another_song') : t('shelves.an_empty_shelf'), detail: t('shelves.tap_plus_to_add') }
          }
          // The how-to goes once a shelf has been played from (`TipId`);
          // Edit's stays, since it is a different mode's instructions.
          const artist = s.artist ?? s.albumArtist ?? t('common.unknown_artist')
          return {
            title: s.title,
            detail: editing
              ? t('shelves.record_caption_editing', { artist })
              : shelfPlayLearnt ? artist : t('shelves.record_caption_hint', { artist }),
          }
        }}
      />
      {editing && picked && (
        // Move the picked record along the shelf, or take it off.
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => move(shelfId, picked, -1)} className={pill} disabled={songs[0]?.id === picked}>
            {t('shelves.move_left')}
          </button>
          <button type="button" onClick={() => move(shelfId, picked, 1)} className={pill} disabled={songs[songs.length - 1]?.id === picked}>
            {t('shelves.move_right')}
          </button>
          <button
            type="button"
            onClick={() => {
              toggle(shelfId, picked)
              setPicked(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-[12.5px] font-medium text-red-700 transition hover:border-red-500 dark:border-red-800 dark:text-red-400"
          >
            {t('shelves.take_off')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Choose the songs for a shelf: tap to put one on, tap again to take it off. */
function SongPicker({ shelfId, name, onClose }: { shelfId: string; name: string; onClose(): void }) {
  const t = useT()
  const dialogRef = useDialogFocus()
  const tracks = useLibraryStore((s) => s.tracks)
  const shelves = useShelvesStore((s) => s.shelves)
  const toggle = useShelvesStore((s) => s.toggle)
  // The empty shelf becomes a real one on its first song; the rest go on that.
  const [target, setTarget] = useState(shelfId)
  const [query, setQuery] = useState('')
  const onShelf = new Set(shelves.find((s) => s.id === target)?.trackIds ?? [])
  const found = useMemo(
    () => [...matchTracks(tracks, query)].sort((a, b) => compareBaseNumeric(a.title, b.title)),
    [tracks, query],
  )
  const shown = found.slice(0, PICKER_CAP)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      aria-modal="true"
      aria-label={t('shelves.add_songs_to', { name })}
      className="outline-none fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t('shelves.add_songs_to', { name })}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1 text-[13px] font-semibold text-white shadow-sm"
          >
            {t('common.done')}
          </button>
        </div>
        <div className="px-4 py-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('shelves.search_your_songs')}
            aria-label={t('shelves.search_your_songs')}
            className="w-full rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {shown.map((track) => {
            const on = onShelf.has(track.id)
            return (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => setTarget(toggle(target, track.id))}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-slate-900 dark:text-slate-100">{track.title}</span>
                    <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                      {[track.artist ?? track.albumArtist, track.album].filter(Boolean).join(' — ')}
                    </span>
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] ${
                      on ? 'bg-orange-500 text-white' : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                    }`}
                    aria-hidden
                  >
                    {on ? '✓' : '+'}
                  </span>
                </button>
              </li>
            )
          })}
          {found.length > shown.length && (
            <li className="px-2 py-3 text-center text-[12px] text-slate-500 dark:text-slate-400">
              {t.plural('shelves.picker_more', found.length - shown.length)}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
