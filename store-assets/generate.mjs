#!/usr/bin/env node
// Regenerates the App Store and Google Play captures for Universal Jukebox.
//
//   npm run build:desktop                 # the bundle the iOS/Android shells load
//   node store-assets/generate.mjs        # every screen, every device
//   node store-assets/generate.mjs now    # only captures whose name starts "now"
//   DEVICE=iphone node store-assets/generate.mjs
//
// Needs Playwright's Chromium. It is not a dependency of this repo, so either
// `npm i --no-save playwright && npx playwright install chromium`, or point
// PLAYWRIGHT at an existing copy's index.mjs (the umbrella's
// backoffice/universal-platform/node_modules/playwright/index.mjs works).
//
// The screens are the real app: dist/ is served to the browser through
// Playwright's request routing (no local server, no port), at each store
// device's viewport and pixel ratio, and driven like a person would drive it.
// Anything that is not the app itself is refused.
//
// ⚠️ EVERYTHING ON SCREEN IS THE EXAMPLE LIBRARY. Its "Example library"
// banner is hidden in the captures only (James, 2026-09-27), by `captureMode`
// below; the app itself always shows it. Its four artists, nine
// records, sleeves, music and lyrics are all made up and made by the app
// (`src/lib/exampleLibrary.ts`), so no real artist, cover or lyric appears in a
// store image — the store-listing rule that every name and face is invented.
//
// Output (committed): raw/iphone (1320x2580), raw/ipad (2064x2664) and
// raw/android (1080x2172). The UNI·SIM store kit frames them:
//
//   node ../../Docs_UNI_SIM/store-kit/build.mjs store-assets
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const dist = path.join(root, 'dist')
const { chromium } = await import(
  process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright'
)

// Each device's screen less the status bar and home indicator the store kit
// draws (its layouts.mjs, CLASSES[…].insets): iPhone 17 Pro Max 956 pt less
// 62 + 34, iPad 13" 1376 pt less 24 + 20, an Android phone 780 dp less 32 + 24.
// LOCALE=de-DE (etc.) captures the app in that language — the app's own
// language set before it loads, as Tune this app ▸ Language would — into
// raw/<locale>/<class>/, which the store kit frames for that locale. en-GB is
// the shared raw/<class>/.
const LOCALE = process.env.LOCALE || 'en-GB'
const APP_LANGUAGE = { 'en-GB': 'en', 'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es', 'it-IT': 'it', 'pt-BR': 'pt-BR', 'pt-PT': 'pt-PT', 'tr-TR': 'tr' }[LOCALE]
if (!APP_LANGUAGE) throw new Error(`LOCALE ${LOCALE}: not one of the app's languages`)
const rawDir = (dir) => (LOCALE === 'en-GB' ? dir : dir.replace(/^raw\//, `raw/${LOCALE}/`))

const DEVICES = [
  { key: 'iphone', dir: 'raw/iphone', width: 440, height: 860, dpr: 3 },
  { key: 'ipad', dir: 'raw/ipad', width: 1032, height: 1332, dpr: 2 },
  { key: 'android', dir: 'raw/android', width: 360, height: 724, dpr: 3 },
]
const ORIGIN = 'https://app.test'
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json',
}

// ── Driving the app ────────────────────────────────────────────────────────
// ⚠️ THE PHONE SCREENS (2026-10-11). The store shows the iPhone / Android app,
// which has screens of its own (`src/native/`); the website's layout is not in
// any capture. `phoneScreens()` turns them on from a session flag set below,
// before the app loads. Everything is found by structure (the tab bar's
// position, the welcome screen's button), never by English words, so the same
// steps capture every language.

/** The tab bar, left to right: Artists · Albums · Tracks · Shelves · Tune. */
const TAB = { artists: 0, albums: 1, tracks: 2, shelves: 3, tune: 4 }

async function exampleLibrary(page) {
  await page.locator('.jx-welcome .jx-btn.primary').click()
  await page.locator('.jx-tab').first().waitFor()
  await page.waitForTimeout(1500)
}
async function tab(page, name) {
  await page.locator('.jx-tab').nth(TAB[name]).click()
  await page.waitForTimeout(700)
}
/** Play a song from the Tracks list (its title is the example library's, the same in every language). */
async function play(page, song) {
  await tab(page, 'tracks')
  await page.locator('.jx-song .jx-row', { hasText: song }).first().click()
}
const top = (page) => page.evaluate(() => window.scrollTo(0, 0))

/** Pull down from the top of a list, as a finger would, to open its drawer (`PullDrawer`). */
async function pullDown(page, ctx) {
  const cdp = await ctx.newCDPSession(page)
  const x = 180, from = 300
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] })
  for (let y = from; y <= from + 240; y += 15) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(700)
}

/**
 * Settings the capture starts with, written before the app loads. Everything
 * not named keeps the app's own default. The first-run tips are marked seen:
 * a "Tap here" bubble belongs to somebody's first minute, not to a screenshot.
 */
function settings(extra = {}) {
  return { tipsSeen: ['record', 'cover', 'hold', 'shelfPlay'], lyricsAround: true, lyricsAroundStyle: 'orbit', ...extra }
}

/**
 * Runs in the page before the app: the phone screens on, and the banners above
 * a screen (the example library's notice, scan progress) out of the picture.
 * The app itself always shows them.
 */
function captureMode() {
  try { sessionStorage.setItem('jukebox:store-capture', '1') } catch { /* captures fail loudly below */ }
  // Init scripts run before <html> exists: add the rule once the page has a head.
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = 'html.jx-phone .jx-main > :not(.jx-page):not(.jx-playing){display:none!important}'
    document.head.append(style)
  })
}

const CAPTURES = {
  // 01: the record on the turntable, the words going round it.
  'now-vinyl': {
    settings: settings({ deck: 'vinyl' }),
    async run(page) {
      await play(page, 'Forty-five')
      await page.waitForTimeout(14000)
      await top(page)
    },
  },
  'now-cassette': {
    settings: settings({ deck: 'cassette' }),
    async run(page) {
      await play(page, 'Crackle')
      await page.waitForTimeout(15000)
      await top(page)
    },
  },
  'now-jukebox': {
    settings: settings({ deck: 'jukebox' }),
    async run(page) {
      await play(page, 'Acetate')
      await page.waitForTimeout(15000)
      await top(page)
    },
  },
  // 03: the words going round a turning record, and a close-up of them for
  // the lens (James, 2026-10-11: "use a vinyl and zoom in to see the
  // lyrics"). The close-up is cut from the same screen at full resolution:
  // the record's frame (the orbit's parent), with room for the words round it.
  'lyrics-vinyl': {
    settings: settings({ deck: 'vinyl', lyricsAroundStyle: 'orbit' }),
    async run(page, ctx, save) {
      await play(page, 'The Long Way Round')
      await page.waitForTimeout(16000)
      await top(page)
      await page.waitForTimeout(400)
      const box = await page.evaluate(() => {
        const frame = document.querySelector('[data-lyrics-around="orbit"]')?.parentElement
        if (!frame) return null
        const r = frame.getBoundingClientRect()
        const side = Math.min(r.width * 1.4, window.innerWidth)
        const x = Math.max(0, Math.min(window.innerWidth - side, r.left + r.width / 2 - side / 2))
        const y = Math.max(0, r.top + r.height / 2 - side / 2)
        return { x, y, width: side, height: side }
      })
      if (!box) throw new Error('no lyrics round the record to zoom in on')
      await save('lyrics-zoom', await page.screenshot({ clip: box }))
    },
  },
  // 02: one record's page — Play, Shuffle, the songs with their preview and
  // ⋯ — under "Each album, its own sleeve" (James, 2026-10-11).
  album: {
    settings: settings(),
    async run(page) {
      // Through the artist, as a person would: the example library's names
      // are the same in every language.
      await tab(page, 'artists')
      await page.locator('.jx-tile', { hasText: 'The Tone Arms' }).first().click()
      await page.waitForTimeout(800)
      await page.locator('.jx-tile', { hasText: 'Second Pressing' }).first().click()
      await page.waitForTimeout(900)
      await top(page)
    },
  },
  // Tune this app, the machines open (its third card, in every language).
  tune: {
    settings: settings({ deck: 'vinyl' }),
    async run(page) {
      await tab(page, 'tune')
      await page.evaluate(() => {
        const machines = document.querySelectorAll('.jx-tune-settings details')[2]
        if (!machines) throw new Error('no machines section in Tune')
        machines.open = true
        window.scrollTo(0, machines.getBoundingClientRect().top + window.scrollY - 70)
      })
      await page.waitForTimeout(800)
    },
  },
}

function pngInfo(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colourType: buf[25] }
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

const only = process.argv.slice(2)
const devices = DEVICES.filter((d) => !process.env.DEVICE || process.env.DEVICE.split(',').includes(d.key))
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
let bad = 0
for (const dev of devices) {
  await mkdir(path.join(here, rawDir(dev.dir)), { recursive: true })
  for (const [name, capture] of Object.entries(CAPTURES)) {
    if (only.length && !only.some((p) => name.startsWith(p))) continue
    const ctx = await browser.newContext({
      viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr,
      isMobile: true, hasTouch: true, colorScheme: 'light', locale: LOCALE,
    })
    await serve(ctx)
    await ctx.addInitScript((blob) => {
      localStorage.setItem('unisim-jukebox-settings', JSON.stringify(blob))
    }, capture.settings)
    await ctx.addInitScript(captureMode)
    await ctx.addInitScript((lang) => {
      try { localStorage.setItem('universal:language:jukebox', lang) } catch { /* captured in English, and the check below says so */ }
    }, APP_LANGUAGE)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${ORIGIN}/index.html`)
    await page.waitForTimeout(1200)
    try {
      await exampleLibrary(page)
      await capture.run(page, ctx, async (extra, buf) => {
        await writeFile(path.join(here, rawDir(dev.dir), `${extra}.png`), buf)
        console.log(`OK  ${rawDir(dev.dir)}/${extra}.png (close-up)`)
      })
    } catch (err) {
      console.error(`FAIL ${rawDir(dev.dir)}/${name}: ${err.message.split('\n')[0]}`)
      bad++
    }
    const out = path.join(here, rawDir(dev.dir), `${name}.png`)
    const buf = await page.screenshot()
    await writeFile(out, buf)
    const { w, h, colourType } = pngInfo(buf)
    const ok = w === dev.width * dev.dpr && h === dev.height * dev.dpr && colourType === 2
    if (!ok) bad++
    console.log(`${ok ? 'OK ' : 'BAD'} ${rawDir(dev.dir)}/${name}.png ${w}x${h}${colourType === 2 ? '' : ' has alpha'}${errors.length ? ` (page errors: ${errors.length}: ${errors[0].slice(0, 120)})` : ''}`)
    await ctx.close()
  }
}
await browser.close()
if (bad) {
  console.error(`${bad} problem(s) — check the output above`)
  process.exit(1)
}
