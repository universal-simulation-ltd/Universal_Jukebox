// What the Hits lookups know, shown where the songs are: an album's and an
// artist's plays, rating and awards worldwide, each song's plays in the lists,
// and an artist's biggest hits (James, 2026-10-28: "Use the played, awards etc
// info to enrich the artist, album, track views").
//
// Nothing here asks anything: it reads the answers `hitsStore` already keeps.
// With the lookups off (the default) there are none, and every view looks as
// it did. Pure, so the sums are tested (`hitsView.test.ts`).

import { RATING_MIN_VOTES, rankHits, type HitRecord } from './hits'
import type { Track } from './types'

export interface WorldStats {
  /** Plays worldwide, all the songs together. */
  listens: number
  /** Awards, all the songs together. */
  awards: number
  /** The MusicBrainz rating, weighted by votes; null when no song has enough. */
  rating: number | null
  votes: number
}

/**
 * A set of songs in the world: their plays and awards added up, and their
 * ratings averaged by votes. Null when nothing is known.
 *
 * ⚠️ Each RECORDING once: the same song on the album and its deluxe edition is
 * one MusicBrainz recording, and counting its plays twice would double it.
 */
export function worldStats(tracks: readonly Track[], records: ReadonlyMap<string, HitRecord>): WorldStats | null {
  const seen = new Set<string>()
  let listens = 0
  let awards = 0
  let rated = 0
  let votes = 0
  for (const track of tracks) {
    const r = records.get(track.id)
    if (!r?.mbid || seen.has(r.mbid)) continue
    seen.add(r.mbid)
    listens += r.listens ?? 0
    awards += r.awards ?? 0
    if (r.rating !== null && r.votes !== null && r.votes >= RATING_MIN_VOTES) {
      rated += r.rating * r.votes
      votes += r.votes
    }
  }
  if (!listens && !awards && !votes) return null
  return { listens, awards, rating: votes ? rated / votes : null, votes }
}

/** Songs on an artist's "Biggest hits", at most. */
export const BIGGEST_MAX = 5

/**
 * An artist's biggest songs, biggest first — the Hits shelf's own ranking
 * (`rankHits`) over their songs alone. Empty below two: one song isn't a list
 * worth a heading.
 */
export function biggestSongs(tracks: readonly Track[], records: ReadonlyMap<string, HitRecord>): Track[] {
  const ranked = rankHits(records, tracks).slice(0, BIGGEST_MAX)
  return ranked.length >= 2 ? ranked : []
}
