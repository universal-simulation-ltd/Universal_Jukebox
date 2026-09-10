// The lock screen's picture of what is playing — the album cover ON the
// machine playing it, rather than the bare cover every other player shows
// (James, 2026-09-10: "what can we do to make the lockscreen player more 'us'?").
//
// ⚠️ DRAWN ON A CANVAS, NOT EXPORTED FROM THE DECK FACES. The faces are
// Tailwind-styled DOM, and nothing turns that into an image a lock screen can
// take — so the colours below are copied from the faces by hand. Restyle a
// face and mirror it here, or the lock screen shows a different machine from
// the one on Now Playing.
//
// One call makes two images:
//   - `still`: the square the Media Session is handed, on every platform;
//   - `disc`: for the three disc machines, the disc alone on a transparent
//     ground. The iPhone app turns it into iOS 26's animated lock-screen
//     artwork, one revolution looped (`nowPlayingNative.ts`), over the same
//     `ground` — so the video's first frame and the still match.

import type { DeckStyle } from '../stores/settingsStore'

export interface LockArt {
  /** Names this album on this machine; the native side caches videos by it. */
  key: string
  /** Object URL of `stillPng`, for `MediaMetadata.artwork`. */
  stillUrl: string
  stillPng: Blob
  /** The disc alone, transparent around it — disc machines only. */
  disc: Blob | null
  /** Top and bottom of the background, `#rrggbb`. */
  ground: [string, string]
  /** One revolution, in seconds — disc machines only. */
  spinSeconds: number | null
}

/** Bumped whenever the drawing changes, so no stale picture is reused. */
const VERSION = 1
const STILL = 600
const DISC = 1024

/**
 * A real 33⅓ for the LP (the face's own 1.8 s), a 45 for the jukebox's single,
 * and a CD slowed right down — at its real speed it is a grey blur.
 */
const SPIN: Partial<Record<DeckStyle, number>> = { vinyl: 1.8, jukebox: 1.33, cd: 1.2 }

const cache = new Map<string, Promise<LockArt | null>>()
const KEEP = 6

export function lockArt(input: {
  albumId: string
  cover: string | null
  hue: number
  style: DeckStyle
}): Promise<LockArt | null> {
  const key = `${input.albumId}:${input.style}:v${VERSION}:${input.cover ? 'art' : 'hue'}`
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit)
    return hit
  }
  const made = draw(input, key).catch(() => null)
  cache.set(key, made)
  while (cache.size > KEEP) {
    const [oldest, promise] = cache.entries().next().value as [string, Promise<LockArt | null>]
    cache.delete(oldest)
    void promise.then((art) => {
      if (art) URL.revokeObjectURL(art.stillUrl)
    })
  }
  return made
}

/** The background: the album's own hue, dark, so any cover sits well on it. */
export function groundFor(hue: number): [string, string] {
  return [hslToHex(hue, 30, 22), hslToHex(hue, 38, 7)]
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`
}

function isDisc(style: DeckStyle): boolean {
  return style === 'vinyl' || style === 'jukebox' || style === 'cd'
}

async function draw(
  input: { albumId: string; cover: string | null; hue: number; style: DeckStyle },
  key: string,
): Promise<LockArt | null> {
  const img = await loadImage(input.cover)
  const ground = groundFor(input.hue)

  const still = surface(STILL)
  if (!still) return null
  const [stillCanvas, ctx] = still
  paintGround(ctx, STILL, STILL, ground)

  let disc: HTMLCanvasElement | null = null
  if (isDisc(input.style)) {
    disc = drawDisc(input.style, img, input.hue)
    if (!disc) return null
    const size = STILL * 0.86
    const at = (STILL - size) / 2
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = STILL * 0.04
    ctx.shadowOffsetY = STILL * 0.015
    ctx.drawImage(disc, at, at, size, size)
    ctx.restore()
    if (input.style !== 'cd') sheen(ctx, STILL / 2, (size / 2) * 0.995, (size / 2) * LABEL[input.style])
  } else if (input.style === 'cassette') {
    drawCassette(ctx, STILL, img, input.hue)
  } else {
    drawPocket(ctx, STILL, img, input.hue)
  }

  const stillPng = await png(stillCanvas)
  const discPng = disc ? await png(disc) : null
  return {
    key,
    stillUrl: URL.createObjectURL(stillPng),
    stillPng,
    disc: discPng,
    ground,
    spinSeconds: SPIN[input.style] ?? null,
  }
}

/** The label's radius as a share of the disc's — a touch bigger than the face's
 *  40%, because a lock-screen thumbnail is small and the cover is the point. */
const LABEL: Record<string, number> = { vinyl: 0.44, jukebox: 0.42, cd: 0.34 }

function drawDisc(style: DeckStyle, img: HTMLImageElement | null, hue: number): HTMLCanvasElement | null {
  const made = surface(DISC)
  if (!made) return null
  const [canvas, ctx] = made
  const r = DISC / 2

  if (style === 'cd') {
    // Silver, then the cover printed across the face, then the rainbow the
    // pits throw, then the clear hub.
    const body = ctx.createRadialGradient(r, r, r * 0.1, r, r, r)
    body.addColorStop(0, '#f3f4f6')
    body.addColorStop(0.6, '#cbd5e1')
    body.addColorStop(1, '#94a3b8')
    ctx.fillStyle = body
    circle(ctx, r, r, r * 0.995)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.arc(r, r, r * 0.95, 0, Math.PI * 2)
    ctx.arc(r, r, r * LABEL.cd, 0, Math.PI * 2)
    ctx.clip('evenodd')
    drawCover(ctx, img, hue, r - r * 0.95, r - r * 0.95, r * 1.9, r * 1.9)
    ctx.restore()

    if (typeof ctx.createConicGradient === 'function') {
      const rainbow = ctx.createConicGradient(0.6, r, r)
      const bands = ['255,0,0', '255,200,0', '0,220,120', '0,160,255', '180,0,255', '255,0,0']
      bands.forEach((rgb, i) => rainbow.addColorStop(i / (bands.length - 1), `rgba(${rgb},0.14)`))
      ctx.fillStyle = rainbow
      circle(ctx, r, r, r * 0.995)
      ctx.fill()
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ring(ctx, r, r * 0.2, r * LABEL.cd)
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'
    ctx.lineWidth = DISC / 400
    circle(ctx, r, r, r * LABEL.cd)
    ctx.stroke()
    punch(ctx, r, r * 0.075)
    return canvas
  }

  // Vinyl — `VinylDeck`'s slate record, its grooves, the cover as the label.
  ctx.fillStyle = '#0f172a'
  circle(ctx, r, r, r * 0.995)
  ctx.fill()
  const label = r * LABEL[style]
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = DISC / 512
  for (let groove = label + DISC / 60; groove < r * 0.97; groove += DISC / 110) {
    circle(ctx, r, r, groove)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = DISC / 200
  circle(ctx, r, r, r * 0.985)
  ctx.stroke()

  ctx.save()
  circle(ctx, r, r, label)
  ctx.clip()
  drawCover(ctx, img, hue, r - label, r - label, label * 2, label * 2)
  ctx.restore()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = DISC / 300
  circle(ctx, r, r, label)
  ctx.stroke()
  // A jukebox single has the wide 45 hole; an LP the spindle's pinprick.
  punch(ctx, r, style === 'jukebox' ? r * 0.09 : r * 0.035)
  return canvas
}

/** Light catching the grooves — on the still only: on a turning record the
 *  reflection stays where the light is, so the video leaves it out. */
function sheen(ctx: CanvasRenderingContext2D, c: number, outer: number, inner: number): void {
  if (typeof ctx.createConicGradient !== 'function') return
  const light = ctx.createConicGradient(-0.4, c, c)
  const stops: [number, number][] = [[0, 0], [0.08, 0.1], [0.16, 0], [0.5, 0], [0.58, 0.08], [0.66, 0], [1, 0]]
  for (const [at, alpha] of stops) light.addColorStop(at, `rgba(255,255,255,${alpha})`)
  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, outer, 0, Math.PI * 2)
  ctx.arc(c, c, inner, 0, Math.PI * 2)
  ctx.clip('evenodd')
  ctx.fillStyle = light
  ctx.fillRect(c - outer, c - outer, outer * 2, outer * 2)
  ctx.restore()
}

/** `CassetteDeck`'s shell: the cover as the label, the reels in its window. */
function drawCassette(ctx: CanvasRenderingContext2D, S: number, img: HTMLImageElement | null, hue: number): void {
  const w = S * 0.9
  const h = w * 0.64
  const x = (S - w) / 2
  const y = (S - h) / 2
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = S * 0.04
  ctx.shadowOffsetY = S * 0.015
  ctx.fillStyle = '#1f2937'
  rounded(ctx, x, y, w, h, S * 0.04)
  ctx.fill()
  ctx.restore()

  const lx = x + w * 0.06
  const ly = y + h * 0.08
  const lw = w * 0.88
  const lh = h * 0.6
  ctx.save()
  rounded(ctx, lx, ly, lw, lh, S * 0.02)
  ctx.clip()
  drawCover(ctx, img, hue, lx, ly, lw, lh)
  ctx.restore()

  // The window sits LOW on the label, as on a real tape, so the middle of the
  // cover — where a cover's subject usually is — stays in view.
  const ww = w * 0.46
  const wh = lh * 0.3
  const wx = x + (w - ww) / 2
  const wy = ly + lh * 0.64
  ctx.fillStyle = 'rgba(15,23,42,0.88)'
  rounded(ctx, wx, wy, ww, wh, wh * 0.5)
  ctx.fill()
  for (const cx of [wx + ww * 0.2, wx + ww * 0.8]) {
    const cy = wy + wh / 2
    ctx.fillStyle = '#e5e7eb'
    circle(ctx, cx, cy, wh * 0.36)
    ctx.fill()
    ctx.fillStyle = '#111827'
    circle(ctx, cx, cy, wh * 0.14)
    ctx.fill()
  }

  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(x + w * 0.2, y + h)
  ctx.lineTo(x + w * 0.26, y + h * 0.8)
  ctx.lineTo(x + w * 0.74, y + h * 0.8)
  ctx.lineTo(x + w * 0.8, y + h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#9ca3af'
  for (const [sx, sy] of [[0.03, 0.05], [0.97, 0.05], [0.03, 0.95], [0.97, 0.95]]) {
    circle(ctx, x + w * sx, y + h * sy, S * 0.008)
    ctx.fill()
  }
}

/** `PocketDeck`: the cover on the screen, the click wheel below it. */
function drawPocket(ctx: CanvasRenderingContext2D, S: number, img: HTMLImageElement | null, hue: number): void {
  const h = S * 0.88
  const w = h / 1.4
  const x = (S - w) / 2
  const y = (S - h) / 2
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = S * 0.04
  ctx.shadowOffsetY = S * 0.015
  const body = ctx.createLinearGradient(0, y, 0, y + h)
  body.addColorStop(0, '#f8fafc')
  body.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = body
  rounded(ctx, x, y, w, h, w * 0.12)
  ctx.fill()
  ctx.restore()

  const sw = w * 0.8
  const sx = x + (w - sw) / 2
  const sy = y + w * 0.1
  ctx.save()
  rounded(ctx, sx, sy, sw, sw, w * 0.03)
  ctx.clip()
  drawCover(ctx, img, hue, sx, sy, sw, sw)
  ctx.restore()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = S / 300
  rounded(ctx, sx, sy, sw, sw, w * 0.03)
  ctx.stroke()

  const cx = x + w / 2
  const cy = sy + sw + (y + h - (sy + sw)) / 2
  ctx.fillStyle = '#e2e8f0'
  circle(ctx, cx, cy, w * 0.3)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.stroke()
  ctx.fillStyle = '#f1f5f9'
  circle(ctx, cx, cy, w * 0.11)
  ctx.fill()
  ctx.stroke()
}

// ─── small drawing helpers ────────────────────────────────────────────────

function surface(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  return ctx ? [canvas, ctx] : null
}

function paintGround(ctx: CanvasRenderingContext2D, w: number, h: number, ground: [string, string]): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, ground[0])
  g.addColorStop(1, ground[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

/** The cover, cropped to fill the box like `object-cover`; the album's hue
 *  gradient, as the faces draw it, when there is no cover. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  hue: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    return
  }
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, `hsl(${hue}, 46%, 62%)`)
  g.addColorStop(1, `hsl(${(hue + 28) % 360}, 44%, 44%)`)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
}

function ring(ctx: CanvasRenderingContext2D, c: number, inner: number, outer: number): void {
  ctx.beginPath()
  ctx.arc(c, c, outer, 0, Math.PI * 2)
  ctx.arc(c, c, inner, 0, Math.PI * 2)
  ctx.fill('evenodd')
}

/** A hole right through — transparent, so the ground shows through it. */
function punch(ctx: CanvasRenderingContext2D, c: number, radius: number): void {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  circle(ctx, c, c, radius)
  ctx.fill()
  ctx.restore()
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null
  const img = new Image()
  img.src = url
  try {
    await img.decode()
    return img
  } catch {
    return null
  }
}

function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas gave no image'))), 'image/png')
  })
}
