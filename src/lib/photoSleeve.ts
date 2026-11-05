// photoSleeve.ts — a photograph with the album's name and artist set across
// the top: the example library's sleeves (James, 2026-10-20) and, since
// 2026-11-05, the sleeve of any album of yours whose files carry no artwork
// (`madeSleeves.ts`). One painter, so the two always look like one family.

export interface SleeveLettering {
  title: string
  artist: string
  /** A serif italic title instead of the bold sans. */
  serif?: boolean
  /** Set centred instead of from the left. */
  centred?: boolean
}

/**
 * Paint the sleeve: `src` (a data URL, see `exampleCovers.ts` for why) cropped
 * square, a shade down from the top, the title on up to two lines, the artist
 * in spaced capitals under it. `size` is the square's side in pixels; every
 * measure scales from the 720px original.
 */
export async function paintPhotoSleeve(
  src: string,
  text: SleeveLettering,
  size = 720,
  quality = 0.86,
): Promise<Blob | null> {
  const img = new Image()
  img.src = src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const k = size / 720
  // Cover-cropped from the middle; the files are square already.
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

  const centred = text.centred === true
  const x = centred ? size / 2 : 44 * k
  const titleFont = text.serif
    ? `italic 500 ${60 * k}px Georgia, "Times New Roman", serif`
    : `700 ${58 * k}px system-ui, -apple-system, Segoe UI, sans-serif`
  ctx.font = titleFont
  const lines = fitLines(ctx, titleLines(ctx, text.title, size - 88 * k), size - 88 * k)
  const artistY = 98 * k + (lines.length - 1) * 64 * k + 44 * k
  // Where the lettering is: from the top to just under its last line.
  const textBottom = Math.ceil((text.artist ? artistY : 98 * k + (lines.length - 1) * 64 * k) + 14 * k)

  // A shade down from the top edge, so white type reads over sky and over
  // a bright window alike…
  const shade = ctx.createLinearGradient(0, 0, 0, size * 0.5)
  shade.addColorStop(0, 'rgba(0,0,0,0.58)')
  shade.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, size, size * 0.5)
  // …and then as much more as THIS photo needs (James, 2026-11-05: "make sure
  // the text used provides enough contrast"). Measured, not guessed: with the
  // fixed shade alone, 11 of the 20 sleeve photos fell below 4.5:1 behind the
  // artist line (bright sky, a white beach, a misty window). See `deepenShade`.
  deepenShade(ctx, size, textBottom, centred ? 0 : Math.floor(30 * k), size - Math.floor(30 * k))

  ctx.textAlign = centred ? 'center' : 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 12 * k

  ctx.fillStyle = '#ffffff'
  ctx.font = titleFont
  lines.forEach((line, i) => ctx.fillText(line, x, 98 * k + i * 64 * k))

  if (text.artist) {
    // Pure white, like the title: the small line is the one that needs the
    // contrast most, so its hierarchy comes from size and weight, not a grey.
    ctx.fillStyle = '#ffffff'
    ctx.font = `600 ${22 * k}px system-ui, -apple-system, Segoe UI, sans-serif`
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${3 * k}px`
    const artist = ellipsis(ctx, text.artist.toUpperCase(), size - 88 * k)
    ctx.fillText(artist, x, artistY)
  }

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/**
 * White text needs the background at or below this luminance for 4.5:1 (WCAG
 * AA, small text). Aimed at 5:1: the check samples every few pixels and the
 * JPEG shifts them a little, and at 4.5 three sleeves came out at 4.2–4.4.
 */
const MAX_LUMINANCE = 1.05 / 5 - 0.05
/** Judged on the brightest 5% of what is behind the text, not the average: one bright cloud under a letter is enough to lose it. */
const PERCENTILE = 0.95

function channel(v: number): number {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** The `PERCENTILE` relative luminance of the band [0, bottom) × [left, right). */
export function bandLuminance(data: Uint8ClampedArray, width: number, bottom: number, left: number, right: number): number {
  const seen: number[] = []
  for (let y = 0; y < bottom; y += 2) {
    for (let x = left; x < right; x += 3) {
      const i = (y * width + x) * 4
      seen.push(0.2126 * channel(data[i]) + 0.7152 * channel(data[i + 1]) + 0.0722 * channel(data[i + 2]))
    }
  }
  if (seen.length === 0) return 0
  seen.sort((a, b) => a - b)
  return seen[Math.min(seen.length - 1, Math.floor(seen.length * PERCENTILE))]
}

/**
 * Darken the band behind the lettering until white text on it reaches 4.5:1,
 * with a soft fade below it so the photo doesn't look cut. A dark photo is
 * left alone. If the canvas can't be read (it always can for a data URL, but
 * belt and braces), a fixed deep shade is laid instead.
 */
function deepenShade(ctx: CanvasRenderingContext2D, size: number, bottom: number, left: number, right: number): void {
  const fade = Math.round(size * 0.18)
  const lay = (alpha: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, bottom + fade)
    g.addColorStop(0, `rgba(0,0,0,${alpha})`)
    g.addColorStop(bottom / (bottom + fade), `rgba(0,0,0,${alpha})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, bottom + fade)
  }
  try {
    for (let round = 0; round < 4; round++) {
      const lum = bandLuminance(ctx.getImageData(0, 0, size, bottom).data, size, bottom, left, right)
      if (lum <= MAX_LUMINANCE) return
      // A black layer at alpha a scales each sRGB channel by (1 − a), so
      // luminance by roughly (1 − a)^2.2; a little extra so one round usually does.
      const a = Math.min(0.9, 1 - (MAX_LUMINANCE / lum) ** (1 / 2.2) + 0.03)
      lay(a)
    }
  } catch {
    lay(0.45)
  }
}

/** A title broken into lines no wider than `width`. */
function titleLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/** At most two lines; a longer title (or one long word) ends in "…". */
function fitLines(ctx: CanvasRenderingContext2D, lines: string[], width: number): string[] {
  const two = lines.slice(0, 2)
  if (lines.length > 2) two[1] = `${two[1]} ${lines.slice(2).join(' ')}`
  return two.map((l) => ellipsis(ctx, l, width))
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}
