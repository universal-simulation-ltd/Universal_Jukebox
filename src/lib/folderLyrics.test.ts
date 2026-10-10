import { describe, expect, it } from 'vitest'
import { readLyricsFile } from './folderLyrics'
import { withoutExtension } from './scan'

describe('pairing a song with its .lrc', () => {
  it('drops only the last extension', () => {
    expect(withoutExtension('Artist/Album/01 Song.mp3')).toBe('Artist/Album/01 Song')
    expect(withoutExtension('Artist/Album/01 Song.lrc')).toBe('Artist/Album/01 Song')
    expect(withoutExtension('Album/Song.live.flac')).toBe('Album/Song.live')
  })
  it('leaves a dot in a folder name alone', () => {
    expect(withoutExtension('Mr. Brightside/Track')).toBe('Mr. Brightside/Track')
    expect(withoutExtension('Media.localized/Music/Song.m4a')).toBe('Media.localized/Music/Song')
  })
})

describe('reading a .lrc', () => {
  const file = (text: string) => new File([text], 'Song.lrc', { lastModified: 1 })
  it('keeps timed lyrics, without a byte-order mark', async () => {
    const raw = await readLyricsFile(file('\uFEFF[00:01.00]First line\n[00:04.50]Second line\n'))
    expect(raw).toBe('[00:01.00]First line\n[00:04.50]Second line\n')
  })
  it('refuses an empty file and one with no words', async () => {
    expect(await readLyricsFile(file(''))).toBeNull()
    expect(await readLyricsFile(file('[00:01.00]\n[00:02.00]   \n'))).toBeNull()
  })
})
