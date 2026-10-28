import { useCallback, useEffect, useId, useState } from 'react'
import HelpArticleLink from './HelpArticleLink'
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  translateNav,
  useGlobalPreferences,
  useResetAppDefaults,
  signOut,
  useUniversal,
  type Language,
} from '@unisim/sdk'
import { engineActive } from '../lib/audio'
import { graphAllowed, graphUnavailable, quietUnavailable } from '../lib/audioGraph'
import { playTransportCue } from '../lib/crackle'
import { DECKS, deckCopy, resolveDeck, sanitiseEras, startSummary, type DeckEras } from '../lib/decks'
import { clearAbout, clearLyrics, countAbout, countLyrics } from '../lib/library'
import { barsOnlineLyrics, barsPocketPlayer, isNativeShell, nativePlatform } from '../lib/nativeFile'
import { lockLyricsAvailable } from '../lib/lockLyrics'
import { nativeCommandLog } from '../lib/nowPlayingNative'
import { formatPlaybackLog } from '../lib/playbackLog'
import { savedEvents } from '../lib/bgLog'
import { goHome, navigate } from '../lib/route'
import { scrollBelowBar } from '../lib/scrollBelowBar'
import { forgetSettingsSection, pendingSettingsSection, type SettingsSectionId } from '../lib/settingsSection'
import { applyBackup, gatherBackup, readBackupFile, saveBackupFile, type RestoreResult } from '../lib/backupIo'
import type { JukeboxBackup } from '../lib/backup'
import { askToNotify, notifyPermission, notifySupport } from '../lib/trackNotify'
import { canSetElementVolume } from '../lib/volumeSupport'
import CrossfadeDialog from './CrossfadeDialog'
import ModeGlyph from './ModeGlyph'
import TryExampleDialog from './TryExampleDialog'
import { DeckMiniature } from './Deck'
import { useAboutStore } from '../stores/aboutStore'
import { useLyricsStore } from '../stores/lyricsStore'
import { useRequestsStore } from '../stores/requestsStore'
import { currentTrack, usePlayerStore } from '../stores/playerStore'
import { useLibraryStore, wholeLibrary } from '../stores/libraryStore'
import { useHiddenStore, type HiddenKind } from '../lib/hidden'
import { EXAMPLE_ROOT_ID } from '../lib/exampleLibrary'
import {
  CEREMONY_LADDER,
  deckSettings,
  MAX_BOOST,
  MAX_FADE_SEC,
  MAX_LEVEL_DB,
  MODE_KEYS,
  MODE_LABELS,
  NEEDLE_STEP_MAX,
  NEEDLE_STEP_MIN,
  levelToStep,
  stepToLevel,
  useSettingsStore,
  type CeremonyMode,
  type DeckSetting,
  type HomeTab,
  type LyricsAroundStyle,
} from '../stores/settingsStore'
import { useThemeStore, type ThemePref } from '../stores/themeStore'
import { isDesktopApp } from '../lib/host'
import { useT, type Translator } from '../i18n'

// The settings page.
//
// Built as a list of SECTIONS of ROWS, with the row components at the bottom,
// so adding a setting is a field in `settingsStore` plus one `<Choice>` /
// `<Slider>` / `<Toggle>` here — not a new piece of layout. That is the whole
// reason it looks like this rather than a hand-laid-out form: there will be
// more of these.
//
// Every control writes straight through to the store, which persists on every
// change. There is deliberately no Save button: nothing here is a form, each
// setting takes effect the moment it is changed, and a Save button on
// preferences is a thing to forget to press.

export default function Settings() {
  const t = useT()
  const s = useSettingsStore()
  // This app's override of the Global preference (null = follow it) — the same
  // four-way choice, on the same store, as the menu's App preferences.
  const themeOverride = useThemeStore((t) => t.override)
  const themeGlobal = useThemeStore((t) => t.global)
  const setThemeOverride = useThemeStore((t) => t.setOverride)
  // Until this person uses a second app (or is in an organisation) the menu
  // has no Global preferences, so there is nothing to "follow": the choice is
  // plain Light / Dark / System and sets the global value (SDK 0.144.0).
  const { split: prefsSplit, setColorScheme: setGlobalColorScheme } = useGlobalPreferences()
  const libraryReady = useLibraryStore((l) => l.status === 'ready')
  const trying = useLibraryStore((l) => l.trying)
  const leaveExample = useLibraryStore((l) => l.leaveExample)
  // The example loaded from the landing page IS the library: nothing to try.
  const isExample = useLibraryStore((l) => l.roots.some((r) => r.id === EXAMPLE_ROOT_ID))
  const [tryingExample, setTryingExample] = useState(false)
  // Arrived from "Customise" under Now Playing: that section opens, and the
  // page scrolls to it once App has put the page at its top.
  const [openSection] = useState<SettingsSectionId | null>(pendingSettingsSection)
  const [crossfadeOpen, setCrossfadeOpen] = useState(false)
  useEffect(() => {
    forgetSettingsSection()
    if (!openSection) return
    let reduced = false
    try {
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* animate */ }
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollBelowBar(document.getElementById(`settings-${openSection}`), reduced)),
    )
    return () => cancelAnimationFrame(frame)
  }, [openSection])

  // The boost is the one setting that can be genuinely unavailable: it needs a
  // Web Audio graph, and a browser can refuse us one. Saying so is better than
  // a slider that does nothing. Not in the iPhone app: its native engine
  // boosts the song itself (`BoostTap` in JukeboxEngine.swift), no graph.
  const boostBroken = !engineActive() && graphUnavailable()
  const quietBroken = quietUnavailable()
  // Where the engine will not let an app set `element.volume`, a fade is a
  // slider that moves and changes nothing you can hear. The suite's rule for a
  // capability gap is to say so rather than to fail at the moment of use — the
  // boost slider right above already does exactly this.
  // ⚠️ Asked of the ENGINE, not of the platform: iOS was expected to be the case
  // that needed this and measured not to be, so on a current iPhone these
  // sliders stay live. See the header of `lib/volumeSupport.ts`.
  const fadesBroken = !canSetElementVolume()
  const FADE_HINT = t('settings.no_fades_hint')
  const HOME_OPTIONS = homeOptions(t)
  const THEME_OPTIONS = themeOptions(t)

  // Every string below that would otherwise say "record" at a cassette owner.
  const deck = deckCopy(s.deck)

  // Hoisted out of the `<Ladder>` below so the fold's summary reads the SAME
  // label the handle shows — a second copy of "Every track" is a copy that can
  // drift.
  const ladderCopy: Record<CeremonyMode, { label: string; hint: string }> = {
    always: { label: t('settings.ladder_always'), hint: deck.everyTrackHint },
    album: { label: t('settings.ladder_album'), hint: deck.albumChangeHint },
    artist: { label: t('settings.ladder_artist'), hint: t('settings.ladder_artist_hint') },
    first: { label: t('settings.ladder_first'), hint: t('settings.ladder_first_hint') },
    off: { label: t('settings.ladder_off'), hint: t('settings.ladder_off_hint') },
  }

  // ⚠️ What each SHUT fold says it is set to. One hand-written line per
  // section, but every value in it comes from the store through the same
  // labels and formatters the controls themselves display — so a fold can never
  // say "1.5s" over a slider reading 2.0s.
  const summaries = {
    library: t(`settings.summary_opens_on_${s.homeTab}`),
    deck: DECKS[s.deck].label,
    start: startSummary(
      s.deck,
      ladderCopy[s.ceremonyMode].label,
      !s.needleDrop ? 'off' : levelToStep(s.needleDropLevel) === 0 ? 'on' : 'at',
      formatStep(levelToStep(s.needleDropLevel)),
    ),
    sound: sentence(t, [
      s.stableVolume ? t('settings.summary_stable') : t('settings.summary_original'),
      ...(s.levelDb !== 0 && !quietBroken
        ? [t(s.levelDb < 0 ? 'settings.summary_quiet' : 'settings.summary_loud', { level: formatLevel(t, s.levelDb) })]
        : []),
      boostBroken
        ? t('settings.summary_no_boost_device')
        : s.volumeBoost <= 1.001
          ? t('settings.summary_boost_off')
          : t('settings.summary_boost', { boost: formatBoost(t, s.volumeBoost) }),
      fadesBroken ? t('settings.summary_no_fades_device') : describeFades(t, s.fadeInSec, s.fadeOutSec),
    ]),
    buttons:
      s.hiddenModes.length === 0
        ? t('settings.summary_buttons_all')
        : t.plural('settings.summary_buttons_shown', MODE_KEYS.length - s.hiddenModes.length, { total: t.num(MODE_KEYS.length) }),
    lyrics: [
      s.lyricsOnline && !barsOnlineLyrics() ? t('settings.summary_lyrics_online') : t('settings.summary_lyrics_files'),
      ...(s.lyricsAround ? [t(`settings.summary_style_${s.lyricsAroundStyle}`)] : []),
      ...(s.lockScreenLyrics && lockLyricsAvailable() ? [t('settings.summary_lock_screen')] : []),
    ].join(', '),
    about: s.aboutOnline ? t('settings.summary_about_on') : t('common.off'),
    notifications: sentence(t, [
      s.trackNotifications ? t('settings.summary_notify_on') : t('settings.summary_notify_off'),
      s.hideErrors ? t('settings.summary_errors_hidden') : t('settings.summary_errors_shown'),
    ]),
    appearance: !prefsSplit
      ? labelOf(THEME_OPTIONS, themeOverride ?? themeGlobal)
      : themeOverride
        ? labelOf(THEME_OPTIONS, themeOverride)
        : t('settings.summary_following_global', { value: labelOf(THEME_OPTIONS, themeGlobal) }),
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={goHome}
        className="mb-5 hidden items-center gap-1.5 text-[13px] text-slate-600 sm:inline-flex hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-400"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.42 10l4.3 4.3a1 1 0 1 1-1.42 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
        </svg>
        {t('settings.back_to_library')}
      </button>

      {/* The menu row's name — "Tune this app" for both (James, 2026-09-27). */}
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-slate-100">
        {t('settings.title')}
      </h1>
      <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
        {t('settings.intro')}
      </p>

      {/* The seven folds, as a stack. Adjacent cards with a small gap
          rather than the old headings-and-panels run: shut, they read as
          a list of what Settings CONTAINS. */}
      <div className="mt-8 space-y-3">
        <Section
          title={t('settings.library_title')}
          note={t('settings.library_note')}
          summary={summaries.library}
        >
          <Choice<HomeTab>
            label={t('settings.open_library_on')}
            value={s.homeTab}
            onChange={(v) => s.set('homeTab', v)}
            options={HOME_OPTIONS}
          />
          <Toggle
            label={t('settings.hide_resume')}
            hint={t('settings.hide_resume_hint')}
            checked={!s.resumeCard}
            onChange={(v) => s.set('resumeCard', !v)}
          />
          <Toggle
            label={t('settings.hide_most_played')}
            hint={t('settings.hide_most_played_hint')}
            checked={!s.mostPlayedShelf}
            onChange={(v) => s.set('mostPlayedShelf', !v)}
          />
          {/* This, the theme and the tips were in the Actions menu (James,
              2026-09-11: "Appearance, tidy, show tips again should all go into
              settings"). */}
          {libraryReady && (
            <Action label={t('settings.tidy_up')} button={t('common.open')} onClick={() => navigate({ view: 'tidy' })} />
          )}
          <RemovedFromJukebox />
          {/* ⚠️ THE EXAMPLE LIBRARY'S SECOND DOOR (backlog, 2026-09-29). The
              landing page was its only one, because loading it there REPLACES
              the library and the landing page is only shown when there is none
              to replace. This one sets the real library aside instead
              (`libraryStore.tryExample`), behind a confirm that says so, with
              "Back to my music" as the way out — here, in the strip on every
              page, and in the menu.
              ⚠️ Here, and not in the menu's Advanced, which holds only About and
              the knowledge base (James, 2026-09-28). It is about the library,
              and this is the library's section. */}
          {trying ? (
            <Action
              label={t('settings.trying_example')}
              hint={t('settings.trying_example_hint')}
              button={t('settings.back_to_my_music')}
              onClick={() => {
                leaveExample()
                goHome()
              }}
            />
          ) : (
            libraryReady && !isExample && (
              <Action
                label={t('settings.try_example')}
                hint={t('settings.try_example_hint')}
                button={t('settings.try_it')}
                onClick={() => setTryingExample(true)}
              />
            )
          )}
          {tryingExample && <TryExampleDialog onClose={() => setTryingExample(false)} />}
        </Section>

        {/* James, 2026-10-05: "Go ahead with B and backup" — the music stays in
            the person's own cloud; what they made in the app is backed up.
            See `lib/backup.ts`. */}
        <BackupSection />

        {/* ⚠️ ABOVE the animation section, not inside it, and that order is the
            argument for the whole feature: what you are playing ON comes before
            how theatrically it starts. It also means the section below is already
            talking about the right machine by the time you read it. */}
        <Section
          title={t('settings.deck_title')}
          note={t('settings.deck_note')}
          summary={summaries.deck}
        >
          <Choice<DeckSetting>
            label={t('settings.deck_choice')}
            value={s.deck}
            onChange={(v) => s.set('deck', v)}
            // ⚠️ `DECK_SETTINGS` rather than `Object.keys(DECKS)`. Both hold the
            // same five values, but only one of them has a defined ORDER — object
            // key order is an implementation detail, and this list has `automatic`
            // deliberately last, after the four real machines.
            options={deckSettings().map((value) => ({
              value,
              label: DECKS[value].label,
              hint: DECKS[value].hint,
              // The machine itself, still — the sentence beside it says what
              // it does; this says what it LOOKS like, which is the question.
              picture: <DeckMiniature setting={value} box={64} />,
            }))}
          />
          {/* Automatic only: the years each machine takes over (James,
              2026-09-10: "you can choose some years that correspond"). */}
          {s.deck === 'automatic' && (
            <EraYears eras={s.deckEras} onChange={(eras) => s.set('deckEras', eras)} />
          )}
        </Section>

        <Section title={deck.startTitle} note={deck.startNote} summary={summaries.start}>
          {/* ⚠️ A SLIDER, not the radios this used to be (James asked for one,
              2026-09-09). The five settings are a frequency ladder — every track,
              every record, every artist, once a visit, never — and a ladder is
              what a slider is for: you can see where you are on it and which
              direction is "more". The radios' one advantage was that every
              option's sentence was visible at once; `<Ladder>` keeps that by
              showing the sentence for wherever the handle is. */}
          <Ladder
            label={deck.animationLabel}
            hint={deck.animationHint}
            value={s.ceremonyMode}
            onChange={(v) => s.set('ceremonyMode', v)}
            copy={ladderCopy}
          />
          {/* James, 2026-09-11: "crossfade with crackle by default … allow to
              change in settings". See `planHandover`. */}
          <Toggle
            label={t('settings.no_crossfade')}
            hint={t('settings.no_crossfade_hint')}
            checked={!s.recordCrossfade}
            onChange={(v) => s.set('recordCrossfade', !v)}
          />
          {/* Button renamed Advanced… → Fine-tune… (James, 2026-10-10: the suite's
              "Fine-tune" = adjusting one thing; the dialog was already
              "Fine-tune crossfade"). James, 2026-09-28: "an 'Advanced' button next to the crossfade
              option and popup with these controls" — the lengths, the
              quiet-opening hold, the silent-ending skip and the shape. */}
          <Action
            label={t('settings.crossfade_timing')}
            hint={t('settings.crossfade_timing_hint', {
              track: oneDecimal(t, s.xfTrackSec),
              record: oneDecimal(t, s.xfRecordSec),
              skip: oneDecimal(t, s.xfSkipSec),
            })}
            button={t('settings.fine_tune')}
            onClick={() => setCrossfadeOpen(true)}
          />
          {crossfadeOpen && <CrossfadeDialog onClose={() => setCrossfadeOpen(false)} />}
          <Toggle
            label={deck.muteLabel}
            hint={deck.muteHint}
            checked={!s.needleDrop}
            onChange={(v) => s.set('needleDrop', !v)}
          />
          {/* ⚠️ `onCommit` plays it. A loudness control you cannot hear while you
              set it is a control you set once, wrongly, and never touch again —
              and this one is for an effect that lasts under a second and happens
              when you are looking somewhere else. Firing on release rather than
              on every input event is what keeps dragging the slider from becoming
              a stack of forty overlapping thunks.

              ⚠️ The slider speaks STEPS (-5…+5) and the store speaks multipliers;
              `stepToLevel` is the only crossing point. See `settingsStore`. */}
          <Slider
            label={deck.volumeLabel}
            hint={t('settings.sound_volume_hint')}
            value={levelToStep(s.needleDropLevel)}
            min={NEEDLE_STEP_MIN}
            max={NEEDLE_STEP_MAX}
            step={1}
            disabled={!s.needleDrop}
            disabledHint={deck.volumeOffHint}
            format={formatStep}
            onChange={(v) => s.set('needleDropLevel', stepToLevel(v))}
            // ⚠️ Resolved against the album on the deck, so under Automatic the
            // demonstration is the machine currently playing. `playTransportCue` takes a `DeckStyle` and this store
            // holds a `DeckSetting`, so the compiler insists on the crossing.
            onCommit={(v) => {
              const player = usePlayerStore.getState()
              const track = currentTrack(player)
              const album = track ? useLibraryStore.getState().albums.find((a) => a.id === track.albumId) : undefined
              playTransportCue(resolveDeck(s.deck, album ?? track, s.deckEras), player.volume, stepToLevel(v))
            }}
          />
        </Section>

        <Section
          title={t('settings.sound_title')}
          note={t('settings.sound_note')}
          summary={summaries.sound}
        >
          {/* James, 2026-09-11: "an option for stable volume - keeps the volume
              at in a sensible min / max range so a track doesn't blast your
              ears off". See `lib/loudness.ts`. */}
          <Toggle
            label={t('settings.original_levels')}
            hint={t('settings.original_levels_hint')}
            checked={!s.stableVolume}
            onChange={(v) => s.set('stableVolume', !v)}
          />
          {/* James, 2026-09-28: quieter than the phone's lowest notch, for
              listening in bed, and louder too. On the iPhone this is an
              experiment — see `quietGraphAllowed` in lib/audioGraph.ts. */}
          <Slider
            label={t('settings.quiet_loud')}
            hint={t('settings.quiet_loud_hint')}
            value={s.levelDb}
            min={-MAX_LEVEL_DB}
            max={MAX_LEVEL_DB}
            step={5}
            disabled={quietBroken}
            disabledHint={isDesktopApp() ? t('settings.no_graph_app') : t('settings.no_graph_browser')}
            format={(v) => formatLevel(t, v)}
            onChange={(v) => s.set('levelDb', v)}
          />
          <Slider
            label={t('settings.volume_boost')}
            hint={t('settings.volume_boost_hint')}
            value={s.volumeBoost}
            min={1}
            max={MAX_BOOST}
            step={0.1}
            disabled={boostBroken}
            disabledHint={
              graphAllowed()
                ? isDesktopApp() ? t('settings.no_boost_graph_app') : t('settings.no_boost_graph_browser')
                : t('settings.no_boost_iphone')
            }
            format={(v) => formatBoost(t, v)}
            onChange={(v) => s.set('volumeBoost', v)}
          />
          <Slider
            label={t('settings.fade_in')}
            hint={t('settings.fade_in_hint')}
            value={s.fadeInSec}
            min={0}
            max={MAX_FADE_SEC}
            step={0.5}
            disabled={fadesBroken}
            disabledHint={FADE_HINT}
            format={(v) => formatFade(t, v)}
            onChange={(v) => s.set('fadeInSec', v)}
          />
          <Slider
            label={t('settings.fade_out')}
            hint={t('settings.fade_out_hint')}
            value={s.fadeOutSec}
            min={0}
            max={MAX_FADE_SEC}
            step={0.5}
            disabled={fadesBroken}
            disabledHint={FADE_HINT}
            format={(v) => formatFade(t, v)}
            onChange={(v) => s.set('fadeOutSec', v)}
          />
        </Section>

        {/* James, 2026-09-28: "have the hidden controls bar customisable in
            the settings, so they click each button they want to appear". */}
        <Section
          title={t('settings.buttons_title')}
          id="settings-buttons"
          open={openSection === 'buttons'}
          note={t('settings.buttons_note')}
          summary={summaries.buttons}
        >
          <Row>
            <div className="flex flex-wrap gap-2">
              {MODE_KEYS.map((key) => {
                const shown = !s.hiddenModes.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={shown}
                    onClick={() =>
                      s.set('hiddenModes', shown ? [...s.hiddenModes, key] : s.hiddenModes.filter((k) => k !== key))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-2.5 text-[13px] font-medium transition ${
                      shown
                        ? 'bg-gradient-to-br from-[#FE8C01] to-[#E05504] text-white shadow-sm'
                        : 'border border-slate-300 text-slate-500 line-through decoration-slate-400 hover:border-orange-500 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {/* Its icon as well as its word — as it looks on the
                        player (James, 2026-09-29). Hidden ones fade with it. */}
                    <span className={`inline-flex ${shown ? '' : 'opacity-60'}`}>
                      <ModeGlyph mode={key} />
                    </span>
                    {MODE_LABELS[key]}
                  </button>
                )
              })}
            </div>
          </Row>
        </Section>

        <Section
          title={t('settings.lyrics_title')}
          note={t('settings.lyrics_note')}
          summary={summaries.lyrics}
        >
          {/* Not on iPhone or iPad — `barsOnlineLyrics` says why. */}
          {!barsOnlineLyrics() && (
            <Toggle
              label={t('settings.lyrics_online')}
              hint={t('settings.lyrics_online_hint')}
              checked={s.lyricsOnline}
              onChange={(v) => s.set('lyricsOnline', v)}
            />
          )}
          {/* Worded as the way OUT, so the box starts unticked (the suite's
              rule) while the lyrics go round the record by default. */}
          <Toggle
            label={t('settings.no_lyrics_around')}
            hint={t('settings.lyrics_around_hint')}
            checked={!s.lyricsAround}
            onChange={(v) => s.set('lyricsAround', !v)}
          />
          {s.lyricsAround && (
            <Choice<LyricsAroundStyle>
              label={t('settings.lyrics_style')}
              value={s.lyricsAroundStyle}
              onChange={(v) => s.set('lyricsAroundStyle', v)}
              options={lyricsStyleOptions(t)}
            />
          )}
          {/* Not in the Android app, where it can't reach the lock screen. */}
          {lockLyricsAvailable() && (
            <Toggle
              label={t('settings.lock_lyrics')}
              hint={t('settings.lock_lyrics_hint')}
              checked={s.lockScreenLyrics}
              onChange={(v) => s.set('lockScreenLyrics', v)}
            />
          )}
          <DownloadedLyrics />
          {/* Lyrics for a whole library at once, with LRCGET (James, 2026-10-11). */}
          <div className="pt-1">
            <HelpArticleLink article="lyrics-with-lrcget">{t('lyrics.lrcget_link')}</HelpArticleLink>
          </div>
        </Section>

        {/* James, 2026-09-13: "an about this track feature where you click it
            and it gives you some info". See `lib/aboutTrack.ts`. */}
        <Section
          title={t('settings.about_title')}
          note={t('settings.about_note')}
          summary={summaries.about}
        >
          <Toggle
            label={t('settings.about_online')}
            hint={t('settings.about_online_hint')}
            checked={s.aboutOnline}
            onChange={(v) => s.set('aboutOnline', v)}
          />
          <SavedAbout />
        </Section>

        {/* James, 2026-09-13: "an option for a notification everytime a new
            song plays, replace each notification and don't stack them". */}
        <Section
          title={t('settings.messages_title')}
          note={t('settings.messages_note')}
          summary={summaries.notifications}
        >
          <NotifyToggle />
          <Toggle
            label={t('settings.show_errors')}
            hint={t('settings.show_errors_hint')}
            checked={!s.hideErrors}
            onChange={(v) => s.set('hideErrors', !v)}
          />
          {isNativeShell() && <CopyPlaybackLog />}
        </Section>

        <Section title={t('settings.appearance_title')} summary={summaries.appearance}>
          <LanguageRow split={prefsSplit} />
          {!prefsSplit ? (
            <Choice<ThemePref>
              label={t('settings.colour_scheme')}
              value={themeOverride ?? themeGlobal}
              onChange={(v) => {
                setGlobalColorScheme(v)
                if (themeOverride) setThemeOverride(null)
              }}
              options={THEME_OPTIONS}
            />
          ) : (
            <Choice<ThemePref | typeof FOLLOW_GLOBAL>
              label={t('settings.colour_scheme')}
              value={themeOverride ?? FOLLOW_GLOBAL}
              onChange={(v) => setThemeOverride(v === FOLLOW_GLOBAL ? null : v)}
              options={[
                {
                  value: FOLLOW_GLOBAL,
                  label: t('settings.follow_global', { value: labelOf(THEME_OPTIONS, themeGlobal) }),
                  // No hint pointing at Global Tuning: it is a signed-in menu,
                  // and Jukebox has no sign-in since 2026-10-20.
                },
                ...THEME_OPTIONS,
              ]}
            />
          )}
          {/* Not in the iPhone / iPad app, where the bars never draw (no graph there). */}
          {graphAllowed() && (
            <Toggle
              label={t('settings.no_visualiser')}
              hint={t('settings.no_visualiser_hint')}
              checked={s.hideVisualiser}
              onChange={(v) => s.set('hideVisualiser', v)}
            />
          )}
          {/* The first-run "Tap here" pointers (`components/Tip.tsx`), back. */}
          <Action
            label={t('settings.show_tips')}
            hint={
              s.tipsSeen.length > 0
                ? t('settings.show_tips_hint')
                : t('settings.show_tips_none_hint')
            }
            button={t('settings.show_them')}
            disabled={s.tipsSeen.length === 0}
            onClick={() => s.set('tipsSeen', [])}
          />
        </Section>
        <AccountSection />
      </div>

      <ResetDefaults />
    </div>
  )
}

/**
 * Reset to defaults — the SDK Tune this app dialog's row, for the page that
 * stands in for that dialog here (James, 2026-09-30: "Each 'Tune this app'
 * page should have a reset defaults button"). The SDK's words and flow: it
 * asks in place (not window.confirm, a bare system alert in the native shell),
 * then says "Defaults restored". Its words are the SDK's translations, so they
 * follow the language like the menus do.
 *
 * What it resets: everything on this page (`settingsStore`, which includes the
 * library's opening tab, order and columns), the kind new requests start on
 * (Requests' double tap), and — through `useResetAppDefaults` — this app's
 * language and colour scheme overrides and any SDK default views. NOT the
 * library, the requests, the volume or shuffle/repeat: those are what is
 * playing, not how the app is tuned.
 */
function ResetDefaults() {
  const t = useT()
  const { language } = useUniversal()
  const reset = useSettingsStore((s) => s.reset)
  const resetKind = useRequestsStore((r) => r.resetDefaultKind)
  const resetAll = useResetAppDefaults(
    useCallback(() => { reset(); resetKind() }, [reset, resetKind]),
    useThemeStore,
  )
  const [step, setStep] = useState<'idle' | 'ask' | 'done'>('idle')
  const link =
    'text-[13px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400'
  return (
    <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800" data-testid="jukebox-reset-defaults">
      {step === 'ask' ? (
        <>
          <p className="text-[13px] text-slate-700 dark:text-slate-200">
            {translateNav(language, 'prefs.reset_confirm').replace('{app}', 'Jukebox')}
          </p>
          <div className="mt-2 flex gap-4">
            <button
              type="button"
              onClick={() => { resetAll(); setStep('done') }}
              className="text-[13px] font-semibold text-red-700 underline-offset-2 hover:underline dark:text-red-400"
            >
              {translateNav(language, 'prefs.reset_yes')}
            </button>
            <button type="button" onClick={() => setStep('idle')} className={link}>
              {translateNav(language, 'prefs.reset_cancel')}
            </button>
          </div>
        </>
      ) : step === 'done' ? (
        <p role="status" className="text-[13px] text-slate-500 dark:text-slate-400">
          ✓ {translateNav(language, 'prefs.reset_done')}
        </p>
      ) : (
        <button type="button" onClick={() => setStep('ask')} className={link}>
          ↺ {translateNav(language, 'prefs.reset_defaults')}
        </button>
      )}
      <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
        {t('settings.reset_note')}
      </p>
    </div>
  )
}

/**
 * Everything removed from Jukebox from a long press (`lib/hidden.ts`), each
 * with "Put back". Only there once something has been removed.
 *
 * ⚠️ NAMED FROM THE WHOLE CATALOGUE (`wholeLibrary`), since the screens' own
 * view of the library is exactly what these are missing from. A removed song
 * whose file has gone since is still listed, by its file name, so it can be
 * cleared from the list.
 */
function RemovedFromJukebox() {
  const t = useT()
  const hidden = useHiddenStore((h) => h.hidden)
  const restore = useHiddenStore((h) => h.restore)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const count = hidden.tracks.length + hidden.albums.length + hidden.artists.length
  if (count === 0) return null
  const { tracks, albums } = wholeLibrary()
  const items: { kind: HiddenKind; key: string; name: string; what: string }[] = [
    ...hidden.artists.map((key) => ({ kind: 'artists' as const, key, name: key, what: t('settings.removed_artist') })),
    ...hidden.albums.map((key) => ({
      kind: 'albums' as const,
      key,
      name: albums.find((a) => a.id === key)?.title ?? key,
      what: t('settings.removed_album'),
    })),
    ...hidden.tracks.map((key) => ({
      kind: 'tracks' as const,
      key,
      name: tracks.find((x) => x.path === key)?.title ?? key.split('/').pop() ?? key,
      what: t('settings.removed_track'),
    })),
  ]
  return (
    <>
      <Action
        label={t('settings.removed_title')}
        hint={t.plural('settings.removed_hint', count)}
        button={open ? t('common.close') : t('common.open')}
        onClick={() => setOpen(!open)}
        expanded={open}
        controls={listId}
      />
      {open && (
        <Row id={listId}>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <li key={`${item.kind}:${item.key}`} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-slate-900 dark:text-slate-100">{item.name}</span>
                  <span className="block text-[12px] text-slate-500 dark:text-slate-400">{item.what}</span>
                </span>
                <button
                  type="button"
                  onClick={() => restore(item.kind, item.key)}
                  className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-[13px] font-medium text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:text-orange-400"
                >
                  {t('settings.put_back')}
                </button>
              </li>
            ))}
          </ul>
        </Row>
      )}
    </>
  )
}

/**
 * Backup: where the music should live, and a copy of what only exists in here.
 *
 * ⚠️ THE MUSIC IS NOT BACKED UP, AND THE FIRST ROW SAYS SO. It stays wherever
 * the person keeps it — their own cloud, made available offline and added as
 * a folder — so "nothing is uploaded" stays true. What IS backed up is listed
 * in the hint of every button, so nobody has to guess.
 *
 * ⚠️ A restore always asks first, because it REPLACES the settings (the
 * shelves and requests it only adds to — see `lib/backup.ts`).
 *
 * The file is the only place a backup goes. Until 2026-10-20 a signed-in
 * visitor on the website or desktop also saw "Back up to your Universal ID";
 * that went with sign-in (`noAccounts: true` in main.tsx).
 */
function BackupSection() {
  const t = useT()
  const libraryReady = useLibraryStore((l) => l.status === 'ready')
  const trying = useLibraryStore((l) => l.trying)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  /** The backup file waiting on "Restore" to be confirmed. */
  const [pending, setPending] = useState<JukeboxBackup | null>(null)

  const run = async (work: () => Promise<string | null>) => {
    setBusy(true)
    setMessage(null)
    try {
      const text = await work()
      if (text) setMessage({ text })
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : t('settings.something_wrong'), error: true })
    } finally {
      setBusy(false)
    }
  }

  const restore = (backup: JukeboxBackup) =>
    run(async () => {
      setPending(null)
      return restoredSentence(t, await applyBackup(backup))
    })

  const blocked = trying || !libraryReady
  const blockedHint = trying
    ? t('settings.backup_blocked_trying')
    : t('settings.backup_blocked_loading')

  return (
    <Section
      title={t('settings.backup_title')}
      note={t('settings.backup_note')}
      summary={t('settings.summary_backup_none')}
    >
      <Row>
        <Label
          text={t('settings.your_music')}
          hint={t('settings.your_music_hint')}
        />
      </Row>
      <Action
        label={t('settings.save_file')}
        hint={blocked ? blockedHint : t('settings.save_file_hint')}
        button={t('common.save')}
        disabled={busy || blocked}
        onClick={() =>
          void run(async () => {
            const name = await saveBackupFile(await gatherBackup())
            return isNativeShell()
              ? t('settings.saved_native', { name })
              : t('settings.saved', { name })
          })
        }
      />
      <FileRestore
        disabled={busy || blocked}
        hint={blocked ? blockedHint : t('settings.restore_file_hint')}
        onFile={(file) =>
          void run(async () => {
            setPending(await readBackupFile(file))
            return null
          })
        }
      />
      {pending && (
        <Row>
          <p className="text-[13.5px] text-slate-800 dark:text-slate-200">
            {t('settings.restore_confirm_file', { when: formatWhen(t, pending.savedAt) })}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('settings.restore_confirm_detail')}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore(pending)}
              className="rounded-full bg-orange-600 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {t('settings.restore')}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 hover:border-orange-500 hover:text-orange-700 dark:border-slate-600 dark:text-slate-200 dark:hover:text-orange-400"
            >
              {t('common.cancel')}
            </button>
          </div>
        </Row>
      )}
      {message && (
        <Row>
          <p
            role="status"
            className={`text-[13px] ${message.error ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}
          >
            {message.text}
          </p>
        </Row>
      )}
    </Section>
  )
}

/**
 * "Copy playback log" — both logs on the clipboard, to paste into a report
 * (`lib/playbackLog.ts`). Phone apps only: the page log is only kept there.
 *
 * ⚠️ IF THE CLIPBOARD SAYS NO, THE TEXT IS SHOWN INSTEAD, selected, so it can
 * still be copied by hand. A button that fails quietly would lose the one log
 * that mattered.
 */
function CopyPlaybackLog() {
  const t = useT()
  const [state, setState] = useState<'idle' | 'copied' | 'shown'>('idle')
  const [text, setText] = useState('')
  return (
    <>
      <Action
        label={t('settings.copy_log')}
        hint={
          state === 'copied'
            ? t('settings.copy_log_copied_hint')
            : t('settings.copy_log_hint')
        }
        button={state === 'copied' ? t('settings.copied') : t('settings.copy')}
        onClick={() =>
          void (async () => {
            const log = formatPlaybackLog({
              now: Date.now(),
              platform: nativePlatform(),
              version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '?',
              events: savedEvents(),
              native: await nativeCommandLog(),
            })
            setText(log)
            try {
              await navigator.clipboard.writeText(log)
              setState('copied')
            } catch {
              setState('shown')
            }
          })()
        }
      />
      {state === 'shown' && (
        <Row>
          <p className="text-[12.5px] text-slate-600 dark:text-slate-300">
            {t('settings.copy_log_failed')}
          </p>
          <textarea
            readOnly
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 h-48 w-full rounded-xl border border-slate-300 bg-white p-2 font-mono text-[16px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </Row>
      )}
    </>
  )
}

/** "Restore from a file": an Action whose button is a file picker. */
function FileRestore({ disabled, hint, onFile }: { disabled: boolean; hint: string; onFile(file: File): void }) {
  const t = useT()
  return (
    <Row>
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <Label text={t('settings.restore_file')} hint={hint} />
        </span>
        <label
          className={`shrink-0 rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition dark:border-slate-600 dark:text-slate-200 ${
            disabled
              ? 'cursor-default opacity-50'
              : 'cursor-pointer hover:border-orange-500 hover:text-orange-700 focus-within:outline-2 focus-within:outline-orange-600 dark:hover:text-orange-400'
          }`}
        >
          {t('common.open')}
          <input
            type="file"
            accept=".json,application/json"
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              // Cleared, so choosing the same file again still fires.
              e.target.value = ''
              if (file) onFile(file)
            }}
          />
        </label>
      </div>
    </Row>
  )
}

function restoredSentence(t: Translator, r: RestoreResult): string {
  const parts = [
    t('settings.restored_settings'),
    r.found ? t.plural('settings.restored_found', r.found) : '',
    r.requests ? t.plural('settings.restored_requests', r.requests) : '',
    r.lyrics ? t.plural('settings.restored_lyrics', r.lyrics) : '',
  ].filter(Boolean)
  const missing = r.missing ? ` ${t.plural('settings.restored_missing', r.missing)}` : ''
  return `${sentence(t, parts)}.${missing}`
}

/** "5 Oct 2026, 14:03", in the app's language. */
function formatWhen(t: Translator, ms: number): string {
  try {
    return new Date(ms).toLocaleString(t.locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
  }
}

/**
 * What has been downloaded, and the way to undo it.
 *
 * ⚠️ The count is the honest part. "Answers are kept on this device" above is a
 * claim, and a claim about stored data that the person cannot check or reverse
 * is worth very little — so the number of them is on screen and there is one
 * button that removes the lot. It counts the "nobody has this one" answers too,
 * because those are stored as well and pretending otherwise would make the
 * number quietly wrong.
 */
function DownloadedLyrics() {
  const t = useT()
  const [count, setCount] = useState<number | null>(null)
  const forget = useLyricsStore((l) => l.forget)

  useEffect(() => {
    let live = true
    void countLyrics().then((n) => { if (live) setCount(n) })
    return () => { live = false }
  }, [])

  if (count === null || count === 0) return null
  return (
    <div className="px-1 py-3">
      <p className="text-[13px] text-slate-600 dark:text-slate-300">
        {t.plural('settings.lyrics_looked_up', count)}
      </p>
      <button
        type="button"
        onClick={() => {
          void clearLyrics().then(() => {
            setCount(0)
            // The panel may be showing one of the sheets that just went.
            forget()
          })
        }}
        className="mt-1.5 text-[12.5px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
      >
        {t('settings.forget_them')}
      </button>
    </div>
  )
}

/**
 * "Notify me of each new song" — the one switch that has to ASK before it can
 * be on.
 *
 * ⚠️ The system prompt comes from the tap that turns it on, and the setting is
 * stored only once the answer is yes: a switch reading "on" over a refusal is
 * a notification nobody ever gets. A refusal is then said in words, with where
 * to undo it, because the app cannot ask twice — after one "no", the browser
 * and both phones answer every later request themselves without showing it.
 *
 * Asked again whenever the page comes back into view, so allowing it in the
 * phone's Settings and switching back is enough to bring the switch to life.
 */
function NotifyToggle() {
  const t = useT()
  const on = useSettingsStore((s) => s.trackNotifications)
  const set = useSettingsStore((s) => s.set)
  const support = notifySupport()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (support === 'none') return
    let live = true
    const check = () => {
      if (document.visibilityState !== 'visible') return
      void notifyPermission().then((p) => {
        if (live) setBlocked(p === 'denied')
      })
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', check)
    }
  }, [support])

  return (
    <Toggle
      label={t('settings.notify')}
      hint={t('settings.notify_hint')}
      checked={on && !blocked}
      disabled={support === 'none' || blocked}
      disabledHint={
        support === 'none'
          ? t('settings.notify_no_support')
          : support === 'native'
            ? t('settings.notify_off_native')
            : isDesktopApp()
              ? t('settings.notify_off_desktop')
              : t('settings.notify_blocked_site')
      }
      onChange={(v) => {
        if (!v) {
          set('trackNotifications', false)
          return
        }
        void askToNotify().then((granted) => {
          if (granted) set('trackNotifications', true)
          else setBlocked(true)
        })
      }}
    />
  )
}

/**
 * What "About this track" has kept, and the way to undo it — `DownloadedLyrics`
 * for Wikipedia, for the same reason: a claim about stored data the person
 * cannot see or clear is worth very little.
 */
/**
 * "Your Universal ID" — the website only, and only when somebody is signed in
 * to the suite somewhere else (the hub, BlackBook…): Jukebox asks nobody to
 * sign in, but recognises the shared session and says so in the top bar
 * ("James’ Jukebox", `lib/personalTitle.ts`). This is where that account is
 * managed and left — the SDK's own copy of this section is in ITS Tune this
 * app, which Jukebox replaces with this page (`showAppPreferences={false}`).
 * The suite rule, James 2026-10-26: "On the tuning page there should be an
 * account management".
 */
function AccountSection() {
  const t = useT()
  const { config, session, supabase } = useUniversal()
  const user = session?.user
  if (config.noAccounts || !user || (user as { is_anonymous?: boolean }).is_anonymous || !user.email) return null
  const hub = 'https://app.unisim.co.uk/profile'
  return (
    <Section title={t('settings.account_title')} summary={user.email}>
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="min-w-0 flex-1 text-[14px] font-semibold break-all text-slate-900 dark:text-slate-100">{user.email}</p>
          <a href={hub} target="_blank" rel="noopener" className="text-[13px] font-medium whitespace-nowrap text-orange-700 hover:underline dark:text-orange-400">
            {t('settings.account_manage')} →
          </a>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">{t('settings.account_note')}</p>
        <button
          type="button"
          onClick={() => void signOut(supabase)}
          className="mt-2.5 text-[13px] font-semibold text-slate-700 hover:text-orange-700 dark:text-slate-200 dark:hover:text-orange-400"
        >
          {t('settings.sign_out')}
        </button>
      </div>
    </Section>
  )
}

function SavedAbout() {
  const t = useT()
  const [count, setCount] = useState<number | null>(null)
  const forget = useAboutStore((a) => a.forget)

  useEffect(() => {
    let live = true
    void countAbout().then((n) => { if (live) setCount(n) })
    return () => { live = false }
  }, [])

  if (count === null || count === 0) return null
  return (
    <div className="px-5 py-4">
      <p className="text-[13px] text-slate-600 dark:text-slate-300">
        {t.plural('settings.songs_looked_up', count)}
      </p>
      <button
        type="button"
        onClick={() => {
          void clearAbout().then(() => {
            setCount(0)
            forget()
          })
        }}
        className="mt-1.5 text-[12.5px] text-slate-600 underline-offset-2 hover:text-orange-700 hover:underline dark:text-slate-400 dark:hover:text-orange-400"
      >
        {t('settings.forget_them')}
      </button>
    </div>
  )
}

// ── Labels and formats, shared by the controls and the fold summaries ────────

// ⚠️ Functions of the translator, not constant arrays: a constant would be
// built once, at import, in whatever language was active then.

const homeOptions = (t: Translator): Option<HomeTab>[] => [
  { value: 'artists', label: t('settings.home_artists') },
  { value: 'albums', label: t('settings.home_albums') },
  { value: 'tracks', label: t('settings.home_tracks') },
  { value: 'jukebox', label: t('settings.home_jukebox') },
]

const lyricsStyleOptions = (t: Translator): Option<LyricsAroundStyle>[] => [
  { value: 'arc', label: t('settings.style_arc') },
  { value: 'lines', label: t('settings.style_lines') },
  { value: 'orbit', label: t('settings.style_orbit'), hint: t('settings.style_orbit_hint') },
]

// The labels the SDK's App preferences uses for the same choice, so the two
// places read alike.
const themeOptions = (t: Translator): Option<ThemePref>[] => [
  { value: 'light', label: t('settings.theme_light') },
  { value: 'dark', label: t('settings.theme_dark') },
  { value: 'system', label: t('settings.theme_system'), hint: t('settings.theme_system_hint') },
]

/** The Colour scheme choice's "no override" value. Not a stored value: picking it removes the key. */
const FOLLOW_GLOBAL = 'global'

function labelOf<T extends string>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? String(value)
}

/** The ±5 needle-drop step, as its slider shows it. */
function formatStep(v: number): string {
  return v === 0 ? '0' : v > 0 ? `+${v}` : String(v)
}

/** One decimal place, in the language's own digits: "1.8", "1,8". */
function oneDecimal(t: Translator, n: number): string {
  return new Intl.NumberFormat(t.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)
}

/** The boost multiplier, as its slider shows it. */
function formatBoost(t: Translator, v: number): string {
  return v <= 1.001 ? t('common.off') : t('settings.boost_value', { value: oneDecimal(t, v) })
}

/** The Quiet / Loud level, as its slider and button show it. */
function formatLevel(t: Translator, v: number): string {
  const db = Math.round(v)
  return db === 0 ? t('common.off') : t(db < 0 ? 'settings.level_down' : 'settings.level_up', { db: t.num(Math.abs(db)) })
}

/** A fade length, as its slider shows it. */
function formatFade(t: Translator, v: number): string {
  return v === 0 ? t('common.off') : t('settings.fade_value', { value: oneDecimal(t, v) })
}

/** "no fades", "1.5s fades", or the two named separately when they differ. */
function describeFades(t: Translator, fadeIn: number, fadeOut: number): string {
  if (fadeIn === 0 && fadeOut === 0) return t('settings.summary_no_fades')
  if (fadeIn === fadeOut) return t('settings.summary_fades', { fade: formatFade(t, fadeIn) })
  return [
    fadeIn > 0 ? t('settings.summary_fade_in', { fade: formatFade(t, fadeIn) }) : null,
    fadeOut > 0 ? t('settings.summary_fade_out', { fade: formatFade(t, fadeOut) }) : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/** Comma-joined, with the first letter raised: "Boost off, no fades". */
function sentence(t: Translator, parts: string[]): string {
  const text = parts.join(', ')
  return text.charAt(0).toLocaleUpperCase(t.locale) + text.slice(1)
}

// ── The row kit ──────────────────────────────────────────────────────────────

/**
 * One category of settings, shut until you open it.
 *
 * ⚠️ Every section starts CLOSED (James, 2026-09-09). Open, the page was six
 * screens of controls to scroll past to reach the one you came for; shut, the
 * whole of Settings is a list of six headings you can see at once. The titles
 * and their notes stay OUTSIDE the fold precisely so that closing them costs
 * nothing to scan — what folds away is the controls, never the sentence telling
 * you what is in there.
 *
 * ⚠️ A real `<details>`, not a div with a click handler. That is the keyboard,
 * the screen reader's "collapsed"/"expanded", and browser find-in-page reaching
 * inside a shut fold, all for free — and it is also what the SDK's suite-wide
 * reveal-on-expand listens for, so opening the last section scrolls it into
 * view without this file knowing anything about it.
 *
 * ⚠️ `summary` is what the section is SET TO, shown on the title line while it
 * is shut — "Sound: Boost off, 1.5s fades" — so the list of six headings is also
 * a list of six answers, and nobody opens a fold just to find out it says what
 * they thought. It hides once the fold is open, where the controls say it
 * themselves. What it does NOT do is remember which folds were open: every
 * section still starts shut on every visit, and that was decided, not missed.
 */
function Section({
  title, note, summary, id, open, children,
}: {
  title: string
  note?: string
  summary?: string
  /** For `openSettingsAt` to scroll to. */
  id?: string
  /** Starts unfolded — only when `openSettingsAt` asked for this section. */
  open?: boolean
  children: React.ReactNode
}) {
  return (
    <details id={id} open={open || undefined} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* `list-none` plus the webkit marker rule: without BOTH, one engine keeps
          its own triangle and the row ends up with two disclosure arrows. */}
      <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-600 dark:hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {title}
            </span>
            {summary && (
              <span className="text-[13px] font-medium text-slate-800 group-open:hidden dark:text-slate-200">
                {/* Read as "Sound: boost off…", not as one run-on phrase. */}
                <span className="sr-only">: </span>
                {summary}
              </span>
            )}
          </span>
          {note && (
            <span className="mt-1 block text-[13px] text-slate-500 dark:text-slate-400">{note}</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 dark:text-slate-500"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.58l3.3-3.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.42Z" />
        </svg>
      </summary>
      <div className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {children}
      </div>
    </details>
  )
}

function Row({ children, id }: { children: React.ReactNode; id?: string }) {
  return <div id={id} className="px-5 py-4">{children}</div>
}

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <>
      <span className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">{text}</span>
      {hint && (
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {hint}
        </span>
      )}
    </>
  )
}

interface Option<T> {
  value: T
  label: string
  hint?: string
  /**
   * A picture of the option, drawn beside its radio — the deck chooser's
   * miniatures. Decoration: it sits inside the `<label>`, so clicking it picks
   * the option, but it is `aria-hidden` and the radio and its text remain the
   * control a keyboard or a screen reader uses.
   */
  picture?: React.ReactNode
}

/**
 * A set of mutually exclusive choices, as real radios.
 *
 * ⚠️ Radios rather than a `<select>` because each option carries a sentence
 * explaining what it does, and a dropdown can only show one of them at a time —
 * which for "how often should this animation appear" is precisely the
 * information needed to choose.
 */
/**
 * This app's language (James, 2026-09-28: "signed out users should be able to
 * choose language in tune this app (instead of global)"). Global Tuning is for
 * signed-in accounts only since SDK 0.165.0, and "Tune this app" in Jukebox is
 * this page, so the language the SDK's own Tune this app dialog offers has to
 * be here. The same rules as that dialog: with one app there is nothing to
 * follow and it sets the global value; with more, it is this app's override.
 */
function LanguageRow({ split }: { split: boolean }) {
  const t = useT()
  const { globalLanguage, appLanguage, setGlobalLanguage, setAppLanguage } = useUniversal()
  const follow = t('settings.follow_global', { value: LANGUAGE_LABELS[globalLanguage] ?? globalLanguage })
  return (
    <Row>
      <label className="block">
        <span className="block text-[14px] font-medium text-slate-900 dark:text-slate-100">{t('settings.language')}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t('settings.language_hint')}
        </span>
        <select
          value={split ? (appLanguage ?? '') : (appLanguage ?? globalLanguage)}
          onChange={(e) => {
            const v = e.target.value
            if (split) {
              setAppLanguage(v ? (v as Language) : null)
            } else {
              if (appLanguage) setAppLanguage(null)
              setGlobalLanguage(v as Language)
            }
          }}
          className="mt-2.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[16px] text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {split && <option value="">{follow}</option>}
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code] ?? code}
            </option>
          ))}
        </select>
      </label>
    </Row>
  )
}

function Choice<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: Option<T>[]; onChange(value: T): void }) {
  // ⚠️ Not built from `label`, which is translated: two labels could fold to
  // the same name in another language and join their radios into one group.
  const name = useId()
  return (
    <Row>
      <fieldset>
        <legend className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</legend>
        <div className="mt-2.5 space-y-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-2.5 ${option.picture ? 'items-center' : 'items-start'}`}
            >
              <input
                type="radio"
                name={name}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className={`h-3.5 w-3.5 shrink-0 accent-orange-600 ${option.picture ? '' : 'mt-0.5'}`}
              />
              {option.picture && (
                // A fixed box, so five machines of five different shapes line
                // their text up in one column.
                <span
                  aria-hidden
                  className={`flex h-[72px] w-[80px] shrink-0 items-center justify-center transition-opacity ${
                    value === option.value ? '' : 'opacity-75'
                  }`}
                >
                  {option.picture}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[13.5px] text-slate-800 dark:text-slate-200">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {option.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Row>
  )
}

/**
 * A slider along an ordered set of named settings.
 *
 * ⚠️ It is a real `<input type="range">` over the ladder's INDICES, not a row
 * of styled buttons pretending to be a slider. That buys the keyboard and the
 * screen reader for free — arrow keys step, Home and End jump, and
 * `aria-valuetext` reads the option's name rather than "3 of 5", which is the
 * one thing a numeric slider gets wrong for a set of named choices.
 *
 * ⚠️ The order comes from `CEREMONY_LADDER` and is not repeated here. A second
 * copy of the order is how a slider ends up running backwards after somebody
 * adds a mode in the middle.
 */
function Ladder({
  label, hint, value, copy, onChange,
}: {
  label: string
  hint?: string
  value: CeremonyMode
  copy: Record<CeremonyMode, { label: string; hint: string }>
  onChange(value: CeremonyMode): void
}) {
  const index = Math.max(0, CEREMONY_LADDER.indexOf(value))
  const here = copy[CEREMONY_LADDER[index]]
  return (
    <Row>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
        <span className="shrink-0 text-[13px] font-medium text-orange-700 dark:text-orange-400">
          {here.label}
        </span>
      </div>
      {hint && (
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      <input
        type="range"
        min={0}
        max={CEREMONY_LADDER.length - 1}
        step={1}
        value={index}
        aria-label={label}
        aria-valuetext={here.label}
        onChange={(e) => onChange(CEREMONY_LADDER[Number(e.target.value)])}
        className="jb-scrub mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700"
      />
      {/* The two ends, named. Without them a slider with no scale is a control
          you have to drag to find out what it does — and the whole reason this
          replaced radios was that the ORDER means something. */}
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{copy[CEREMONY_LADDER[0]].label}</span>
        <span>{copy[CEREMONY_LADDER[CEREMONY_LADDER.length - 1]].label}</span>
      </div>
      {/* ⚠️ A fixed height, because the sentence under the handle changes as you
          drag and the rows below must not jump about while you are dragging. */}
      <p className="mt-2 min-h-[2.6rem] text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
        {here.hint}
      </p>
    </Row>
  )
}

/** A row that DOES something rather than setting something: its name, and a button. */
function Action({
  label, hint, button, onClick, disabled = false, expanded, controls,
}: {
  label: string; hint?: string; button: string; onClick(): void; disabled?: boolean
  /** For a button that folds a panel open beneath it: the panel's id. */
  expanded?: boolean; controls?: string
}) {
  return (
    <Row>
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <Label text={label} hint={hint} />
        </span>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-expanded={expanded}
          aria-controls={controls}
          className="shrink-0 rounded-full border border-slate-300 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:cursor-default disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:text-orange-400 dark:disabled:hover:border-slate-600 dark:disabled:hover:text-slate-200"
        >
          {button}
        </button>
      </div>
    </Row>
  )
}

/**
 * A tick box.
 *
 * ⚠️ EVERY TOGGLE ON THIS PAGE IS UNTICKED BY DEFAULT (James, 2026-09-16: "Maybe
 * we should have them all as default off and reworded?" — which replaced, the
 * same day, the opposite rule of all ticked). A setting whose default is ON gets
 * the question turned round — "Hide “Resume listening”", "No crossfade between
 * records", "Show error messages" — and is bound as `checked={!value}` /
 * `set(key, !ticked)`. The STORED settings are unchanged; only the question
 * turned round. A new switch follows the rule.
 */
function Toggle({
  label, hint, checked, onChange, disabled = false, disabledHint,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange(value: boolean): void
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <Row>
      <label className={`flex items-start gap-3 ${disabled ? 'cursor-default opacity-55' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked && !disabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
        />
        <span className="min-w-0 flex-1">
          <Label text={label} hint={disabled ? (disabledHint ?? hint) : hint} />
        </span>
      </label>
    </Row>
  )
}

function Slider({
  label, hint, value, min, max, step, format, onChange, onCommit, disabled = false, disabledHint,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  format(value: number): string
  onChange(value: number): void
  /** Fired when the drag ENDS, for a setting worth demonstrating. */
  onCommit?(value: number): void
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <Row>
      <div className={disabled ? 'opacity-55' : undefined}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{label}</span>
          <span className="shrink-0 text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
            {disabled ? '—' : format(value)}
          </span>
        </div>
        {(disabled ? (disabledHint ?? hint) : hint) && (
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {disabled ? (disabledHint ?? hint) : hint}
          </p>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={label}
          aria-valuetext={disabled ? undefined : format(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          // Both, because a slider is dragged with a pointer and nudged with the
          // arrow keys, and only handling the first leaves the keyboard user
          // with a control that never demonstrates itself.
          onPointerUp={(e) => onCommit?.(Number(e.currentTarget.value))}
          onKeyUp={(e) => onCommit?.(Number(e.currentTarget.value))}
          className="jb-scrub mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-200 disabled:cursor-default dark:bg-slate-700"
        />
      </div>
    </Row>
  )
}

/**
 * The years each machine takes over, for Automatic.
 *
 * ⚠️ Committed on BLUR (or Enter), not on every keystroke. The years are kept in
 * order by `sanitiseEras`, and typing "19" on the way to "1991" would otherwise
 * be clamped and re-ordered under the cursor — the field would fight the typing.
 */
function EraYears({ eras, onChange }: { eras: DeckEras; onChange(eras: DeckEras): void }) {
  const t = useT()
  const all: { key: keyof DeckEras; label: string }[] = [
    { key: 'vinyl', label: t('settings.era_vinyl') },
    { key: 'cassette', label: t('settings.era_cassette') },
    { key: 'cd', label: t('settings.era_cd') },
    { key: 'pocket', label: t('settings.era_pocket') },
  ]
  // No pocket player on iPhone/iPad (`barsPocketPlayer`), so no year for it.
  const rows = all.filter((row) => row.key !== 'pocket' || !barsPocketPlayer())
  return (
    <div className="mt-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
      <p className="text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
        {t('settings.eras_note', { year: String(eras.vinyl) })}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((row) => (
          <label key={row.key} className="flex flex-col gap-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
            {row.label}
            <input
              key={`${row.key}-${eras[row.key]}`}
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={eras[row.key]}
              onBlur={(e) => {
                const year = Number(e.currentTarget.value)
                if (Number.isFinite(year) && year !== eras[row.key]) onChange(sanitiseEras({ ...eras, [row.key]: year }))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] tabular-nums text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
