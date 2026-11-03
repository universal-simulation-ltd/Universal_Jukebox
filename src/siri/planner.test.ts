import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { beforeAll, describe, expect, it } from 'vitest'
import { decideSearch, decideShortcut } from '../lib/voicePlan'
import type { PlanAlbum, PlanTrack } from '../lib/voicePlan'
import type { PlannerOutput } from './planner'

// The planner as JavaScriptCore runs it: the BUILT bundle, in a context with
// nothing in it but the language — no window, no localStorage, no fetch, no
// module loader. If anything in `lib/voicePlan.ts`'s imports starts reaching
// for the page, this fails here rather than on a locked phone, silently.

const root = fileURLToPath(new URL('../..', import.meta.url))
let planJSON: (input: string) => string

beforeAll(() => {
  execFileSync('node', ['scripts/build-planner.mjs'], { cwd: root })
  const code = readFileSync(`${root}public/siri-planner.js`, 'utf8')
  const context = vm.createContext({})
  vm.runInContext(`${code};globalThis.__plan = JukeboxPlanner.planJSON`, context)
  planJSON = context.__plan as (input: string) => string
}, 30_000)

const track = (id: string, albumId: string, over: Partial<PlanTrack> = {}): PlanTrack => ({
  id, albumId, path: `${albumId}/${id}.mp3`, title: id, artist: 'Mika', album: albumId, ...over,
})
const tracks: PlanTrack[] = [
  track('Grace Kelly', 'Life in Cartoon Motion', { trackNo: 1 }),
  track('Lollipop', 'Life in Cartoon Motion', { trackNo: 2 }),
  track('Relax', 'Life in Cartoon Motion', { trackNo: 3 }),
  track('Paranoid Android', 'OK Computer', { artist: 'Radiohead', trackNo: 2 }),
  track('Airbag', 'OK Computer', { artist: 'Radiohead', trackNo: 1 }),
]
const albums: PlanAlbum[] = [
  { id: 'Life in Cartoon Motion', artist: 'Mika' },
  { id: 'OK Computer', artist: 'Radiohead' },
]

function run(input: Record<string, unknown>, session: unknown = null): PlannerOutput {
  return JSON.parse(planJSON(JSON.stringify({
    seed: 7, hasSong: false, playing: false, manifest: JSON.stringify({ tracks, albums, session }), ...input,
  })))
}

describe('Siri planner bundle', () => {
  it('runs with nothing but the language', () => {
    expect(run({ action: 'shuffle-songs' }).do).toBe('queue')
  })

  it('shuffles exactly as the page would, for the same seed', () => {
    for (const action of ['shuffle-songs', 'shuffle-albums', 'shuffle-artists']) {
      const page = decideShortcut(action, { tracks, albums }, 7)
      const locked = run({ action })
      expect(locked).toMatchObject({ do: 'queue', at: 0 })
      if (page.kind !== 'queue' || locked.do !== 'queue') throw new Error('no queue')
      expect(locked.ids).toEqual(page.tracks.map((t) => t.id))
      expect(locked.shuffle).toBe(page.shuffle)
    }
  })

  it('plays an album asked for by name in its own order, from the song asked for', () => {
    const out = run({ action: 'search', request: { query: 'lollipop' } })
    expect(out).toEqual({ do: 'queue', ids: ['Grace Kelly', 'Lollipop', 'Relax'], at: 1, shuffle: false, startSec: 0 })
    const page = decideSearch({ query: 'lollipop' }, { tracks, albums }, 7)
    expect(page).toMatchObject({ kind: 'queue', at: 1, shuffle: false })
  })

  it('mixes an artist, and says when nothing answers', () => {
    const out = run({ action: 'search', request: { focus: 'artist', artist: 'Radiohead' } })
    expect(out.do === 'queue' && [...out.ids].sort()).toEqual(['Airbag', 'Paranoid Android'])
    expect(run({ action: 'search', request: { query: 'beyonce' } })).toEqual({ do: 'none', asked: 'beyonce' })
  })

  it('"play music" carries on: playing, then the deck, then last time, then a shuffle', () => {
    expect(run({ action: 'play', playing: true, hasSong: true })).toEqual({ do: 'nothing' })
    expect(run({ action: 'play', hasSong: true })).toEqual({ do: 'resume' })
    const session = { ids: ['Relax', 'Airbag', 'Gone'], trackId: 'Airbag', sec: 42 }
    expect(run({ action: 'play' }, session)).toEqual({ do: 'queue', ids: ['Relax', 'Airbag'], at: 1, shuffle: false, startSec: 42 })
    expect(run({ action: 'play', session: { ids: ['Lollipop'], trackId: 'Lollipop', sec: 3 } })).toMatchObject({ do: 'queue', ids: ['Lollipop'], startSec: 3 })
    expect(run({ action: 'play' })).toMatchObject({ do: 'queue', shuffle: true })
  })

  it('has nothing to play with no songs, and reports bad input instead of throwing', () => {
    expect(JSON.parse(planJSON(JSON.stringify({ action: 'play', seed: 1, hasSong: false, playing: false, manifest: '{"tracks":[]}' })))).toEqual({ do: 'empty' })
    expect(JSON.parse(planJSON('not json')).do).toBe('error')
  })
})
