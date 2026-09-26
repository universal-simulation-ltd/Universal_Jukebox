import { useEffect, useMemo, useState } from 'react'
import Record45 from './Record45'
import { ShelfRow } from './Shelf'
import {
  KIND_LABEL, TITLE_MAX, artBlob, findInLibrary, indexLibrary, keepArt, requestsInOrder, searchArt,
  type ArtResult, type MusicRequest, type RequestKind,
} from '../lib/requests'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useRequestsStore } from '../stores/requestsStore'
import type { Album } from '../lib/types'

// The Jukebox tab's requests shelf: music to get, standing as records in the
// picture you picked, ticked off when the library has it — the rules are
// `lib/requests.ts` (James, 2026-09-26).

const PLUS = { plus: true } as const
type Slot = MusicRequest | typeof PLUS
const isPlus = (slot: Slot): slot is typeof PLUS => slot === PLUS

const pill =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-[12.5px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:text-orange-400'

/** Who by, for a caption: "Album · The Beatles". */
function describe(r: MusicRequest): string {
  return r.kind === 'artist' ? KIND_LABEL.artist : [KIND_LABEL[r.kind], r.artist].filter(Boolean).join(' · ')
}

export default function Requests() {
  const requests = useRequestsStore((s) => s.requests)
  const setGot = useRequestsStore((s) => s.setGot)
  const remove = useRequestsStore((s) => s.remove)
  const clearGot = useRequestsStore((s) => s.clearGot)
  const tracks = useLibraryStore((s) => s.tracks)
  const albums = useLibraryStore((s) => s.albums)
  const playTracks = usePlayerStore((s) => s.playTracks)
  const [adding, setAdding] = useState(false)
  /** The record tapped, whose buttons show under the shelf. */
  const [picked, setPicked] = useState<string | null>(null)

  const ordered = useMemo(() => requestsInOrder(requests), [requests])
  const index = useMemo(() => indexLibrary(tracks, albums), [tracks, albums])
  // One stand-in album per request, so its picture is a record's label like any
  // other — and made once, because `Cover` mints one URL per album id.
  const sleeves = useMemo(() => {
    const map = new Map<string, Album>()
    for (const r of requests) {
      map.set(r.id, { id: `request:${r.id}`, title: r.title, artist: r.artist ?? r.title, trackCount: 0, cover: artBlob(r.art) })
    }
    return map
  }, [requests])
  const got = requests.filter((r) => r.gotAt).length
  const toGet = requests.length - got
  const slots: Slot[] = [...ordered, PLUS]
  const current = picked ? requests.find((r) => r.id === picked) : undefined
  const found = current ? findInLibrary(current, index) : []

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
          Requests
          <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
            {requests.length === 0 ? 'music to get' : toGet > 0 ? `${toGet} to get` : 'all got'}
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setAdding(true)} className={pill}>
            + Request
          </button>
          {got > 0 && (
            <button
              type="button"
              onClick={() => {
                clearGot()
                setPicked(null)
              }}
              className={pill}
            >
              Clear {got} got
            </button>
          )}
        </div>
      </div>
      <ShelfRow<Slot>
        items={slots}
        label="Requests"
        size="record"
        verb="Choose"
        keyOf={(s) => (isPlus(s) ? 'plus' : s.id)}
        nameOf={(s) => (isPlus(s) ? 'Requests' : s.title)}
        labelOf={(s) => (isPlus(s) ? 'Request a song, album or artist' : undefined)}
        artOf={(s) => (isPlus(s) ? undefined : sleeves.get(s.id))}
        render={(s) =>
          isPlus(s) ? (
            <span className="flex aspect-square w-full items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white/40 text-slate-400 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-500">
              <svg viewBox="0 0 24 24" className="h-1/3 w-1/3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          ) : (
            <span
              className={`relative block rounded-full ${picked === s.id ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950' : ''}`}
            >
              {/* Still to get: a record not yet in the box, so a little faded. */}
              <span className={`block transition ${s.gotAt ? '' : 'opacity-75 saturate-50'}`}>
                <Record45 album={sleeves.get(s.id)} />
              </span>
              {s.gotAt && (
                <span className="absolute top-[6%] right-[6%] flex h-[22%] w-[22%] items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white dark:ring-slate-950" aria-hidden>
                  <svg viewBox="0 0 20 20" className="h-3/5 w-3/5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" />
                  </svg>
                </span>
              )}
            </span>
          )
        }
        direct={(s) => isPlus(s)}
        open={(s) => {
          if (isPlus(s)) setAdding(true)
          else setPicked((p) => (p === s.id ? null : s.id))
        }}
        caption={(s) =>
          isPlus(s)
            ? {
                title: requests.length > 0 ? 'Request another' : 'Nothing requested',
                detail: 'Tap + for a song, album or artist to get — it’s ticked off when your library has it',
              }
            : {
                title: s.title,
                detail: `${describe(s)} — ${s.gotAt ? 'in your library ✓' : 'still to get'}`,
              }
        }
      />
      {current && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {found.length > 0 && (
            <button type="button" onClick={() => playTracks(found, 0)} className={pill}>
              ▶ Play
            </button>
          )}
          <button type="button" onClick={() => setGot(current.id, !current.gotAt)} className={pill} aria-pressed={!!current.gotAt}>
            {current.gotAt ? 'Not got yet' : '✓ Got it'}
          </button>
          <button
            type="button"
            onClick={() => {
              remove(current.id)
              setPicked(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-[12.5px] font-medium text-red-700 transition hover:border-red-500 dark:border-red-800 dark:text-red-400"
          >
            Remove
          </button>
        </div>
      )}
      {adding && <RequestDialog onClose={() => setAdding(false)} />}
    </div>
  )
}

/** Say what to get, and — if you like — find its picture. */
function RequestDialog({ onClose }: { onClose(): void }) {
  const add = useRequestsStore((s) => s.add)
  const [kind, setKind] = useState<RequestKind>('album')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [results, setResults] = useState<ArtResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [chosen, setChosen] = useState<ArtResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const words = kind === 'artist' ? title : [title, artist].filter((w) => w.trim()).join(' ')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const search = async () => {
    if (!words.trim()) return
    setSearching(true)
    setError(null)
    try {
      setResults(await searchArt(kind, words))
    } catch {
      setError('The search didn’t get an answer. Check the connection and try again — or add it without a picture.')
    } finally {
      setSearching(false)
    }
  }

  const save = async () => {
    const name = title.trim()
    if (!name) return
    setSaving(true)
    setError(null)
    let art: string | undefined
    if (chosen) {
      try {
        art = await keepArt(chosen.image)
      } catch {
        setSaving(false)
        setError('That picture wouldn’t download. Pick another, or add it without one.')
        return
      }
    }
    add({ kind, title: name.slice(0, TITLE_MAX), ...(kind !== 'artist' && artist.trim() ? { artist: artist.trim().slice(0, TITLE_MAX) } : {}), ...(art ? { art } : {}) })
    onClose()
  }

  const field =
    'w-full rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request music"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <p className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Request music</p>
          <button type="button" onClick={onClose} className="text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
            Cancel
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div role="radiogroup" aria-label="What to get" className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            {(['track', 'album', 'artist'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => {
                  setKind(k)
                  setResults(null)
                  setChosen(null)
                }}
                className={`flex-1 rounded-full px-3 py-1 text-[13px] font-medium transition ${
                  kind === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void search()
            }}
          >
            <input
              autoFocus
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'artist' ? 'Artist' : kind === 'album' ? 'Album' : 'Song'}
              aria-label={kind === 'artist' ? 'Artist' : kind === 'album' ? 'Album title' : 'Song title'}
              className={field}
            />
            {kind !== 'artist' && (
              <input
                value={artist}
                maxLength={TITLE_MAX}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist (optional)"
                aria-label="Artist"
                className={field}
              />
            )}
            <button type="submit" disabled={!words.trim() || searching} className={pill}>
              {searching ? 'Searching…' : 'Find a picture'}
            </button>
            <p className="text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
              Finding a picture sends what you typed to Apple’s iTunes Search — nothing else, and only when you tap it.
              The picture you pick is kept on this device.
            </p>
          </form>
          {results && results.length === 0 && (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">No pictures found. Try other words, or add it without one.</p>
          )}
          {results && results.length > 0 && (
            <>
              {kind === 'artist' && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400">Pick one of their covers to stand for them.</p>
              )}
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {results.map((r) => {
                  const on = chosen?.image === r.image
                  return (
                    <li key={r.image}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          if (on) return setChosen(null)
                          setChosen(r)
                          // Apple's spelling is better for matching than what was
                          // typed — take it, and it can still be edited above.
                          if (r.title) setTitle(r.title.slice(0, TITLE_MAX))
                          if (kind !== 'artist' && r.artist) setArtist(r.artist.slice(0, TITLE_MAX))
                        }}
                        className="block w-full text-left"
                      >
                        <img
                          src={r.thumb}
                          alt=""
                          referrerPolicy="no-referrer"
                          className={`aspect-square w-full rounded-lg bg-slate-200 object-cover dark:bg-slate-800 ${on ? 'ring-4 ring-orange-500' : ''}`}
                        />
                        <span className="mt-1 block truncate text-[11.5px] font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {[kind === 'artist' ? r.album ?? '' : r.artist, r.year].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          {error && <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!title.trim() || saving}
            className="rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {saving ? 'Adding…' : chosen ? 'Add with this picture' : 'Add request'}
          </button>
        </div>
      </div>
    </div>
  )
}
