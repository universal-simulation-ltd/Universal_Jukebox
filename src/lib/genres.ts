import type { Album, Track } from './types'

// Genre, out of the tags people actually have — and the shelves it makes.
//
// The genre was read from the first day (`tags.ts`: ID3's TCON/TCO, Vorbis
// GENRE, MP4 ©gen) and stored on every track, but until now it was shown in one
// place only: a chip on Now Playing. This is what turns it into a way to browse
// (James, 2026-09-12: "shelves organised by blues, rock etc — if there's less
// than 3 songs to a genre don't show it").
//
// ⚠️ NORMALISED HERE, ON THE WAY OUT, NOT IN THE SCANNER. Everything below
// works on the string already in the library, so a library scanned months ago
// gets tidy genre shelves without being rescanned. Putting it in `tags.ts`
// would have fixed only what people scan next.

/** Fewer songs than this behind a genre and it gets no shelf (James, 2026-09-12). */
export const GENRE_MIN = 3

/** Where the songs whose files carry no genre at all go — always last. */
export const NO_GENRE = 'No genre'

/**
 * ID3v1's numbered genres, which MP3s still carry in 2026.
 *
 * ⚠️ THIS IS NOT TRIVIA — WITHOUT IT THE FEATURE IS A LIST OF NUMBERS. A great
 * many taggers write `TCON` as `(17)`, or `17`, rather than the word: the frame
 * is text, so nothing is malformed and nothing throws — the shelf is simply
 * called "(17)" instead of "Rock". 0–79 are the original list, 80–125 Winamp's
 * first extension and 126–191 its second; the numbers are fixed for ever
 * because files already use them.
 */
const ID3V1_GENRES = [
  'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal',
  'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial',
  'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk',
  'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
  'Alternative Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop', 'Instrumental Rock', 'Ethnic', 'Gothic',
  'Darkwave', 'Techno-Industrial', 'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult', 'Gangsta',
  'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American', 'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes',
  'Trailer', 'Lo-Fi', 'Tribal', 'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
  'Folk', 'Folk-Rock', 'National Folk', 'Swing', 'Fast Fusion', 'Bebop', 'Latin', 'Revival', 'Celtic', 'Bluegrass',
  'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock', 'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic',
  'Humour', 'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus', 'Porn Groove',
  'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore', 'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle',
  'Duet', 'Punk Rock', 'Drum Solo', 'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House', 'Hardcore',
  'Terror', 'Indie', 'BritPop', 'Afro-Punk', 'Polsk Punk', 'Beat', 'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover',
  'Contemporary Christian', 'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop', 'Abstract', 'Art Rock',
  'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout', 'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro',
  'Electroclash', 'Emo', 'Experimental', 'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock',
  'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock', 'Psytrance', 'Shoegaze', 'Space Rock',
  'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook', 'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
  'Garage Rock', 'Psybient',
]

/** The word for an ID3v1 genre number, if it is one of them. */
export function id3v1Genre(code: number): string | undefined {
  return Number.isInteger(code) && code >= 0 && code < ID3V1_GENRES.length ? ID3V1_GENRES[code] : undefined
}

/**
 * The genres a tag names, tidied — usually one, occasionally none.
 *
 * ⚠️ SPLIT ON `;` AND NUL ONLY. ID3v2.4 separates multiple values with a NUL
 * and taggers write `Rock;Blues`, so both are two genres. `/` and `,` are NOT
 * separators here however much they look like ones: `Pop/Funk` and `Folk, World
 * & Country` are single genres in the lists people tag from, and splitting them
 * invents shelves nobody's music is on.
 */
export function normaliseGenres(raw: string | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(/[;\0]/)) {
    const name = oneGenre(part)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/** One value of a genre tag: `(17)`, `17`, `(17)Hardcore` or plain words. */
function oneGenre(part: string): string {
  const text = part.trim().replace(/\s+/g, ' ')
  if (!text) return ''
  // A bare number is a reference and nothing else. `RX` and `CR` are ID3v1's
  // remix and cover; they are not genres, and neither is a lone number we have
  // no name for — better no genre than a shelf called "482".
  if (/^\d+$/.test(text)) return id3v1Genre(Number(text)) ?? ''
  // `(17)`, or `(17)` with a refinement after it — the words win where there
  // are any, because that is what the tagger meant them to say.
  const refs = /^(\((\d+)\))+/.exec(text)
  if (refs) {
    const rest = text.slice(refs[0].length).trim()
    if (rest) return rest.replace(/\s+/g, ' ')
    const first = /\((\d+)\)/.exec(refs[0])
    return first ? (id3v1Genre(Number(first[1])) ?? '') : ''
  }
  return text
}

/** Every genre this track is filed under. */
export function trackGenres(track: Track): string[] {
  return normaliseGenres(track.genre)
}

export interface GenreTally {
  /** As shown — the spelling most of the songs use. */
  name: string
  songs: number
}

/**
 * Every genre in the library and how many songs are behind it, A–Z, with
 * `NO_GENRE` last. Small ones are included: `shownGenres` decides what is
 * shown, and `hiddenByGenre` needs to be able to say what was not.
 *
 * ⚠️ Case-insensitive: `Rock`, `rock` and `ROCK` are ONE genre, shown with the
 * spelling most of the songs use. Three shelves of the same word, which is what
 * a straight group-by gives on a real library, reads as a bug in the app rather
 * than as untidy tags.
 */
export function tallyGenres(tracks: readonly Track[]): GenreTally[] {
  const byKey = new Map<string, { songs: number; spellings: Map<string, number> }>()
  for (const track of tracks) {
    const names = trackGenres(track)
    for (const name of names.length > 0 ? names : [NO_GENRE]) {
      const key = name.toLowerCase()
      const entry = byKey.get(key) ?? { songs: 0, spellings: new Map() }
      entry.songs++
      entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1)
      byKey.set(key, entry)
    }
  }
  const tally = [...byKey.values()].map(({ songs, spellings }) => ({ name: commonest(spellings), songs }))
  return tally.sort(byName)
}

/** The spelling most songs use; the alphabetically first of any that tie. */
function commonest(spellings: Map<string, number>): string {
  return [...spellings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
}

/** A–Z, with "No genre" last however the alphabet feels about it. */
function byName(a: { name: string }, b: { name: string }): number {
  if (a.name === NO_GENRE) return 1
  if (b.name === NO_GENRE) return -1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

/** The genres that get a shelf: `GENRE_MIN` songs or more, in shelf order. */
export function shownGenres(tally: readonly GenreTally[]): string[] {
  return tally.filter((g) => g.songs >= GENRE_MIN).map((g) => g.name)
}

/** What the `GENRE_MIN` rule leaves out, so the library can say so rather than just lose it. */
export function hiddenByGenre(tally: readonly GenreTally[]): { songs: number; genres: number } {
  const small = tally.filter((g) => g.songs < GENRE_MIN)
  return { songs: small.reduce((n, g) => n + g.songs, 0), genres: small.length }
}

/**
 * The items on each shelf, in the order the genres are shown.
 *
 * ⚠️ AN ITEM CAN BE ON MORE THAN ONE SHELF, and that is the honest answer
 * rather than a shortcut: a song tagged `Rock;Blues` IS both, and picking one
 * would leave the Blues shelf missing songs the tags say belong on it. An album
 * or an artist takes the genres of its own songs, so a compilation stands on
 * every shelf it earns.
 *
 * An item whose every genre is too small to be shown is not shown either —
 * that is the rule doing what it says, and `hiddenByGenre` is how the screen
 * owns up to it.
 */
export function groupByGenre<T>(
  items: readonly T[],
  genresOf: (item: T) => readonly string[],
  shown: readonly string[],
): { genre: string; items: T[] }[] {
  const key = new Map(shown.map((name) => [name.toLowerCase(), name]))
  const groups = new Map<string, T[]>(shown.map((name) => [name, []]))
  for (const item of items) {
    const names = genresOf(item)
    for (const name of names.length > 0 ? names : [NO_GENRE]) {
      const shelf = key.get(name.toLowerCase())
      if (shelf) groups.get(shelf)!.push(item)
    }
  }
  return shown.map((genre) => ({ genre, items: groups.get(genre) ?? [] })).filter((g) => g.items.length > 0)
}

/** Genre → the albums it holds, for the Albums shelf: an album is its songs' genres. */
export function albumGenres(tracks: readonly Track[]): (album: Album) => string[] {
  const byAlbum = new Map<string, Set<string>>()
  for (const track of tracks) {
    const names = trackGenres(track)
    const set = byAlbum.get(track.albumId) ?? new Set<string>()
    for (const name of names) set.add(name)
    byAlbum.set(track.albumId, set)
  }
  return (album) => [...(byAlbum.get(album.id) ?? [])]
}
