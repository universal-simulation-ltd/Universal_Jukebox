// WelcomeScreen.tsx — the first screen, before there is a library: where your
// music is, as big buttons, and the example library for anyone (App Review
// included) with no music on the phone.
//
// The same actions as the website's Landing, picked the same way per platform
// (`lib/nativeFile`, `lib/appleMusic`, `lib/nativeImport`); in a dev browser
// with `?app` the folder and file buttons fall back to the browser's pickers.

import { useRef, useState } from 'react'
import { hasMusicLibrary } from '../lib/appleMusic'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../lib/nativeFile'
import { hasNativeImporter } from '../lib/nativeImport'
import { navigate } from '../lib/route'
import { useLibraryStore } from '../stores/libraryStore'
import { RecordMark } from './icons'

export function WelcomeScreen() {
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const loadExample = useLibraryStore((s) => s.loadExample)
  const scanNativeFolder = useLibraryStore((s) => s.scanNativeFolder)
  const addNativeFolder = useLibraryStore((s) => s.addNativeFolder)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  const importProgress = useLibraryStore((s) => s.importProgress)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [building, setBuilding] = useState(false)

  const native = isNativeShell()
  const chosen = usesChosenFolder()
  const own = hasOwnMusicFolder()
  const busy = building || importProgress !== null

  const chooseFolder = () => {
    if (chosen) void addNativeFolder()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }
  const pickSongs = () => (hasNativeImporter() ? void pickNativeFiles() : fileInput.current?.click())
  const tryExample = () => {
    setBuilding(true)
    void loadExample().finally(() => setBuilding(false))
  }

  type Way = { label: string; sub: string; run(): void }
  const ways: Way[] = []
  if (hasMusicLibrary()) {
    ways.push({ label: 'My Music library', sub: 'Songs synced to this phone from a computer', run: () => void importMusicLibrary() })
  }
  if (!native || chosen) {
    ways.push({ label: 'A folder of music', sub: 'In Files, iCloud Drive or on a drive you plug in', run: chooseFolder })
  }
  if (own) {
    ways.push({ label: 'The Jukebox folder', sub: 'Files › On My iPhone › Jukebox', run: () => void scanNativeFolder() })
  }
  if (!chosen || own) {
    ways.push({ label: 'Pick songs', sub: 'Choose files one at a time', run: pickSongs })
  }

  return (
    <div className="jx-page jx-welcome">
      <div className="jx-welcome-art" aria-hidden>
        <RecordMark />
      </div>
      <h1 className="jx-h1">Your music, on the turntable</h1>
      <p className="jx-sub">
        Jukebox plays the music already on your phone: a record turning, the words going round it. Nothing is uploaded and there is no account.
      </p>

      {importProgress ? (
        <p className="jx-card" role="status">
          Copying {importProgress.done} of {importProgress.total}: {importProgress.name}
        </p>
      ) : null}

      <p className="jx-label">Where is your music?</p>
      <ul className="jx-list">
        {ways.map((way) => (
          <li key={way.label}>
            <button type="button" className="jx-row" disabled={busy} onClick={way.run}>
              <span>
                <b>{way.label}</b>
                <small>{way.sub}</small>
              </span>
              <span className="jx-chev" aria-hidden>›</span>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="jx-btn primary" disabled={busy} onClick={tryExample}>
        {building ? 'Cutting the records…' : 'Try it with the example library'}
      </button>
      <p className="jx-fine">Made-up albums, so you can see every machine before adding your own.</p>

      <button type="button" className="jx-link center" onClick={() => navigate({ view: 'settings' })}>
        Tune this app
      </button>

      <input
        ref={folderInput}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {/* On the phone, picked files are COPIED into the music folder
          (`importNativeFiles`): a picked File is gone after a relaunch.
          Landing's note has the whole story. */}
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.flac,.wav,.aiff,.ogg,.opus"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) {
            if (native) void importNativeFiles(e.target.files)
            else void addFiles(e.target.files, 'Chosen files')
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
