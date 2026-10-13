import { beforeEach, describe, expect, it } from 'vitest'
import { useHiddenStore, NOTHING_HIDDEN } from '../lib/hidden'
import type { Album, Track } from '../lib/types'
import { useLibraryStore, wholeLibrary } from './libraryStore'

const track = (id: string, albumId: string): Track =>
  ({ id, path: `m/${id}`, name: id, size: 1, mtime: 1, ext: 'mp3', title: id, artist: 'X', albumId }) as Track
const album = (id: string, trackCount: number): Album => ({ id, title: id, artist: 'X', trackCount, cover: null }) as Album

describe('the library store, as the screens see it', () => {
  beforeEach(() => {
    useHiddenStore.setState({ hidden: { ...NOTHING_HIDDEN } })
    useLibraryStore.setState({ tracks: [track('a', 'one'), track('b', 'one'), track('c', 'two')], albums: [album('one', 2), album('two', 1)] })
  })

  it('leaves a removed album out of the view and keeps it in the catalogue', () => {
    useHiddenStore.getState().hide('albums', 'two')
    expect(useLibraryStore.getState().tracks.map((t) => t.id)).toEqual(['a', 'b'])
    expect(useLibraryStore.getState().albums.map((x) => x.id)).toEqual(['one'])
    expect(wholeLibrary().tracks).toHaveLength(3)
    useHiddenStore.getState().restore('albums', 'two')
    expect(useLibraryStore.getState().tracks).toHaveLength(3)
  })

  it('a write through the view does not lose what it hides', () => {
    useHiddenStore.getState().hide('tracks', 'm/a')
    useLibraryStore.setState({ tracks: useLibraryStore.getState().tracks.map((t) => ({ ...t, durationSec: 5 })) })
    expect(wholeLibrary().tracks.map((t) => t.id).sort()).toEqual(['a', 'b', 'c'])
    expect(useLibraryStore.getState().tracks.every((t) => t.durationSec === 5)).toBe(true)
    useHiddenStore.getState().restore('tracks', 'm/a')
    expect(useLibraryStore.getState().tracks.map((t) => t.id).sort()).toEqual(['a', 'b', 'c'])
  })
})
