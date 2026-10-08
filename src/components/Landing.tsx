import { useRef, useState, type ReactNode } from 'react'
import { hasOwnMusicFolder, isNativeShell, usesChosenFolder } from '../lib/nativeFile'
import { hasMusicLibrary } from '../lib/appleMusic'
import { hasNativeImporter } from '../lib/nativeImport'
import { useLibraryStore } from '../stores/libraryStore'
import { keepsFolderWhenInstalled } from '../lib/persistence'
import { isDesktopApp } from '../lib/host'

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

/**
 * The answers to "Where is your music?" — in the listener's words, not ours.
 *
 * ⚠️ ASKED BY WHERE THE MUSIC IS, NOT BY HOW WE READ IT (James, 2026-10-05:
 * "ask questions such as where is your music stored: In your Apple Library, in
 * the cloud somewhere, on this device, on a streaming service ('sorry, we can't
 * help with this one')"). The answers used to be named after our mechanisms —
 * "Files — the Universal Jukebox folder", "A folder of my choice" — which is
 * only a question somebody can answer once they know how the app works. Each
 * answer now maps, behind the scenes, to the same per-platform mechanisms as
 * before; only the question changed.
 */
type Answer = 'device' | 'apple' | 'cloud' | 'streaming' | 'example'

// The answer last opened, kept across a remount. A scan that finds nothing
// sends the library back to 'empty' and this screen is mounted afresh under
// the error that says why — and that error's advice ("add songs one at a time",
// "choose a different folder") is about buttons inside the answer that was
// open. Coming back with it still open keeps them on screen.
let lastAnswer: Answer | null = null

/** A phone or tablet's browser: "this device", not "this computer". */
function isTouchOnly(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(hover: none) and (pointer: coarse)').matches
  } catch {
    return false
  }
}

/** "phone", or "iPad" on an iPad (which reports itself as a touch-screen Mac). */
function deviceWord(): 'phone' | 'iPad' {
  if (typeof navigator === 'undefined') return 'phone'
  const iPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return iPad ? 'iPad' : 'phone'
}

interface Step {
  /** The one-line next step, in plain words. */
  say: ReactNode
  /** The main action — a filled button. */
  action?: { label: string; run(): void }
  /** Quieter ways on, as links under the button. */
  more?: { label: string; run(): void }[]
}

export default function Landing() {
  const pickFolder = useLibraryStore((s) => s.pickFolder)
  const addFiles = useLibraryStore((s) => s.addFiles)
  const canPersist = useLibraryStore((s) => s.canPersistFolder)
  const loadExample = useLibraryStore((s) => s.loadExample)
  const scanNativeFolder = useLibraryStore((s) => s.scanNativeFolder)
  const addNativeFolder = useLibraryStore((s) => s.addNativeFolder)
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
  const desktopApp = !native && isDesktopApp()
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
  //
  // The button reads "Find my music" since 2026-10-05: "Scan my music folder"
  // was wrong for two of the answers behind it (the Music library is not a
  // folder, and a streaming service cannot be scanned at all).
  const [choosing, setChoosing] = useState(lastAnswer !== null)
  const [answer, setAnswerState] = useState<Answer | null>(lastAnswer)
  const setAnswer = (next: Answer | null) => {
    lastAnswer = next
    setAnswerState(next)
  }
  const busy = importProgress !== null || building

  const tryExample = () => {
    setBuilding(true)
    void loadExample().finally(() => setBuilding(false))
  }

  // ── The mechanisms, chosen per platform exactly as before ─────────────────
  // A folder of the app's OWN (iOS, or a shell whose one folder is fixed).
  const ownFolder = native && (own || !chosen)
  // The folder picker: the phone's own where there is one; in a browser, the
  // real picker where the folder can be remembered, `webkitdirectory` where not.
  const chooseFolder = () => {
    if (chosen) void addNativeFolder()
    else if (canPersist) void pickFolder()
    else folderInput.current?.click()
  }
  // ⚠️ Not on Android. The importer copies into `Directory.Documents`, which
  // there is the phone's SHARED Documents folder — not the folder the library
  // reads — so it would copy files somewhere they are never found.
  const canPickSongs = !chosen || own
  const pickSongs = () => (nativePicker ? void pickNativeFiles() : fileInput.current?.click())

  const here = native ? `this ${deviceWord()}` : isTouchOnly() ? 'this device' : 'this computer'
  // Said only where it is true — see the ⚠️ at the top of this file.
  const remembers = desktopApp
    ? 'The app remembers it, so your library will still be here next time.'
    : canPersist
    ? `This browser can remember the folder, so your library will still be here next time — you’ll just be asked to confirm access once.${
        keepsFolderWhenInstalled() ? ' Install it as an app from Chrome’s address bar and it won’t ask even that.' : ''
      }`
    : 'This browser can’t remember a folder, so you’ll choose it again each visit. Your library and its artwork are kept, so it comes back instantly.'

  type Entry = { key: Answer; title: string; sub: string; step?: Step }
  const answers: Entry[] = []
  let apple: Entry | null = null

  // ⚠️ THE ONE MOST PEOPLE WITH AN iPHONE ACTUALLY NEED, so it comes first
  // there (and second, after "On this computer", everywhere else). Songs synced from a Mac live in the Music app's library, which no
  // folder — ours or one chosen — can see (James, 2026-09-10). See
  // `lib/appleMusic.ts`. On a computer the same library IS a folder, so it is
  // the folder picker with directions; on Android, and in a phone's browser,
  // there is no Apple library this app could reach, so it is not offered.
  if (musicLibrary) {
    apple = {
      key: 'apple',
      title: 'In my Apple Music library',
      sub: `Songs synced to this ${deviceWord()} from a computer`,
      step: {
        say: (
          <>
            The songs synced to this {deviceWord()}, as they are in the Music app. Apple Music subscription
            downloads are protected, and iOS doesn’t let other apps play them.
          </>
        ),
        action: { label: 'Use my Music library', run: () => void importMusicLibrary() },
      },
    }
  } else if (!native && !isTouchOnly()) {
    apple = {
      key: 'apple',
      title: 'In my Apple Music or iTunes library',
      sub: 'The Music or iTunes app on this computer',
      step: {
        say: (
          <>
            Those songs are files in a folder. Choose your <strong>Music</strong> folder, then{' '}
            <strong>Music → Media</strong> (or <strong>iTunes → iTunes Media</strong>). Songs you’ve bought or
            added yourself will play; Apple Music subscription downloads are protected and can’t.
          </>
        ),
        action: { label: 'Choose the folder', run: chooseFolder },
      },
    }
  }
  if (apple && musicLibrary) answers.push(apple)

  answers.push({
    key: 'device',
    title: `On ${here}`,
    sub: native ? 'Music files you’ve copied or downloaded' : 'A folder of music files',
    step: ownFolder
      ? {
          say: own
            ? `Put it in the Files app, under On My ${deviceWord() === 'iPad' ? 'iPad' : 'iPhone'} → Universal Jukebox — AirDrop it, or drag it across from a computer. Folders are fine.`
            : 'Put it in the Universal Jukebox folder in the Files app — folders are fine.',
          action: { label: 'Scan the Jukebox folder', run: () => void scanNativeFolder() },
          more: [
            ...(chosen ? [{ label: 'Choose a different folder', run: () => void addNativeFolder() }] : []),
            ...(canPickSongs ? [{ label: 'Add songs one at a time', run: pickSongs }] : []),
          ],
        }
      : {
          say: native
            ? 'Choose the folder your music is in — usually Music. Folders inside it are fine, and the app keeps permission to read it.'
            : (
              <>
                Choose the folder your music is in — usually Music. Folders inside it are fine.{' '}
                <span className="text-slate-500 dark:text-slate-400">{remembers}</span>
              </>
            ),
          action: { label: 'Choose the folder', run: chooseFolder },
          more: canPickSongs ? [{ label: 'Or pick individual files', run: pickSongs }] : [],
        },
  })

  if (apple && !musicLibrary) answers.push(apple)

  answers.push({
    key: 'cloud',
    title: 'In the cloud',
    sub: 'iCloud Drive, Google Drive, Dropbox, OneDrive…',
    step: native
      ? own && chosen
        ? {
            say: `If your cloud shows up in the Files app — iCloud Drive always does — choose your music folder there. If it doesn’t, download the music to this ${deviceWord()} first.`,
            action: { label: 'Choose the folder', run: () => void addNativeFolder() },
          }
        : chosen
        ? {
            say: 'Cloud apps on Android usually can’t share a whole folder, so download the music to this phone first — into Music or Downloads — then choose that folder.',
            action: { label: 'Choose the folder', run: () => void addNativeFolder() },
          }
        : {
            say: 'Download the music to this phone first, then put it in the Universal Jukebox folder in the Files app.',
            action: { label: 'Scan the Jukebox folder', run: () => void scanNativeFolder() },
          }
      : isTouchOnly()
      ? {
          say: 'Download the music to this device first, then choose the folder it’s in.',
          action: { label: 'Choose the folder', run: chooseFolder },
        }
      : {
          say: 'If your cloud’s app is installed on this computer, it keeps a folder here — choose your music inside it. If not, download the music first.',
          action: { label: 'Choose the folder', run: chooseFolder },
        },
  })

  // The honest dead end — and still a way to see what the app does.
  answers.push({
    key: 'streaming',
    title: 'On a streaming service',
    sub: 'Spotify, Apple Music, YouTube Music, Amazon Music…',
    step: {
      say: (
        <>
          <strong className="font-semibold text-slate-900 dark:text-slate-100">Sorry, we can’t help with this one.</strong>{' '}
          Streaming services lock their songs inside their own apps — even downloaded ones — so no other player
          can open them. Jukebox plays music files you own: CDs you’ve copied, or albums bought as downloads.
        </>
      ),
      action: { label: building ? 'Cutting the records…' : 'Try the example library', run: tryExample },
    },
  })

  // Visibly the side door: last in the list, and it acts at once.
  answers.push({
    key: 'example',
    title: building ? 'Cutting the records…' : 'I just want to try it',
    sub: 'Nine made-up records, made on this device — nothing is downloaded',
  })

  return (
    <div className="mx-auto max-w-2xl text-center">
      <Turntable />

      <h1 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {native
          ? `Plays the music on your ${deviceWord()}`
          : desktopApp
          ? 'Plays the music on your computer'
          : 'Plays your whole music library, in your browser'}
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        It reads the tags and the real album art out of your own music files and plays them — MP3, M4A, FLAC and
        WAV. Nothing is uploaded, and you don’t need an account.
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
          Find my music
        </button>

        {choosing && (
          <div id="jb-sources" className="mt-2 w-full max-w-md space-y-2 text-left" role="group" aria-labelledby="jb-where">
            <p id="jb-where" className="text-center text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              Where is your music?
            </p>
            {answers.map((a) => {
              const open = answer === a.key && !!a.step
              return (
                <div
                  key={a.key}
                  className={`rounded-2xl bg-white shadow-sm ring-1 transition dark:bg-slate-900 ${
                    open ? 'ring-2 ring-orange-400' : 'ring-slate-900/5 dark:ring-white/10'
                  }`}
                >
                  <button
                    type="button"
                    disabled={!a.step && busy}
                    onClick={() => (a.step ? setAnswer(open ? null : a.key) : tryExample())}
                    aria-expanded={a.step ? open : undefined}
                    aria-controls={a.step ? `jb-answer-${a.key}` : undefined}
                    className="flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition hover:bg-orange-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:cursor-default disabled:opacity-60 dark:hover:bg-white/5"
                  >
                    <SourceGlyph kind={a.key} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">{a.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">{a.sub}</span>
                    </span>
                    {a.step && (
                      <svg
                        viewBox="0 0 20 20"
                        className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.58l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.42Z" />
                      </svg>
                    )}
                  </button>
                  {open && a.step && (
                    <div id={`jb-answer-${a.key}`} className="px-4 pb-4 pl-[4.25rem]">
                      <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{a.step.say}</p>
                      {a.step.action && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={a.step.action.run}
                          className="mt-3 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504] disabled:cursor-default disabled:opacity-60"
                        >
                          {a.step.action.label}
                        </button>
                      )}
                      {a.step.more && a.step.more.length > 0 && (
                        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                          {a.step.more.map((m) => (
                            <button
                              key={m.label}
                              type="button"
                              disabled={busy}
                              onClick={m.run}
                              className="text-[12.5px] text-slate-600 underline underline-offset-2 hover:text-orange-700 disabled:cursor-default disabled:opacity-60 dark:text-slate-400 dark:hover:text-orange-400"
                            >
                              {m.label}
                            </button>
                          ))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

/** The little picture beside each answer to "Where is your music?". */
function SourceGlyph({ kind }: { kind: Answer }) {
  const paths: Record<Answer, ReactNode> = {
    device: <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.2c.4 0 .8.16 1.06.44L9 5.5h7.5A1.5 1.5 0 0 1 18 7v7.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9Z" />,
    apple: <path d="M15.5 3.2v9.3a2.5 2.5 0 1 1-1.5-2.3V6.1L8 7.4v6.6a2.5 2.5 0 1 1-1.5-2.3V5.2a1 1 0 0 1 .78-.98l7-1.55a1 1 0 0 1 1.22.98Z" />,
    cloud: <path d="M5.5 16a3.5 3.5 0 0 1-.55-6.96 5 5 0 0 1 9.7-1.03A4 4 0 0 1 14.5 16h-9Z" />,
    streaming: (
      <>
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M6.6 12.4a4.8 4.8 0 0 1 6.8 0" />
          <path d="M4 9.6a8.5 8.5 0 0 1 12 0" />
          <path d="M1.6 6.9a12 12 0 0 1 16.8 0" />
        </g>
        <circle cx="10" cy="15.4" r="1.6" />
      </>
    ),
    example: <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 1.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z" />,
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
        {paths[kind]}
      </svg>
    </span>
  )
}
