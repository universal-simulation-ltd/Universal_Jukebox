// WelcomeScreen.tsx — the first screen, before there is a library: where your
// music is, as big buttons, and the example library for anyone (App Review
// included) with no music on the phone.
//
// The same actions as the website's Landing, picked the same way per platform
// (`lib/nativeFile`, `lib/appleMusic`, `lib/nativeImport`); in a dev browser
// with `?app` the folder and file buttons fall back to the browser's pickers.

import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'
import { hasMusicLibrary } from '../lib/appleMusic'
import { hasOwnMusicFolder, isNativeShell, nativePlatform, usesChosenFolder } from '../lib/nativeFile'
import { hasNativeImporter } from '../lib/nativeImport'
import { useLibraryStore } from '../stores/libraryStore'
import { RecordMark } from './icons'
import { useT } from '../i18n'

export function WelcomeScreen() {
  const t = useT()
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const loadExample = useLibraryStore((s) => s.loadExample)
  const addNativeFolder = useLibraryStore((s) => s.addNativeFolder)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  const importProgress = useLibraryStore((s) => s.importProgress)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [building, setBuilding] = useState(false)
  const spin = useRevUp()

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
    // Android has no Files app or iCloud Drive to name.
    const folderSub = native && nativePlatform() === 'android' ? t('native.way_folder_sub_android') : t('native.way_folder_sub')
    ways.push({ label: t('native.way_folder'), sub: folderSub, run: chooseFolder })
  }
  // No separate "The Jukebox folder" row (James, 2026-10-11): the folder
  // picker opens IN it on the iPhone (MusicFolderPlugin, `startInOwnFolder`),
  // so choosing it is one tap from "A folder of music".
  if (!chosen || own) {
    ways.push({ label: t('native.way_pick'), sub: t('native.way_pick_sub'), run: pickSongs })
  }

  return (
    <div className="jx-page jx-welcome">
      <div className="jx-welcome-art" aria-hidden {...spin}>
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

      {/* Nothing else here (James, 2026-10-11): no Tune link, as there is
          nothing to tune before there is a library, and the streaming
          question lives in Tune ▸ About & help. The subtitle already says the
          music is the files on this phone. */}

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

/**
 * An easter egg (James, 2026-10-12): hold the record and it revs up past
 * 78 rpm; let go and it coasts back down to its own 33⅓. The extra turn rides
 * on the `rotate` property, on top of the CSS spin (`.jx-mark`), so letting go
 * hands straight back to it. Nothing when motion is reduced.
 */
function useRevUp() {
  const reduced = usePrefersReducedMotion()
  const state = useRef({ held: false, speed: 0, angle: 0, frame: 0, last: 0, el: null as HTMLElement | null })
  useEffect(() => () => cancelAnimationFrame(state.current.frame), [])

  const step = (now: number) => {
    const s = state.current
    const dt = Math.min(0.05, (now - s.last) / 1000)
    s.last = now
    // Revs up in about a second, coasts down in about two.
    const target = s.held ? 420 : 0
    s.speed += (target - s.speed) * (1 - Math.exp(-dt * (s.held ? 2.2 : 1.3)))
    s.angle = (s.angle + s.speed * dt) % 360
    if (s.el) s.el.style.rotate = `${s.angle}deg`
    if (s.held || s.speed > 2) s.frame = requestAnimationFrame(step)
    else s.frame = 0
  }

  if (reduced) return {}
  return {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return
      const s = state.current
      s.el = e.currentTarget.querySelector<HTMLElement>('.jx-mark')
      s.held = true
      haptic('tick')
      if (!s.frame) {
        s.last = performance.now()
        s.frame = requestAnimationFrame(step)
      }
    },
    onPointerUp: () => { state.current.held = false },
    onPointerLeave: () => { state.current.held = false },
    onPointerCancel: () => { state.current.held = false },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: 'none', WebkitTouchCallout: 'none', userSelect: 'none' } as React.CSSProperties,
  }
}
