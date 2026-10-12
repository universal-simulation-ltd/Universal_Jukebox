// TuneExtras.tsx — what the website keeps in its actions menu, which the
// phone app doesn't have: your folders (add, rescan, remove, the iPhone's
// Music library), the way back from the example library, About and the
// knowledge base. At the top of the Tune tab, above Tune this app's own
// sections (found missing in the 2026-10-10 parity review — with no menu, a
// phone with a library had no way to add more music).
//
// The same choices as `components/Header/AppMenu.tsx`, per platform: picked
// songs are COPIED into the Jukebox folder where the phone has one, a chosen
// folder is a native picker on Android, and the browser's pickers stand in
// for both in a dev browser.

import { useEffect, useRef, useState } from 'react'
import { hasMusicLibrary } from '../lib/appleMusic'
import { useT } from '../i18n'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../lib/nativeFile'
import { hasNativeImporter } from '../lib/nativeImport'
import { goHome, navigate } from '../lib/route'
import { shownRootLabel, trackCountFor } from '../lib/roots'
import { useLibraryStore } from '../stores/libraryStore'
import { isExampleOnly } from '../lib/exampleLibrary'

function deviceWord(): 'phone' | 'iPad' {
  if (typeof navigator === 'undefined') return 'phone'
  const iPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iPad ? 'iPad' : 'phone'
}

export function YourMusic() {
  const t = useT()
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const trying = useLibraryStore((s) => s.trying)
  const leaveExample = useLibraryStore((s) => s.leaveExample)
  const clear = useLibraryStore((s) => s.clear)
  const removeFolder = useLibraryStore((s) => s.removeFolder)
  const rescanFolder = useLibraryStore((s) => s.rescanFolder)
  const rescanNativeFolders = useLibraryStore((s) => s.rescanNativeFolders)
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const addNativeFolder = useLibraryStore((s) => s.addNativeFolder)
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // Asked once, in place: Remove takes the folder's songs off every shelf too.
  const [removing, setRemoving] = useState<string | null>(null)
  useEffect(() => {
    if (!removing) return
    const timer = window.setTimeout(() => setRemoving(null), 4000)
    return () => window.clearTimeout(timer)
  }, [removing])

  const native = isNativeShell()
  const chosen = usesChosenFolder()
  const own = hasOwnMusicFolder()
  const folders = roots.filter((r) => r.source !== 'music-library')
  const hasMusicRoot = roots.some((r) => r.source === 'music-library')
  const canAddTracks = !native || own || !chosen
  const canAddFolder = !native || chosen

  const addTracks = () => (hasNativeImporter() ? void pickNativeFiles() : fileInput.current?.click())
  const addFolder = () => {
    if (chosen) void addNativeFolder()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }
  const rescan = async () => {
    if (native) return rescanNativeFolders()
    for (const root of folders) await rescanFolder(root.id)
  }

  // Trying the example library, the one thing wanted here is the way out
  // (AppMenu's rule): its folders would all be the demo's. Two ways to be in
  // it: `trying` (a look at the demo from your own library), or the demo IS
  // the library (picked on the first-run screen), where the way out clears it
  // and the first-run screen asks where your music is.
  const exampleOnly = isExampleOnly(roots)
  if (trying || exampleOnly) {
    return (
      // Lit up (`.jx-lit`), matching the red dot on the Tune tab: the example
      // is for looking round, and this is where your own music comes in.
      <section className="jx-card jx-tune-card jx-lit" aria-label={t('native.your_music')}>
        <p className="jx-label">{t('native.your_music')}</p>
        <button
          type="button"
          className="jx-row"
          onClick={() => {
            if (trying) leaveExample()
            else void clear()
            goHome()
          }}
        >
          <span>
            <b>{t('native.use_own_music')}</b>
            <small>{t('native.use_own_music_sub')}</small>
          </span>
          <span className="jx-chev" aria-hidden>›</span>
        </button>
      </section>
    )
  }
  if (status !== 'ready' && status !== 'scanning') return null

  return (
    <section className="jx-card jx-tune-card" aria-label={t('native.your_music')}>
      <p className="jx-label">{t.plural('native.your_music_songs', tracks.length)}</p>
      <ul className="jx-list">
        {roots.map((root) => (
          <li key={root.id}>
            <div className="jx-row">
              <span>
                <b>{shownRootLabel(root.label)}</b>
                <small>{t.plural('common.songs', trackCountFor(tracks, root))}</small>
              </span>
              {/* One button, two taps: "Remove", then "Tap to confirm" (James,
                  2026-10-11 — a Remove / Keep pair crowded the row, and either
                  tap could land on Remove). It goes back after a few seconds. */}
              <button
                type="button"
                className={removing === root.id ? 'jx-link danger' : 'jx-link quiet'}
                onClick={() => {
                  if (removing === root.id) {
                    setRemoving(null)
                    void removeFolder(root.id)
                  } else setRemoving(root.id)
                }}
                title={t('app.remove_folder_title')}
              >
                {removing === root.id ? t('native.tap_to_confirm') : t('common.remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {removing && <p className="jx-fine left">{t('native.remove_note')}</p>}
      <div className="jx-tune-actions">
        {canAddTracks && <button type="button" className="jx-btn" onClick={addTracks}>{t('app.add_tracks')}</button>}
        {canAddFolder && <button type="button" className="jx-btn" onClick={addFolder}>{t('app.add_folder')}</button>}
        {/* ONE button reads everything again — the folders AND the phone's
            Music library (James, 2026-10-12: "could we do refresh and
            rescan"). Named for what there is to read. */}
        {(folders.length > 0 || (native && !hasMusicRoot) || (hasMusicRoot && hasMusicLibrary())) && (
          <button
            type="button"
            className="jx-btn"
            onClick={async () => {
              if (folders.length > 0 || !hasMusicRoot) await rescan()
              if (hasMusicRoot && hasMusicLibrary()) await importMusicLibrary()
            }}
          >
            {folders.length > 0 && hasMusicRoot
              ? t('native.refresh_music')
              : hasMusicRoot
                ? t(deviceWord() === 'iPad' ? 'native.refresh_library_ipad' : 'native.refresh_library_phone')
                : folders.length > 1
                  ? t('app.rescan_folders')
                  : t('native.rescan_music')}
          </button>
        )}
        {hasMusicLibrary() && !hasMusicRoot && (
          <button type="button" className="jx-btn" onClick={() => void importMusicLibrary()}>
            {t(deviceWord() === 'iPad' ? 'native.add_library_ipad' : 'native.add_library_phone')}
          </button>
        )}
      </div>

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
    </section>
  )
}

/** About Universal Jukebox and the knowledge base — the website's Advanced menu. */
export function AboutAndHelp() {
  const t = useT()
  return (
    <section className="jx-card jx-tune-card jx-tune-wrap" aria-label={t('native.about_and_help')}>
      <button type="button" className="jx-row" onClick={() => navigate({ view: 'help' })}>
        <span>
          <b>{t('native.knowledge_base')}</b>
          <small>{t('app.knowledge_base_detail')}</small>
        </span>
        <span className="jx-chev" aria-hidden>›</span>
      </button>
      {/* Moved here from the first-run screen (James, 2026-10-11). */}
      <button type="button" className="jx-row" onClick={() => navigate({ view: 'help', article: 'cloud-and-streaming' })}>
        <span>
          <b>{t('native.cloud_help_title')}</b>
          <small>{t('native.cloud_help')}</small>
        </span>
        <span className="jx-chev" aria-hidden>›</span>
      </button>
      <button type="button" className="jx-row" onClick={() => navigate({ view: 'about' })}>
        <span>
          <b>{t('app.about_jukebox')}</b>
          <small>{t('native.about_detail')}</small>
        </span>
        <span className="jx-chev" aria-hidden>›</span>
      </button>
    </section>
  )
}
