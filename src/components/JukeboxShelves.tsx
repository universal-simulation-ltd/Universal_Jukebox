import { useEffect, useMemo, useState } from 'react'
import Record45 from './Record45'
import { ShelfRow } from './Shelf'
import { ShuffleGlyph } from './AlbumView'
import { plural } from '../lib/format'
import { grooveRings } from '../lib/grooves'
import { matchTracks } from '../lib/search'
import { NAME_MAX, NEW_SHELF, shelfName, shelvesToShow } from '../lib/shelves'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useShelvesStore } from '../stores/shelvesStore'
import type { Album, Track } from '../lib/types'

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
  const shelves = useShelvesStore((s) => s.shelves)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const byId = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks])
  const albumOf = useMemo(() => {
    const map = new Map(albums.map((a) => [a.id, a]))
    return (t: Track) => map.get(t.albumId)
  }, [albums])
  const [picking, setPicking] = useState<{ shelfId: string; name: string } | null>(null)

  return (
    <div className="space-y-12">
      {shelves.length === 0 && (
        <p className="text-center text-[13px] text-slate-500 dark:text-slate-400">
          Your jukebox. Tap + to put a song on the shelf — each shelf plays as a playlist.
        </p>
      )}
      {shelvesToShow(shelves).map((shelf, i) => {
        const name = shelfName(shelf, i)
        // A song no longer in the library is left off, not shown as a blank.
        const songs = shelf.trackIds.map((id) => byId.get(id)).filter((t): t is Track => t !== undefined)
        return (
          <JukeboxShelfRow
            key={shelf.id}
            shelfId={shelf.id}
            name={name}
            named={shelf.id !== NEW_SHELF}
            songs={songs}
            albumOf={albumOf}
            onAdd={() => setPicking({ shelfId: shelf.id, name })}
          />
        )
      })}
      {picking && <SongPicker shelfId={picking.shelfId} name={picking.name} onClose={() => setPicking(null)} />}
    </div>
  )
}

function JukeboxShelfRow({
  shelfId, name, named, songs, albumOf, onAdd,
}: { shelfId: string; name: string; named: boolean; songs: Track[]; albumOf(t: Track): Album | undefined; onAdd(): void }) {
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
            aria-label={`Name for ${name}`}
            className="min-w-0 flex-1 rounded-lg border border-orange-400 bg-white px-2.5 py-1 text-[14px] font-semibold text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {named ? (
              <button type="button" onClick={() => setDraft(name)} title="Tap to rename" className="inline-flex items-center gap-1.5 hover:text-orange-700 dark:hover:text-orange-400">
                {name}
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12.5 4.5l3 3L7 16H4v-3z" />
                </svg>
              </button>
            ) : (
              name
            )}
            <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">{songs.length > 0 ? plural(songs.length, 'song') : 'empty'}</span>
          </p>
        )}
        {songs.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => playTracks(songs, 0)} className={pill}>
              ▶ Play
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
              Shuffle
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
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        )}
      </div>
      <ShelfRow<Slot>
        items={slots}
        label={name}
        size="record"
        verb={editing ? 'Pick' : 'Play from'}
        keyOf={(s) => (isPlus(s) ? 'plus' : s.id)}
        nameOf={(s) => (isPlus(s) ? name : s.title)}
        labelOf={(s) => (isPlus(s) ? `Add a song to ${name}` : undefined)}
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
          else playTracks(songs, i)
        }}
        caption={(s) =>
          isPlus(s)
            ? { title: songs.length > 0 ? 'Add another song' : 'An empty shelf', detail: 'Tap + to put a song on it' }
            : {
                title: s.title,
                detail: `${s.artist ?? s.albumArtist ?? 'Unknown artist'} — ${editing ? 'tap a record to move it or take it off' : 'tap the record to play the shelf from here'}`,
              }
        }
      />
      {editing && picked && (
        // Move the picked record along the shelf, or take it off.
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => move(shelfId, picked, -1)} className={pill} disabled={songs[0]?.id === picked}>
            ‹ Move left
          </button>
          <button type="button" onClick={() => move(shelfId, picked, 1)} className={pill} disabled={songs[songs.length - 1]?.id === picked}>
            Move right ›
          </button>
          <button
            type="button"
            onClick={() => {
              toggle(shelfId, picked)
              setPicked(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-[12.5px] font-medium text-red-700 transition hover:border-red-500 dark:border-red-800 dark:text-red-400"
          >
            Take off
          </button>
        </div>
      )}
    </div>
  )
}

/** Choose the songs for a shelf: tap to put one on, tap again to take it off. */
function SongPicker({ shelfId, name, onClose }: { shelfId: string; name: string; onClose(): void }) {
  const tracks = useLibraryStore((s) => s.tracks)
  const shelves = useShelvesStore((s) => s.shelves)
  const toggle = useShelvesStore((s) => s.toggle)
  // The empty shelf becomes a real one on its first song; the rest go on that.
  const [target, setTarget] = useState(shelfId)
  const [query, setQuery] = useState('')
  const onShelf = new Set(shelves.find((s) => s.id === target)?.trackIds ?? [])
  const found = useMemo(
    () => [...matchTracks(tracks, query)].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })),
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
      aria-modal="true"
      aria-label={`Add songs to ${name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Add songs to {name}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1 text-[13px] font-semibold text-white shadow-sm"
          >
            Done
          </button>
        </div>
        <div className="px-4 py-2.5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your songs"
            aria-label="Search your songs"
            className="w-full rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {shown.map((t) => {
            const on = onShelf.has(t.id)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTarget(toggle(target, t.id))}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-slate-900 dark:text-slate-100">{t.title}</span>
                    <span className="block truncate text-[12px] text-slate-500 dark:text-slate-400">
                      {[t.artist ?? t.albumArtist, t.album].filter(Boolean).join(' — ')}
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
              {(found.length - shown.length).toLocaleString()} more — search to find them
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
