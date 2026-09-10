import { useRef, useState } from 'react'
import { isNativeShell, usesChosenFolder } from '../lib/nativeFile'
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
  // Building it draws eleven sleeves, which is fast but not instant — and a
  // button that appears to do nothing for half a second is a button people
  // press twice.
  const [building, setBuilding] = useState(false)

  return (
    <div className="mx-auto max-w-2xl text-center">
      <Turntable />

      <h1 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {native ? 'Plays the music on your phone' : 'Plays your whole music library, in your browser'}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        {native ? (
          <>
            It reads the tags and the real album art out of your own files and plays them —
            MP3, M4A, FLAC and WAV. Nothing is uploaded, nothing needs an account, and there
            is no catalogue to sign into.
          </>
        ) : (
          <>
            Point it at a folder. It reads the tags and the real album art out of your own
            files and plays them — MP3, M4A, FLAC and WAV. Nothing is uploaded, nothing needs
            an account, and there is no catalogue to sign into.
          </>
        )}
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={importProgress !== null}
          onClick={() =>
            chosen
              ? void chooseNativeFolder()
              : native
                ? void scanNativeFolder()
                : canPersist
                  ? void pickFolder()
                  : folderInput.current?.click()
          }
          className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:cursor-default disabled:opacity-60"
        >
          <FolderGlyph />
          {native && !chosen ? 'Scan my music folder' : 'Choose your music folder'}
        </button>

        <p className="max-w-md text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {chosen ? (
            <>
              Pick the folder your music is in — usually <strong>Music</strong>. Sub-folders
              are fine. The app keeps permission to read it, so your library is still here
              next time you open the app.
            </>
          ) : native ? (
            <>
              Your music goes in the <strong>Universal Jukebox</strong> folder in the Files
              app — copy it in, AirDrop it, or drag it over from a computer. Sub-folders are
              fine. Once it’s scanned, your library is still here next time you open the app.
            </>
          ) : canPersist ? (
            <>
              This browser can remember the folder, so your library will still be here next
              time — you’ll just be asked to confirm access once.
              {/* Only where it is true — Chrome 122+, not yet installed. See
                  `lib/persistence.ts`. */}
              {keepsFolderWhenInstalled() && (
                <> Install it as an app from Chrome’s address bar and it won’t ask even that.</>
              )}
            </>
          ) : (
            <>
              This browser can’t remember a folder, so you’ll choose it again each visit.
              Your library and its artwork <em>are</em> kept, so it comes back instantly.
            </>
          )}
        </p>

        {/* ⚠️ Not on Android. The importer copies into `Directory.Documents`,
            which there is the phone's SHARED Documents folder — not the folder
            the library reads — so it would copy files somewhere they are never
            found. Music goes into the chosen folder, the way it gets onto an
            Android phone anyway. */}
        {!chosen && (
          <button
            type="button"
            disabled={importProgress !== null}
            onClick={() => fileInput.current?.click()}
            className="mt-1 text-[13px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline disabled:cursor-default disabled:opacity-60 dark:text-slate-400 dark:hover:text-orange-400"
          >
            {native ? 'Or add music from this device' : 'Or pick individual files'}
          </button>
        )}

        {/* ⚠️ An import COPIES, through the Capacitor bridge, so a big one is
            genuinely slow — and a silent slow thing reads as a crash. This is
            also why the Files app is presented above as the main route and this
            as the convenience. */}
        {importProgress !== null && (
          <p className="text-[12.5px] text-slate-600 dark:text-slate-300" aria-live="polite">
            Copying {importProgress.done + 1} of {importProgress.total}
            {importProgress.name ? ` — ${importProgress.name}` : ''}…
          </p>
        )}
      </div>

      {/* ⚠️ Below the fold of the real thing, and visibly a side door. The app
          is for the music you already have; an example library is for deciding
          whether to point it at yours. Putting it level with the main button
          would advertise the demo as the product. */}
      <div className="mt-9 border-t border-slate-200 pt-7 dark:border-slate-800">
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          Nothing to hand? Take it for a spin.
        </p>
        <button
          type="button"
          disabled={building}
          onClick={() => {
            setBuilding(true)
            void loadExample().finally(() => setBuilding(false))
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-[14px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:cursor-default disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          {building ? 'Cutting the records…' : 'Load the example library'}
        </button>
        <p className="mx-auto mt-2.5 max-w-md text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          Eleven records by four artists that don’t exist — the music and the sleeves are
          both generated on this device, in this tab. Nothing is downloaded. Choosing your
          own folder afterwards replaces it.
        </p>
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
