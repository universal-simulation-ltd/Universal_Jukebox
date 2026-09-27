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
// banner is hidden in the captures only (James, 2026-09-27), by `hideBanner`
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
async function exampleLibrary(page) {
  await page.getByText('Scan my music folder').click()
  await page.getByText('The example library').click()
  // Nine sleeves drawn and the index built.
  await page.getByRole('button', { name: 'Albums', exact: true }).first().waitFor()
  await page.waitForTimeout(1500)
}
async function tab(page, name) {
  await page.getByRole('button', { name, exact: true }).first().click()
  await page.waitForTimeout(700)
}
/** Open a record from the Albums tab and play one of its songs. */
async function play(page, album, song) {
  await tab(page, 'Albums')
  await page.getByText(album, { exact: true }).first().click()
  await page.waitForTimeout(800)
  await page.getByText(song, { exact: true }).first().click()
}
const top = (page) => page.evaluate(() => window.scrollTo(0, 0))

/**
 * Settings the capture starts with, written before the app loads. Everything
 * not named keeps the app's own default. The first-run tips are marked seen:
 * a "Tap here" bubble belongs to somebody's first minute, not to a screenshot.
 */
function settings(extra = {}) {
  return { tipsSeen: ['record', 'cover'], lyricsAround: true, lyricsAroundStyle: 'orbit', ...extra }
}

/** Runs in the page before the app: keeps the example-library banner out of the captures. */
function hideBanner() {
  const hide = () => {
    for (const strong of document.querySelectorAll('p > strong')) {
      if (strong.textContent === 'Example library') strong.parentElement.style.display = 'none'
    }
  }
  new MutationObserver(hide).observe(document, { childList: true, subtree: true })
}

const CAPTURES = {
  // Now Playing on the turntable, the words turning round the record.
  'now-vinyl': {
    settings: settings({ deck: 'vinyl' }),
    async run(page) {
      await play(page, 'Second Pressing', 'Forty-five')
      await page.waitForTimeout(14000)
      await top(page)
    },
  },
  'now-cassette': {
    settings: settings({ deck: 'cassette' }),
    async run(page) {
      await play(page, 'Surface Noise', 'Crackle')
      await page.waitForTimeout(15000)
      await top(page)
    },
  },
  'now-cd': {
    settings: settings({ deck: 'cd' }),
    async run(page) {
      await play(page, 'Sides A and B', 'The Long Way Round')
      await page.waitForTimeout(15000)
      await top(page)
    },
  },
  'now-jukebox': {
    settings: settings({ deck: 'jukebox' }),
    async run(page) {
      await play(page, 'Cutting Head', 'Acetate')
      await page.waitForTimeout(15000)
      await top(page)
    },
  },
  // The lyrics panel, following along, with what is waiting to go on under it.
  lyrics: {
    settings: settings({ deck: 'vinyl' }),
    async run(page) {
      await play(page, 'Sides A and B', 'The Long Way Round')
      await page.waitForTimeout(16000)
      await page.getByText('Show lyrics').first().click()
      await page.waitForTimeout(1200)
    },
  },
  albums: {
    settings: settings(),
    async run(page) {
      await tab(page, 'Albums')
      await top(page)
    },
  },
  tracks: {
    settings: settings(),
    async run(page) {
      await tab(page, 'Tracks')
      await top(page)
      await page.waitForTimeout(800)
    },
  },
  // A shelf of the Jukebox tab with records on it.
  shelf: {
    settings: settings(),
    async run(page) {
      await tab(page, 'Jukebox')
      await page.locator('button[aria-label*="shelf" i]').first().click()
      await page.waitForTimeout(600)
      for (const song of ['Forty-five', 'Crackle', 'Acetate', 'The Blue Hour', 'Counterweight']) {
        const row = page.getByRole('dialog').getByText(song, { exact: true }).first()
        await row.locator('xpath=ancestor::*[.//button][1]').locator('button').last().click()
        await page.waitForTimeout(250)
      }
      await page.getByRole('button', { name: 'Done', exact: true }).first().click()
      await page.waitForTimeout(900)
      await top(page)
    },
  },
  // Tune this app, with the deck chooser open.
  tune: {
    settings: settings({ deck: 'vinyl' }),
    async run(page) {
      await page.goto(`${ORIGIN}/index.html#/settings`)
      await page.waitForTimeout(1200)
      await page.getByText('What you’re playing on', { exact: false }).first().click()
      await page.waitForTimeout(800)
      await top(page)
    },
  },
}

// ── Running them ───────────────────────────────────────────────────────────
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
  await mkdir(path.join(here, dev.dir), { recursive: true })
  for (const [name, capture] of Object.entries(CAPTURES)) {
    if (only.length && !only.some((p) => name.startsWith(p))) continue
    const ctx = await browser.newContext({
      viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr,
      isMobile: true, hasTouch: true, colorScheme: 'light', locale: 'en-GB',
    })
    await serve(ctx)
    await ctx.addInitScript((blob) => {
      localStorage.setItem('unisim-jukebox-settings', JSON.stringify(blob))
    }, capture.settings)
    await ctx.addInitScript(hideBanner)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${ORIGIN}/index.html`)
    await page.waitForTimeout(1200)
    try {
      await exampleLibrary(page)
      await capture.run(page)
    } catch (err) {
      console.error(`FAIL ${dev.dir}/${name}: ${err.message.split('\n')[0]}`)
      bad++
    }
    const out = path.join(here, dev.dir, `${name}.png`)
    const buf = await page.screenshot()
    await writeFile(out, buf)
    const { w, h, colourType } = pngInfo(buf)
    const ok = w === dev.width * dev.dpr && h === dev.height * dev.dpr && colourType === 2
    if (!ok) bad++
    console.log(`${ok ? 'OK ' : 'BAD'} ${dev.dir}/${name}.png ${w}x${h}${colourType === 2 ? '' : ' has alpha'}${errors.length ? ` (page errors: ${errors.length}: ${errors[0].slice(0, 120)})` : ''}`)
    await ctx.close()
  }
}
await browser.close()
if (bad) {
  console.error(`${bad} problem(s) — check the output above`)
  process.exit(1)
}
