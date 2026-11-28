// mixSync.ts — the arithmetic of the Mix tab's Sync button, pure so it can be
// tested without an AudioContext (`mixSync.test.ts`).
//
// Sync matches ONE deck's tempo to the other's by changing its playback rate.
// It matches tempo only, not where the beats fall: that is still the hand on
// the edge of the record.

/** How far Sync will stretch a record: ±8%. Beyond that it says it cannot. */
export const SYNC_RANGE = 0.08

export type SyncRelation = 'same' | 'double' | 'half'

export interface SyncPlan {
  /** The playback rate for the deck being synced (1 = normal). */
  rate: number
  /** Whether it lands on the other deck's tempo, twice it, or half of it. */
  relation: SyncRelation
}

/**
 * The rate that brings a deck of `myBpm` (at normal speed) onto `otherBpm` as
 * the other deck is actually running now (its BPM x its speed). Tries the same
 * tempo, then double and half time (a 70 against a 140 is already in step) and
 * takes whichever needs the least stretch. Null when none is within
 * ±`SYNC_RANGE`, or a tempo is missing.
 */
export function syncPlan(myBpm: number | null | undefined, otherBpm: number | null | undefined): SyncPlan | null {
  if (!myBpm || !otherBpm || !(myBpm > 0) || !(otherBpm > 0)) return null
  const options: SyncPlan[] = [
    { rate: otherBpm / myBpm, relation: 'same' },
    { rate: (2 * otherBpm) / myBpm, relation: 'double' },
    { rate: otherBpm / 2 / myBpm, relation: 'half' },
  ]
  let best: SyncPlan | null = null
  for (const o of options) {
    if (Math.abs(o.rate - 1) > SYNC_RANGE + 1e-9) continue
    if (!best || Math.abs(Math.log(o.rate)) < Math.abs(Math.log(best.rate))) best = o
  }
  return best
}

/** A deck's tempo as it is playing: its detected BPM at its speed. */
export function effectiveBpm(bpm: number | null | undefined, speed: number): number | null {
  return bpm ? bpm * speed : null
}

/** "128" / "127.5": one decimal at most, none when it is whole. */
export function bpmLabel(bpm: number): string {
  return String(Math.round(bpm * 10) / 10)
}
