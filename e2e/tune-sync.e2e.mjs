// tune-sync.e2e.mjs — Tune this app's own rows follow the account
// (James, 2026-10-30: "mobile app and web app settings in tune this app should
// be saved and synced to their account … Global rule"; @unisim/sdk 0.232.0
// createSyncedSettings, src/stores/settingsStore.ts).
//
//   npm run test:tune-sync   (dev server up: npm run dev, or E2E_BASE_URL;
//                             PLAYWRIGHT_MODULE = any checkout's playwright/index.js)
//
// Supabase is mocked at the network: every /auth/v1, /rest/v1 and
// /functions/v1 request is answered here, and `user_app_prefs` is ONE table in
// this process, so two browser contexts signed in as the same person are two
// devices on one account. A signed-in context carries a made-up session in
// localStorage ('universal-suite-auth', where the SDK keeps it off the
// .unisim.co.uk zone), so the SDK's real sync runs, not its offline mock.
//
//   • signed out: a switch persists over a reload and nothing is sent;
//   • settings from before (the blob, and Requests' old double-tap key) are
//     kept, unstamped, and not sent;
//   • signed in: a change goes to `tune-app:jukebox` as { at, values }, with
//     no device-only setting in it (the volume boost, say);
//   • a second device follows, newest wins, keeps its own device-only
//     settings, Reset follows, reopening is quiet;
//   • a deck the iPhone can't show (the website's Pocket) is kept: the iPhone
//     (the store-capture flag, which bars the pocket player as iOS does)
//     shows the CD, and changing something else there sends Pocket back, not
//     what it showed.

import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5204/'

const PRODUCT = 'jukebox'
const ROW = `tune-app:${PRODUCT}`
const STORE_KEY = 'unisim-jukebox-settings'
const ORIGINAL = /Original sound levels/
const SHOW_ERRORS = /Show error messages/
const DECK_FOLD = 'What you’re playing on'
const POCKET = /^Pocket player/
const CD = /^CD\b/

const PLAYWRIGHT_CANDIDATES = [
  '../node_modules/playwright/index.js',
  '../../Universal_Exports/node_modules/playwright/index.js',
  '../../Universal_Video/node_modules/playwright/index.js',
  '../../../backoffice/universal-platform/node_modules/playwright/index.js',
]

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, ...PLAYWRIGHT_CANDIDATES.map((rel) => join(HERE, rel))].filter(Boolean)
  for (const file of candidates) {
    let mod
    try {
      const m = await import(pathToFileURL(file).href)
      mod = m.default ?? m
    } catch { continue }
    try {
      const probe = await mod.chromium.launch()
      await probe.close()
      return mod
    } catch { /* next */ }
  }
  console.error('No usable Playwright found (set PLAYWRIGHT_MODULE).')
  process.exit(2)
}

const failures = []
function check(label, condition, detail) {
  if (condition) console.log(`  ✓ ${label}`)
  else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
    failures.push(label)
  }
}

// ── The mocked account ───────────────────────────────────────────────────────

/** user_app_prefs: { uid: { app: data } }, and every upsert. */
const table = {}
const upserts = []

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function sessionFor(uid) {
  const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600
  const user = {
    id: uid, aud: 'authenticated', role: 'authenticated', email: `${uid}@example.invalid`,
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
    created_at: '2026-01-01T00:00:00Z', is_anonymous: false,
  }
  const access_token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, exp, role: 'authenticated', aal: 'aal1', email: user.email, session_id: `s-${uid}` })}.sig`
  return { access_token, refresh_token: `r-${uid}`, token_type: 'bearer', expires_in: 365 * 24 * 3600, expires_at: exp, user }
}
function uidOf(request) {
  const token = (request.headers().authorization ?? '').replace(/^Bearer\s+/i, '')
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub ?? null } catch { return null }
}

async function answer(route) {
  const req = route.request()
  const url = new URL(req.url())
  const path = url.pathname
  const uid = uidOf(req)
  if (path.startsWith('/auth/v1/user')) {
    return uid ? route.fulfill({ json: sessionFor(uid).user }) : route.fulfill({ status: 401, json: { message: 'no session' } })
  }
  if (path.startsWith('/auth/v1/')) return route.fulfill({ json: {} })
  if (path === '/rest/v1/user_app_prefs') {
    if (req.method() === 'POST') {
      const body = JSON.parse(req.postData() ?? '[]')
      for (const row of [].concat(body)) {
        upserts.push(row)
        table[row.user_id] = { ...(table[row.user_id] ?? {}), [row.app]: row.data }
      }
      return route.fulfill({ status: 201, body: '' })
    }
    const mine = uid ? (table[uid] ?? {}) : {}
    const eq = url.searchParams.get('app')
    let rows = Object.entries(mine).map(([app, data]) => ({ app, data, user_id: uid }))
    if (eq?.startsWith('eq.')) rows = rows.filter((r) => r.app === eq.slice(3))
    else if (eq?.startsWith('in.(')) {
      const list = eq.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''))
      rows = rows.filter((r) => list.includes(r.app))
    }
    if ((req.headers().accept ?? '').includes('vnd.pgrst.object')) {
      return rows[0]
        ? route.fulfill({ json: rows[0] })
        : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } })
    }
    return route.fulfill({ json: rows })
  }
  if (path.startsWith('/rest/v1/rpc/')) return route.fulfill({ json: null })
  if (path.startsWith('/rest/v1/')) {
    if ((req.headers().accept ?? '').includes('vnd.pgrst.object')) return route.fulfill({ status: 406, json: { code: 'PGRST116' } })
    return route.fulfill({ json: [] })
  }
  return route.fulfill({ json: {} })
}


const playwright = await loadPlaywright()
const browser = await playwright.chromium.launch()
const errors = []

async function device({ uid = null, seed = {}, iphone = false } = {}) {
  const context = await browser.newContext({ viewport: iphone ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  // An iPhone stand-in: the flag the store screenshots set, which gives the
  // phone screens and bars the pocket player exactly as iOS does
  // (lib/nativeFile.ts barsPocketPlayer, native/shell.ts).
  if (iphone) {
    await context.addInitScript(() => {
      if (location.protocol === 'about:') return
      sessionStorage.setItem('jukebox:store-capture', '1')
    })
  }
  await context.route(/\/(auth|rest|functions|storage)\/v1\//, answer)
  await context.route(/\/realtime\/v1\//, (r) => r.abort())
  const session = uid ? sessionFor(uid) : null
  await context.addInitScript(([session, seed]) => {
    if (location.protocol === 'about:') return
    if (sessionStorage.getItem('tune-sync:seeded')) return
    sessionStorage.setItem('tune-sync:seeded', '1')
    if (session) localStorage.setItem('universal-suite-auth', JSON.stringify(session))
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v)
  }, [session, seed])
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  const box = (name) => page.getByRole('checkbox', { name }).first()
  const boost = () => page.getByRole('slider', { name: 'Volume boost' }).first()
  return {
    page,
    close: () => context.close(),
    // Jukebox's own Tune this app page (it stands in for the SDK dialog).
    open: async () => {
      // Via a blank page: the same address with a #fragment is a same-page
      // navigation, not a reopen.
      await page.goto('about:blank')
      await page.goto(`${BASE}#/settings`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      // The phone screens open on the welcome until there is a library: the
      // example one, then Tune.
      const example = page.getByText('Try it with the example library')
      if (iphone && (await example.count()) > 0) {
        await example.first().click()
        await page.waitForTimeout(1500)
        await page.evaluate(() => { location.hash = '#/settings' })
        await page.waitForTimeout(1000)
      }
    },
    tune: async () => {
      for (const title of ['Sound', 'Messages', DECK_FOLD]) {
        const fold = page.locator('details').filter({ has: page.locator('summary').filter({ has: page.getByText(title, { exact: true }) }) }).first()
        if (!(await fold.evaluate((d) => d.open))) await fold.locator('summary').click()
      }
      await box(ORIGINAL).waitFor({ timeout: 10000 })
    },
    deckOffered: (label) => page.getByRole('radio', { name: label }).count().then((n) => n > 0),
    deckOn: (label) => page.getByRole('radio', { name: label }).first().isChecked(),
    pickDeck: async (label) => {
      await page.getByRole('radio', { name: label }).first().check()
      await page.waitForTimeout(400)
    },
    isOn: (name) => box(name).isChecked(),
    flip: async (name) => {
      await box(name).click()
      await page.waitForTimeout(400)
    },
    boostUp: async () => {
      await boost().focus()
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(400)
    },
    reset: async () => {
      await page.locator('[data-testid="jukebox-reset-defaults"] button', { hasText: 'Reset to defaults' }).first().click()
      await page.waitForTimeout(300)
      await page.locator('[data-testid="jukebox-reset-defaults"] button', { hasText: /^Reset$/ }).first().click()
      await page.waitForTimeout(600)
    },
    stored: () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), STORE_KEY),
  }
}
const rowUps = (uid) => upserts.filter((u) => u.app === ROW && (!uid || u.user_id === uid))
const DEVICE_ONLY = ['homeTab', 'ownerName', 'volumeBoost', 'levelDb', 'keepAwake', 'trackNotifications', 'libraryOrder',
  'libraryColumns', 'fullAlbumsOnly', 'artistsMin3', 'genresMin3', 'listDefaults', 'tipsSeen', 'customiseSeen']

try {
  console.log('\nsigned out: this device only')
  {
    const a = await device()
    await a.open()
    await a.tune()
    check('"Original sound levels" starts unticked', !(await a.isOn(ORIGINAL)))
    await a.flip(ORIGINAL)
    check('…ticks and is saved on the device', (await a.isOn(ORIGINAL)) && (await a.stored())?.stableVolume === false, JSON.stringify((await a.stored())?.stableVolume))
    await a.open()
    await a.tune()
    check('a reload keeps it', await a.isOn(ORIGINAL))
    check('nothing is sent to an account', rowUps().length === 0, JSON.stringify(upserts))
    await a.close()
  }

  console.log('\nsettings from before are kept')
  {
    const a = await device({
      uid: 'u-old',
      seed: {
        [STORE_KEY]: JSON.stringify({ hideErrors: false, volumeBoost: 2, deck: 'cd' }),
        'jukebox:requestKind': 'album',
      },
    })
    await a.open()
    await a.tune()
    check('an old switch shows as it was', await a.isOn(SHOW_ERRORS))
    const s = await a.stored()
    check('…kept with the rest, and Requests’ old double tap moved in', s?.hideErrors === false && s.volumeBoost === 2 && s.deck === 'cd' && s.requestKind === 'album', JSON.stringify(s))
    check('…and, never changed here, not sent (no row on the account)', rowUps('u-old').length === 0, JSON.stringify(rowUps()))
    await a.close()
  }

  console.log('\nsigned in: two devices on one account')
  {
    const a = await device({ uid: 'u1' })
    const b = await device({ uid: 'u1' })
    await a.open()
    check('opening the app sends nothing', rowUps('u1').length === 0, JSON.stringify(rowUps('u1')))
    await a.tune()
    await a.boostUp()
    check('a device-only setting (Volume boost) is saved here but not sent', (await a.stored())?.volumeBoost > 1 && rowUps('u1').length === 0, JSON.stringify(rowUps('u1')))
    await a.flip(ORIGINAL)
    const ups = rowUps('u1')
    const data = ups.at(-1)?.data
    const keys = data ? Object.keys(data.values) : []
    check('A ticks a switch → one write to tune-app:jukebox, for this account', ups.length === 1, JSON.stringify(ups.map((u) => u.data?.at)))
    check('…holding only the stamp and the settings', data && JSON.stringify(Object.keys(data).sort()) === '["at","values"]' && data.values.stableVolume === false
      && keys.includes('requestKind') && keys.includes('deck') && keys.includes('hiddenModes'), JSON.stringify(data))
    check('…and none of the device-only ones', DEVICE_ONLY.every((k) => !keys.includes(k)), keys.filter((k) => DEVICE_ONLY.includes(k)).join(','))
    await b.open()
    await b.tune()
    check('B opens with it ticked', await b.isOn(ORIGINAL))
    check('…without A’s Volume boost', (await b.stored())?.volumeBoost === 1, JSON.stringify((await b.stored())?.volumeBoost))
    check('…and sends nothing back', rowUps('u1').length === 1)
    await b.flip(SHOW_ERRORS)
    check('B ticks another → written', rowUps('u1').length === 2 && rowUps('u1')[1].data.values.hideErrors === false)
    await a.open()
    await a.tune()
    check('A, reopened, has both', (await a.isOn(ORIGINAL)) && (await a.isOn(SHOW_ERRORS)))
    check('…and keeps its own Volume boost', (await a.stored())?.volumeBoost > 1)
    await b.flip(ORIGINAL)
    await a.open()
    await a.tune()
    check('B unticks the first again → A follows (newest wins)', !(await a.isOn(ORIGINAL)) && (await a.isOn(SHOW_ERRORS)))
    await a.reset()
    const last = rowUps('u1').at(-1)?.data?.values
    check('A resets to defaults → the defaults are written', last && last.stableVolume === true && last.hideErrors === true, JSON.stringify(last && { stableVolume: last.stableVolume, hideErrors: last.hideErrors }))
    check('…and its own Volume boost is back to off', (await a.stored())?.volumeBoost === 1)
    await b.open()
    await b.tune()
    check('…and B is back to them too', !(await b.isOn(ORIGINAL)) && !(await b.isOn(SHOW_ERRORS)))
    const before = rowUps('u1').length
    await a.open()
    await b.open()
    check('reopening both sends nothing more', rowUps('u1').length === before)
    await a.close()
    await b.close()
  }

  console.log('\na deck the iPhone can’t show: the website’s Pocket survives it')
  {
    const web = await device({ uid: 'u2' })
    const phone = await device({ uid: 'u2', iphone: true })
    await web.open()
    await web.tune()
    await web.pickDeck(POCKET)
    check('the website picks the Pocket player → sent', rowUps('u2').at(-1)?.data?.values?.deck === 'pocket', JSON.stringify(rowUps('u2').at(-1)?.data?.values?.deck))
    await phone.open()
    await phone.tune()
    check('the iPhone doesn’t offer it, and shows the CD', !(await phone.deckOffered(POCKET)) && (await phone.deckOn(CD)))
    check('…while keeping Pocket as the stored choice', (await phone.stored())?.deck === 'pocket', JSON.stringify((await phone.stored())?.deck))
    const before = rowUps('u2').length
    await phone.flip(SHOW_ERRORS)
    const sent = rowUps('u2').at(-1)?.data?.values
    check('the iPhone changes another setting → sent, with Pocket, not the CD it shows', rowUps('u2').length === before + 1 && sent?.deck === 'pocket' && sent?.hideErrors === false, JSON.stringify(sent && { deck: sent.deck, hideErrors: sent.hideErrors }))
    check('…and still shows the CD', await phone.deckOn(CD))
    await web.open()
    await web.tune()
    check('the website still reads Pocket, and has the iPhone’s change', (await web.deckOn(POCKET)) && (await web.isOn(SHOW_ERRORS)))
    await phone.pickDeck(/^Cassette/)
    check('a deck picked on the iPhone is a real choice → sent', rowUps('u2').at(-1)?.data?.values?.deck === 'cassette')
    await web.open()
    await web.tune()
    check('…and the website follows', await web.deckOn(/^Cassette/))
    await web.close()
    await phone.close()
  }

  check('no page errors', errors.length === 0, errors[0])
} finally {
  await browser.close()
}

console.log(failures.length ? `\n${failures.length} failed` : '\nall passed')
process.exit(failures.length ? 1 : 0)
