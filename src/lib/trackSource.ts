// Turning a file into something an `<audio>` element can be pointed at.
//
// One function each way — make a URL, give it back — and they exist as a pair
// because the two platforms answer differently and the DIFFERENCE IS ENTIRELY IN
// THE GIVING BACK.
//
// On the web a track is a `File`, and the URL is an object URL. Those must be
// revoked: every `createObjectURL` pins its file in memory until it is, so the
// two-decks-and-revoke-the-retiring-one discipline in `lib/audio.ts` is what
// stops an evening's listening pinning the whole library. Read that file's
// header before touching any of this.
//
// In the native shell a track is a path, and Capacitor's local file server
// already serves it over a stable URL — nothing is pinned, and there is nothing
// to revoke. Handing that URL to `revokeObjectURL` is not an error (it silently
// does nothing), but relying on that would be relying on a no-op, so the release
// is explicit about which kind of URL it is looking at.
//
// ⚠️ The alternative — read the native file's bytes and wrap them in a Blob so
// everything downstream stays identical — is exactly the thing not to do. It
// would pull an entire track across the Capacitor bridge as base64 before a
// single note played, and it would put both decks' worth of decoded audio in the
// WebView's heap. Streaming from the local server is what makes a phone build of
// this app behave like the web one.

import { NativeFile } from './nativeFile'
import type { SourceFile } from './types'

/**
 * A URL for this file, to assign to `audio.src`.
 *
 * Pair every call with `releaseTrackUrl` on the URL it returned, once nothing is
 * pointed at it any more.
 */
export function trackUrl(file: SourceFile): string {
  if (file instanceof NativeFile) return file.playbackUrl
  // Everything else here is a real `File`/`Blob` from a picker or the example
  // library's generated WAV.
  return URL.createObjectURL(file as unknown as Blob)
}

/**
 * Release a URL from `trackUrl`.
 *
 * ⚠️ Only object URLs are revoked. The native server's URLs are not ours to
 * revoke and stay valid for the life of the app — revoking one would be
 * meaningless, and a future change that made it meaningful would break playback
 * on the second play of a track, which is a horrible thing to debug.
 */
export function releaseTrackUrl(url: string | null | undefined): void {
  if (!url) return
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}
