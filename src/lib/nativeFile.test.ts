import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NativeFile,
  ensureNativeMusicFolder,
  isNativeShell,
  nativeFileUrl,
  pickNativeMusicFolder,
  usesChosenFolder,
  walkNativeLibrary,
  type NativeEntry,
} from './nativeFile'
import { HEAD_BYTES, isPlayable, scan } from './scan'
import { readTags } from './tags'

// The native shell's file, and the one thing about it that can be checked
// without a phone: that a "read" really is a RANGE read.
//
// ⚠️ This is the assertion worth having. Everything downstream — the tag reader,
// `trackKey`, the scan — behaves identically whether a slice arrives as 512 KB
// off the front of a 90 MB file or as the whole 90 MB trimmed to 512 KB. The
// tags come out right either way, so the failure is INVISIBLE: correct library,
// correct art, and a scan that has quietly moved a 40 GB library through a
// phone's memory. Nothing in the app would report it, so it is asserted here.

/** A stand-in for Capacitor's local file server, with real range semantics. */
function serveBytes(bytes: Uint8Array, options: { honourRange?: boolean } = {}) {
  const { honourRange = true } = options
  const calls: { range: string | null; served: number }[] = []
  const fetchMock = vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
    const range = init?.headers?.Range ?? null
    if (!honourRange || !range) {
      calls.push({ range, served: bytes.byteLength })
      return new Response(bytes.slice().buffer as ArrayBuffer, { status: 200 })
    }
    const [from, to] = range.replace('bytes=', '').split('-').map(Number)
    const slice = bytes.slice(from, to + 1)
    calls.push({ range, served: slice.byteLength })
    return new Response(slice.buffer as ArrayBuffer, { status: 206 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

const entry = (over: Partial<NativeEntry> = {}): NativeEntry => ({
  path: 'Nick Cave/Let Love In/01 Do You Love Me.mp3',
  uri: 'file:///var/mobile/Containers/Data/Application/ABC/Documents/Nick%20Cave/01.mp3',
  name: '01 Do You Love Me.mp3',
  size: 90 * 1024 * 1024,
  mtime: 1_700_000_000_000,
  ...over,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('NativeFile', () => {
  it('carries the four things the scanner needs off the entry', () => {
    const file = new NativeFile(entry())
    expect(file.name).toBe('01 Do You Love Me.mp3')
    expect(file.size).toBe(90 * 1024 * 1024)
    // Part of `trackKey`, so it must be the file's own mtime and not "now".
    expect(file.lastModified).toBe(1_700_000_000_000)
  })

  it('asks for a byte range, and gets only that many bytes back', async () => {
    const bytes = new Uint8Array(4096).map((_, i) => i % 251)
    const calls = serveBytes(bytes)

    const got = await new NativeFile(entry({ size: bytes.byteLength })).slice(0, 512).arrayBuffer()

    expect(calls).toHaveLength(1)
    // Inclusive at both ends: a 512-byte slice is bytes 0-511, NOT 0-512.
    expect(calls[0].range).toBe('bytes=0-511')
    expect(calls[0].served).toBe(512)
    expect(new Uint8Array(got)).toEqual(bytes.slice(0, 512))
  })

  it('reads off the BACK of a file, which is where an MP4 hides its tags', async () => {
    const bytes = new Uint8Array(4096).map((_, i) => i % 251)
    const calls = serveBytes(bytes)
    const file = new NativeFile(entry({ size: bytes.byteLength }))

    const got = await file.slice(bytes.byteLength - 100, bytes.byteLength).arrayBuffer()

    expect(calls[0].range).toBe('bytes=3996-4095')
    expect(new Uint8Array(got)).toEqual(bytes.slice(-100))
  })

  it('clamps a slice that runs past either end rather than asking for nonsense', async () => {
    const bytes = new Uint8Array(1000)
    const calls = serveBytes(bytes)
    const file = new NativeFile(entry({ size: 1000 }))

    await file.slice(-50, 200).arrayBuffer()
    expect(calls[0].range).toBe('bytes=0-199')

    await file.slice(900, 99_999).arrayBuffer()
    expect(calls[1].range).toBe('bytes=900-999')
  })

  it('costs nothing for an empty slice — no request at all', async () => {
    const calls = serveBytes(new Uint8Array(100))
    const got = await new NativeFile(entry({ size: 100 })).slice(50, 50).arrayBuffer()
    expect(got.byteLength).toBe(0)
    expect(calls).toHaveLength(0)
  })

  it('still returns the RIGHT bytes if the server ignores the range', async () => {
    // The failure this guards: a server answering 200 with everything. The
    // caller must not silently receive the whole file where it asked for 512 B,
    // because it would parse fine and nothing would ever say why scanning was
    // slow.
    const bytes = new Uint8Array(4096).map((_, i) => i % 251)
    serveBytes(bytes, { honourRange: false })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const got = await new NativeFile(entry({ size: bytes.byteLength })).slice(100, 200).arrayBuffer()

    expect(new Uint8Array(got)).toEqual(bytes.slice(100, 200))
    expect(warn).toHaveBeenCalled()
  })

  it('stops reading at the end of the window when a 206 runs on to the end of the file', async () => {
    // ⚠️ Android, measured 2026-09-10: Capacitor's local server answers 206 with
    // a Content-Range for exactly the window asked for, and a body that starts
    // there and runs to the END OF THE FILE — 10 bytes asked, 3 MB back. The
    // status says the range was honoured, so only the length gives it away, and
    // the tags still parse. The read has to stop, not buffer the rest.
    const bytes = new Uint8Array(64 * 1024).map((_, i) => i % 251)
    const CHUNK = 1024
    let pulled = 0
    let cancelled = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: { headers?: Record<string, string> }) => {
        let at = Number(init?.headers?.Range?.replace('bytes=', '').split('-')[0] ?? 0)
        const body = new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              if (at >= bytes.byteLength) return controller.close()
              pulled++
              controller.enqueue(bytes.slice(at, at + CHUNK))
              at += CHUNK
            },
            cancel() {
              cancelled = true
            },
          },
          { highWaterMark: 0 },
        )
        return new Response(body, { status: 206 })
      }),
    )

    const got = await new NativeFile(entry({ size: bytes.byteLength })).slice(5000, 5100).arrayBuffer()

    expect(new Uint8Array(got)).toEqual(bytes.slice(5000, 5100))
    expect(cancelled).toBe(true)
    // One chunk covers the window; the other ~60 KB were never pulled.
    expect(pulled).toBeLessThanOrEqual(2)
  })

  it('throws on a real HTTP failure rather than returning empty bytes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    await expect(new NativeFile(entry()).slice(0, 10).arrayBuffer()).rejects.toThrow()
  })
})

describe('isNativeShell', () => {
  it('is false with no Capacitor global — i.e. in a browser', () => {
    expect(isNativeShell()).toBe(false)
  })

  it('is false when Capacitor is present but says web', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => false })
    expect(isNativeShell()).toBe(false)
  })

  it('is true inside the shell', () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true })
    expect(isNativeShell()).toBe(true)
  })

  it('survives a Capacitor global that throws', () => {
    vi.stubGlobal('Capacitor', {
      isNativePlatform() {
        throw new Error('nope')
      },
    })
    expect(isNativeShell()).toBe(false)
  })
})

describe('nativeFileUrl', () => {
  it('goes through convertFileSrc when the shell provides it', () => {
    vi.stubGlobal('Capacitor', { convertFileSrc: (u: string) => `capacitor://localhost/_file_/${u}` })
    expect(nativeFileUrl('file:///x/y.mp3')).toBe('capacitor://localhost/_file_/file:///x/y.mp3')
  })

  it('hands the path back untouched off a native platform', () => {
    expect(nativeFileUrl('file:///x/y.mp3')).toBe('file:///x/y.mp3')
  })
})

// ── The bit that decides which walker a scan uses ────────────────────────────

describe('scan over native entries', () => {
  // The real tagged fixtures the tag reader is already checked against, served
  // through a stand-in for the native file server. That makes this an
  // end-to-end test of the native path — walker, range read, tag parse, Track —
  // rather than a test of a fixture invented to pass it.
  const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')
  const mp3 = new Uint8Array(readFileSync(join(FIXTURES, 'id3v23.mp3')))

  beforeEach(() => {
    vi.stubGlobal('Capacitor', { convertFileSrc: (u: string) => u })
  })

  it('reads a native entry the whole way through to a Track', async () => {
    // Sanity: the fixture really is tagged, so a failure below is the native
    // path's and not the fixture's.
    const expected = readTags(mp3)
    expect(expected.title).toBeTruthy()
    serveBytes(mp3)

    const result = await scan(
      [entry({ path: 'Nick Cave/Let Love In/01.mp3', name: '01.mp3', size: mp3.byteLength })],
      { prefix: 'Music' },
    )

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0].title).toBe(expected.title)
    expect(result.tracks[0].artist).toBe(expected.artist)
    // ⚠️ The ROOT PREFIX is on the path, and the device-absolute `uri` is not.
    // A container path would embed the app's install UUID, which iOS changes on
    // reinstall — every track id in the library would churn.
    expect(result.tracks[0].path).toBe('Music/Nick Cave/Let Love In/01.mp3')
    expect([...result.files.keys()]).toEqual(['Music/Nick Cave/Let Love In/01.mp3'])
  })

  it('picks the NATIVE walker, not the FileList one', async () => {
    // ⚠️ The regression this exists for. `NativeEntry[]` and `File[]` are both
    // arrays, so a walker chosen with `Array.isArray` sends native entries
    // through `walkFileList` — which reads `.name` off them (they have one) and
    // yields tracks whose "file" has no `slice`. The tell is the path: the
    // FileList walker files by `name` alone, the native one keeps the folder
    // structure.
    serveBytes(mp3)

    const result = await scan(
      [entry({ path: 'A/R/02.mp3', name: '02.mp3', size: mp3.byteLength })],
      { prefix: 'Music' },
    )

    expect(result.tracks[0].path).toBe('Music/A/R/02.mp3')
    expect(result.tracks[0].path).not.toBe('Music/02.mp3')
  })

  it('reads only the head of a big file, not all of it', async () => {
    // The scan's whole cost model on a phone, asserted: a library is scanned by
    // reading a fraction of a percent of it. `size` here is a lie the server is
    // in on — 90 MB declared, 4 KB of fixture behind it — which is exactly the
    // shape of a real FLAC.
    const calls = serveBytes(mp3)
    await scan([entry({ path: 'A/R/03.mp3', name: '03.mp3', size: 90 * 1024 * 1024 })], {
      prefix: 'Music',
    })
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.range).toMatch(/^bytes=/)
      expect(call.served).toBeLessThanOrEqual(HEAD_BYTES)
    }
  })

  it('refuses what it cannot play, natively too', async () => {
    serveBytes(new Uint8Array(10))
    const result = await scan([entry({ path: 'x.wma', name: 'x.wma', size: 10 })], { prefix: 'Music' })
    expect(result.tracks).toHaveLength(0)
    expect(result.refused.get('wma')).toBe(1)
  })
})

describe('the seeded readme', () => {
  // ⚠️ The folder is seeded so that iOS shows it in the Files app at all, which
  // means "no music yet" is never "no FILES yet". Two things have to hold for
  // the empty-folder message to reach the person who needs it, and both are
  // one-liners that a rename would quietly break.
  const README = 'Put your music in here.txt'

  it('is not mistaken for music', () => {
    // If this ever became playable, a fresh install would scan "successfully",
    // build a library of one unplayable track, and never show the message that
    // explains where music goes.
    expect(isPlayable(README)).toBe(false)
  })

  it('is not reported as a snubbed format either', async () => {
    // `.txt` must be skipped SILENTLY, not listed in the "some files were
    // skipped" report — telling somebody their readme was refused is noise
    // about a file this app wrote itself.
    vi.stubGlobal('Capacitor', { convertFileSrc: (u: string) => u })
    serveBytes(new Uint8Array(16))
    const result = await scan([entry({ path: README, name: README, size: 16 })], { prefix: 'Music' })
    expect(result.tracks).toHaveLength(0)
    expect(result.refused.has('txt')).toBe(false)
  })
})

// ── Android: the folder is chosen ────────────────────────────────────────────

const musicFolder = vi.hoisted(() => ({ pick: vi.fn(), walk: vi.fn(), release: vi.fn() }))
const fs = vi.hoisted(() => ({ readdir: vi.fn(), writeFile: vi.fn() }))
vi.mock('@capacitor/core', () => ({ registerPlugin: () => musicFolder }))
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: fs,
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
}))

/**
 * A native shell. `musicFolderPlugin` is whether the native side registered
 * `JukeboxMusicFolder` — which Android does and iOS does not, yet.
 */
function onPlatform(platform: 'ios' | 'android', options: { musicFolderPlugin?: boolean } = {}) {
  const { musicFolderPlugin = platform === 'android' } = options
  vi.stubGlobal('Capacitor', {
    isNativePlatform: () => true,
    getPlatform: () => platform,
    convertFileSrc: (u: string) => u,
    PluginHeaders: musicFolderPlugin ? [{ name: 'JukeboxMusicFolder', methods: [] }] : [],
  })
}

describe('the Android music folder', () => {
  beforeEach(() => {
    for (const f of [musicFolder.pick, musicFolder.walk, musicFolder.release, fs.readdir, fs.writeFile]) f.mockReset()
  })

  it('is chosen on Android and fixed on iOS', () => {
    onPlatform('android')
    expect(usesChosenFolder()).toBe(true)
    onPlatform('ios')
    expect(usesChosenFolder()).toBe(false)
    vi.unstubAllGlobals()
    expect(usesChosenFolder()).toBe(false)
  })

  it('follows the PLUGIN, not the platform name — the seam for any other platform', () => {
    // An iOS `JukeboxMusicFolder` plugin must switch the chosen-folder route on
    // with no call site changing; Android without one must not pretend.
    onPlatform('ios', { musicFolderPlugin: true })
    expect(usesChosenFolder()).toBe(true)
    onPlatform('android', { musicFolderPlugin: false })
    expect(usesChosenFolder()).toBe(false)
  })

  it('walks the CHOSEN folder through the plugin — never Documents', async () => {
    onPlatform('android')
    const file = { path: 'A/R/01.mp3', uri: 'content://docs/document/1', name: '01.mp3', size: 10, mtime: 5 }
    musicFolder.walk.mockResolvedValue({ files: [file] })

    const entries = await walkNativeLibrary(undefined, 'content://docs/tree/primary%3AMusic')

    expect(musicFolder.walk).toHaveBeenCalledWith({ uri: 'content://docs/tree/primary%3AMusic' })
    expect(entries).toEqual([file])
    expect(fs.readdir).not.toHaveBeenCalled()
  })

  it('refuses to walk with no folder chosen, rather than calling it empty', async () => {
    // "Your folder is empty" and "I could not look" need different things from
    // the person — the same line the iOS walker draws at its root.
    onPlatform('android')
    await expect(walkNativeLibrary()).rejects.toThrow()
    expect(musicFolder.walk).not.toHaveBeenCalled()
  })

  it('treats a backed-out picker as no answer, not an error', async () => {
    onPlatform('android')
    musicFolder.pick.mockResolvedValueOnce({ cancelled: true })
    expect(await pickNativeMusicFolder()).toBeNull()

    musicFolder.pick.mockResolvedValueOnce({ uri: 'content://docs/tree/x', name: 'Albums' })
    expect(await pickNativeMusicFolder()).toEqual({ uri: 'content://docs/tree/x', name: 'Albums' })
  })

  it('does not leave a readme in the phone’s shared Documents folder', async () => {
    // On iOS the readme is what makes the folder appear in the Files app. On
    // Android `Directory.Documents` is the phone's SHARED Documents, which the
    // library does not even read — writing there is litter.
    onPlatform('android')
    await ensureNativeMusicFolder()
    expect(fs.writeFile).not.toHaveBeenCalled()

    onPlatform('ios')
    fs.readdir.mockResolvedValue({ files: [] })
    await ensureNativeMusicFolder()
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
  })
})
