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

  // A shade down from the top edge, so white type reads over sky and over
  // a bright window alike.
  const shade = ctx.createLinearGradient(0, 0, 0, size * 0.5)
  shade.addColorStop(0, 'rgba(0,0,0,0.58)')
  shade.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, size, size * 0.5)

  const centred = text.centred === true
  const x = centred ? size / 2 : 44 * k
  ctx.textAlign = centred ? 'center' : 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 12 * k

  ctx.fillStyle = '#ffffff'
  ctx.font = text.serif
    ? `italic 500 ${60 * k}px Georgia, "Times New Roman", serif`
    : `700 ${58 * k}px system-ui, -apple-system, Segoe UI, sans-serif`
  const lines = fitLines(ctx, titleLines(ctx, text.title, size - 88 * k), size - 88 * k)
  lines.forEach((line, i) => ctx.fillText(line, x, 98 * k + i * 64 * k))

  if (text.artist) {
    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.font = `600 ${22 * k}px system-ui, -apple-system, Segoe UI, sans-serif`
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${3 * k}px`
    const artist = ellipsis(ctx, text.artist.toUpperCase(), size - 88 * k)
    ctx.fillText(artist, x, 98 * k + (lines.length - 1) * 64 * k + 44 * k)
  }

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
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
