#!/usr/bin/env node
// The App Store app preview for Universal Jukebox: 15–30 s of the real phone
// app, 886×1920 (James, 2026-10-14).
//
//   npm run build:desktop                   # the bundle the iOS shell loads
//   node store-assets/preview.mjs           # → store-assets/out/en-GB/preview/iphone-01.mp4
//   node store-assets/preview.mjs --stills  # and PNG stills beside it, to look at
//
// The recorder, the status bar and the encoding are the UNI·SIM store kit's
// (Docs_UNI_SIM/store-kit/preview.mjs). The app is served from dist/ as
// generate.mjs serves it, with the phone screens on, and driven in English.
//
// ⚠️ EVERYTHING ON SCREEN IS THE EXAMPLE LIBRARY, as on the screenshots: its
// artists, records, sleeves, music and lyrics are made up and made by the app.
// The preview is silent (the kit adds a silent track), as Apple autoplays it.
//
// The story: the record already turning with the words going round it (the
// strongest shot, from the first frame), back out to the albums' shelf of
// sleeves, one record's own page, a song from it, Bedside, then the Player button stepping through
// the machines, ending held on the jukebox.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dist = path.join(root, 'dist')
const kit = await import(pathToFileURL(path.resolve(root, '../../Docs_UNI_SIM/store-kit/preview.mjs')).href)
const { IPHONE, playwright, prepare, record, stills, tap, scroll, hold } = kit

const ORIGIN = 'https://app.test'
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
}

async function serve(ctx) {
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== ORIGIN) return route.abort()
    let p = decodeURIComponent(url.pathname)
    if (p.endsWith('/')) p += 'index.html'
    try {
      const file = path.join(dist, p)
      await route.fulfill({ body: await readFile(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream' })
    } catch {
      await route.fulfill({ status: 404, body: '' })
    }
  })
}

/** The tab bar, left to right: Artists · Albums · Tracks · Shelves · Tune (generate.mjs). */
const TAB = { artists: 0, albums: 1, tracks: 2, shelves: 3, tune: 4 }

const { chromium } = await playwright()
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ ...IPHONE, locale: 'en-GB', colorScheme: 'light' })
await serve(ctx)
// generate.mjs's capture settings: the vinyl, the words round the record, the
// first-run tips already seen, the phone screens on and the banners out of shot.
await ctx.addInitScript(() => {
  localStorage.setItem('unisim-jukebox-settings', JSON.stringify({
    tipsSeen: ['record', 'cover', 'hold', 'shelfPlay', 'foldUp', 'pullDown'], lyricsAround: true, lyricsAroundStyle: 'orbit', deck: 'vinyl',
  }))
  localStorage.setItem('universal:language:jukebox', 'en-gb')
  sessionStorage.setItem('jukebox:store-capture', '1')
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = 'html.jx-phone .jx-main > :not(.jx-page):not(.jx-playing){display:none!important}'
    document.head.append(style)
  })
})
const page = await ctx.newPage()
// The clock starts at 9:41 and runs on, so Bedside's clock agrees with the
// kit's status bar (generate.mjs holds it there for the Bedside screenshot).
await page.clock.install({ time: new Date(2026, 9, 14, 9, 40, 30) })
await prepare(page)
await page.goto(`${ORIGIN}/index.html`)
await page.waitForTimeout(1200)

const tab = (name) => page.locator('.jx-tab').nth(TAB[name])

/** A finger dragged from one point to another, as a touch (CSS px). */
async function swipe([x0, y0], [x1, y1], { steps = 20, after = 700 } = {}) {
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] })
    await page.waitForTimeout(12)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(after)
}
/** Swipe up from near the bottom of the screen: opens Now Playing's folded row (`FoldUp`). */
const swipeUp = () => swipe([220, 760], [220, 500])
/** The albums shelf's sleeve in the middle of the screen (IPHONE is 443 × 864 CSS px). */
const SHELF_CENTRE = { x: 221, y: 410 }

// Before the camera rolls: the example library, and "Forty-five" on the
// turntable long enough for its words to be going round the record.
await page.locator('.jx-welcome .jx-btn.primary').click()
await page.locator('.jx-tab').first().waitFor()
await page.waitForTimeout(1200)
await tab('tracks').click()
await page.waitForTimeout(700)
await page.locator('.jx-song .jx-row', { hasText: 'Forty-five' }).first().click()
await page.waitForTimeout(12000)
await page.evaluate(() => window.scrollTo(0, 0))

const out = path.join(here, 'out/en-GB/preview/iphone-01.mp4')
await record(page, async () => {
  // The record turning, the words going round it.
  await hold(page, 3200)
  // Back out to the albums, each in its sleeve, and one record's own page.
  await tap(page, page.locator('.jx-back').first(), { after: 600 })
  await tap(page, tab('albums'), { after: 1100 })
  // Along the shelf, a sleeve at a time, then open the one in the middle.
  await swipe([380, SHELF_CENTRE.y], [120, SHELF_CENTRE.y], { after: 900 })
  await swipe([380, SHELF_CENTRE.y], [120, SHELF_CENTRE.y], { after: 1000 })
  await tap(page, SHELF_CENTRE, { after: 1800 })
  await scroll(page, 260, { ms: 700, after: 500 })
  // A song from it: back on the turntable.
  await tap(page, page.locator('.jx-song .jx-row').nth(2), { after: 2600 })
  // Bedside: dim on black for a dark room.
  await page.evaluate(() => window.scrollTo(0, 0))
  await swipeUp()
  await tap(page, page.locator('[data-mode="bedside"]').first(), { after: 2600 })
  await tap(page, page.getByRole('button', { name: 'Close bedside' }), { after: 700 })
  await page.evaluate(() => document.activeElement?.blur())
  // The Player button: the next machine, a tap at a time, ending on the jukebox.
  const player = page.locator('[data-mode="player"]').first()
  if (!(await player.isVisible())) await swipeUp()
  for (let i = 0; i < 4; i++) await tap(page, player, { after: 1500 })
}, { out, tail: 2200, edge: { top: 24 } })

if (process.argv.includes('--stills')) console.log((await stills(out, [0.5, 3, 5, 7, 9, 12, 15, 18, 21, 24])).join('\n'))
await browser.close()
