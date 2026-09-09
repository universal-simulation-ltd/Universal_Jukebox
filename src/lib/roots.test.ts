import { describe, expect, it } from 'vitest'
import { trackKey } from './keys'
import {
  addScan, pathUnder, prefixOf, removeRoot, rootsNeedingAccess, trackCountFor, uniqueLabel,
} from './roots'
import type { Album, Root, Track } from './types'

// More than one music folder.
//
// Tested hard for the same reason `ceremony.test.ts` is: the failures here are
// SILENT. A path collision does not throw — it overwrites one track with
// another, and which one wins depends on the order two scans finished in. A
// track count that is added up rather than recomputed is simply a wrong number
// on a tile. Neither is visible by clicking around a library you already know.

function track(path: string, over: Partial<Track> = {}): Track {
  return {
    id: trackKey({ path, size: 1000, mtime: 0 }),
    path,
    name: path.slice(path.lastIndexOf('/') + 1),
    size: 1000,
    mtime: 0,
    ext: 'mp3',
    title: 'A song',
    albumId: 'an album',
    ...over,
  }
}

function album(id: string, over: Partial<Album> = {}): Album {
  return { id, title: id, artist: 'An artist', trackCount: 1, cover: null, ...over }
}

function root(id: string, over: Partial<Root> = {}): Root {
  return { id, label: id, prefix: id, handle: null, scannedAt: 0, trackCount: 0, ...over }
}

// ⚠️ THE BUG THE WHOLE FEATURE WAS BLOCKED ON. Two folders, each holding a copy
// of the same album at the same relative path — an original and a backup — used
// to produce identical track ids, and one silently replaced the other.
describe('the path collision', () => {
  const relative = 'Nick Cave/Let Love In/01 Do You Love Me.mp3'

  it('gave two folders the same track id before the prefix existed', () => {
    expect(trackKey({ path: relative, size: 1000, mtime: 0 }))
      .toBe(trackKey({ path: relative, size: 1000, mtime: 0 }))
  })

  it('and gives them different ids now', () => {
    const a = track(`Music/${relative}`)
    const b = track(`Backup/${relative}`)
    expect(a.id).not.toBe(b.id)
  })
})

describe('which tracks belong to a folder', () => {
  it('matches on a whole path segment, never a substring', () => {
    expect(pathUnder('Music/a.mp3', 'Music')).toBe(true)
    // ⚠️ The one that bites: "Music" must not claim "Music Backup".
    expect(pathUnder('Music Backup/a.mp3', 'Music')).toBe(false)
    expect(pathUnder('MusicBackup/a.mp3', 'Music')).toBe(false)
  })

  it('treats a root with no prefix as owning everything, for libraries stored before this existed', () => {
    expect(prefixOf(root('primary', { prefix: undefined }))).toBe('')
    expect(pathUnder('anything/at/all.mp3', '')).toBe(true)
  })
})

describe('naming a new folder', () => {
  it('uses the folder name when it is free', () => {
    expect(uniqueLabel('Music', ['Backup'])).toBe('Music')
  })

  it('disambiguates a clash, because the prefix IS the identity', () => {
    expect(uniqueLabel('Music', ['Music'])).toBe('Music (2)')
    expect(uniqueLabel('Music', ['Music', 'Music (2)'])).toBe('Music (3)')
  })

  it('never returns an empty prefix, which would claim the whole library', () => {
    expect(uniqueLabel('   ', [])).toBe('Folder')
  })
})

describe('adding a folder', () => {
  const existing = {
    tracks: [track('Music/a.mp3', { albumId: 'one' }), track('Music/b.mp3', { albumId: 'one' })],
    albums: [album('one', { trackCount: 2 })],
  }

  it('keeps what was already there', () => {
    const merged = addScan(existing, 'Backup', {
      tracks: [track('Backup/c.mp3', { albumId: 'two' })],
      albums: [album('two')],
    })
    expect(merged.tracks).toHaveLength(3)
    expect(merged.albums.map((a) => a.id).sort()).toEqual(['one', 'two'])
  })

  // Re-scanning is a replacement OF THAT FOLDER and of nothing else.
  it('drops the rescanned folder’s old tracks, and only those', () => {
    const merged = addScan(existing, 'Music', {
      tracks: [track('Music/a.mp3', { albumId: 'one' })],
      albums: [album('one')],
    })
    expect(merged.tracks.map((t) => t.path)).toEqual(['Music/a.mp3'])
  })

  it('lets a deleted album disappear on a rescan', () => {
    const merged = addScan(existing, 'Music', { tracks: [], albums: [] })
    expect(merged.tracks).toHaveLength(0)
    // An album with no tracks left must not survive as a blank tile.
    expect(merged.albums).toHaveLength(0)
  })

  // ⚠️ The same record in two folders is ONE album with tracks from both,
  // because an album id comes from the tags. Counts are recomputed for exactly
  // this case: either scan's own count would be half the truth.
  it('merges one album that lives in two folders, and counts it once', () => {
    const merged = addScan(existing, 'Backup', {
      tracks: [track('Backup/a.mp3', { albumId: 'one' })],
      albums: [album('one', { trackCount: 1 })],
    })
    expect(merged.albums).toHaveLength(1)
    expect(merged.albums[0].trackCount).toBe(3)
  })

  it('keeps artwork the new scan did not find', () => {
    const cover = new Blob(['art'])
    const withArt = { tracks: existing.tracks, albums: [album('one', { cover, trackCount: 2 })] }
    const merged = addScan(withArt, 'Music', {
      tracks: [track('Music/a.mp3', { albumId: 'one' })],
      albums: [album('one', { cover: null })],
    })
    expect(merged.albums[0].cover).toBe(cover)
  })
})

describe('removing a folder', () => {
  const two = {
    tracks: [
      track('Music/a.mp3', { albumId: 'one' }),
      track('Backup/b.mp3', { albumId: 'two' }),
      track('Backup/c.mp3', { albumId: 'two' }),
    ],
    albums: [album('one'), album('two', { trackCount: 2 })],
  }

  it('takes its tracks and its albums, and leaves the rest alone', () => {
    const left = removeRoot(two, 'Backup')
    expect(left.tracks.map((t) => t.path)).toEqual(['Music/a.mp3'])
    expect(left.albums.map((a) => a.id)).toEqual(['one'])
  })

  it('leaves an album that spans two folders, with the right count', () => {
    const shared = {
      tracks: [track('Music/a.mp3', { albumId: 'one' }), track('Backup/b.mp3', { albumId: 'one' })],
      albums: [album('one', { trackCount: 2 })],
    }
    const left = removeRoot(shared, 'Backup')
    expect(left.albums).toHaveLength(1)
    expect(left.albums[0].trackCount).toBe(1)
  })

  it('empties the library when the last folder goes', () => {
    const left = removeRoot(removeRoot(two, 'Backup'), 'Music')
    expect(left.tracks).toHaveLength(0)
    expect(left.albums).toHaveLength(0)
  })
})

describe('which folders need their permission back', () => {
  const roots = [root('Music'), root('Backup'), root('example', { prefix: 'Example library' })]
  const tracks = [
    track('Music/a.mp3'),
    track('Backup/b.mp3'),
    track('Example library/c.wav'),
  ]
  const generated = (r: Root) => r.id === 'example'

  it('is all of the real ones after a reload, when nothing is live', () => {
    const need = rootsNeedingAccess(roots, tracks, new Map(), generated)
    expect(need.map((r) => r.id)).toEqual(['Music', 'Backup'])
  })

  // ⚠️ The multi-folder case a single boolean got wrong: granting one folder
  // must not silence the banner for the others.
  it('drops only the folder that was granted', () => {
    const files = new Map([['Music/a.mp3', new File([], 'a.mp3')]])
    const need = rootsNeedingAccess(roots, tracks, files, generated)
    expect(need.map((r) => r.id)).toEqual(['Backup'])
  })

  it('never asks for the example library, whose audio is generated', () => {
    const need = rootsNeedingAccess(roots, tracks, new Map(), generated)
    expect(need.map((r) => r.id)).not.toContain('example')
  })

  it('does not ask for an empty folder', () => {
    const need = rootsNeedingAccess([root('Empty')], tracks, new Map(), generated)
    expect(need).toHaveLength(0)
  })
})

describe('the count shown beside a folder', () => {
  it('counts what is in the library now, not what the scan found', () => {
    const tracks = [track('Music/a.mp3'), track('Music/b.mp3'), track('Backup/c.mp3')]
    expect(trackCountFor(tracks, root('Music', { trackCount: 99 }))).toBe(2)
    expect(trackCountFor(tracks, root('Backup'))).toBe(1)
  })
})
