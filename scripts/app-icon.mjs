#!/usr/bin/env node
// The phone app's icon and splash — "the needle drop" (James, 2026-10-10,
// option B of three): a cream tone arm resting on a black record, the record
// running off the corner of a red ground. Drawn once, below; every iOS and
// Android file is rendered from it.
//
//   PLAYWRIGHT=../../backoffice/universal-platform/node_modules/playwright/index.mjs \
//     node scripts/app-icon.mjs
//
// Jukebox's phone icon is its own, not the suite mark on the orange tile, so
// the suite generator skips it (`ownNativeIcon` in
// backoffice/universal-platform/scripts/app-marks/marks.mjs). The website's
// favicon and the suite switcher still use that mark.
//
// What it writes:
//   iOS      AppIcon (1024, opaque) and the launch splash (2732, the icon on
//            the phone app's warm paper)
//   Android  legacy ic_launcher / ic_launcher_round, the adaptive icon as two
//            layers (the red ground and record behind, the tone arm in front,
//            so launchers that move the layers move the arm), the splash mark,
//            and the splash background colour.
//
// ⚠️ ADAPTIVE LAYERS ARE 108dp, AND A LAUNCHER SHOWS ONLY THE MIDDLE ~72dp.
// The artwork is composed edge to edge for iOS, so the layers draw it with the
// viewBox widened (1660 for 1024): the visible circle's radius is a third of the
// canvas, and at 1660 the tone arm's pivot sits just inside it, where at the
// plain 108/72 (1536) a circular mask clipped it. The red ground and the record
// carry on out to the edges for launchers that mask less.

// 1660 / 3 = 553, which clears the pivot's far edge (880,250 r 86 from the
// centre: 538).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright')

/** The phone app's warm paper (native.css `--jx-bg`): the splash ground. */
const PAPER = '#f6f2ec'

const pt = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180
  return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]
}
const wedge = (cx, cy, r, a1, a2) => {
  const [x1, y1] = pt(cx, cy, r, a1)
  const [x2, y2] = pt(cx, cy, r, a2)
  return `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}Z`
}

/**
 * The icon as SVG on a 1024 grid.
 * @param {{ wide?: boolean, back?: boolean, arm?: boolean }} o
 *   wide — the 108dp adaptive canvas (viewBox widened, see the header);
 *   back / arm — which layers to draw (both by default).
 */
function svg({ wide = false, back = true, arm = true } = {}) {
  const box = wide ? '-318 -318 1660 1660' : '0 0 1024 1024'
  const [cx, cy, r, label] = [400, 700, 600, 190]
  let grooves = ''
  for (let g = label + 34; g <= r - 18; g += 15) {
    grooves += `<circle cx="${cx}" cy="${cy}" r="${g}" fill="none" stroke="#f6f2ec" stroke-opacity="0.07" stroke-width="2.4"/>`
  }
  const ground = `
    <rect x="-340" y="-340" width="1704" height="1704" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" fill-opacity="0.25" transform="translate(10 16)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#disc)"/>
    ${grooves}
    <path d="${wedge(cx, cy, r - 6, -150, -112)}" fill="#fff" fill-opacity="0.07"/>
    <path d="${wedge(cx, cy, r - 6, 30, 68)}" fill="#fff" fill-opacity="0.05"/>
    <circle cx="${cx}" cy="${cy}" r="${label}" fill="#b42318"/>
    <circle cx="${cx}" cy="${cy}" r="${label - 30}" fill="none" stroke="#f6f2ec" stroke-opacity="0.28" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${label * 0.11}" fill="#f6f2ec"/>`
  const toneArm = `
    <circle cx="880" cy="250" r="86" fill="#000" fill-opacity="0.25" transform="translate(6 10)"/>
    <line x1="938" y1="196" x2="996" y2="142" stroke="url(#arm)" stroke-width="58" stroke-linecap="round"/>
    <line x1="880" y1="250" x2="648" y2="472" stroke="#000" stroke-opacity="0.25" stroke-width="34" stroke-linecap="round" transform="translate(8 12)"/>
    <line x1="880" y1="250" x2="648" y2="472" stroke="url(#arm)" stroke-width="34" stroke-linecap="round"/>
    <circle cx="880" cy="250" r="86" fill="url(#arm)"/>
    <circle cx="880" cy="250" r="34" fill="#b9a68c"/>
    <rect x="-42" y="-64" width="84" height="128" rx="18" fill="url(#arm)" transform="translate(632 494) rotate(44)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d23a24"/><stop offset="1" stop-color="#8a1a10"/></linearGradient>
    <linearGradient id="arm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf6ee"/><stop offset="1" stop-color="#d9cbb6"/></linearGradient>
    <radialGradient id="disc" cx="50%" cy="50%" r="50%"><stop offset="0.35" stop-color="#1c1815"/><stop offset="1" stop-color="#0a0807"/></radialGradient>
  </defs>
  ${back ? ground : ''}
  ${arm ? toneArm : ''}
</svg>`
}

const browser = await chromium.launch()

/**
 * Render to PNG.
 * @param {number} size  canvas edge in px
 * @param {string} art   the SVG
 * @param {{ inset?: number, radius?: string, ground?: string | null }} o
 *   inset — share of the canvas the art takes; radius — CSS corner rounding
 *   of the art; ground — the canvas colour, or null for transparent.
 */
async function png(size, art, { inset = 1, radius = '0', ground = null } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const pct = (inset * 100).toFixed(4)
  await page.setContent(`<!doctype html><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:${ground ?? 'transparent'};display:grid;place-items:center}
    div{width:${pct}%;height:${pct}%;border-radius:${radius};overflow:hidden}
  </style><div>${art}</div>`)
  const buf = await page.screenshot({ omitBackground: ground === null })
  await page.close()
  return buf
}

const written = []
function put(rel, data) {
  const file = path.join(root, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  try {
    if (readFileSync(file).equals(Buffer.from(data))) return
  } catch { /* new file */ }
  writeFileSync(file, data)
  written.push(rel)
}

const HEADER = `<!-- Written by scripts/app-icon.mjs — edit the drawing there, not this file.
     Jukebox's phone icon is its own; the suite generator skips it (ownNativeIcon). -->`

// ── iOS ─────────────────────────────────────────────────────────────────────
const IOS = 'ios/App/App/Assets.xcassets'
// Opaque, full bleed: iOS rounds the corners itself and refuses alpha.
put(`${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`, await png(1024, svg(), { ground: '#8a1a10' }))
// The splash: the icon, rounded, in the middle of the paper — the ground the
// app itself opens on, so the launch doesn't flash a colour the app hasn't got.
const splash = await png(2732, svg(), { inset: 0.26, radius: '22.4%', ground: PAPER })
for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
  put(`${IOS}/Splash.imageset/${name}`, splash)
}

// ── Android ─────────────────────────────────────────────────────────────────
const RES = 'android/app/src/main/res'
const DENSITIES = { 'mipmap-mdpi': 1, 'mipmap-hdpi': 1.5, 'mipmap-xhdpi': 2, 'mipmap-xxhdpi': 3, 'mipmap-xxxhdpi': 4 }
for (const [dir, scale] of Object.entries(DENSITIES)) {
  const launcher = Math.round(48 * scale)
  const adaptive = Math.round(108 * scale)
  // Pre-Android 8: nothing masks these, so they carry their own shape.
  put(`${RES}/${dir}/ic_launcher.png`, await png(launcher, svg(), { inset: 0.92, radius: '22.4%' }))
  put(`${RES}/${dir}/ic_launcher_round.png`, await png(launcher, svg(), { inset: 0.92, radius: '50%' }))
  put(`${RES}/${dir}/ic_launcher_background.png`, await png(adaptive, svg({ wide: true, arm: false }), { ground: '#8a1a10' }))
  put(`${RES}/${dir}/ic_launcher_foreground.png`, await png(adaptive, svg({ wide: true, back: false })))
}
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
put(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`, adaptiveXml)
put(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptiveXml)

// The splash. Android 11 and below draw `drawable/splash.xml` (the tile, then
// the mark at its own size); 12 and up draw the launcher icon on
// `ic_launcher_background`. Both on the paper.
const SPLASH = { 'drawable-mdpi': 1, 'drawable-hdpi': 1.5, 'drawable-xhdpi': 2, 'drawable-xxhdpi': 3, 'drawable-xxxhdpi': 4 }
for (const [dir, scale] of Object.entries(SPLASH)) {
  const px = Math.round(240 * scale)
  put(`${RES}/${dir}/splash_mark.png`, await png(px, svg(), { inset: 0.6, radius: '22.4%' }))
}
put(`${RES}/drawable/ic_launcher_tile.xml`, `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<!-- The splash ground (drawable/splash.xml draws it under the mark). -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${PAPER}"/>
</shape>
`)
put(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>
${HEADER}
<resources>
    <color name="ic_launcher_background">${PAPER}</color>
</resources>
`)

await browser.close()
console.log(written.length ? `Wrote ${written.length} file(s):\n  ${written.join('\n  ')}` : 'Nothing changed.')
