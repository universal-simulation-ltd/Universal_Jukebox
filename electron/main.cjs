const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')
const { installHubHandoff } = require('@unisim/sdk/electron')

// Universal Jukebox on the desktop — Windows first (James, 2026-09-11: "A
// windows app is possible too?", then "go").
//
// It is the web app, built in the `desktop` Vite mode — relative asset paths
// and no service worker, the same bundle Capacitor ships to the phone — and
// loaded from disk over file://. The music is read exactly as the browser
// reads it: the folder is chosen through Chromium's own picker
// (`showDirectoryPicker`), so nothing in this process touches the disk on the
// page's behalf and the renderer stays sandboxed.
//
// Modelled on Universal PDF's shell, less everything PDF-specific.

// Set to a Vite dev server URL to run the shell against live source. Unset —
// the packaged app — it loads the built bundle from disk.
const DEV_SERVER_URL = process.env.ELECTRON_START_URL

const APP_ID = 'uk.co.unisim.jukebox'
const ICON = path.join(__dirname, '..', 'dist', 'icon-512.png')

let mainWindow = null

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 640,
    minHeight: 520,
    title: 'Universal Jukebox',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    icon: ICON,
    // Held back until there is something to look at, rather than an empty
    // frame while the bundle boots.
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // ⚠️ A music player. Chromium may slow the timers of a hidden or
      // minimised window, and the change-over, the crossfade and the countdown
      // all run on timers — the sound would carry on while the deck fell out
      // of step with it. An audible page is usually spared, but this is not
      // left to "usually".
      backgroundThrottling: false,
    },
  })
  // The page's <title> is its search-result headline; the title bar only
  // needs the app's name.
  win.on('page-title-updated', (event) => event.preventDefault())

  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  const reveal = () => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }
  win.once('ready-to-show', reveal)
  // Belt and braces: a page that never reaches first paint still leaves a
  // window rather than nothing at all.
  win.webContents.on('did-finish-load', reveal)

  if (DEV_SERVER_URL) win.loadURL(DEV_SERVER_URL)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // Links out (the suite switcher, lrclib, GitHub) open in the system browser
  // rather than replacing the player. Hub pages are the exception, and
  // `installHubHandoff` below owns those.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
  // `setWindowOpenHandler` only sees window.open and target=_blank; a plain
  // <a href> navigates the window itself. The bundle is a local file, so any
  // http(s) navigation is somewhere else — except the dev server in dev.
  win.webContents.on('will-navigate', (event, url) => {
    if (DEV_SERVER_URL && url.startsWith(DEV_SERVER_URL)) return
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
}

// ⚠️ One copy at a time. A second would open the same profile — the library
// index in IndexedDB, the settings in localStorage — while the first holds it,
// and two players would be writing the one queue. Launching again brings the
// running window forward instead.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  // Windows keys the taskbar entry and the media overlay (the play/pause card
  // over the volume flyout) to this; without it they belong to "Electron".
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    // Hub pages (profile, account) open in a window this app owns, signed in
    // as the current user — the desktop session lives here and nowhere else.
    installHubHandoff({ icon: ICON })
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
