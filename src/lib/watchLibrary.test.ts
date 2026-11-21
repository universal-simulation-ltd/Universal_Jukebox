import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildWatchLibrary, type WatchLibraryInput } from './watchLibrary'
import { decideCollection, type PlanAlbum, type PlanTrack } from './voicePlan'

// The watch's library, held to the fixture the Swift tests decode
// (`ios/App/JukeboxWatchTests/library.json`) — the two ends of one protocol.

const FIXTURE = fileURLToPath(new URL('../../ios/App/JukeboxWatchTests/library.json', import.meta.url))

export const watchInput: WatchLibraryInput = {
  tracks: [
    { id: 't1', albumId: 'a-sides' },
    { id: 't2', albumId: 'a-sides' },
    { id: 't3', albumId: 'a-quiet' },
    { id: 't4', albumId: 'a-long' },
    { id: 't5', albumId: 'a-long' },
  ],
  albums: [
    { id: 'a-long', title: 'The Long Player', artist: 'The Tone Arms', year: 1971, trackCount: 2 },
    { id: 'a-sides', title: 'Sides A and B', artist: 'The Tone Arms', year: 1968, trackCount: 2 },
    { id: 'a-quiet', title: 'Quiet Rooms', artist: 'Marguerite Vale', year: 1975, trackCount: 1 },
  ],
  shelves: [
    { id: 'most', name: 'Most played', kind: 'most', trackIds: ['t3', 't1'] },
    { id: 'gone', name: 'Shelf 1', kind: 'shelf', trackIds: ['not-in-library'] },
    { id: 's2', name: 'Sunday', kind: 'shelf', trackIds: ['t5', 'missing', 't2'] },
  ],
  tabs: ['albums', 'artists', 'tracks', 'jukebox', 'mix'],
  example: false,
  covers: ['a-sides'],
}

describe('buildWatchLibrary', () => {
  const built = buildWatchLibrary(watchInput)

  it('matches the fixture the Swift side decodes', () => {
    expect(JSON.parse(readFileSync(FIXTURE, 'utf8'))).toEqual(built)
  })

  it('follows the phone tab order, and leaves out Mix', () => {
    expect(built.sections).toEqual(['albums', 'artists', 'songs', 'shelves'])
  })

  it('lists albums A–Z and an artist’s albums oldest first', () => {
    expect(built.albums.map((a) => a.t)).toEqual(['The Long Player', 'Quiet Rooms', 'Sides A and B'])
    expect(built.artists.find((a) => a.id === 'The Tone Arms')).toEqual({ id: 'The Tone Arms', al: ['a-sides', 'a-long'], c: 4 })
  })

  it('drops songs no longer in the library, and shelves left with none', () => {
    expect(built.shelves.map((s) => [s.id, s.ids])).toEqual([
      ['most', ['t3', 't1']],
      ['s2', ['t5', 't2']],
    ])
    expect(built.shelves[1].art).toBe('a-long')
  })

  it('changes rev when a cover arrives, and only then', () => {
    expect(buildWatchLibrary(watchInput).rev).toBe(built.rev)
    expect(buildWatchLibrary({ ...watchInput, covers: ['a-sides', 'a-long'] }).rev).not.toBe(built.rev)
  })
})

describe('decideCollection', () => {
  const track = (id: string, albumId: string, trackNo: number): PlanTrack => ({ id, albumId, path: `${albumId}/${id}.mp3`, title: id, trackNo })
  const tracks = [track('b2', 'B', 2), track('a2', 'A', 2), track('b1', 'B', 1), track('a1', 'A', 1)]
  const albums: PlanAlbum[] = [{ id: 'A', artist: 'X' }, { id: 'B', artist: 'X' }]
  const library = { tracks, albums }
  const ids = (d: ReturnType<typeof decideCollection>) => (d.kind === 'queue' ? d.tracks.map((t) => t.id) : d.kind)

  it('plays albums in turn, each in its own order', () => {
    expect(ids(decideCollection({ albums: ['B', 'A'] }, library, 1))).toEqual(['b1', 'b2', 'a1', 'a2'])
  })

  it('plays a shelf in shelf order, skipping songs gone since', () => {
    expect(ids(decideCollection({ tracks: ['a2', 'gone', 'b1'] }, library, 1))).toEqual(['a2', 'b1'])
  })

  it('shuffles with shuffle on, and the same seed shuffles the same way', () => {
    const one = decideCollection({ albums: ['A', 'B'], shuffle: true }, library, 9)
    expect(one).toMatchObject({ kind: 'queue', shuffle: true })
    expect(ids(one)).toEqual(ids(decideCollection({ albums: ['A', 'B'], shuffle: true }, library, 9)))
    expect([...(ids(one) as string[])].sort()).toEqual(['a1', 'a2', 'b1', 'b2'])
  })

  it('says none when nothing of it is left', () => {
    expect(decideCollection({ albums: ['Z'] }, library, 1).kind).toBe('none')
    expect(decideCollection({}, library, 1).kind).toBe('none')
  })
})
