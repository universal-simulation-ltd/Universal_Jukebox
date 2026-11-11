import { describe, expect, it } from 'vitest'
import { SONG_MIX_FOLLOWERS, songThenRandom } from './resume'
import type { Track } from './types'

// "Listen to this song" on the Songs tab: that song, then 19 at random
// (James, 2026-11-11).
const library = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, title: `Song ${i}`, albumId: 'a' }) as Track)

describe('songThenRandom', () => {
  it('plays the song first, then 19 others, none twice and never the song again', () => {
    const tracks = library(100)
    const list = songThenRandom(tracks[42], tracks)
    expect(SONG_MIX_FOLLOWERS).toBe(19)
    expect(list).toHaveLength(20)
    expect(list[0].id).toBe('t42')
    expect(new Set(list.map((t) => t.id)).size).toBe(20)
    expect(list.slice(1).some((t) => t.id === 't42')).toBe(false)
  })

  it('gives a small library all it has', () => {
    const tracks = library(5)
    const list = songThenRandom(tracks[0], tracks)
    expect(list).toHaveLength(5)
    expect(list[0].id).toBe('t0')
  })

  it('is just the song in a library of one', () => {
    const tracks = library(1)
    expect(songThenRandom(tracks[0], tracks).map((t) => t.id)).toEqual(['t0'])
  })

  it('does not reorder the library it was given', () => {
    const tracks = library(30)
    const before = tracks.map((t) => t.id)
    songThenRandom(tracks[3], tracks)
    expect(tracks.map((t) => t.id)).toEqual(before)
  })
})
