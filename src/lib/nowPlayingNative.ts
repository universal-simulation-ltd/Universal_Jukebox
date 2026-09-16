// The iPhone app's own lock-screen entry — for iOS 26's ANIMATED artwork: the
// record on the lock screen actually turning. `MPMediaItemAnimatedArtwork` is
// native-only, so this talks to `JukeboxNowPlaying`
// (`ios/App/App/NowPlayingPlugin.swift`), which makes the looping video from
// `lockArt.ts`'s disc.
//
// ⚠️ WEBKIT ALREADY PUBLISHES A NOW-PLAYING ENTRY FOR THE <audio>, and whether
// it does so through the app's own `MPNowPlayingInfoCenter` decides how this
// works. The plugin looks the first time it is called and says which it found:
//   - `merge`: WebKit's entry IS the app's — the plugin only adds the animated
//     artwork to it, and puts it back if WebKit's next update drops it;
//   - `own`: it is not — the plugin publishes a whole entry of its own, so it
//     must also carry the progress (`followProgress`) and answer the buttons
//     (the `command` events, handed to the page's Media Session handlers).
// The mode is in `[jukebox:diag]` as `lockArt`.

import { pluginRegistered } from './nativePlugins'
import { dispatchAction } from './mediaSession'
import { noteEvent } from './bgLog'
import type { LockArt } from './lockArt'
import type { Track } from './types'

const NAME = 'JukeboxNowPlaying'

interface ShowOptions {
  artworkId: string
  still: string
  disc: string | null
  ground: [string, string]
  spinSeconds: number | null
  title: string
  artist: string
  album: string
  elapsed: number
  duration: number
  rate: number
}

interface NowPlayingPlugin {
  show(options: ShowOptions): Promise<{ animated: boolean; supportedKeys: string[]; mode: string }>
  update(options: { elapsed: number; duration: number; rate: number }): Promise<void>
  artist(options: { artist: string }): Promise<void>
  clear(): Promise<void>
  addListener(event: 'command', fn: (e: { action: string; position?: number }) => void): Promise<unknown>
  addListener(event: 'audio', fn: (e: { kind: string } & Record<string, unknown>) => void): Promise<unknown>
}

let plugin: NowPlayingPlugin | null = null
let mode = 'unknown'
let report = 'not called'
let listening = false

export function nativeNowPlayingAvailable(): boolean {
  return pluginRegistered(NAME)
}

/** One line for `[jukebox:diag]`. */
export function describeNativeNowPlaying(): string {
  return report
}

async function load(): Promise<void> {
  if (plugin) return
  const { registerPlugin } = await import('@capacitor/core')
  plugin = registerPlugin<NowPlayingPlugin>(NAME)
}

export async function showOnLockScreen(
  track: Track,
  art: LockArt,
  /**
   * Where playback is — a READER, not a snapshot, because it is read twice.
   *
   * ⚠️ The second read is the fix for Control Centre and the lock screen
   * showing ▶ over a playing song (James, 2026-09-11). The first `show` goes out
   * as the countdown runs, so it says "paused"; the music then starts while
   * the art is still being drawn and sent, and `followProgress` ignored that —
   * the mode was not known yet — so nothing ever corrected it.
   */
  now: () => { elapsed: number; duration: number; playing: boolean },
): Promise<void> {
  if (!nativeNowPlayingAvailable()) return
  try {
    await load()
    const at = now()
    const result = await plugin!.show({
      artworkId: art.key,
      still: await base64(art.stillPng),
      disc: art.disc ? await base64(art.disc) : null,
      ground: art.ground,
      spinSeconds: art.spinSeconds,
      title: track.title,
      artist: track.artist ?? track.albumArtist ?? '',
      album: track.album ?? '',
      elapsed: at.elapsed,
      duration: at.duration,
      rate: at.playing ? 1 : 0,
    })
    mode = result.mode
    // What the entry says now — `setLockArtist` puts a lyric line back over it.
    artistSent = track.artist ?? track.albumArtist ?? ''
    report = `mode=${result.mode} animated=${result.animated} keys=${result.supportedKeys.join(',') || 'none'}`
    if (mode === 'own' && !listening) {
      listening = true
      // Logged, with its route, by the gate in `dispatchAction`.
      await plugin!.addListener('command', (e) => dispatchAction(e.action, e.position))
    }
    // Where playback is NOW, not when `show` set off.
    const latest = now()
    sent = { playing: latest.playing, at: performance.now(), sec: latest.elapsed, duration: latest.duration }
    // ⚠️ In BOTH modes since 2026-09-15. A track change is the moment the
    // button goes wrong, so it is the moment worth being sure about, and in
    // `merge` mode the plugin takes nothing from this but the play/pause state.
    await plugin!.update({ elapsed: latest.elapsed, duration: latest.duration, rate: latest.playing ? 1 : 0 })
    // …and go on saying it for the rest of the change-over — see `RESTATE_MS`.
    restateUntil = performance.now() + RESTATE_MS
  } catch (error) {
    report = `failed: ${error instanceof Error ? error.message : String(error)}`
  }
  noteEvent('lock-art', { report })
}

/** An interruption of the audio — Siri, a call, a timer — as iOS described it. */
export interface AudioInterruption {
  /** 'began' or 'ended'. Anything else is a version of iOS we do not know. */
  type: string
  /**
   * iOS's own `shouldResume`: whether the audio is ours to take back.
   *
   * ⚠️ ABSENT is not the same as false, and the difference is acted on. The
   * plugin leaves the key out when iOS sent no options at all — false is iOS
   * saying no, missing is iOS saying nothing. See `shouldComeBack`.
   */
  shouldResume?: boolean | null
}

/**
 * Told when something takes the audio away and when it gives it back.
 *
 * ⚠️ The ONLY `audio` event anything acts on; the rest are log lines. Set by
 * `playerStore`, which owns what to do about it — the plugin observes and
 * reports, and this app never touches its own audio session (see
 * `AppDelegate.swift`).
 */
let onInterruption: ((event: AudioInterruption) => void) | null = null

export function setInterruptionHandler(fn: ((event: AudioInterruption) => void) | null): void {
  onInterruption = fn
}

/** Told when iOS moves the sound — see `routeChanged` in `lib/audio.ts`. */
let onRoute: ((reason: string) => void) | null = null

export function setRouteHandler(fn: ((reason: string) => void) | null): void {
  onRoute = fn
}

/**
 * Headphones in and out, and interruptions, into the saved log (`bgLog`) — so a
 * report like "not sure if it was when I put headphones in" can be checked
 * against what iOS actually did (James, 2026-09-11). The plugin only observes;
 * this app never touches its own audio session (see `AppDelegate.swift`).
 */
export async function watchAudioRoute(): Promise<void> {
  if (!nativeNowPlayingAvailable()) return
  try {
    await load()
    await plugin!.addListener('audio', ({ kind, ...detail }) => {
      noteEvent(kind, detail)
      // ⚠️ Logged FIRST, and acted on after: a handler that throws must not be
      // able to cost the log the one line that says what iOS did.
      if (kind === 'interruption') onInterruption?.(detail as unknown as AudioInterruption)
      if (kind === 'route') onRoute?.(String(detail.reason ?? ''))
    })
  } catch {
    /* the log is a nicety */
  }
}

/** The artist line the iPhone app's own entry was last given. */
let artistSent: string | null = null

/**
 * A lyric line in the artist's place, or the artist back — `lib/lockLyrics.ts`.
 *
 * ⚠️ `own` MODE ONLY. There the entry's artist is the plugin's copy, which its
 * keeper restores whenever WebKit writes over the entry, so the line has to be
 * in that copy. In `merge` the entry is WebKit's, which takes the artist from
 * the Media Session's metadata — already changed by `setArtistLine`.
 */
export function setLockArtist(track: Track, line: string | null): void {
  if (mode !== 'own' || !plugin) return
  const wanted = line ?? track.artist ?? track.albumArtist ?? ''
  if (wanted === artistSent) return
  artistSent = wanted
  void plugin.artist({ artist: wanted }).catch(() => {})
}

export async function clearLockScreen(): Promise<void> {
  if (!plugin) return
  try {
    await plugin.clear()
  } catch {
    /* nothing to clear */
  }
}

let sent = { playing: false, at: 0, sec: 0, duration: 0 }

/**
 * How long after a new entry goes out the state is re-stated on EVERY tick,
 * whether or not anything about it changed.
 *
 * ⚠️ WE ARE NOT THE ONLY WRITER OF THIS ENTRY, AND A TRACK CHANGE IS WHEN THAT
 * SHOWS. WebKit publishes its own now-playing entry for the page's `<audio>`
 * into the same `MPNowPlayingInfoCenter` the plugin writes to, and `own` mode
 * is decided by ONE look at that centre during the first countdown — before
 * anything has played, so before WebKit has written anything there. From then
 * on both write to it. Across a change-over WebKit's write is the one that says
 * PAUSED: the outgoing element is re-sourced, or faded out and stopped, while
 * the new one starts.
 *
 * `followProgress` had nothing left to say by then. It speaks only when
 * playback CHANGED, and a change-over need not change it at all — the player's
 * `playing` stays true right through a crossfade, and through a record change
 * with the screen locked (`audio.ts` carries a hidden page's pause rather than
 * reporting it). So the last word was WebKit's, and ▶ stood over a playing song
 * until the next real pause — pressing next on the lock screen changed the
 * track and left the play button showing (James, 2026-09-14).
 *
 * Long enough to outlast the longest change-over: a record crossfade is 1.5s
 * from the press, and a record change lifts the pickup for 420ms before the
 * next file is even loaded.
 */
const RESTATE_MS = 3000
let restateUntil = 0

/**
 * …and then SAY IT AGAIN, at least this often, for as long as the music plays.
 *
 * ⚠️ `RESTATE_MS` ABOVE WAS SIZED AGAINST THE WRONG CHANGE-OVERS, and the sum
 * in its own note says so: 1.5s for a record crossfade, 420ms for a lift. Those
 * are the ones somebody ASKS for. The change-over a queue makes on its own is
 * far longer — `CROSSFADE.SEC` plus the next song's quiet opening, up to
 * `INTRO_HOLD_MAX`, and `CROSSFADE.RECORD_SEC` plus the same again for a change
 * of record: over ten seconds at the limit. And the moment that matters is the
 * END of it, when the outgoing deck is paused and released (`finishRetirement`
 * in `lib/audio.ts`) and WebKit writes PAUSED into the same centre — seven
 * seconds after a three-second window shut. Nothing of ours answered, because
 * nothing about playback had changed: a crossfade never stops (James,
 * 2026-09-15: "still an issue where the track is playing but the play button is
 * incorrectly shown").
 *
 * ⚠️ AND THE ANSWER IS DELIBERATELY NOT A BIGGER NUMBER UP THERE. A window long
 * enough for the longest blend would have to be derived by hand from three
 * constants in two other files, which is how the first one came to be wrong; it
 * would go stale the next time any of them moved, and silently. A heartbeat
 * needs to know none of them. Whatever writes over the entry, and whenever, the
 * button is right again within this — at the cost of one bridge call every two
 * seconds while a song plays, which is less than the plugin's own keeper does.
 */
const RESTATE_EVERY_MS = 2000

/**
 * Keep an `own` entry's progress honest. iOS runs the clock itself from the
 * last elapsed time and rate, so this only speaks when that clock would be
 * wrong: play or pause, a new duration, a jump (a seek) of over two seconds —
 * or a change-over just happened and the entry is being defended (`RESTATE_MS`)
 * — or it has simply been a while and something may have written over us since
 * (`RESTATE_EVERY_MS`).
 *
 * ⚠️ WHILE PAUSED IT STAYS QUIET, and that is the point of hanging the heartbeat
 * on `playing`. A wrong ▶ over a playing song is the bug; a wrong ⏸ over a
 * paused one cannot happen from this direction, and a heartbeat that ran while
 * paused would be the app talking to the lock screen for ever about a song
 * nobody is listening to.
 */
export function followProgress(playing: boolean, sec: number, duration: number): void {
  // ⚠️ `merge` GETS THIS TOO, since 2026-09-15, and it is the likeliest reason
  // the ▶ survived the fix before it (James, after the first build that had
  // any of this on it: "lock screen still has the play button issue after a
  // track change"). In `merge` mode WebKit's entry IS the app's entry, so
  // nothing of ours was ever sent — this returned here, and the plugin's
  // keeper skips `playbackState` for anything but `own`. WebKit writes PAUSED
  // across a change-over and there was no second writer anywhere to disagree.
  // The plugin decides what a merge-mode update may touch: the play/pause
  // state and nothing else, so the scrub bar stays WebKit's alone.
  if (mode === 'unknown' || !plugin) return
  const now = performance.now()
  const expected = sent.playing ? sent.sec + (now - sent.at) / 1000 : sent.sec
  const jumped = Math.abs(sec - expected) > 2
  const restating = now < restateUntil
  const stale = playing && now - sent.at >= RESTATE_EVERY_MS
  if (!restating && !stale && playing === sent.playing && duration === sent.duration && !jumped) return
  sent = { playing, at: now, sec, duration }
  void plugin.update({ elapsed: sec, duration, rate: playing ? 1 : 0 }).catch(() => {})
}

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('could not read the image'))
    reader.readAsDataURL(blob)
  })
}
