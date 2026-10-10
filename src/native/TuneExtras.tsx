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

import { useRef, useState } from 'react'
import { KnowledgeBaseDialog } from '@unisim/sdk'
import { KNOWLEDGE_BASE } from '../knowledge'
import { hasMusicLibrary } from '../lib/appleMusic'
import { plural } from '../lib/format'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../lib/nativeFile'
import { hasNativeImporter } from '../lib/nativeImport'
import { goHome, navigate } from '../lib/route'
import { trackCountFor } from '../lib/roots'
import { useLibraryStore } from '../stores/libraryStore'
import { useThemeStore } from '../stores/themeStore'

function deviceWord(): 'phone' | 'iPad' {
  if (typeof navigator === 'undefined') return 'phone'
  const iPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iPad ? 'iPad' : 'phone'
}

export function YourMusic() {
  const status = useLibraryStore((s) => s.status)
  const roots = useLibraryStore((s) => s.roots)
  const tracks = useLibraryStore((s) => s.tracks)
  const trying = useLibraryStore((s) => s.trying)
  const leaveExample = useLibraryStore((s) => s.leaveExample)
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
  // (AppMenu's rule): its folders would all be the demo's.
  if (trying) {
    return (
      <section className="jx-card jx-tune-card" aria-label="Your music">
        <p className="jx-label">Your music</p>
        <button
          type="button"
          className="jx-row"
          onClick={() => {
            leaveExample()
            goHome()
          }}
        >
          <span>
            <b>Back to my music</b>
            <small>Leave the example library</small>
          </span>
        </button>
      </section>
    )
  }
  if (status !== 'ready' && status !== 'scanning') return null

  return (
    <section className="jx-card jx-tune-card" aria-label="Your music">
      <p className="jx-label">Your music · {plural(tracks.length, 'song')}</p>
      <ul className="jx-list">
        {roots.map((root) => (
          <li key={root.id}>
            <div className="jx-row">
              <span>
                <b>{root.label}</b>
                <small>{plural(trackCountFor(tracks, root), 'song')}</small>
              </span>
              {removing === root.id ? (
                <span className="jx-confirm">
                  <button type="button" className="jx-link danger" onClick={() => { setRemoving(null); void removeFolder(root.id) }}>
                    Remove
                  </button>
                  <button type="button" className="jx-link quiet" onClick={() => setRemoving(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="jx-link quiet"
                  onClick={() => setRemoving(root.id)}
                  title="Takes it out of Jukebox — the music files themselves stay where they are"
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {removing && <p className="jx-fine left">Only Jukebox forgets it. The music files stay where they are.</p>}
      <div className="jx-tune-actions">
        {canAddTracks && <button type="button" className="jx-btn" onClick={addTracks}>Add tracks</button>}
        {canAddFolder && <button type="button" className="jx-btn" onClick={addFolder}>Add a folder</button>}
        {(native || folders.length > 0) && (
          <button type="button" className="jx-btn" onClick={() => void rescan()}>
            {folders.length > 1 ? 'Rescan my folders' : 'Rescan my music'}
          </button>
        )}
        {hasMusicLibrary() && (
          <button type="button" className="jx-btn" onClick={() => void importMusicLibrary()}>
            {hasMusicRoot ? `Refresh my ${deviceWord()}’s Music library` : `Add my ${deviceWord()}’s Music library`}
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
  const [kb, setKb] = useState(false)
  const theme = useThemeStore((s) => s.effective)
  return (
    <section className="jx-card jx-tune-card" aria-label="About and help">
      <button type="button" className="jx-row" onClick={() => setKb(true)}>
        <span>
          <b>Knowledge base</b>
          <small>How music files, lyrics and background play work</small>
        </span>
        <span className="jx-chev" aria-hidden>›</span>
      </button>
      <button type="button" className="jx-row" onClick={() => navigate({ view: 'about' })}>
        <span>
          <b>About Universal Jukebox</b>
          <small>What it plays, what it can’t, and why</small>
        </span>
        <span className="jx-chev" aria-hidden>›</span>
      </button>
      <KnowledgeBaseDialog {...KNOWLEDGE_BASE} open={kb} onClose={() => setKb(false)} theme={theme} />
    </section>
  )
}

/** The knowledge base on its own, for the first-run screen's "Where is my music?" */
export function HelpLink({ label }: { label: string }) {
  const [kb, setKb] = useState(false)
  const theme = useThemeStore((s) => s.effective)
  return (
    <>
      <button type="button" className="jx-link center" onClick={() => setKb(true)}>
        {label}
      </button>
      <KnowledgeBaseDialog {...KNOWLEDGE_BASE} open={kb} onClose={() => setKb(false)} theme={theme} />
    </>
  )
}
