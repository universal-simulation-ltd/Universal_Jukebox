import { useEffect, useState } from 'react'
import { coverUrl, fallbackHue } from './art'
import type { Album } from './types'

// The one colour a sleeve is remembered by — for washing Now Playing in it and
// for the sing-along screen behind the words.
//
// ⚠️ NOT THE AVERAGE. The plain mean of most covers is a muddy brown-grey,
// because the dark and light parts cancel the colour out. Each pixel is
// weighted by how colourful it is (chroma), so a black sleeve with one red
// stripe comes out red, as a person would describe it. A sleeve with no colour
// in it at all falls back to its own grey rather than inventing one.
//
// Read off a 24 × 24 copy drawn on a canvas, once per album, and cached — the
// sleeve is at most 512 px (`COVER_MAX`) and already decoded for the deck.

export interface Rgb {
  r: number
  g: number
  b: number
}

const cache = new Map<string, Rgb>()

/** The chroma-weighted colour of RGBA pixel data. Exported for the tests. */
export function dominant(data: ArrayLike<number>): Rgb | null {
  let r = 0, g = 0, b = 0, weight = 0
  let gr = 0, gg = 0, gb = 0, count = 0
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const pr = data[i], pg = data[i + 1], pb = data[i + 2]
    gr += pr; gg += pg; gb += pb; count++
    const chroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb)
    const w = chroma * chroma
    r += pr * w; g += pg * w; b += pb * w; weight += w
  }
  if (count === 0) return null
  // Under ~12% chroma on average there is no colour to speak of.
  if (weight / count < 30 * 30) return { r: Math.round(gr / count), g: Math.round(gg / count), b: Math.round(gb / count) }
  return { r: Math.round(r / weight), g: Math.round(g / weight), b: Math.round(b / weight) }
}

/** An album without art is washed in the hue its drawn sleeve already uses. */
function fromHue(hue: number): Rgb {
  // hsl(hue 60% 50%) → rgb.
  const s = 0.6, l = 0.5
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) }
}

function read(url: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 24
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, 24, 24)
        resolve(dominant(ctx.getImageData(0, 0, 24, 24).data))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** The sleeve's colour, or null for the moment it takes to read it. */
export function useSleeveColour(album: Album | undefined): Rgb | null {
  const id = album?.id
  const [colour, setColour] = useState<Rgb | null>(() => (id ? cache.get(id) ?? null : null))
  useEffect(() => {
    if (!album) return setColour(null)
    const known = cache.get(album.id)
    if (known) return setColour(known)
    const url = coverUrl(album.id, album.cover)
    if (!url) {
      const drawn = fromHue(fallbackHue(album.id))
      cache.set(album.id, drawn)
      return setColour(drawn)
    }
    let live = true
    void read(url).then((rgb) => {
      const found = rgb ?? fromHue(fallbackHue(album.id))
      cache.set(album.id, found)
      if (live) setColour(found)
    })
    return () => {
      live = false
    }
  }, [album])
  return colour
}

/** `rgb(r g b / alpha)`. */
export function rgba({ r, g, b }: Rgb, alpha: number): string {
  return `rgb(${r} ${g} ${b} / ${alpha})`
}
