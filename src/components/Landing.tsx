import { useRef } from 'react'
import { useLibraryStore } from '../stores/libraryStore'

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

export default function Landing() {
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const folderInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <div className="mx-auto max-w-2xl text-center">
      <Turntable />

      <h1 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        Plays the music already on your device
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        Point it at a folder. It reads the tags and the real album art out of your own
        files and plays them — MP3, M4A, FLAC and WAV. Nothing is uploaded, nothing needs
        an account, and there is no catalogue to sign into.
      </p>

      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => (canPersist ? void pickFolder() : folderInput.current?.click())}
          className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          <FolderGlyph />
          Choose your music folder
        </button>

        <p className="max-w-md text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {canPersist ? (
            <>
              This browser can remember the folder, so your library will still be here next
              time — you’ll just be asked to confirm access once.
            </>
          ) : (
            <>
              This browser can’t remember a folder, so you’ll choose it again each visit.
              Your library and its artwork <em>are</em> kept, so it comes back instantly.
            </>
          )}
        </p>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="mt-1 text-[13px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
        >
          Or pick individual files
        </button>
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
      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.m4a,.flac,.wav,.aiff,.ogg,.opus"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files, 'Chosen files')
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
