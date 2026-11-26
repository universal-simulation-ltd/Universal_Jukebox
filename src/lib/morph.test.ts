import { describe, expect, it } from 'vitest'
import { morphWay } from './morph'

describe('morphWay — Now Playing ↔ the playing album', () => {
  const playing = { view: 'playing' as const }
  const album = (albumId: string) => ({ view: 'album' as const, albumId })

  it('opens from Now Playing into the album that is playing', () => {
    expect(morphWay(playing, album('a'), 'a')).toBe('open')
  })
  it('closes from that album back to Now Playing', () => {
    expect(morphWay(album('a'), playing, 'a')).toBe('close')
  })
  it('never morphs into or out of another album', () => {
    expect(morphWay(playing, album('b'), 'a')).toBeNull()
    expect(morphWay(album('b'), playing, 'a')).toBeNull()
  })
  it('never morphs with nothing playing, or between other screens', () => {
    expect(morphWay(playing, album('a'), undefined)).toBeNull()
    expect(morphWay({ view: 'albums' }, album('a'), 'a')).toBeNull()
    expect(morphWay(playing, { view: 'queue' }, 'a')).toBeNull()
  })
})
