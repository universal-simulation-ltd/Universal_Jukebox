import { beforeEach, describe, expect, it, vi } from 'vitest'
import { holdSession, readSession, saveSession, windowAround } from './session'

describe('windowAround', () => {
  const ids = Array.from({ length: 50 }, (_, i) => `t${i}`)
  it('keeps a short queue whole', () => {
    expect(windowAround(ids, 7, 100)).toEqual({ ids, cursor: 7 })
  })
  it('keeps a window around the position in a long one, still pointing at the same track', () => {
    const kept = windowAround(ids, 30, 10)
    expect(kept.ids).toHaveLength(10)
    expect(kept.ids[kept.cursor]).toBe('t30')
  })
  it('does not run off either end', () => {
    expect(windowAround(ids, 2, 10).ids[0]).toBe('t0')
    const end = windowAround(ids, 49, 10)
    expect(end.ids.at(-1)).toBe('t49')
    expect(end.ids[end.cursor]).toBe('t49')
  })
})

describe('saveSession', () => {
  let store: Map<string, string>
  let writes: string[]
  beforeEach(() => {
    store = new Map()
    writes = []
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { writes.push(k); store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    })
  })

  it('writes the queue only when it changes, and the position every time', () => {
    const ids = Array.from({ length: 3000 }, (_, i) => `track-${i}`)
    saveSession(ids, 5, 10)
    saveSession(ids, 5, 15)
    saveSession(ids, 5, 20)
    expect(writes.filter((k) => k === 'jukebox:session-queue')).toHaveLength(1)
    expect(writes.filter((k) => k === 'jukebox:session')).toHaveLength(3)
    // The every-five-seconds write is small.
    expect(store.get('jukebox:session')!.length).toBeLessThan(200)
    saveSession([...ids, 'track-new'], 5, 25)
    expect(writes.filter((k) => k === 'jukebox:session-queue')).toHaveLength(2)
  })

  it('reads back what it wrote', () => {
    saveSession(['a', 'b', 'c'], 1, 42.7)
    expect(readSession()).toMatchObject({ ids: ['a', 'b', 'c'], cursor: 1, trackId: 'b', sec: 42 })
  })

  it('still reads a session saved before the split', () => {
    store.set('jukebox:session', JSON.stringify({ ids: ['x', 'y'], cursor: 1, trackId: 'y', sec: 3, at: 1 }))
    expect(readSession()).toMatchObject({ ids: ['x', 'y'], cursor: 1, trackId: 'y', sec: 3 })
  })

  it('writes nothing while held — the example library being tried — and resumes after', () => {
    saveSession(['real-1', 'real-2'], 1, 30)
    holdSession(true)
    try {
      saveSession(['demo-1', 'demo-2', 'demo-3'], 2, 90)
      expect(readSession()).toMatchObject({ ids: ['real-1', 'real-2'], trackId: 'real-2', sec: 30 })
    } finally {
      holdSession(false)
    }
    saveSession(['real-1', 'real-2'], 0, 5)
    expect(readSession()).toMatchObject({ trackId: 'real-1', sec: 5 })
  })

  it('finds the track if the saved cursor no longer points at it', () => {
    store.set('jukebox:session-queue', JSON.stringify(['a', 'b', 'c']))
    store.set('jukebox:session', JSON.stringify({ cursor: 0, trackId: 'c', sec: 0, at: 0 }))
    expect(readSession()?.cursor).toBe(2)
  })
})
