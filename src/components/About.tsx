// What this app is, said plainly — including what it deliberately is not.
//
// ⚠️ The "what it isn't" half is not modesty, it is the point. "Universal
// Jukebox" is a suite prefix plus the generic word for a machine that plays
// music you already own, and the name is only unambiguous while every surface
// says what the thing DOES beside it. This page is where that is said at
// length; `index.html`, the manifest and the SDK catalogue entry each say it in
// one line.

import { goHome, navigate } from '../lib/route'
import { useT } from '../i18n'
import { isNativeShell, nativePlatform } from '../lib/nativeFile'
// Generated — `npm run credits` after any dependency change. Never edit by hand.
import credits from '../generated/credits.json'

const NOTICES = 'https://github.com/universal-simulation-ltd/Universal_Jukebox/blob/main/THIRD-PARTY-NOTICES.md'

export default function About() {
  const t = useT()
  // The phone app says what is true on the phone: no sign-in (Play Data safety
  // and the privacy policy both say no account), no browser talk, and no link
  // to another app (store-listings §7). The website keeps its own wording.
  const phone = isNativeShell()
  const android = phone && nativePlatform() === 'android'
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
        className="mb-5 hidden items-center gap-1.5 text-[13px] text-slate-600 sm:inline-flex hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        {t('about.app_back')}
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {t('about.app_title')}
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        <p>{t('about.app_intro')}</p>
        <p>
          {t.rich(phone ? 'about.app_privacy_phone' : 'about.app_privacy', {
            nothing_uploaded: (
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{t('about.app_nothing_uploaded')}</strong>
            ),
          })}
          {android && <> {t('about.app_privacy_lyrics_android')}</>}
        </p>
        <p>
          {t.rich('about.app_not', {
            not: <strong className="font-semibold text-slate-900 dark:text-slate-100">{t('about.app_not_word')}</strong>,
          })}
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('about.app_plays_heading')}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t(phone ? 'about.app_plays_phone' : 'about.app_plays')}
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('about.app_cant_heading')}
      </h2>
      <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
        <li>
          {t.rich('about.app_drm', { name: <strong className="font-medium">{t('about.app_drm_name')}</strong> })}
        </li>
        <li>
          {/* The format names and the other app's name are names, the same in
              every language — only the sentence round them is translated. */}
          {phone ? t.rich('about.app_codecs_phone', {
            formats: <strong className="font-medium">WMA, Monkey’s Audio, WavPack</strong>,
          }) : t.rich('about.app_codecs', {
            formats: <strong className="font-medium">WMA, Monkey’s Audio, WavPack</strong>,
            converter: (
              <a
                href="https://opensource.unisim.co.uk/converter"
                className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
              >
                Universal Converter
              </a>
            ),
          })}
        </li>
        <li>
          {t.rich('about.app_midi', { midi: <strong className="font-medium">MIDI</strong> })}
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('about.app_folder_heading')}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t(phone ? 'about.app_folder_phone' : 'about.app_folder')}
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('about.app_turntable_heading')}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t.rich('about.app_turntable', {
          settings: (
            <button
              type="button"
              onClick={() => navigate({ view: 'settings' })}
              className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400"
            >
              {t('about.app_tune_this_app')}
            </button>
          ),
        })}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t('about.app_preview')}
      </p>

      {/* The projects that ship inside the app, and the full licence texts.
          MIT and the rest require the notice to travel with the app, which is
          what THIRD-PARTY-NOTICES.md is; this list is the courtesy. Jukebox has
          its own About page rather than the SDK's dialog, so it carries the
          dialog's "Built with" itself. Regenerate with `npm run credits`. */}
      <h2 className="mt-8 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t('about.app_built_with_heading')}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
        {t('about.app_built_with')}
      </p>
      <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
        {credits.ships.map((c) => (
          <li key={c.name}>
            <a href={c.repo} target="_blank" rel="noreferrer" className="font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-400">
              {c.title ?? c.name}
            </a>
            <span className="text-slate-500 dark:text-slate-400"> · {c.licence}{c.authors?.length ? ` · ${c.authors.join(', ')}` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[14px]">
        <a href={NOTICES} target="_blank" rel="noreferrer" className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400">
          {t('about.app_all_packages', { count: String(credits.noticesCount) })}
        </a>
      </p>

      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <button
          type="button"
          onClick={goHome}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#FE8C01] to-[#E05504] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E05504]"
        >
          {t('about.app_back')}
        </button>
        {/* Repeated at the foot because this is a long page, and somebody who
            has read to the bottom should not have to scroll back up to leave. */}
        <p className="mt-6 text-[13px] text-slate-500 dark:text-slate-400">
          {/* The two links the page footer carries on the web. The phone apps
              have no footer (`App.tsx`), so this is where they live there. */}
          {t.rich('about.app_footer', {
            unisim: (
              <a href="https://www.unisim.co.uk" target="_blank" rel="noreferrer" className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400">
                UNI·SIM
              </a>
            ),
            source: (
              <a href="https://github.com/universal-simulation-ltd/Universal_Jukebox" target="_blank" rel="noreferrer" className="text-orange-700 underline-offset-2 hover:underline dark:text-orange-400">
                {t('about.app_footer_source')}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  )
}
