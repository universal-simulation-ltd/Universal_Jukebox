import { useRef, useState } from 'react'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../lib/nativeFile'
import { hasMusicLibrary } from '../lib/appleMusic'
import { hasNativeImporter } from '../lib/nativeImport'
import { useLibraryStore } from '../stores/libraryStore'
import { keepsFolderWhenInstalled } from '../lib/persistence'

// The front door, before there is a library.
//
// ⚠️ THE BUTTON IS LABELLED DIFFERENTLY PER BROWSER, and that is the whole
// design of this screen. On Chromium the folder can be remembered, so the copy
// promises a library that is still there next time. On Firefox and Safari it
// cannot — there is no File System Access API and no polyfill can invent the
// permission — so the copy says "every time" and MEANS it, rather than
// promising a library that evaporates.
//
// This is the suite's established shape for a capability gap
// (`Universal_Converter/src/lib/saveFile.ts`, `Universal_Beam/src/lib/fileSink.ts`
// both feature-detect and relabel rather than failing at the moment of use). The
// alternative — one button, discover the truth on your second visit — is how an
// app gets a reputation for losing things.
//
// ⚠️ THERE IS NOW A THIRD CASE, AND IT IS NOT A BROWSER. Inside the iOS/Android
// shell there is no folder picker to relabel: `showDirectoryPicker` is absent
// and `webkitdirectory` is ignored, so "Choose your music folder" is a button
// that CANNOT work, and shipping it would be the exact failure the paragraph
// above describes. The native screen therefore does not ask for a folder at
// all — it says where the folder already is. See `lib/nativeFile.ts`.

export default function Landing() {
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const loadExample = useLibraryStore((s) => s.loadExample)
  const scanNativeFolder = useLibraryStore((s) => s.scanNativeFolder)
  const chooseNativeFolder = useLibraryStore((s) => s.chooseNativeFolder)
  const importNativeFiles = useLibraryStore((s) => s.importNativeFiles)
  const importProgress = useLibraryStore((s) => s.importProgress)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // Answered synchronously — see `isNativeShell`. A `useState`/`useEffect` pair
  // would render the web copy for one frame first, which on the phone reads as
  // the app offering a folder picker and then thinking better of it.
  const native = isNativeShell()
  // ⚠️ AND ANDROID IS A FOURTH CASE: it has no fixed folder the app can read,
  // so there the folder IS chosen — through the system picker, which Android
  // then lets the app keep. See `usesChosenFolder`.
  const chosen = usesChosenFolder()
  // ⚠️ AND iOS IS BOTH. It has a folder of its own (the Files app's "Universal
  // Jukebox") AND can choose another — so the own folder stays the main button
  // and choosing is offered beside it, never instead. `chosen` alone would have
  // turned iOS into Android the moment its picker plugin was registered.
  const own = hasOwnMusicFolder()
  // iOS: the Music app's library, and a native picker for audio files — see
  // `lib/appleMusic.ts` and `lib/nativeImport.ts`.
  const musicLibrary = hasMusicLibrary()
  const nativePicker = hasNativeImporter()
  const importMusicLibrary = useLibraryStore((s) => s.importMusicLibrary)
  const pickNativeFiles = useLibraryStore((s) => s.pickNativeFiles)
  // Building it draws eleven sleeves, which is fast but not instant — and a
  // button that appears to do nothing for half a second is a button people
  // press twice.
  const [building, setBuilding] = useState(false)

  // ⚠️ ONE BUTTON, THEN THE CHOICE (James, 2026-09-11: "on the landing page no
  // library only have the 'Scan my music folder' button and on clicking ask
  // them which one i.e. Files/Jukebox, Music Library, Custom Folder(s), Example
  // Library — will give a much cleaner and less confusing UI"). The front door
  // used to show every route at once — a main button, two links, a second
  // button and a demo section — with a paragraph under each. Now it asks one
  // question, and each answer carries its own sentence. Which answers appear is
  // still decided per platform, exactly as before: only what can work here.
  const [choosing, setChoosing] = useState(false)
  const busy = importProgress !== null || building

  const sources: { key: SourceKind; title: string; hint: string; act(): void }[] = []
  if (native && (own || !chosen)) {
    sources.push({
      key: 'files',
      title: 'Files — the Universal Jukebox folder',
      hint: 'Music copied into the Universal Jukebox folder in the Files app — AirDropped, dragged over from a computer, or saved there. Sub-folders are fine.',
      act: () => void scanNativeFolder(),
    })
  }
  // ⚠️ THE ONE MOST PEOPLE WITH AN iPHONE ACTUALLY NEED. Songs synced from a
  // Mac live in the Music app's library, which no folder — ours or one chosen —
  // can see (James, 2026-09-10). See `lib/appleMusic.ts`.
  if (musicLibrary) {
    sources.push({
      key: 'music',
      title: 'My Music library',
      hint: 'The songs synced to this iPhone from your computer, as they are in the Music app. Apple Music subscription downloads are protected, and iOS doesn’t let other apps play them.',
      act: () => void importMusicLibrary(),
    })
  }
  if (chosen) {
    sources.push({
      key: 'folder',
      title: own ? 'A different folder' : 'A folder of my choice',
      hint: own
        ? 'iCloud Drive, On My iPhone, a connected drive — the app keeps permission to read it, so your library is still here next time.'
        : 'Pick the folder your music is in — usually Music. Sub-folders are fine, and the app keeps permission to read it.',
      act: () => void chooseNativeFolder(),
    })
  } else if (!native) {
    sources.push({
      key: 'folder',
      title: 'A folder on this computer',
      hint: canPersist
        ? `This browser can remember the folder, so your library will still be here next time — you’ll just be asked to confirm access once.${
            keepsFolderWhenInstalled() ? ' Install it as an app from Chrome’s address bar and it won’t ask even that.' : ''
          }`
        : 'This browser can’t remember a folder, so you’ll choose it again each visit. Your library and its artwork are kept, so it comes back instantly.',
      act: () => (canPersist ? void pickFolder() : folderInput.current?.click()),
    })
  }
  // Visibly the side door: last in the list, and it says what it is.
  sources.push({
    key: 'example',
    title: building ? 'Cutting the records…' : 'The example library',
    hint: 'Nine records by four artists that don’t exist — the music and the sleeves are both made on this device. Nothing is downloaded, and choosing your own afterwards replaces it.',
    act: () => {
      setBuilding(true)
      void loadExample().finally(() => setBuilding(false))
    },
  })

  return (
    <div className="mx-auto max-w-2xl text-center">
      <Turntable />

      <h1 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {native ? 'Plays the music on your phone' : 'Plays your whole music library, in your browser'}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        It reads the tags and the real album art out of your own files and plays them — MP3, M4A,
        FLAC and WAV. Nothing is uploaded, nothing needs an account, and there is no catalogue to
        sign into.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setChoosing((c) => !c)}
          aria-expanded={choosing}
          aria-controls="jb-sources"
          className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          <FolderGlyph />
          Scan my music folder
        </button>

        {choosing && (
          <div id="jb-sources" className="mt-2 w-full max-w-md space-y-2.5 text-left" role="group" aria-label="Where is your music?">
            <p className="text-center text-[13px] font-medium text-slate-600 dark:text-slate-300">Where is your music?</p>
            {sources.map((source) => (
              <button
                key={source.key}
                type="button"
                disabled={busy}
                onClick={source.act}
                className="flex w-full items-start gap-3.5 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-900/5 transition hover:ring-2 hover:ring-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:cursor-default disabled:opacity-60 dark:bg-slate-900 dark:ring-white/10"
              >
                <SourceGlyph kind={source.key} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">{source.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{source.hint}</span>
                </span>
              </button>
            ))}
            {/* ⚠️ Not on Android. The importer copies into `Directory.Documents`,
                which there is the phone's SHARED Documents folder — not the
                folder the library reads — so it would copy files somewhere they
                are never found. */}
            {(!chosen || own) && (
              <p className="pt-1 text-center">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (nativePicker ? void pickNativeFiles() : fileInput.current?.click())}
                  className="text-[13px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline disabled:cursor-default disabled:opacity-60 dark:text-slate-400 dark:hover:text-orange-400"
                >
                  {native ? 'Or add individual songs from this device' : 'Or pick individual files'}
                </button>
              </p>
            )}
          </div>
        )}

        {/* ⚠️ An import COPIES, through the Capacitor bridge, so a big one is
            genuinely slow — and a silent slow thing reads as a crash. */}
        {importProgress !== null && (
          <p className="text-[12.5px] text-slate-600 dark:text-slate-300" aria-live="polite">
            Copying {importProgress.done + 1} of {importProgress.total}
            {importProgress.name ? ` — ${importProgress.name}` : ''}…
          </p>
        )}
      </div>

      {/* Both inputs are always present. The folder one is the Firefox/Safari
          path AND the fallback if `showDirectoryPicker` throws for any reason —
          an iframe, a policy, an older Chromium. */}
      <input
        ref={folderInput}
        type="file"
        // Non-standard but universally implemented, and there is no standard
        // alternative — this attribute is the only way to pick a folder without
        // File System Access. React needs the lower-cased spelling.
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {/* ⚠️ On native this goes to `importNativeFiles`, which COPIES into the
          music folder, not to `addFiles`, which keeps the picked `File` objects.
          The picker itself works fine on iOS — it is only the directory variant
          that does not — but its files are ephemeral, so `addFiles` there would
          give a library that plays now and is empty after a relaunch. */}
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.flac,.wav,.aiff,.ogg,.opus"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            if (native) void importNativeFiles(e.target.files)
            else void addFiles(e.target.files, 'Chosen files')
          }
          e.target.value = ''
        }}
      />

      <p className="mt-10 text-[12px] text-slate-400 dark:text-slate-500">
        Not a streaming service. It plays files you already have.
      </p>
    </div>
  )
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.2c.4 0 .8.16 1.06.44L9 5.5h7.5A1.5 1.5 0 0 1 18 7v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9Z" />
    </svg>
  )
}

/**
 * The drawing on the front door — the app's own mark, drawn large and turning.
 *
 * Not the favicon scaled up: this one spins, which is the first hint of the
 * ceremony that happens on the first play. Held still under reduced motion,
 * where it is simply a record.
 */
function Turntable() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="mx-auto h-36 w-36 sm:h-44 sm:w-44"
      role="img"
      aria-label="A record on a turntable"
    >
      <defs>
        <linearGradient id="jb-landing-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FE8C01" />
          <stop offset="1" stopColor="#E05504" />
        </linearGradient>
      </defs>
      <g className="motion-safe:animate-[spin_9s_linear_infinite]" style={{ transformOrigin: '92px 104px' }}>
        <circle cx="92" cy="104" r="72" fill="#0f172a" className="dark:fill-[#182236]" />
        {[62, 52, 42].map((r) => (
          <circle key={r} cx="92" cy="104" r={r} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.5" />
        ))}
        <circle cx="92" cy="104" r="26" fill="url(#jb-landing-tile)" />
        <circle cx="92" cy="104" r="5" className="fill-slate-100 dark:fill-slate-900" />
      </g>
      <circle cx="160" cy="44" r="11" className="fill-slate-300 dark:fill-slate-600" />
      <path d="M160 44 L128 96" stroke="currentColor" className="text-slate-300 dark:text-slate-600" strokeWidth="7" strokeLinecap="round" />
      <path d="M128 96 L122 106" stroke="currentColor" className="text-slate-400 dark:text-slate-500" strokeWidth="13" strokeLinecap="round" />
    </svg>
  )
}

type SourceKind = 'files' | 'music' | 'folder' | 'example'

/** The little picture beside each answer to "Where is your music?". */
function SourceGlyph({ kind }: { kind: SourceKind }) {
  const paths: Record<SourceKind, React.ReactNode> = {
    files: <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.2c.4 0 .8.16 1.06.44L9 5.5h7.5A1.5 1.5 0 0 1 18 7v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9Z" />,
    music: <path d="M15.5 3.2v9.3a2.5 2.5 0 1 1-1.5-2.3V6.1L8 7.4v6.6a2.5 2.5 0 1 1-1.5-2.3V5.2a1 1 0 0 1 .78-.98l7-1.55a1 1 0 0 1 1.22.98Z" />,
    folder: <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.2c.4 0 .8.16 1.06.44L9 5.5h7.5A1.5 1.5 0 0 1 18 7v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9Zm8 2.75a.75.75 0 0 0-.75.75v1.25H8a.75.75 0 0 0 0 1.5h1.25V13a.75.75 0 0 0 1.5 0v-1.25H12a.75.75 0 0 0 0-1.5h-1.25V9a.75.75 0 0 0-.75-.75Z" />,
    example: <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 1.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />,
  }
  return (
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
        {paths[kind]}
      </svg>
    </span>
  )
}
