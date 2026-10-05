import { describe, expect, it } from 'vitest'
import {
  ONLINE_MAX_BYTES, backupBytes, backupFileName, buildBackup, fitBackup, matchSongs, mergeRequests, mergeShelves, parseBackup,
  type JukeboxBackup,
} from './backup'
import { REQUESTS_MAX, type MusicRequest } from './requests'
import type { Track } from './types'

const track = (id: string, title: string, artist?: string, album?: string, trackNo?: number, mtime = 1): Track =>
  ({ id, path: id, name: id, size: 1, mtime, ext: 'mp3', title, artist, album, trackNo, albumId: album ?? '' }) as Track

const phone = [
  track('p1', 'Come Together', 'The Beatles', 'Abbey Road', 1),
  track('p2', 'Something', 'The Beatles', 'Abbey Road', 2),
  track('p3', 'Hurt', 'Johnny Cash', 'American IV', 2),
]
// The same music on a new phone: same tags, new ids (a different mtime).
const newPhone = [
  track('n1', 'Come Together', 'The Beatles', 'Abbey Road', 1, 9),
  track('n3', 'Hurt', 'Johnny Cash', 'American IV', 2, 9),
]

const req = (over: Partial<MusicRequest>): MusicRequest => ({ id: 'r', kind: 'album', title: 'x', addedAt: 1, ...over })

const backup = (): JukeboxBackup =>
  buildBackup({
    settings: { deck: 'turntable' },
    shelves: [{ id: 's1', name: 'Sunday', trackIds: ['p1', 'p2', 'gone'] }, { id: 's2', trackIds: ['p3'] }],
    requests: [req({ id: 'r1', title: 'Revolver' })],
    lyrics: [{ id: 'p3', raw: '[00:01.00]I hurt myself today' }, { id: 'gone', raw: 'x' }],
    tracks: phone,
    now: 1,
  })

describe('building a backup', () => {
  it('names songs by their tags, and drops ids the library no longer has', () => {
    const b = backup()
    expect(b.shelves).toEqual([
      { id: 's1', name: 'Sunday', songs: [{ t: 'Come Together', a: 'The Beatles', al: 'Abbey Road', n: 1 }, { t: 'Something', a: 'The Beatles', al: 'Abbey Road', n: 2 }] },
      { id: 's2', songs: [{ t: 'Hurt', a: 'Johnny Cash', al: 'American IV', n: 2 }] },
    ])
    expect(b.lyrics).toHaveLength(1)
    expect(JSON.stringify(b)).not.toContain('p1')
  })

  it('reads back what it wrote, and refuses what is not a Jukebox backup', () => {
    const b = backup()
    expect(parseBackup(JSON.parse(JSON.stringify(b)))).toEqual(b)
    expect(parseBackup({ app: 'pdf', v: 1 })).toBeNull()
    expect(parseBackup({ app: 'jukebox', v: 99 })).toBeNull()
    expect(parseBackup('nonsense')).toBeNull()
    expect(parseBackup({ app: 'jukebox', v: 1, shelves: [{ id: 's', songs: [{ t: '' }, 3] }], lyrics: [{ song: { t: 'a' } }] })).toMatchObject({
      shelves: [], lyrics: [], requests: [], settings: {},
    })
  })
})

describe('fitting the online copy', () => {
  it('keeps everything when it fits', () => {
    const b = backup()
    expect(fitBackup(b)).toEqual({ backup: b, left: { pictures: 0, lyrics: 0 } })
  })

  it('drops pictures before lyrics, and says how many', () => {
    const art = `data:image/webp;base64,${'A'.repeat(20_000)}`
    const b: JukeboxBackup = {
      ...backup(),
      requests: [req({ id: 'a', art }), req({ id: 'b', art }), req({ id: 'c', art })],
      lyrics: [{ song: { t: 'Hurt' }, raw: 'L'.repeat(15_000) }],
    }
    const fitted = fitBackup(b)!
    expect(backupBytes(fitted.backup)).toBeLessThanOrEqual(ONLINE_MAX_BYTES)
    expect(fitted.backup.lyrics).toHaveLength(1)
    expect(fitted.left).toEqual({ pictures: 1, lyrics: 0 })
    expect(fitted.backup.requests.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('gives up when the shelves alone are too big for the online copy', () => {
    const b = { ...backup(), shelves: [{ id: 's', songs: Array.from({ length: 3_000 }, (_, i) => ({ t: `Song number ${i}`, a: 'Someone' })) }] }
    expect(fitBackup(b)).toBeNull()
  })
})

describe('restoring onto another device', () => {
  it('finds the same song under a new id', () => {
    const [ct, something, hurt] = matchSongs(backup().shelves.flatMap((s) => s.songs), newPhone)
    expect(ct?.id).toBe('n1')
    expect(something).toBeNull()
    expect(hurt?.id).toBe('n3')
  })

  it('falls back to title and artist, then to a title only one track has', () => {
    const lib = [track('a', 'Hurt', 'Johnny Cash', 'Best Of'), track('b', 'Intro', 'X'), track('c', 'Intro', 'Y'), track('d', 'Unique', 'Z')]
    expect(matchSongs([{ t: 'Hurt', a: 'Johnny Cash', al: 'American IV' }], lib)[0]?.id).toBe('a')
    expect(matchSongs([{ t: 'Intro' }], lib)[0]).toBeNull()
    expect(matchSongs([{ t: 'Unique', a: 'Renamed' }], lib)[0]?.id).toBe('d')
  })

  it('merges shelves, so restoring again later fills in the rest', () => {
    const first = mergeShelves([], backup().shelves, newPhone)
    expect(first).toMatchObject({ found: 2, missing: 1 })
    expect(first.shelves).toEqual([{ id: 's1', name: 'Sunday', trackIds: ['n1'] }, { id: 's2', trackIds: ['n3'] }])
    const later = [...newPhone, track('n2', 'Something', 'The Beatles', 'Abbey Road', 2, 9)]
    const second = mergeShelves(first.shelves, backup().shelves, later)
    expect(second.shelves[0].trackIds).toEqual(['n1', 'n2'])
    expect(second.shelves).toHaveLength(2)
  })

  it('adds requests it does not have, and keeps the list cap', () => {
    const here = [req({ id: 'r1', title: 'Mine' })]
    expect(mergeRequests(here, [req({ id: 'r1', title: 'Theirs' }), req({ id: 'r2' })]).map((r) => [r.id, r.title])).toEqual([['r1', 'Mine'], ['r2', 'x']])
    const many = Array.from({ length: REQUESTS_MAX + 5 }, (_, i) => req({ id: `m${i}`, addedAt: i }))
    expect(mergeRequests([], many)).toHaveLength(REQUESTS_MAX)
  })
})

it('names the file by the date', () => {
  expect(backupFileName(new Date(2026, 9, 5, 12).getTime())).toBe('jukebox-backup-2026-10-05.json')
})
