// What this app is, said plainly — including what it deliberately is not.
//
// ⚠️ The "what it isn't" half is not modesty, it is the point. "Universal
// Jukebox" is a suite prefix plus the generic word for a machine that plays
// music you already own, and the name is only unambiguous while every surface
// says what the thing DOES beside it. This page is where that is said at
// length; `index.html`, the manifest and the SDK catalogue entry each say it in
// one line.

import { goHome, navigate } from '../lib/route'

export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* ⚠️ The way back, and it is not optional. This page is reached from a
          dropdown that closes behind you, so without this row the only exits
          are the browser's back button and the app's own logo — neither of
          which looks like a way back to your music. Settings and Tidy carry
          the same row, in the same place, saying the same words. */}
      <button
        type="button"
        onClick={goHome}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        Back to your library
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        A player for the music you already have
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        <p>
          Universal Jukebox is a music player, and nothing more than that. You point it at
          a folder on your own device; it reads the tags and the album art out of the files
          themselves, builds a library you can browse, and plays it.
        </p>
        <p>
          <strong className="font-semibold text-slate-900 dark:text-slate-100">
            Nothing is uploaded.
          </strong>{' '}
          Not a track, not a cover, not a filename. The reading happens in this tab, on your
          machine, and the app has no server to send anything to even if it wanted one. That
          is also why there is no account: there is nothing to have an account for.
        </p>
        <p>
          It is <strong className="font-semibold text-slate-900 dark:text-slate-100">not</strong>{' '}
          a streaming service and has no catalogue of its own. It cannot find you music you
          do not already have, and it is not connected to any record label, shop or
          subscription. If your files are somewhere else, this app cannot reach them.
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900 dark:text-slate-100">
        What it plays
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        MP3, M4A/AAC, FLAC, WAV and AIFF — everything a current browser decodes on its own.
        Ogg and Opus play where the browser supports them, which most do and Safari mostly
        doesn’t.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        What it can’t play, and why
      </h2>
      <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
        <li>
          <strong className="font-medium">DRM-protected tracks</strong> — older iTunes
          purchases and anything else with a licence attached. No browser can decode these,
          and no local player can either.
        </li>
        <li>
          <strong className="font-medium">WMA, Monkey’s Audio, WavPack</strong> — no browser
          ships a decoder.{' '}
          <a
            href="https://opensource.unisim.co.uk/converter"
            className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
          >
            Universal Converter
          </a>{' '}
          will turn them into something this can play, also without uploading anything.
        </li>
        <li>
          <strong className="font-medium">MIDI</strong> — a MIDI file is a score, not a
          recording. There is no audio in it to play.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        About the folder
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        Chrome and Edge can remember which folder you chose, so the library is still there
        next time behind one confirmation. Firefox and Safari have no way to do that — the
        permission itself is the thing that cannot be saved — so you pick the folder again
        each visit. Either way the library and its artwork are kept, so it comes back
        immediately rather than being rebuilt.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        The turntable
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        When you put a different record on, the deck spins up and the arm comes down
        before the music starts. It only does this when you actually choose a new album —
        never between tracks of the one already playing, never in the middle of a queue,
        and not more than once every ninety seconds however fast you click. Any click or
        key skips it, and you can change or switch it off entirely in{' '}
        <button
          type="button"
          onClick={() => navigate({ view: 'settings' })}
          className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
        >
          Settings
        </button>
        , along with fades and a volume boost for quietly-mastered albums.
      </p>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <button
          type="button"
          onClick={goHome}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          Back to your library
        </button>
        {/* Repeated at the foot because this is a long page, and somebody who
            has read to the bottom should not have to scroll back up to leave. */}
        <p className="mt-6 text-[13px] text-slate-500 dark:text-slate-400">
          Free and open source, like every Universal App. Built by UNI·SIM.
        </p>
      </div>
    </div>
  )
}
