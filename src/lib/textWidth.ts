// How wide a word actually is, for `lib/lyricOrbit.ts`.
//
// ⚠️ A CANVAS, NOT THE DOCUMENT. The orbit style has to know the width of every
// word of a song before it can space them around a circle, and the two obvious
// ways of finding out are both wrong here: guessing from the letter count packs
// a line of wide letters into itself (which is exactly what the first version
// did), and putting the words in the page to read `offsetWidth` back is a
// layout pass per word on the one screen meant to be left running for an
// album. `measureText` is neither — it is the same font metrics the browser
// would use, with nothing laid out and nothing painted.
//
// Measured once per song and remembered, because the same words come round
// again: a chorus, the next play of the same record, and the same short words
// in every song there is.

let context: CanvasRenderingContext2D | null | undefined
const widths = new Map<string, number>()

/**
 * A measurer for text at `fontSize` in the page's own font, or null where there
 * is no canvas to measure with — in which case the caller's estimate stands.
 *
 * `weight` matters: the orbit draws its words semibold, and a bold word is
 * several percent wider than the same word at normal weight.
 */
export function wordWidths(fontSize: number, weight = 600): ((text: string) => number) | null {
  if (context === undefined) {
    try {
      context = document.createElement('canvas').getContext('2d')
    } catch {
      context = null
    }
  }
  const ctx = context
  if (!ctx) return null
  let family = 'system-ui, sans-serif'
  try {
    family = getComputedStyle(document.body).fontFamily || family
  } catch { /* the default stack is close enough */ }
  const font = `${weight} ${fontSize}px ${family}`
  return (text: string) => {
    // ⚠️ Keyed by the FONT as well as the text. The same word is a different
    // width on a phone-sized deck, and a cache that forgot to say so would hand
    // a 300px deck the widths it measured for a 180px one.
    const key = `${font} :: ${text}`
    const known = widths.get(key)
    if (known !== undefined) return known
    ctx.font = font
    const width = ctx.measureText(text).width
    widths.set(key, width)
    return width
  }
}
