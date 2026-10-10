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
import { HelpLink } from './TuneExtras'
import { useT } from '../i18n'

export function WelcomeScreen() {
  const t = useT()
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
    ways.push({ label: t('native.way_music_library'), sub: t('native.way_music_library_sub'), run: () => void importMusicLibrary() })
  }
  if (!native || chosen) {
    ways.push({ label: t('native.way_folder'), sub: t('native.way_folder_sub'), run: chooseFolder })
  }
  if (own) {
    ways.push({ label: t('native.way_jukebox_folder'), sub: t('native.way_jukebox_folder_sub'), run: () => void scanNativeFolder() })
  }
  if (!chosen || own) {
    ways.push({ label: t('native.way_pick'), sub: t('native.way_pick_sub'), run: pickSongs })
  }

  return (
    <div className="jx-page jx-welcome">
      <div className="jx-welcome-art" aria-hidden>
        <RecordMark />
      </div>
      <h1 className="jx-h1">{t('native.welcome_title')}</h1>
      <p className="jx-sub">
        {t('native.welcome_body')}
      </p>

      {importProgress ? (
        <p className="jx-card" role="status">
          {t('native.copying', { done: importProgress.done, total: importProgress.total, name: importProgress.name })}
        </p>
      ) : null}

      <p className="jx-label">{t('native.where_is_music')}</p>
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
        {building ? t('app.cutting_records') : t('native.try_example')}
      </button>
      <p className="jx-fine">{t('native.made_up')}</p>

      {/* The website's Landing explains music in the cloud and on streaming
          services; here that is the knowledge base, one tap away. */}
      <HelpLink label={t('native.cloud_help')} />
      <button type="button" className="jx-link center" onClick={() => navigate({ view: 'settings' })}>
        {t('native.tune_title')}
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
