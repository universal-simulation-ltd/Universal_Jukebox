import { describe, expect, it } from 'vitest'
import { coverNameRank, findCoverGaps, findMerges, pickFolderImage } from './tidy'
import { UNKNOWN_ALBUM, albumKey } from './keys'
import type { Album, Track } from './types'

// The tidy-up rules, tested hard in BOTH directions.
//
// A tidy feature is judged by what it refuses to do. Finding the merge is easy;
// the tests that matter are the ones proving it leaves alone two records that
// merely look similar — because a wrongly merged album cannot be told apart
// afterwards, and the person it happens to has no way back except a rescan.

let n = 0
function track(over: Partial<Track> & { path: string; albumId: string }): Track {
  n++
  return {
    id: `t${n}`,
    name: over.path.split('/').pop() ?? 'x.flac',
    size: 1000 + n,
    mtime: 1_700_000_000_000,
    ext: 'flac',
    title: `Track ${n}`,
    album: 'An Album',
    ...over,
  }
}

function album(over: Partial<Album> & { id: string }): Album {
  return { title: 'An Album', artist: 'An Artist', trackCount: 1, cover: null, ...over }
}

describe('coverNameRank', () => {
  it('knows the names rippers use', () => {
    expect(coverNameRank('cover.jpg')).toBe(0)
    expect(coverNameRank('Folder.JPG')).toBe(1)
    expect(coverNameRank('AlbumArtSmall.png')).not.toBeNull()
  })

  it('ignores separators and case', () => {
    expect(coverNameRank('front_cover.png')).toBe(coverNameRank('frontcover.png'))
    expect(coverNameRank('FRONT-COVER.png')).toBe(coverNameRank('frontcover.png'))
  })

  // ⚠️ The refusal that matters. A photo in the folder is not the sleeve, and
  // putting it on the album replaces an honest blank tile with a wrong picture.
  it('refuses anything that is not a cover name', () => {
    expect(coverNameRank('IMG_4821.jpg')).toBeNull()
    expect(coverNameRank('band photo.jpg')).toBeNull()
    expect(coverNameRank('scan of the back.png')).toBeNull()
    expect(coverNameRank('booklet-03.jpg')).toBeNull()
  })

  it('prefers cover.jpg over the also-rans', () => {
    const best = pickFolderImage([{ name: 'albumartsmall.jpg' }, { name: 'cover.jpg' }, { name: 'folder.jpg' }])
    expect(best?.name).toBe('cover.jpg')
  })

  it('returns nothing when a folder holds only photos', () => {
    expect(pickFolderImage([{ name: 'IMG_1.jpg' }, { name: 'IMG_2.jpg' }])).toBeNull()
  })
})

describe('findMerges — what it offers', () => {
  it('merges two albums with one title in one folder', () => {
    const a = albumKey({ albumArtist: 'The Beatles', album: 'Revolver' })
    const b = albumKey({ albumArtist: 'Beatles', album: 'Revolver' })
    const tracks = [
      track({ path: 'Beatles/Revolver/01.flac', albumId: a, album: 'Revolver' }),
      track({ path: 'Beatles/Revolver/02.flac', albumId: a, album: 'Revolver' }),
      track({ path: 'Beatles/Revolver/03.flac', albumId: b, album: 'Revolver' }),
    ]
    const albums = [
      album({ id: a, title: 'Revolver', artist: 'The Beatles' }),
      album({ id: b, title: 'Revolver', artist: 'Beatles' }),
    ]
    const [merge] = findMerges(tracks, albums)
    expect(merge).toBeDefined()
    // The one with more tracks survives — most of the library already points at it.
    expect(merge.intoAlbumId).toBe(a)
    expect(merge.fromAlbumIds).toEqual([b])
    expect(merge.trackIds).toHaveLength(1)
  })

  it('adopts a track with no tags at all sitting in an album’s folder', () => {
    const a = albumKey({ albumArtist: 'Nova', album: 'Bright' })
    const tracks = [
      track({ path: 'Nova/Bright/01.flac', albumId: a, album: 'Bright' }),
      track({ path: 'Nova/Bright/02.flac', albumId: a, album: 'Bright' }),
      track({ path: 'Nova/Bright/03.flac', albumId: UNKNOWN_ALBUM, album: undefined }),
    ]
    const albums = [album({ id: a, title: 'Bright', artist: 'Nova' }), album({ id: UNKNOWN_ALBUM, title: 'Unknown album' })]
    const merges = findMerges(tracks, albums)
    const adopt = merges.find((m) => m.fromAlbumIds.length === 0)
    expect(adopt?.intoAlbumId).toBe(a)
    expect(adopt?.trackIds).toHaveLength(1)
  })

  // ⚠️ The commoner shape, and the one the first version of this rule MISSED.
  // A track with an artist but no album tag does not fall into the unknown
  // bucket — it gets its own album key (artist + empty title) and becomes a
  // one-track "Unknown album" sitting beside the record it belongs to. Keying
  // the rule off the bucket found only the fully-untagged half.
  it('⚠️ adopts a track that has an ARTIST but no album tag', () => {
    const a = albumKey({ albumArtist: 'Orphanage', album: 'Nearly Whole' })
    const orphanId = albumKey({ artist: 'Orphanage' })
    const tracks = [
      track({ path: 'Orphan/Nearly Whole/01.flac', albumId: a, album: 'Nearly Whole' }),
      track({ path: 'Orphan/Nearly Whole/02.flac', albumId: a, album: 'Nearly Whole' }),
      track({ path: 'Orphan/Nearly Whole/03.flac', albumId: orphanId, album: undefined, artist: 'Orphanage' }),
    ]
    const albums = [
      album({ id: a, title: 'Nearly Whole', artist: 'Orphanage' }),
      album({ id: orphanId, title: 'Unknown album', artist: 'Orphanage' }),
    ]
    const adopt = findMerges(tracks, albums).find((m) => m.fromAlbumIds.length === 0)
    expect(adopt?.intoAlbumId).toBe(a)
    expect(adopt?.trackIds).toHaveLength(1)
  })
})

describe('findMerges — what it REFUSES, which is the point', () => {
  it('⚠️ leaves alone two albums with the same title in DIFFERENT folders', () => {
    const a = albumKey({ albumArtist: 'Queen', album: 'Greatest Hits' })
    const b = albumKey({ albumArtist: 'Abba', album: 'Greatest Hits' })
    const tracks = [
      track({ path: 'Queen/Greatest Hits/01.flac', albumId: a, album: 'Greatest Hits' }),
      track({ path: 'Abba/Greatest Hits/01.flac', albumId: b, album: 'Greatest Hits' }),
    ]
    const albums = [
      album({ id: a, title: 'Greatest Hits', artist: 'Queen' }),
      album({ id: b, title: 'Greatest Hits', artist: 'Abba' }),
    ]
    expect(findMerges(tracks, albums)).toEqual([])
  })

  it('⚠️ leaves alone two DIFFERENT records that share a folder', () => {
    // A folder of singles. Same directory, different album names — merging
    // these would destroy two records to produce one that never existed.
    const a = albumKey({ albumArtist: 'V', album: 'Single One' })
    const b = albumKey({ albumArtist: 'V', album: 'Single Two' })
    const tracks = [
      track({ path: 'Singles/01.flac', albumId: a, album: 'Single One' }),
      track({ path: 'Singles/02.flac', albumId: b, album: 'Single Two' }),
    ]
    const albums = [
      album({ id: a, title: 'Single One', artist: 'V' }),
      album({ id: b, title: 'Single Two', artist: 'V' }),
    ]
    expect(findMerges(tracks, albums)).toEqual([])
  })

  it('⚠️ leaves alone a deluxe edition', () => {
    const a = albumKey({ albumArtist: 'X', album: 'Record' })
    const b = albumKey({ albumArtist: 'X', album: 'Record (Deluxe Edition)' })
    const tracks = [
      track({ path: 'X/Record/01.flac', albumId: a, album: 'Record' }),
      track({ path: 'X/Record/02.flac', albumId: b, album: 'Record (Deluxe Edition)' }),
    ]
    const albums = [
      album({ id: a, title: 'Record', artist: 'X' }),
      album({ id: b, title: 'Record (Deluxe Edition)', artist: 'X' }),
    ]
    expect(findMerges(tracks, albums)).toEqual([])
  })

  it('⚠️ does not adopt loose tracks when the folder holds two albums', () => {
    // No single right answer, so it says nothing rather than guessing.
    const a = albumKey({ albumArtist: 'A', album: 'One' })
    const b = albumKey({ albumArtist: 'B', album: 'Two' })
    const tracks = [
      track({ path: 'Mixed/01.flac', albumId: a, album: 'One' }),
      track({ path: 'Mixed/02.flac', albumId: b, album: 'Two' }),
      track({ path: 'Mixed/03.flac', albumId: UNKNOWN_ALBUM, album: undefined }),
    ]
    const albums = [
      album({ id: a, title: 'One', artist: 'A' }),
      album({ id: b, title: 'Two', artist: 'B' }),
      album({ id: UNKNOWN_ALBUM, title: 'Unknown album' }),
    ]
    expect(findMerges(tracks, albums).filter((m) => m.fromAlbumIds.length === 0)).toEqual([])
  })

  it('⚠️ does not merge an album that also has tracks elsewhere', () => {
    // Album `a` is spread over two folders, so its presence here is not
    // evidence that it is the same record as `b`.
    const a = albumKey({ albumArtist: 'A', album: 'Spread' })
    const b = albumKey({ albumArtist: 'B', album: 'Spread' })
    const tracks = [
      track({ path: 'Here/01.flac', albumId: a, album: 'Spread' }),
      track({ path: 'Elsewhere/02.flac', albumId: a, album: 'Spread' }),
      track({ path: 'Here/03.flac', albumId: b, album: 'Spread' }),
    ]
    const albums = [
      album({ id: a, title: 'Spread', artist: 'A' }),
      album({ id: b, title: 'Spread', artist: 'B' }),
    ]
    expect(findMerges(tracks, albums)).toEqual([])
  })

  it('finds nothing at all in a tidy library', () => {
    const a = albumKey({ albumArtist: 'A', album: 'One' })
    const b = albumKey({ albumArtist: 'B', album: 'Two' })
    const tracks = [
      track({ path: 'A/One/01.flac', albumId: a, album: 'One' }),
      track({ path: 'B/Two/01.flac', albumId: b, album: 'Two' }),
    ]
    expect(findMerges(tracks, [album({ id: a }), album({ id: b })])).toEqual([])
  })
})

describe('findCoverGaps', () => {
  it('lists albums with no artwork, and where to look', () => {
    const a = albumKey({ albumArtist: 'A', album: 'Bare' })
    const tracks = [
      track({ path: 'A/Bare/01.flac', albumId: a }),
      track({ path: 'A/Bare/02.flac', albumId: a }),
    ]
    const [gap] = findCoverGaps(tracks, [album({ id: a, title: 'Bare', artist: 'A' })])
    expect(gap.albumId).toBe(a)
    expect(gap.directories).toEqual(['A/Bare'])
    expect(gap.trackIds).toHaveLength(2)
  })

  it('skips albums that already have a cover', () => {
    const a = albumKey({ albumArtist: 'A', album: 'Sleeved' })
    const tracks = [track({ path: 'A/Sleeved/01.flac', albumId: a })]
    const withArt = album({ id: a, cover: new Blob(['x']) })
    expect(findCoverGaps(tracks, [withArt])).toEqual([])
  })

  // The unknown bucket is not a record — it is where untagged files go — so
  // there is no sleeve to find and offering one would be nonsense.
  it('⚠️ skips the unknown-album bucket', () => {
    const tracks = [track({ path: 'Loose/01.flac', albumId: UNKNOWN_ALBUM })]
    expect(findCoverGaps(tracks, [album({ id: UNKNOWN_ALBUM, title: 'Unknown album' })])).toEqual([])
  })
})
