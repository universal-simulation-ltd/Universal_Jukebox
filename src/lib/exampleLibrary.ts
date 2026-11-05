import { albumKey, trackKey } from './keys'
import type { LyricSheet } from './lyrics'
import type { PlayCount } from './playCounts'
import type { Album, Track } from './types'

// An example library, so somebody with no music to hand can take the app for a
// spin (James, 2026-09-09).
//
// ⚠️ THE MUSIC IS GENERATED IN THE BROWSER. Nothing is downloaded and no
// audio is bundled. That is not a clever trick for its own sake; it is the
// only honest way for THIS app to have a demo:
//
//   • Shipping real music means licensing real music, and "it's only a demo" is
//     not a licence. Shipping a handful of Creative Commons tracks would mean
//     attribution text somebody has to maintain, and a several-megabyte payload
//     on an app whose whole pitch is that it holds nothing.
//   • The app is about YOUR files. A demo that quietly downloads somebody
//     else's contradicts the front page.
//
// So: five artists, ten records, thirty-five tracks of synthesised music, none
// of which exists until it is asked for — sung, since 2026-11-02 (`planVocal`). The sleeves are CC0 photos with the
// album name set on top (James, 2026-10-20), in a chunk of their own that only
// loads with the example (`exampleCovers.ts`); the drawn sleeves below stay as
// the fallback.
//
// ⚠️ THE AUDIO IS MADE LAZILY AND THE INDEX IS NOT. The library — titles,
// artists, years, track numbers, durations, artwork — is built in one go when
// the user asks for it, because that is what fills the grid. The WAV for a
// given track is synthesised the first time something tries to PLAY it, which
// is what keeps this from putting fifty megabytes of PCM into the tab to show
// somebody a grid of covers.
//
// ⚠️ AND IT IS DETERMINISTIC. Every note comes from a PRNG seeded with the
// track's own path, so a track sounds the same on Tuesday as it did on Monday,
// survives being evicted from the cache below, and — the one that actually
// matters — still plays after a reload, when the library has come back out of
// IndexedDB and there is nothing on disk for it to point at.

/** The root id, so the library store can tell this apart from a real folder. */
export const EXAMPLE_ROOT_ID = 'example'
/** The root's name and prefix — DATA, so English; `shownRootLabel` (lib/roots) translates it on screen. */
export const EXAMPLE_LABEL = 'Example library'

/**
 * The path prefix every generated track carries.
 *
 * It is what `isExampleTrack` recognises after a reload, so it has to be
 * something no real folder produces — a real path is relative to the folder the
 * user chose and never carries a root of its own.
 */
const PREFIX = 'Example library/'

const RATE = 22_050
const CHANNELS = 1
const BYTES_PER_SAMPLE = 2
const WAV_HEADER_BYTES = 44

// ── The records ──────────────────────────────────────────────────────────────

interface Recipe {
  /** MIDI note of the key's root. */
  root: number
  /** Minor keys get the flattened third; it is most of what "sadder" means. */
  minor: boolean
  bpm: number
  /** The lead instrument's brightness — how much odd harmonic is mixed in. */
  bite: number
  /** How busy the lead is, 0–1. */
  density: number
  /** Drums at all. A piano record has none. */
  drums: boolean
  /** How loud the pad sits under everything. */
  pad: number
  /**
   * Beats in a bar: 4 unless said otherwise. 3 is a waltz — the bass on one,
   * the chord on two and three ("oom-pah-pah"), the kick on one only. Lyrics
   * are timed in the same bars (`lyricBeats`).
   */
  meter?: 3 | 4
}

interface ExampleAlbum {
  artist: string
  title: string
  year: number
  genre: string
  recipe: Recipe
  /** Track titles, in running order. Their lengths come from the seed. */
  tracks: string[]
  /**
   * Which sleeve construction to use, when the hash's choice would make two
   * records by the same artist look like cousins. See `drawSleeve`.
   */
  sleeve?: 0 | 1 | 2 | 3
  /** The photo sleeve's lettering: a serif title, and/or set centred. */
  serif?: boolean
  centred?: boolean
  /**
   * Words for EVERY song, by track index — written for these made-up records,
   * so the lyrics panel, the orbit, the lock-screen line and the lyric marks
   * can all be shown with nothing looked up (2026-09-27, for the store
   * screenshots and App Review, who have no music of their own; every song
   * since 2026-11-02, James: "have all songs with lyrics"). Timed to the bars
   * by `exampleLyrics`.
   */
  lyrics?: Record<number, string[]>
}

/**
 * ⚠️ THE SHAPE OF THIS LIST IS PART OF THE DEMO, not just its contents.
 *
 * Two artists have three or more records, because three is the point at which
 * the album grid folds a run into a fan (`FAN_MIN` in `AlbumGrid.tsx`) — a
 * demo library of eleven one-album artists would show none of that, and the
 * fan and its open state are among the things worth showing. One artist has a
 * single record, so the ungrouped case is on screen too.
 */
const ALBUMS: ExampleAlbum[] = [
  {
    artist: 'The Tone Arms',
    title: 'Sides A and B',
    year: 2019,
    genre: 'Indie',
    recipe: { root: 57, minor: false, bpm: 104, bite: 0.3, density: 0.62, drums: true, pad: 0.5 },
    tracks: ['Lead-in Groove', 'Counterweight', 'Anti-skate', 'The Long Way Round'],
    lyrics: {
      0: [
        'Silence first, then the hiss begins',
        'A little crackle where the song comes in',
        'Hold your breath for the very first note',
        'The one we waited for, the one you wrote',
        'Lead me in, lead me in',
        'Spiral down to where the songs begin',
        'Lead me in, lead me in',
        'Play it once and play again',
      ],
      1: [
        'You were the weight on the other side',
        'Kept me level when the needle slid',
        'Never pressing, never letting go',
        'Just enough to let the music flow',
        'Counterweight, counterweight',
        'Balance me when I’m running late',
        'Counterweight, counterweight',
        'Hold me steady, hold me straight',
      ],
      2: [
        'Pulled toward the middle every night',
        'A little push to keep the sound right',
        'You never notice what keeps you true',
        'Till it’s gone and the songs skip through',
        'Don’t let me slide, don’t let me skate',
        'Keep me turning, keep me straight',
        'Don’t let me slide, don’t let me skate',
        'Hold the groove until it’s late',
      ],
      3: [
        'Took the long way round the record',
        'Past the bridge and the second verse',
        'Tone arm drifting to the centre',
        'Nothing better, nothing worse',
        'Round and round, the long way round',
        'Every lap a little slower',
        'Round and round, the long way round',
        'Till the music plays no more',
      ],
    },
  },
  {
    artist: 'The Tone Arms',
    title: 'Second Pressing',
    year: 2021,
    genre: 'Indie',
    recipe: { root: 55, minor: true, bpm: 96, bite: 0.36, density: 0.55, drums: true, pad: 0.55 },
    tracks: ['Dust Cover', 'Slipmat', 'Forty-five', 'Static on the Inner Groove'],
    lyrics: {
      0: [
        'Close the lid when the party ends',
        'Keep the dust off our dearest friends',
        'Every sleeve back where it belongs',
        'A quiet room full of sleeping songs',
        'Under glass, under glass',
        'Let the long night slowly pass',
        'Under glass, under glass',
        'We’ll play them all again at last',
      ],
      1: [
        'Spinning under, never seen',
        'Felt and circles in between',
        'Let the record slip and stay',
        'Cue it up and let it play',
        'Slip, slip, slipmat',
        'Round the room and coming back',
        'Slip, slip, slipmat',
        'Hold the beat and keep the track',
      ],
      3: [
        'Near the end the noise gets louder',
        'Static rising like a crowd',
        'Every song we couldn’t finish',
        'Hissing softly, out loud',
        'Inner groove, inner groove',
        'Nothing left but room to move',
        'Inner groove, inner groove',
        'The quiet part was always you',
      ],
      2: [
        'Put the needle down where we left it',
        'Forty-five turns and the room comes back',
        'Every scratch a night we spent in',
        'Every crackle an old wisecrack',
        'Spin it slow, spin it slow',
        'Hold the sleeve up to the light',
        'We wore the groove down to the label',
        'Flip it over, play it all night',
      ],
    },
  },
  {
    artist: 'The Tone Arms',
    title: 'The Long Player',
    year: 2023,
    genre: 'Indie',
    recipe: { root: 60, minor: false, bpm: 88, bite: 0.24, density: 0.48, drums: true, pad: 0.62 },
    tracks: ['Twelve Inches', 'Gatefold', 'Sleeve Notes', 'Repress'],
    // The hash gives this the rings "Sides A and B" already has — two of one
    // band's four sleeves the same shape, side by side in the opened fan.
    sleeve: 3,
    lyrics: {
      0: [
        'Twelve inches wide and twenty minutes deep',
        'A whole side of promises to keep',
        'Lay it flat and lift the arm',
        'Turn it slowly, keep it warm',
        'Big enough to hold the night',
        'Black and round and shining bright',
        'Twelve inches, twenty minutes',
        'Everything we need is in it',
      ],
      1: [
        'Open up the gatefold wide',
        'Photographs on either side',
        'Faces from a summer gone',
        'Names in pencil, every one',
        'Fold it open, fold it out',
        'This is what the songs are about',
        'Fold it open, fold it out',
        'Read the words and sing them out',
      ],
      2: [
        'Small print on the back of the sleeve',
        'Who played what and who couldn’t leave',
        'Thank you mum and thank you town',
        'Recorded live and written down',
        'Read the notes, read the notes',
        'Every name and every quote',
        'Read the notes, read the notes',
        'Somewhere there’s the line you wrote',
      ],
      3: [
        'They pressed it once and it sold out',
        'They pressed again without a doubt',
        'Same old songs on brand new wax',
        'Same mistakes on all the tracks',
        'Press it again, press it again',
        'Play it like we played it then',
        'Press it again, press it again',
        'Every time, we’re young again',
      ],
    },
  },
  {
    artist: 'The Tone Arms',
    title: 'Run-out',
    year: 2025,
    centred: true,
    genre: 'Indie',
    recipe: { root: 58, minor: true, bpm: 112, bite: 0.42, density: 0.68, drums: true, pad: 0.42 },
    tracks: ['Locked Groove', 'Matrix Number', 'Fade to Centre'],
    lyrics: {
      0: [
        'Round and round the same short line',
        'Caught in a circle, lost in time',
        'Lift me up or leave me here',
        'Same three seconds, year on year',
        'Locked groove, locked groove',
        'Nowhere left for me to move',
        'Locked groove, locked groove',
        'Round again, I’m round again',
      ],
      1: [
        'Scratched by hand where the label ends',
        'A secret code for the closest friends',
        'Letters, numbers, a name or two',
        'A message only the cutter knew',
        'Read the run-out, tilt it to the light',
        'Someone wrote a note tonight',
        'Read the run-out, tilt it to the light',
        'Every pressing gets it right',
      ],
      2: [
        'The song gets quiet as it nears the end',
        'Spiral slower round the final bend',
        'Nothing left but the turning sound',
        'Of the needle going round and round',
        'Fade to centre, fade to grey',
        'Let the last note slip away',
        'Fade to centre, fade to grey',
        'Lift the arm and call it a day',
      ],
    },
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Cutting Head',
    year: 2020,
    genre: 'Dub',
    recipe: { root: 45, minor: true, bpm: 72, bite: 0.2, density: 0.4, drums: true, pad: 0.7 },
    tracks: ['Acetate', 'Half-speed', 'Bass Trap'],
    lyrics: {
      1: [
        'Slow it down, slow it down',
        'Half the speed and twice the sound',
        'Every beat a little wide',
        'Room enough to step inside',
        'Half-speed, half-speed',
        'All the time that we need',
        'Slow it down, slow it down',
        'Feel the bass come round',
      ],
      2: [
        'Low notes gather in the corner',
        'Rolling round the room like water',
        'Catch them, hold them, let them be',
        'Deep down where the bass runs free',
        'Bass trap, bass trap',
        'Hold the low end, bring it back',
        'Bass trap, bass trap',
        'Heavy like a heartbeat, heavy like that',
      ],
      0: [
        'Cut it once, cut it deep',
        'Acetate for us to keep',
        'Low end rolling through the floor',
        'Play it back, play it once more',
        'Soft as wax and twice as warm',
        'Rocking steady through the storm',
        'Cut it once, cut it deep',
        'Acetate for us to keep',
      ],
    },
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Test Pressing',
    year: 2022,
    genre: 'Dub',
    recipe: { root: 43, minor: true, bpm: 68, bite: 0.16, density: 0.34, drums: true, pad: 0.78 },
    tracks: ['One Off', 'Reference Cut', 'Room Tone'],
    // Same again: the rings would repeat "Cutting Head", two years earlier.
    sleeve: 3,
    lyrics: {
      0: [
        'Only one of these was made',
        'Pressed by hand and never played',
        'Hold it gently, hold it near',
        'There won’t be another here',
        'One off, one off',
        'One night only, one take enough',
        'One off, one off',
        'Hold it close and don’t let go',
      ],
      1: [
        'Play it back and tell me true',
        'Is it what we meant to do',
        'Turn the dial and check the sound',
        'Low end steady, feet on the ground',
        'Reference, reference',
        'Every echo making sense',
        'Reference, reference',
        'Cut it right and cut it once',
      ],
      2: [
        'Nobody playing, nobody there',
        'Just the hum of the empty air',
        'Microphones listening to the floor',
        'The sound of the room and nothing more',
        'Room tone, room tone',
        'Quiet when we’re all alone',
        'Room tone, room tone',
        'Every room has a tone of its own',
      ],
    },
  },
  {
    artist: 'Lathe & the Lacquers',
    title: 'Master Lacquer',
    year: 2024,
    serif: true,
    genre: 'Dub',
    recipe: { root: 47, minor: true, bpm: 76, bite: 0.26, density: 0.44, drums: true, pad: 0.72 },
    tracks: ['Mother', 'Stamper', 'Plating Room'],
    lyrics: {
      0: [
        'From the master comes the mother',
        'One record made from another',
        'Down the line the copies go',
        'Every groove we used to know',
        'Mother, mother, make it true',
        'Every pressing comes from you',
        'Mother, mother, make it new',
        'Every song still sounds like you',
      ],
      1: [
        'Press it hard and press it down',
        'Hot wax spinning round and round',
        'Stamp the music, seal it in',
        'Every song where it’s always been',
        'Stamper, stamper, heavy hand',
        'Pressing records for the band',
        'Stamper, stamper, steady beat',
        'Rolling out into the street',
      ],
      2: [
        'Silver baths and humming wire',
        'Nickel rising, slow and higher',
        'In the plating room at night',
        'Copies growing in the light',
        'Plating room, plating room',
        'Metal growing from the groove',
        'Plating room, plating room',
        'Morning always comes too soon',
      ],
    },
  },
  {
    artist: 'Marguerite Vale',
    title: 'Quiet Rooms',
    year: 2018,
    serif: true,
    centred: true,
    genre: 'Modern classical',
    recipe: { root: 62, minor: false, bpm: 60, bite: 0.1, density: 0.36, drums: false, pad: 0.85 },
    tracks: ['Morning, First Light', 'The Blue Hour', 'Someone Downstairs', 'Nocturne for an Empty House'],
    lyrics: {
      0: [
        'The curtains pale before the sun',
        'A kettle, and the day begun',
        'Light lays its hand along the floor',
        'And finds the shape it found before',
        'Morning, first light',
        'Nothing yet, and all is right',
      ],
      1: [
        'The day has gone but not the light',
        'The street lamps wait to say goodnight',
        'Blue on the windows, blue on the wall',
        'Blue in the hush after it all',
        'Stay a while, the blue hour',
        'Stay a while before the dark',
      ],
      2: [
        'A door below, a careful tread',
        'A song half-hummed and left unsaid',
        'Someone downstairs is still awake',
        'Turning the pages for my sake',
        'I hear you through the floor',
        'And I’m not alone any more',
      ],
      3: [
        'The chairs are still where we sat down',
        'The clocks go on without a sound',
        'The rooms remember every name',
        'And keep the light the way it came',
        'Goodnight, house',
        'Goodnight, the quiet and the moon',
      ],
    },
  },
  {
    artist: 'Static Bloom',
    title: 'Surface Noise',
    year: 2024,
    genre: 'Electronic',
    recipe: { root: 52, minor: true, bpm: 124, bite: 0.55, density: 0.8, drums: true, pad: 0.38 },
    tracks: ['Crackle', 'Pop', 'Wow and Flutter'],
    lyrics: {
      1: [
        'One pop, two pop, kick it in',
        'Feel the static on your skin',
        'Every click a little spark',
        'Lighting up the dancing dark',
        'Pop, pop, here we go',
        'Turn the lights down, turn it low',
        'Pop, pop, here we go',
        'Every glitch becomes a show',
      ],
      2: [
        'Bending notes like summer heat',
        'A wobble in the sleeping beat',
        'Speeding up and slowing down',
        'Tape that’s seen the whole of town',
        'Wow and flutter, flutter and wow',
        'Every second, here and now',
        'Wow and flutter, flutter and wow',
        'Hold the note and take a bow',
      ],
      0: [
        'Crackle in the speaker, static in my head',
        'Dancing on the surface of the words we never said',
        'Lights go low, the bassline hums',
        'Here it comes, here it comes',
        'Crackle, crackle, turn it up',
        'Pour the noise into my cup',
        'Crackle, crackle, all night long',
        'Every hiss becomes a song',
      ],
    },
  },
  {
    // The fifth artist, in a style none of the others has: folk, in waltz time
    // (2026-11-02, James: "go ahead with all library richer suggestions").
    // Named for the first records of all, which held about two minutes each.
    artist: 'The Wax Cylinders',
    title: 'Parlour Songs',
    year: 2017,
    serif: true,
    genre: 'Folk',
    recipe: { root: 55, minor: false, bpm: 132, bite: 0.34, density: 0.5, drums: true, pad: 0.6, meter: 3 },
    tracks: ['Wax and Wane', 'Speak Into the Horn', 'Two Minutes Each', 'The Parlour Waltz'],
    lyrics: {
      0: [
        'The moon came up on the old mill lane',
        'Round as a record and turning again',
        'Fuller each night as the summer grew long',
        'And thinner each night as we sang the same song',
        'Wax and wane, wax and wane',
        'Everything leaves and comes back again',
        'Wax and wane, wax and wane',
        'Turn me around and I’ll sing it again',
      ],
      1: [
        'Lean to the horn and say it slow',
        'Say it the way that you want it to go',
        'The needle will listen and carve what you say',
        'And keep it for someone a hundred years away',
        'Speak into the horn, love',
        'Sing it while you’re young',
        'Speak into the horn, love',
        'Hold the note and leave it sung',
      ],
      2: [
        'Two minutes each was all they would hold',
        'A fiddle, a voice and a story told',
        'So say what you mean and say it quick',
        'Before the end of the candle wick',
        'Two minutes each, two minutes each',
        'Everything worth it is in our reach',
        'Two minutes each, then turn it round',
        'Before the wax runs out of sound',
      ],
      3: [
        'Roll back the rug and light the lamp',
        'Open the window against the damp',
        'Grandmother’s fiddle is down from the wall',
        'There’s room for a waltz if there’s room for us all',
        'One, two, three, round we go',
        'Under the beams where the candles glow',
        'One, two, three, round again',
        'Dancing till the clock strikes ten',
      ],
    },
  },
]

// ── Building the library ─────────────────────────────────────────────────────

/**
 * The index: everything the grid needs, with the artwork drawn and nothing
 * decoded.
 *
 * Async only because drawing a sleeve ends in `canvas.toBlob`, which is.
 */
export async function buildExampleLibrary(): Promise<{ tracks: Track[]; albums: Album[] }> {
  const tracks: Track[] = []
  const albums: Album[] = []

  for (const entry of ALBUMS) {
    const id = albumKey({ album: entry.title, albumArtist: entry.artist })
    albums.push({
      id,
      title: entry.title,
      artist: entry.artist,
      year: entry.year,
      trackCount: entry.tracks.length,
      cover: await drawSleeve(entry),
    })

    entry.tracks.forEach((title, i) => {
      const path = trackPath(entry, i)
      const seconds = trackSeconds(path)
      const size = WAV_HEADER_BYTES + Math.round(seconds * RATE) * CHANNELS * BYTES_PER_SAMPLE
      tracks.push({
        // ⚠️ The same `trackKey` a real scan uses, over path + size + mtime.
        // The mtime is a fixed date rather than `Date.now()` for the reason at
        // the top of this file: the ids have to come out identical next time, or
        // a reload produces a library whose every track is "new".
        id: trackKey({ path, size, mtime: FIXED_MTIME }),
        path,
        name: `${pad2(i + 1)} ${title}.wav`,
        size,
        mtime: FIXED_MTIME,
        ext: 'wav',
        title,
        artist: entry.artist,
        albumArtist: entry.artist,
        album: entry.title,
        trackNo: i + 1,
        year: entry.year,
        genre: entry.genre,
        // Known up front, unlike a real scan's — which is a small gift: the
        // album totals are right before anything has been played.
        durationSec: seconds,
        albumId: id,
        // Their words are in the app (`exampleLyrics`), so this is known too.
        hasLyrics: Boolean(entry.lyrics?.[i]),
      })
    })
  }

  return { tracks, albums }
}

/** 1 January 2020, so every id is reproducible. */
const FIXED_MTIME = Date.UTC(2020, 0, 1)

/** Where one example track lives. The one place the shape of that path is decided. */
function trackPath(entry: ExampleAlbum, index: number): string {
  return `${PREFIX}${entry.artist}/${entry.title}/${pad2(index + 1)} ${entry.tracks[index]}.wav`
}

/**
 * Every example track's path, and whether its record has drums.
 *
 * ⚠️ A TEST SEAM, and the reason it exists is in the README: the first week of
 * this library was a drum machine and nothing failed. `buildExampleLibrary`
 * cannot run in Node (it draws sleeves on a canvas), so the sound test walks
 * the records through this instead — built from the same `trackPath`, so the
 * two lists cannot drift apart.
 */
export function exampleTrackPaths(): { path: string; drums: boolean }[] {
  return ALBUMS.flatMap((entry) =>
    entry.tracks.map((_, i) => ({ path: trackPath(entry, i), drums: entry.recipe.drums })),
  )
}

/**
 * One VOICE of one example track, rendered on its own — the PCM the real
 * track would contain if the other three were muted.
 *
 * ⚠️ A test seam, and PER VOICE on purpose. A whole-track measurement was
 * healthy the entire time the pad, the bass and the lead wrote nothing, because
 * the drums are built by different functions and were never affected. The only
 * measurement that sees a silent melody is one that listens to the melody.
 */
export function renderExampleVoice(path: string, voice: Voice): Float32Array | null {
  const entry = albumFor(path)
  if (!entry) return null
  return render(path, entry.recipe, trackSeconds(path), voice, linesOf(entry, path))
}

function albumFor(path: string): ExampleAlbum | undefined {
  return ALBUMS.find((a) => path.includes(`/${a.title}/`) && path.includes(`/${a.artist}/`))
}

/** The words of the song at `path` on this record, or undefined. */
function linesOf(entry: ExampleAlbum, path: string): string[] | undefined {
  const index = entry.tracks.findIndex((_, i) => trackPath(entry, i) === path)
  return index < 0 ? undefined : entry.lyrics?.[index]
}

/**
 * The words of an example song, as a timed sheet — or null for a song that has
 * none (none, since 2026-11-02, but a record added later might not).
 *
 * ⚠️ TIMED TO THE MUSIC, not spread evenly (2026-11-02). A line starts on a
 * bar — or on a beat, when the song is too short for a bar a line — after a
 * bar of introduction; when there is room, a bar's break sits halfway, where
 * the chorus comes in; and the last line leaves at least a bar before the end.
 * `render` plays a four-beat bar at the recipe's tempo from 0, so these land
 * on the chord changes you can hear.
 */
export function exampleLyrics(track: Track): LyricSheet | null {
  if (!isExampleTrack(track)) return null
  const entry = albumFor(track.path)
  if (!entry?.lyrics) return null
  const index = entry.tracks.findIndex((_, i) => trackPath(entry, i) === track.path)
  const lines = entry.lyrics[index]
  if (!lines?.length) return null
  return {
    synced: true,
    source: 'file',
    lines: lyricBeats(lines.length, trackSeconds(track.path), entry.recipe.bpm, entry.recipe.meter).map((at, i) => ({
      timeSec: Math.round(at * 100) / 100,
      text: lines[i],
    })),
  }
}

/**
 * When each of `count` lines starts, in seconds — in bars of `meter` beats.
 * Exported for the test, and used by the singing (`planVocal`), so the words
 * on screen and the tune you hear cannot drift apart.
 */
export function lyricBeats(count: number, seconds: number, bpm: number, meter = 4): number[] {
  const beat = 60 / bpm
  const intro = meter
  const outro = meter
  const room = Math.floor(seconds / beat) - intro - outro
  let each = Math.max(1, Math.floor(room / count))
  if (each >= meter) each -= each % meter
  const pause = room - each * count >= meter ? meter : 0
  const half = Math.ceil(count / 2)
  return Array.from({ length: count }, (_, i) => (intro + i * each + (i >= half ? pause : 0)) * beat)
}

/**
 * Listening already done in the example library, by song title (2026-11-02,
 * James: "go ahead with all library richer suggestions"). Without it, Most
 * played — a shelf that only appears once a song has been played twice — is
 * missing from the demo, and a reviewer would have to sit through two plays
 * of a song to learn it exists. A spread across all five artists, as somebody
 * who had owned the records a while might have it.
 */
const EXAMPLE_PLAYS: Readonly<Record<string, number>> = {
  'Counterweight': 9,
  'Crackle': 8,
  'The Parlour Waltz': 7,
  'Morning, First Light': 6,
  'Lead-in Groove': 6,
  'Bass Trap': 5,
  'Repress': 5,
  'Wax and Wane': 4,
  'Locked Groove': 4,
  'The Blue Hour': 3,
  'Wow and Flutter': 3,
  'Half-speed': 2,
  'Slipmat': 2,
}

/**
 * The example library's play counts, for `seedPlays` — each last heard a day
 * or more before `now`, the most played most recently.
 */
export function examplePlays(tracks: readonly Track[], now = Date.now()): Record<string, PlayCount> {
  const out: Record<string, PlayCount> = {}
  for (const track of tracks) {
    const n = isExampleTrack(track) ? EXAMPLE_PLAYS[track.title ?? ''] : undefined
    if (n) out[track.id] = { n, last: now - (10 - n) * 86_400_000 }
  }
  return out
}

/** Is this one of ours? Read after a reload, when the store has no idea. */
export function isExampleTrack(track: Track): boolean {
  return track.path.startsWith(PREFIX)
}

/**
 * The audio for one example track, synthesised on demand.
 *
 * ⚠️ SYNCHRONOUS, and it has to be: `libraryStore.fileFor` is synchronous
 * because everything that plays a track calls it inline (see `playerStore`).
 * Making it async would mean an await on the path between "press play" and
 * "sound", i.e. on the path this whole app is about. Rendering thirty seconds
 * of mono at 22 kHz is a few hundred thousand samples of arithmetic — a handful
 * of milliseconds, hidden entirely by the ceremony that is running anyway.
 */
export function exampleFile(track: Track): File | null {
  if (!isExampleTrack(track)) return null

  const cached = cache.get(track.path)
  if (cached) {
    // Touch it, so the least-recently-PLAYED is the one that goes.
    cache.delete(track.path)
    cache.set(track.path, cached)
    return cached
  }

  const entry = albumFor(track.path)
  if (!entry) return null

  const samples = render(track.path, entry.recipe, trackSeconds(track.path), undefined, linesOf(entry, track.path))
  const file = new File([wav(samples)], track.name, { type: 'audio/wav' })

  cache.set(track.path, file)
  // ⚠️ A cap, because a File holds its bytes and thirty-five of these is tens of
  // megabytes for a demo. Evicting is safe even mid-play: `audio.ts` has
  // already minted an object URL, and a URL keeps its blob alive regardless of
  // who else is holding the File.
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
  return file
}

const CACHE_MAX = 4
const cache = new Map<string, File>()

/**
 * How long a track runs.
 *
 * Between 26 and 46 seconds, from the path's own hash — long enough to be a
 * piece of music and to leave room for the 1.8-second crossfade lead, short
 * enough that ten records is a demo rather than a download.
 */
function trackSeconds(path: string): number {
  return 26 + (hash(path) % 21)
}

// ── The synth ────────────────────────────────────────────────────────────────
//
// Four voices over a four-bar chord loop: a pad, a bass, a lead and (on most
// records) drums. It is not trying to be good; it is trying to be MUSIC — a
// thing with a key, a tempo and a shape, so that the crossfade between two
// tracks of one album sounds like a crossfade rather than like two test tones.
//
// ⚠️ Everything is written straight into one Float32Array and soft-clipped at
// the end. No graph, no `OfflineAudioContext`: a context would be the obvious
// tool and it is asynchronous, which `exampleFile` above cannot be.

/** Degrees of the major and natural minor scales, in semitones. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const MINOR = [0, 2, 3, 5, 7, 8, 10]
/** The pentatonic subset the lead sticks to — it is what makes it hard to play a wrong note. */
const PENTA_MAJOR = [0, 2, 4, 7, 9]
const PENTA_MINOR = [0, 3, 5, 7, 10]

/** The parts a track is built from. */
export type Voice = 'pad' | 'bass' | 'lead' | 'drums' | 'vocal'
export const VOICES: readonly Voice[] = ['pad', 'bass', 'lead', 'drums', 'vocal']

/** A four-bar loop of chord degrees — the ones every listener already knows. */
function progressionOf(recipe: Recipe): number[] {
  return recipe.minor ? [0, 5, 3, 4] : [0, 4, 5, 3]
}

/**
 * A whole track — or, with `only`, one voice of it and nothing else.
 *
 * ⚠️ `only` gates the WRITES and never the dice. The lead and the hats both
 * draw from the seeded PRNG, so skipping a voice's `random()` calls would shift
 * every note after it and a soloed voice would no longer be the one in the
 * mix. Every draw below happens whichever voice is asked for. (The singing
 * has dice of its own, seeded by each line's words — `planVocal`.)
 */
function render(seed: string, recipe: Recipe, seconds: number, only?: Voice, lines?: readonly string[]): Float32Array {
  const plays = (voice: Voice) => only === undefined || only === voice
  const random = mulberry32(hash(seed))
  const frames = Math.round(seconds * RATE)
  const out = new Float32Array(frames)

  const scale = recipe.minor ? MINOR : MAJOR
  const penta = recipe.minor ? PENTA_MINOR : PENTA_MAJOR
  const meter = recipe.meter ?? 4
  const beat = 60 / recipe.bpm
  const bar = beat * meter

  // A demo track has about four seconds to sound deliberate.
  const progression = progressionOf(recipe)

  // The words, sung (2026-11-02). Planned first because the lead steps back
  // while a line is sung, the way a band plays under a singer.
  const sung = lines?.length ? planVocal(lines, recipe, seconds) : []
  const singing = (t: number) => sung.some((n) => t >= n.at - 0.05 && t < n.at + n.dur + 0.1)

  const bars = Math.ceil(seconds / bar)
  for (let b = 0; b < bars; b++) {
    const at = b * bar
    const degree = progression[b % progression.length]
    const rootNote = recipe.root + scale[degree % scale.length]
    const third = recipe.minor ? 3 : 4

    // The pad: a triad held for the bar, quiet and slow to arrive.
    if (plays('pad')) {
      for (const interval of [0, third, 7]) {
        addTone(out, at, bar * 0.98, midi(rootNote + interval), 0.055 * recipe.pad, {
          attack: 0.25, release: bar * 0.5, bite: 0.06,
        })
      }
      // A waltz's "pah-pah": the chord again, short, on two and three.
      if (meter === 3) {
        for (const k of [1, 2]) {
          for (const interval of [third, 7, 12]) {
            addTone(out, at + k * beat, beat * 0.5, midi(rootNote + interval), 0.045, {
              attack: 0.006, release: beat * 0.3, bite: 0.18,
            })
          }
        }
      }
    }

    // The bass: the root on one and three (one only, in a waltz), an octave down.
    if (plays('bass')) {
      for (const b3 of meter === 3 ? [0] : [0, 2]) {
        addTone(out, at + b3 * beat, beat * 1.6, midi(rootNote - 12), 0.16, {
          attack: 0.008, release: beat * 1.2, bite: 0.04,
        })
      }
    }

    // The lead: eighth notes, some of them, from the pentatonic — and quieter
    // while somebody is singing over it.
    for (let e = 0; e < meter * 2; e++) {
      if (random() > recipe.density) continue
      const step = penta[Math.floor(random() * penta.length)]
      const octave = random() < 0.25 ? 12 : 0
      if (!plays('lead')) continue
      const t = at + e * beat * 0.5
      addTone(out, t, beat * 0.5, midi(recipe.root + step + octave + 12), singing(t) ? 0.055 : 0.1, {
        attack: 0.006, release: beat * 0.42, bite: recipe.bite,
      })
    }

    if (recipe.drums) {
      if (meter === 3) {
        // A waltz: the kick on one, the hats on two and three.
        if (plays('drums')) addKick(out, at)
        for (let e = 0; e < 6; e++) {
          const hit = e === 2 || e === 4 || random() < 0.25
          if (hit && plays('drums')) addHat(out, at + e * beat * 0.5, e === 2 || e === 4 ? 0.03 : 0.015)
        }
      } else {
        if (plays('drums')) for (const k of [0, 2]) addKick(out, at + k * beat)
        for (let e = 0; e < 8; e++) {
          const hit = e % 2 === 1 || random() < 0.4
          if (hit && plays('drums')) addHat(out, at + e * beat * 0.5, e % 2 === 1 ? 0.03 : 0.018)
        }
      }
    }
  }

  if (plays('vocal')) for (const note of sung) addSung(out, note)

  // ⚠️ Fade both ends, always. A track that starts or stops mid-waveform is a
  // click, and a click at the seam is precisely what the crossfade this library
  // exists to demonstrate is supposed to be hiding.
  const edge = Math.round(0.4 * RATE)
  for (let i = 0; i < edge && i < frames; i++) {
    const g = i / edge
    out[i] *= g
    out[frames - 1 - i] *= g
  }

  // Soft clip rather than hard limit: five voices can add up past 1, and tanh
  // rounds those peaks off instead of squaring them into distortion.
  for (let i = 0; i < frames; i++) out[i] = Math.tanh(out[i] * 1.25) * 0.82
  return out
}

// ── The singing ──────────────────────────────────────────────────────────────
//
// (2026-11-02, James: "go ahead with all library richer suggestions" — a tune
// that follows the words, so they read as SUNG rather than laid over an
// instrumental.) Not a speech synthesiser: a wordless voice that sings each
// line's syllables to a little tune, on the vowel of each syllable, with a
// breath of consonant in front. Enough for the words on screen to be heard
// arriving with the voice; not trying to be intelligible.
//
// ⚠️ THE TIMING IS `lyricBeats`, the same function the lyric sheet uses, so
// the line lights up as the voice starts it. And the tune is seeded by the
// line's own WORDS, not its position: a chorus that repeats is sung to the
// same tune every time.

/** One sung syllable. */
interface SungNote {
  at: number
  dur: number
  /** MIDI note. */
  note: number
  vowel: Vowel
  /** The consonant in front: hissed (s, f, sh…), struck (t, k, p…) or none. */
  onset: 'hiss' | 'strike' | null
  /** Seeds the consonant's noise, so the track is the same every time. */
  seed: number
}

type Vowel = 'a' | 'e' | 'i' | 'o' | 'u'

/**
 * A line's syllables: one per group of vowels in each word, with a word's
 * silent final "e" left out ("Wane" is one, "again" is two). English
 * spelling is not this tidy, and it does not matter — a syllable more or
 * less is a note more or less.
 */
export function syllables(line: string): { vowel: Vowel; onset: 'hiss' | 'strike' | null }[] {
  const out: { vowel: Vowel; onset: 'hiss' | 'strike' | null }[] = []
  for (const raw of line.toLowerCase().split(/[^a-z’']+/)) {
    const word = raw.replace(/[’']/g, '')
    if (!word) continue
    const groups = [...word.matchAll(/[aeiouy]+/g)].filter((m, i, all) => {
      // "y" at the start of a word is a consonant ("young", "you").
      if (m.index === 0 && m[0] === 'y') return false
      // A silent final "e": "wane", "slow" has none; "the" and "be" keep theirs.
      const last = i === all.length - 1 && all.length > 1
      return !(last && m[0] === 'e' && m.index === word.length - 1 && !word.endsWith('le'))
    })
    if (groups.length === 0) groups.push(...word.matchAll(/[aeiouy]/g))
    let from = 0
    for (const g of groups) {
      const before = word.slice(from, g.index)
      // "you", "your": the "y" is the consonant, the rest the vowel.
      const vowels = g.index === 0 && g[0].length > 1 && g[0][0] === 'y' ? g[0].slice(1) : g[0]
      out.push({ vowel: vowelOf(vowels), onset: onsetOf(before) })
      from = (g.index ?? 0) + g[0].length
    }
  }
  return out
}

function vowelOf(group: string): Vowel {
  if (/^(ee|ea|ie|y|i)/.test(group)) return 'i'
  if (/^(oo|ou|u)/.test(group)) return 'u'
  if (/^(ai|ay|ei|ey|e)/.test(group)) return 'e'
  if (/^o/.test(group)) return 'o'
  return 'a'
}

function onsetOf(consonants: string): 'hiss' | 'strike' | null {
  if (/[sfzxh]|ch|th/.test(consonants)) return 'hiss'
  if (/[tkpbdgcq]/.test(consonants)) return 'strike'
  return null
}

/**
 * Every syllable of every line: when, how long, and on which note.
 *
 * Each line gets the time until the next one, less a breath. Its syllables
 * share it in sixteenths (an eighth or a quarter when there are few), and the
 * last syllable is held. The tune walks the pentatonic in steps from a note
 * of the chord the line starts on, and comes home to the root of the chord it
 * ends on.
 */
function planVocal(lines: readonly string[], recipe: Recipe, seconds: number): SungNote[] {
  const meter = recipe.meter ?? 4
  const beat = 60 / recipe.bpm
  const bar = beat * meter
  const scale = recipe.minor ? MINOR : MAJOR
  const penta = recipe.minor ? PENTA_MINOR : PENTA_MAJOR
  const progression = progressionOf(recipe)
  // The singer's register: the record's key, moved into about A3–G#4.
  let home = recipe.root
  while (home < 57) home += 12
  while (home >= 69) home -= 12
  const chordDegree = (t: number) => progression[Math.floor(t / bar) % progression.length]
  const chordRoot = (t: number) => scale[chordDegree(t) % scale.length]
  const pitch = (step: number) => home + penta[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)

  const starts = lyricBeats(lines.length, seconds, recipe.bpm, meter)
  const notes: SungNote[] = []
  lines.forEach((line, li) => {
    const parts = syllables(line)
    if (parts.length === 0) return
    const at = starts[li]
    const until = li + 1 < starts.length ? starts[li + 1] : seconds - bar
    const room = Math.max(beat, until - at - beat * 0.5)
    const sixteenth = beat / 4
    // Held last syllable counts as three.
    let each = room / (parts.length + 2)
    each = each >= sixteenth ? Math.min(4, Math.floor(each / sixteenth)) * sixteenth : Math.max(0.09, each)
    const random = mulberry32(hash(line))
    // Start on the chord's root, third or fifth, as a pentatonic step.
    const target = scale[(chordDegree(at) + [0, 2, 4][Math.floor(random() * 3)]) % scale.length]
    let step = penta.reduce((best, p, i) => (Math.abs(p - target) < Math.abs(penta[best] - target) ? i : best), 0)
    let t = at
    parts.forEach((part, i) => {
      const last = i === parts.length - 1
      const dur = last ? Math.min(each * 3, Math.max(each, until - t - beat * 0.25)) : each
      let note = pitch(step)
      if (last) {
        // Home: the root of the chord under the held note, nearest the tune.
        const root = home + chordRoot(t)
        note = [root - 12, root, root + 12].reduce((a, b) => (Math.abs(b - note) < Math.abs(a - note) ? b : a))
      }
      notes.push({ at: t, dur: dur * 0.94, note, vowel: part.vowel, onset: part.onset, seed: hash(`${line}|${i}`) })
      t += dur
      // A step up or down, now and then a leap; kept to about an octave.
      const move = random()
      step += move < 0.4 ? 1 : move < 0.8 ? -1 : move < 0.9 ? 2 : -2
      step = Math.max(-2, Math.min(6, step))
    })
  })
  return notes
}

// Formants — the resonances that make a vowel that vowel — in Hz, for a
// voice in the singer's register.
const FORMANTS: Record<Vowel, [number, number, number]> = {
  a: [780, 1240, 2600],
  e: [520, 1820, 2550],
  i: [330, 2250, 2950],
  o: [520, 880, 2550],
  u: [360, 760, 2450],
}
const FORMANT_LEVEL = [1, 0.55, 0.25]
const FORMANT_WIDTH = [90, 120, 170]
const TABLE = 512
const tables = new Map<string, Float32Array>()

/**
 * One cycle of a sung vowel at this note: its harmonics, each as loud as the
 * vowel's resonances make it. Cached — a song reuses a handful.
 */
function vowelTable(vowel: Vowel, note: number): Float32Array {
  const key = `${vowel}${note}`
  const cached = tables.get(key)
  if (cached) return cached
  const f0 = midi(note)
  const formants = FORMANTS[vowel]
  const table = new Float32Array(TABLE)
  for (let h = 1; h * f0 < 5000; h++) {
    const f = h * f0
    let level = 0.02
    formants.forEach((fk, k) => { level += FORMANT_LEVEL[k] / (1 + ((f - fk) / FORMANT_WIDTH[k]) ** 2) })
    // The voice's own slope: each harmonic quieter than the one below.
    level /= h
    for (let i = 0; i < TABLE; i++) table[i] += level * Math.sin((2 * Math.PI * h * i) / TABLE)
  }
  let peak = 0
  for (const v of table) peak = Math.max(peak, Math.abs(v))
  for (let i = 0; i < TABLE; i++) table[i] /= peak || 1
  tables.set(key, table)
  return table
}

/**
 * One syllable, mixed in: a scoop up into the note, vibrato that grows as it
 * is held, and the consonant's breath of noise in front.
 */
function addSung(out: Float32Array, n: SungNote): void {
  const gain = 0.13
  const table = vowelTable(n.vowel, n.note)
  const start = Math.round(n.at * RATE)
  const length = Math.round(n.dur * RATE)
  const f0 = midi(n.note)
  const attack = (n.onset === 'strike' ? 0.012 : 0.035) * RATE
  const release = Math.min(0.08 * RATE, length / 2)
  const noise = mulberry32(n.seed)
  let phase = 0
  let previous = 0
  for (let i = 0; i < length; i++) {
    const at = start + i
    if (at >= out.length) break
    const t = i / RATE
    const scoop = -0.6 * Math.exp(-t * 28)
    const vibrato = t > 0.15 ? 0.28 * Math.min(1, (t - 0.15) / 0.25) * Math.sin(2 * Math.PI * 5.4 * t) : 0
    phase += (f0 * 2 ** ((scoop + vibrato) / 12) * TABLE) / RATE
    const p = phase % TABLE
    const j = Math.floor(p)
    const sample = table[j] + (table[(j + 1) % TABLE] - table[j]) * (p - j)
    const env = Math.min(1, i / attack, (length - i) / release) * (1 - 0.15 * (i / length))
    out[at] += gain * env * sample
    // The consonant: high-passed noise over the first few dozen milliseconds.
    if (n.onset && t < (n.onset === 'hiss' ? 0.07 : 0.015)) {
      const white = noise() * 2 - 1
      const high = white - previous
      previous = white
      out[at] += gain * (n.onset === 'hiss' ? 0.22 : 0.4) * Math.exp(-t * 40) * high
    }
  }
}

/** MIDI note number to Hz. */
function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

interface Envelope {
  attack: number
  release: number
  /** How much third harmonic to mix in: 0 is a sine, 0.5 is reedy. */
  bite: number
}

/**
 * One note, mixed in at `at` seconds.
 *
 * A sine plus a third harmonic, with a linear attack and an exponential decay —
 * which is about the cheapest thing that still reads as an instrument rather
 * than as a beep.
 */
function addTone(
  out: Float32Array, at: number, seconds: number, freq: number, gain: number, env: Envelope,
): void {
  const start = Math.round(at * RATE)
  const length = Math.round(seconds * RATE)
  const attack = Math.max(1, Math.round(env.attack * RATE))
  const step = (2 * Math.PI * freq) / RATE
  const decay = 1 / Math.max(0.02, env.release)

  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const t = i / RATE
    const amp = (i < attack ? i / attack : 1) * Math.exp(-t * decay)
    // ⚠️ The "this note has died away" test must not run DURING THE ATTACK, and
    // the version without that guard silenced every melodic voice in the whole
    // library. At `i === 0` the attack ramp is exactly 0, so an unguarded
    // `amp < 0.0008` broke out of the loop on the first sample of every note:
    // the pad, the bass and the lead wrote nothing at all, ever. What survived
    // was the drums, which are not built from this function — so eight of the
    // nine records played as a drum machine, and "Quiet Rooms" (the one record
    // with `drums: false`) was 38 seconds of digital silence. Nothing failed;
    // every file was the right length and played to the end.
    if (i >= attack && amp < 0.0008) break
    const phase = step * i
    out[at2] += gain * amp * (Math.sin(phase) + env.bite * Math.sin(phase * 3))
  }
}

/** A kick: a sine swept down fast, which is what a kick drum is. */
function addKick(out: Float32Array, at: number): void {
  const start = Math.round(at * RATE)
  const length = Math.round(0.22 * RATE)
  let phase = 0
  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const t = i / RATE
    const freq = 46 + 74 * Math.exp(-t * 26)
    phase += (2 * Math.PI * freq) / RATE
    out[at2] += 0.34 * Math.exp(-t * 13) * Math.sin(phase)
  }
}

/** A hat: noise, differenced to take the bottom off it, with a very fast decay. */
function addHat(out: Float32Array, at: number, gain: number): void {
  const start = Math.round(at * RATE)
  const length = Math.round(0.05 * RATE)
  let previous = 0
  for (let i = 0; i < length; i++) {
    const at2 = start + i
    if (at2 >= out.length) break
    const noise = Math.random() * 2 - 1
    // A one-sample difference is a high-pass filter — the difference between a
    // hat and a burst of pink static.
    const high = noise - previous
    previous = noise
    out[at2] += gain * Math.exp(-(i / RATE) * 90) * high
  }
}

/** Float samples to a 16-bit mono RIFF/WAVE blob. */
function wav(samples: Float32Array): Blob {
  const bytes = new ArrayBuffer(WAV_HEADER_BYTES + samples.length * BYTES_PER_SAMPLE)
  const view = new DataView(bytes)

  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  const dataBytes = samples.length * BYTES_PER_SAMPLE

  text(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, CHANNELS, true)
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * CHANNELS * BYTES_PER_SAMPLE, true)
  view.setUint16(32, CHANNELS * BYTES_PER_SAMPLE, true)
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true)
  text(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    // ⚠️ Asymmetric on purpose: 16-bit PCM runs -32768…32767, so the two
    // directions scale by different numbers. Using 32768 for both is the usual
    // shortcut and it wraps the loudest positive peak round to full negative —
    // an audible tick on exactly the loudest moment of a track.
    view.setInt16(WAV_HEADER_BYTES + i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true)
  }
  return new Blob([bytes], { type: 'audio/wav' })
}

// ── The sleeves ──────────────────────────────────────────────────────────────

/**
 * Draw a cover.
 *
 * ⚠️ It has to be a PICTURE, not a coloured square with the title on it. The
 * app already has a handsome fallback tile for albums with no artwork
 * (`Cover.tsx`), so a demo whose covers looked like that would be showing off
 * the fallback rather than the thing the fallback is for — and the artwork is
 * what the grid, the fan, the deck's centre label and the Now Playing ground
 * are all made of.
 *
 * Each sleeve is one of four constructions over a two-colour ground, chosen by
 * the album's own hash — or by name, where the hash would repeat a sibling's
 * (`sleeve`) — with the type set on top. Nothing here is random at run
 * time: the same record is the same sleeve every time.
 */
async function drawSleeve(entry: ExampleAlbum): Promise<Blob | null> {
  try {
    const photo = await drawPhotoSleeve(entry)
    if (photo) return photo
  } catch { /* no photo, or the canvas refused it: the drawn sleeve below */ }
  const size = 480
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const seed = hash(`${entry.artist}|${entry.title}`)
  const random = mulberry32(seed)
  const hue = seed % 360
  const second = (hue + 40 + (seed % 90)) % 360
  const dark = entry.recipe.minor

  const ground = ctx.createLinearGradient(0, 0, size, size)
  ground.addColorStop(0, `hsl(${hue} ${dark ? 40 : 62}% ${dark ? 22 : 58}%)`)
  ground.addColorStop(1, `hsl(${second} ${dark ? 34 : 54}% ${dark ? 12 : 38}%)`)
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, size, size)

  const ink = dark ? 'rgba(255,255,255,' : 'rgba(15,23,42,'
  // ⚠️ The hash picks from the first three; the fourth is only ever ASKED FOR
  // (`sleeve` on the record). With three constructions over nine records five
  // came out as rings, including two pairs from the same artist — which in the
  // opened fan read as one sleeve printed twice.
  const style = entry.sleeve ?? seed % 3

  if (style === 0) {
    // Concentric rings, off-centre — a record seen from above.
    const cx = size * (0.3 + random() * 0.4)
    const cy = size * (0.3 + random() * 0.4)
    for (let r = size * 0.08; r < size * 0.72; r += size * 0.045) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = `${ink}${(0.05 + random() * 0.14).toFixed(3)})`
      ctx.lineWidth = 1 + random() * 3
      ctx.stroke()
    }
  } else if (style === 1) {
    // A bar chart of the groove, the way a waveform is drawn.
    const bars = 18
    const width = size / bars
    for (let i = 0; i < bars; i++) {
      const height = size * (0.12 + random() * 0.62)
      ctx.fillStyle = `${ink}${(0.06 + random() * 0.16).toFixed(3)})`
      ctx.fillRect(i * width, size - height, width * 0.72, height)
    }
  } else if (style === 3) {
    // A halftone: a grid of dots swelling towards one bright point, the way a
    // screen-printed sleeve does its shading.
    const step = size / 16
    const fx = size * (0.2 + random() * 0.6)
    const fy = size * (0.12 + random() * 0.36)
    for (let y = step / 2; y < size; y += step) {
      for (let x = step / 2; x < size; x += step) {
        const near = 1 - Math.min(1, Math.hypot(x - fx, y - fy) / (size * 0.75))
        ctx.beginPath()
        ctx.arc(x, y, step * 0.47 * Math.max(0.1, near), 0, Math.PI * 2)
        ctx.fillStyle = `${ink}${(0.08 + 0.2 * near).toFixed(3)})`
        ctx.fill()
      }
    }
  } else {
    // Diagonals, with one bold stripe through them.
    ctx.save()
    ctx.translate(size / 2, size / 2)
    ctx.rotate((-22 * Math.PI) / 180)
    for (let y = -size; y < size; y += 26) {
      ctx.fillStyle = `${ink}${(0.04 + random() * 0.1).toFixed(3)})`
      ctx.fillRect(-size, y, size * 2, 8 + random() * 10)
    }
    ctx.fillStyle = `hsl(${(hue + 180) % 360} 78% ${dark ? 58 : 46}%)`
    ctx.globalAlpha = 0.85
    ctx.fillRect(-size, size * 0.1, size * 2, 22)
    ctx.restore()
  }

  // The type. Set at the bottom over a soft scrim, because a title laid
  // straight onto a busy sleeve is the one thing that always looks amateur.
  const scrim = ctx.createLinearGradient(0, size * 0.55, 0, size)
  scrim.addColorStop(0, 'rgba(0,0,0,0)')
  scrim.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = scrim
  ctx.fillRect(0, size * 0.55, size, size * 0.45)

  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = '500 21px system-ui, -apple-system, Segoe UI, sans-serif'
  ctx.fillText(entry.artist.toUpperCase(), 30, size - 74)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 34px system-ui, -apple-system, Segoe UI, sans-serif'
  wrapText(ctx, entry.title, 30, size - 36, size - 60, 36)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * The sleeve as a photograph with the album name across the top (James,
 * 2026-10-20: "get some free to use photos for the albums of people, scenery
 * or anything else and put the album name on top"). Null when there is no
 * photo for the record.
 */
async function drawPhotoSleeve(entry: ExampleAlbum): Promise<Blob | null> {
  const { EXAMPLE_PHOTOS } = await import('./exampleCovers')
  const src = EXAMPLE_PHOTOS[entry.title]
  if (!src) return null
  const { paintPhotoSleeve } = await import('./photoSleeve')
  return paintPhotoSleeve(src, { title: entry.title, artist: entry.artist, serif: entry.serif, centred: entry.centred })
}

/** Lay a title out on at most two lines, bottom-anchored. */
function wrapText(
  ctx: CanvasRenderingContext2D, text: string, x: number, bottom: number, width: number, lineHeight: number,
): void {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 2)
  shown.forEach((l, i) => {
    ctx.fillText(l, x, bottom - (shown.length - 1 - i) * lineHeight)
  })
}

// ── Determinism ──────────────────────────────────────────────────────────────

/** FNV-1a. Small, fast, and stable across engines — which is the requirement. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A seeded PRNG, so "random" means "the same every time". */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** The library is the example and nothing else — the first-run screen's demo. */
export function isExampleOnly(roots: readonly { id: string }[]): boolean {
  return roots.length > 0 && roots.every((r) => r.id === EXAMPLE_ROOT_ID)
}
