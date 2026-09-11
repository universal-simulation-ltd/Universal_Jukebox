# Universal Jukebox

**A player for the music already on your device.** Point it at a folder and it
reads the tags and the embedded album art out of your own files, builds a
library you can browse, and plays it — with lock-screen and media-key controls.

Nothing is uploaded. There is no account. **It is not a streaming service and
has no catalogue of its own** — it plays files you already have, and it cannot
reach music that is anywhere else.

> **One qualification, and only one.** If you switch on the lyrics lookup, the
> app asks lrclib.net for the words to a track whose own tags carry none —
> sending that track's artist, title, album and length, and nothing else. It is
> off until you turn it on, no audio ever leaves the device either way, and it
> is the only feature in the app that opens a connection. See
> [Lyrics](#lyrics).

Live at **<https://opensource.unisim.co.uk/jukebox>**.

> **On the name.** "Universal" is the prefix every app in this suite carries, and
> a jukebox is the ordinary word for a machine that plays records you already
> own. The pairing is only unambiguous while every surface says what the thing
> *does* alongside the name — so the page title, the description, the manifest,
> the suite catalogue entry and the front door all say "plays", "your own files"
> and "not a streaming service". Keep that when editing any one of them.

---

## What it plays

MP3, M4A/AAC, FLAC, WAV and AIFF — everything a current browser decodes on its
own, which is why this app needs no decoder, no wasm and no worker. Ogg and Opus
play where the browser supports them (most do; Safari mostly doesn't), so they
work but are not advertised.

## What it refuses, and why

Refusing well is a suite convention: silence would tell someone their music is
broken when the truth is that no browser has ever been able to play the file.
Each of these is named on screen with a sentence.

| Refused | Why |
|---|---|
| DRM-protected `.m4p` | No browser can decode a licensed track, and neither can any other local player. |
| `.wma`, `.ape`, `.wv` | No browser ships a decoder. [Universal Converter](https://opensource.unisim.co.uk/converter) turns them into something this plays, also without uploading. |
| `.mid` / `.midi` | A score, not a recording — there is no audio in the file. |

## Several folders — added, rescanned, removed

**Adding a folder ADDS to your library** (2026-09-09). Before that it replaced
it, and this section said at length why that was right; the reason it gave was a
real standard rather than an excuse, and the feature had to meet it.

The app menu lists every folder with its own track count, **Rescan** and
**Remove**, plus **Add a folder…**. Removing one takes its tracks and leaves the
others untouched. Rescanning one is a replacement *of that folder*, so an album
you deleted on disk disappears and a renamed file does not turn up twice.

### ⚠️ The path collision that blocked it for a day

`trackKey` is path + size + mtime, and the paths a scan produced used to be
relative to the chosen folder with nothing in front of them. Two folders both
holding `Nick Cave/Let Love In/01 Do You Love Me.mp3` — an original and a
backup — therefore minted the **same track id** and the same `filesByPath` key.
One silently overwrote the other, and which one won depended on the order the
scans finished in. With one folder that could never happen; with two it happens
on the first day.

So every path now carries its root's name — `Music/Nick Cave/…` — which is the
shape `webkitRelativePath` has always had, so the two walkers agree for the first
time as well. **`Root.prefix` is the root's identity**: it is what the user sees
in the folder list AND what every one of its tracks is filed under, which is what
makes "remove this folder" a filter rather than a bookkeeping exercise. Prefixes
are therefore kept unique (`Music`, then `Music (2)`), and choosing a folder you
already have loaded means *rescan that one* rather than *add a second copy*.

⚠️ **A cost, paid once:** track ids changed shape, so a stored `album` fix from
the tidy-up — which is keyed by track id — no longer matches its track and is
dropped. `applyFixes` ignores fixes it cannot place, so nothing breaks; somebody
who had merged tracks by hand has to do it again. Cover fixes are keyed by album
id, which comes from the tags and is unaffected.

All of the arithmetic is pure and in `lib/roots.ts`, with 20 tests, because
every failure here is **silent**: a collision overwrites rather than throwing,
and a track count that is added up rather than recomputed is just a wrong number
on a tile.

### ⚠️ Permission is per folder, so the BUTTON is per folder — the banner is one

One card, with a row per unreachable folder naming that folder and carrying its
own button. The explanation and the "Start a new library" escape hatch are said
once, above and below the list, because they are true of the library rather than
of any one folder; only the name and the button repeat. A whole warning card per
folder — which is what shipped first — read as several separate problems and
pushed the album view underneath it off the screen.

The **button** cannot be merged, and that is the part to leave alone. A single
"Allow access" that looped over the folders would fire several permission
prompts inside one user gesture — which browsers may collapse into a single
grant, silently leaving the rest unplayable under a banner that has just
disappeared.

Which folders are stranded is **derived** from the live `File` map
(`needAccessFrom`), never stored. It was a `needsRegrant` boolean, and that was
fine with one folder and a lie with two: re-granting one of three would have
cleared it for all of them.

⚠️ It is **not** a zustand selector, and must not become one: a selector that
builds a new array on every call never compares equal to its last result, so the
component re-renders forever — "Maximum update depth exceeded", on the landing
page, before there is even a library. Callers subscribe to the pieces and
`useMemo`.

## The example library

**Nothing to hand?** The landing page offers an example library: nine records
by four artists who do not exist, with the music AND the sleeves generated in
the browser (`lib/exampleLibrary.ts`). Not one byte of it is shipped or
downloaded — which is the only honest way for this app to have a demo, since
bundling real music means licensing real music, and an app whose pitch is "it
plays your own files" should not quietly fetch somebody else's.

⚠️ **It stands aside for real music.** Adding a folder ADDS to the library, and
the one thing that must never add is the demo — nine records by artists who do
not exist, mixed in among somebody's own albums, indistinguishable in the grid
and removable only by knowing which names were fake. So the first real folder
takes its place.

**It says it is the demo, once you are inside it.** The sleeves are drawn to
look like real records and survive a reload, so a dashed *Example library*
note sits above the library, the album pages and Now Playing while it is loaded
(`ExampleNotice`). It is a label, not a door: there is still no way to load the
demo from a real library, because loading it replaces the library and that would
need a confirmation and a way back that do not exist.

Three things about it are deliberate:

- **The index is built eagerly, the audio lazily.** Titles, years, durations and
  artwork appear at once; the WAV for a track is synthesised the first time
  something tries to play it, and at most four are kept.
- **It is deterministic.** Every note comes from a PRNG seeded with the track's
  own path, so a record sounds the same next time — and, more usefully, still
  plays after a reload, when the library has come back out of IndexedDB with no
  files anywhere to point at.
- **Two of the four artists have three or more records**, because three is where
  the album grid folds a run into a fan. A demo library that showed none of the
  grouping would be missing the part worth showing.

⚠️ **It was a drum machine for its whole first week, and nothing failed.**
`addTone` ran its "has this note died away" test *during the attack*, where the
envelope is exactly `0` — so it broke out of the write loop on the **first
sample of every note** and the pad, the bass and the lead wrote nothing at all.
What survived was the drums, which are built by a different function. Eight of
the nine records played as percussion only, and "Quiet Rooms" — the one record
with `drums: false` — was thirty-eight seconds of digital silence. Fixed
2026-09-09.

The reason it lasted is worth more than the fix: **every file was the right
shape.** Correct duration, decoded cleanly, played to the end, fired `ended` on
time. The unit tests, the typecheck and every browser run through the app agreed
it was working, because none of them looked at the *content*. If you change the
synthesis, check it by measuring — the PCM peak of a generated track, **per
voice**, not per file. The whole-file peak was healthy the entire time the melody
was missing, because the drums were never affected.

That measurement is now a test: `lib/exampleLibrary.test.ts` renders every voice
of all 31 tracks **on its own** and holds each to a peak and an RMS floor. With
the old unguarded envelope put back it fails 93 times — the pad, the bass and
the lead of every track — while the whole-track peak of the 27 tracks with drums
stays above both floors, which is the point: a per-file version would have
caught "Quiet Rooms" and passed the rest.

## The folder problem

This is the honest bit, and the app is designed around it rather than
discovering it later.

| Where | What you get |
|---|---|
| Chrome / Edge | Pick the folder **once**. The directory handle is stored, so the library is still there next launch behind one permission confirmation — and in **Chrome 122+, installed as an app, not even that**: an installed app keeps its grant. The landing page says so only in Google Chrome 122+ that is not already installed (`lib/persistence.ts`); Edge shares the engine but does not document the policy, so it is not promised there. |
| Firefox / Safari | Pick the folder **every session**. Neither ships File System Access, and the permission is the thing that cannot be saved — no polyfill can invent it. |
| iOS app | **No folder is picked at all.** The app has one, and the OS shares it with the Files app. |
| Android app | Pick the folder **once**, in the system picker. Android keeps the grant, so the library is still there next launch with nothing to confirm. |

**On all three, the library and the artwork survive**, cached in IndexedDB and
keyed by path + size + mtime. What a Firefox visitor loses is a click, not their
library: the covers are already there and nothing is read twice. The button and
the copy differ per platform rather than failing at the moment of use.

### ⚠️ The phone has no folder picker, so it does not ask for one

`showDirectoryPicker` does not exist in an iOS WebView and `webkitdirectory` is
**ignored** by iOS Safari — an `<input>` carrying it quietly degrades to picking
single files. A straight wrapper of this app would therefore install, launch,
look completely correct, and have no route to a single track. The button would
be there and it would do nothing.

So the native build stops asking. `UIFileSharingEnabled` +
`LSSupportsOpeningDocumentsInPlace` publish the app's Documents directory to the
**Files app** as a folder called *Universal Jukebox*; music is copied,
AirDropped, unzipped or synced into it, and the app walks that. Sub-folders are
kept. There is also an in-app *Add music* picker — a plain multi-file `<input>`,
which iOS does support — and it **copies** what you pick into that folder rather
than holding the picked `File` objects, because those are ephemeral and a
library built from them would be empty after a relaunch.

⚠️ **That version is the one WITH persistence**, which is the part worth
noticing. A path is a plain string: it survives in IndexedDB with no permission
attached to go stale, so the phone comes back to a full library with nothing to
confirm — the trick only Chromium manages on the web, and it manages it by
storing a live permission-bearing object. Startup re-walks the folder to find
the files again but re-reads no tags, so it costs a `readdir` per directory and
nothing else.

⚠️ **Music added through the Files app needs a rescan.** Nothing tells the app
that a file appeared behind its back, so *Rescan my music folder* is in the app
menu and is not a duplicate of *Add music*.

⚠️ **And the folder has to be seeded, or it is not THERE to put music in.** iOS
lists an app under *Files → On My iPhone* only once its Documents directory holds
something, so a freshly installed Jukebox has no folder at all — while the
landing page tells you to go and use one. `ensureNativeMusicFolder()` writes a
short *Put your music in here.txt* on first run, which makes the folder appear
and says what to do with it. It is written **only when the folder is completely
empty**, so it never returns once there is music in there, and it does come back
if the folder is emptied — which is the one moment it is wanted again.

⚠️ **A scan that finds nothing must SAY so.** The first build returned silently
when the folder held no music, which on a fresh install — where everybody starts
— made *Scan my music folder* a button that did literally nothing. It now names
the path through the Files app, because the folder cannot be seen from inside the
app and somebody who has just been told there is no music in it has no way to
find out where it is.

### ⚠️ Android has no such folder, so there the folder IS chosen

The iOS answer does not carry over. `@capacitor/filesystem`'s
`Directory.Documents` on Android is not an app folder: it is the phone's shared
`/storage/emulated/0/Documents`, and under scoped storage (Android 11+) an app
can list only what it wrote there itself. Measured on an Android 15 emulator: an
MP3 put into Documents from outside was invisible, and so was every file under
`/sdcard/Music`. The first Android build compiled, installed, told you to use a
"Universal Jukebox folder in your Files app" that does not exist on Android, and
could not have found a single track.

So on Android *Choose your music folder* opens the system folder picker
(Storage Access Framework, starting in Music) and the app **keeps the grant**
(`takePersistableUriPermission`). The folder's tree URI is stored as the root's
`nativePath` — a plain string, like the iOS path — so the library comes back on
launch with nothing to confirm, and a cover image beside an album is visible
too. An app-local plugin (`android/…/MusicFolderPlugin.java`) picks and walks
the folder; the bytes are still read through Capacitor's local server, never
through the plugin. There is one phone folder: choosing another replaces it.
The in-app importer is hidden on Android, because it would copy into that shared
Documents folder, which the library does not read.

The chosen-folder route is switched on by the plugin, not by the platform name
(`usesChosenFolder()` in `lib/nativeFile.ts`), so a native plugin of the same
name on another platform turns it on there.

⚠️ **Android's local server does not honour a range the way it says it does.**
It answers `206` with a `Content-Range` for exactly the bytes asked for, and a
body that runs on to the end of the file: asking for 512 KB of a 20 MB file
returned all 20 MB. The tags still parse, so nothing looks wrong. The scan would
have moved every file in the library through memory. `NativeFile` therefore
reads the body as a stream and cancels it once it has the window, which brought
that read down to about 1 MB of actual disk reads.

### ⚠️ The volume question, and what a device actually said

Received wisdom is that `HTMLMediaElement.volume` is read-only in an iOS
WebView: the assignment does nothing, the property reads back as 1, and volume
belongs to the hardware buttons alone. Four things here go through
`element.volume` — the slider, mute, the fades and the crossfade — so if that
were true on the target device, all four would stop working silently.

**It was not true.** Measured on an iPhone 15 Pro running iOS 26, in this app's
own WebView: the assignment round-trips, so the fades and the real crossfade run
on the phone exactly as they do on the web.

⚠️ **What is checked is the property, not the loudspeaker.**
`lib/volumeSupport.ts` asks whether the engine *stores* the value it was given.
Whether the audio path then attenuates by it cannot be read from JavaScript —
the only instrument for that is an ear.

The check stays, because of what it protects when the answer *is* no. Three of
those four features would merely stop being heard. **The crossfade would get
worse rather than absent:** it starts the incoming track *under* the outgoing
one, and with no working gain "under" is full volume, so both records would play
at once for the length of the fade. Where volume cannot be set, the crossfade
degrades to a clean change-over, the fade sliders are disabled with a sentence
saying why, and the transport's volume slider is replaced by a line saying the
volume is on the device's buttons. Mute stays: it goes through
`element.muted`, which those engines honour.

⚠️ **It is a capability check, not an iOS check, and that is what stopped a bug
shipping.** Hard-coding the assumption — `if (isIOS) noFades()` — would have
left this app refusing to fade on a device perfectly willing to, with a confident
comment explaining why and nothing anywhere to contradict it.

### ⚠️ Two safe-area rules, and what happens without the top one

The native shell runs `viewport-fit=cover` with `contentInset: 'never'`, so the
page owns the full screen — the Dynamic Island and the home indicator included.
Two rules pay for that, and **both are invisible on a Mac**, because
`env(safe-area-inset-*)` is 0 in every browser and every emulator.

- `pt-[env(safe-area-inset-top)]` on the page wrapper in `App.tsx`
- `pb-[env(safe-area-inset-bottom)]` on the transport in `PlayerBar.tsx`

⚠️ **The top one is not cosmetic — without it the navbar PAINTS OVER the page.**
`UniversalAppsNavBar` is `position: sticky; top: 0` and takes the inset onto
itself as `paddingTop`, cancelling the wrapper's with an equal negative
`marginTop`. With no wrapper padding to cancel, the bar's natural box top is
*above* the viewport top — so sticky engages immediately and pins the box at
y=0, while the flow below has reserved only the un-padded height. The bar ends
up `inset` pixels taller than its own gap and covers the top of `<main>`.

Measured on the device that reported it: inset 59px, navbar `63..122`, and the
landing artwork at y=88 — 35px of the record under the bar. With the rule, the
artwork sits at 147 and nothing overlaps. ⚠️ The SDK's own note says it
"repairs an app that FORGOT the wrapper padding"; that is true of a static bar
and **not** of the sticky one.

---

## Running it

```sh
cd D:/Github/UNISIM/Universal_Apps/Universal_Jukebox
npm install
npm run dev          # http://localhost:5204
```

```sh
npm test             # unit tests (vitest)
npm run test:tags    # the tag + cover-art reader, against real files
npm run lint
npm run build
```

### The mobile builds

```sh
cd D:/Github/UNISIM/Universal_Apps/Universal_Jukebox
npm run cap:sync         # build --mode desktop, copy into ios/ and android/, then verify
npm run cap:open:ios     # Xcode
npm run cap:open:android # Android Studio
```

⚠️ **`cap:sync`, never a bare `npx cap sync`.** The hosted app lives at
`opensource.unisim.co.uk/jukebox/`, so a production build asks for
`/jukebox/assets/…` — and Capacitor serves the copied bundle at the ROOT of its
own origin, where no `/jukebox/` exists. Every asset 404s, no module script
runs, and the result is a white screen that Xcode reports as BUILD SUCCEEDED.
`--mode desktop` is the build that gets this right, and
`scripts/verify-mobile-bundle.mjs` (which `cap:sync` runs) fails loudly if the
wrong one was copied. This has shipped for real elsewhere in the suite.

⚠️ **Android needs a JDK Gradle accepts** — Android Studio's bundled JBR 21. A
system JDK 25 fails the Gradle sync with a bare `Unsupported class file major
version 69`.

### The Windows app

```sh
cd D:/Github/UNISIM/Universal_Apps/Universal_Jukebox
npm run build:desktop    # the same --mode desktop bundle the phones get
npm run electron         # the desktop shell, against that build
npm run dist:win         # the NSIS installer, into release/ — on Windows
```

An Electron shell (`electron/main.cjs`) around the `--mode desktop` bundle,
loaded from disk. The music is read exactly as the browser reads it — through
Chromium's own folder picker — so the renderer stays sandboxed and the preload
exposes nothing but the SDK's hub handoff. One copy runs at a time (a second
would share the library's IndexedDB), links out open in the system browser, and
background throttling is off so a change-over keeps time while minimised.

**The installer is built on GitHub, not on a Mac:** Actions → `windows` → Run
workflow. electron-builder writes the icon into the `.exe` with rcedit, a
Windows program, which a Mac can only run under Wine. The run smoke-launches the
packaged app and keeps the installer as its artifact for 30 days; give it a tag
and it is attached to that GitHub Release as well. Unsigned, like the suite's
other desktop apps, so SmartScreen asks once: More info → Run anyway.

⚠️ **An agent's shell sets `ELECTRON_RUN_AS_NODE`,** and with it set any
Electron app starts as plain Node and exits at once. Launch with
`env -u ELECTRON_RUN_AS_NODE`.

### The tag tests are the important ones

`src/lib/tags.ts` is the half of this app that fails **silently**. A misread tag
is not an exception — it is an album filed under the wrong artist, or a cover
that decodes to nothing and draws as an empty square. Both look exactly like
"that file must not have any artwork".

So `npm run test:tags` reads real music files in `src/lib/__fixtures__/` and
asserts on known bytes. **Those fixtures are written by
[mutagen](https://mutagen.readthedocs.io/)** — the tag library behind picard,
beets and quodlibet — and Pillow, via `scripts/make-fixtures.py`. That is the
whole point: a round-trip through our own writer only proves that two halves of
one misunderstanding agree with each other. The fixtures are committed, so CI
needs neither Python nor mutagen.

To add a case:

```sh
pip install mutagen pillow
python scripts/make-fixtures.py     # then commit what it writes
```

Writing these caught two real bugs before the app existed: a minimum-size guard
that silently rejected any cover under 100 bytes, and an MP4 `disk` atom floor
that accepted `trkn` and dropped `disk` from the same file — presenting as "my
library has no disc numbers" rather than as any kind of error.

The lyric frames are in the same fixtures for the same reason, and the text in
them is **doggerel written for `make-fixtures.py`**: a fixture has to assert on
an exact string, and the only words that can be committed to a public repository
and compared byte for byte are words nobody owns. It also makes a failure
obvious, since nothing in them could be mistaken for a real song.

---

## How it is put together

```
src/
├── lib/
│   ├── tags.ts        # ID3v2 · MP4 ilst · Vorbis comments, + cover art. Pure, no DOM
│   ├── keys.ts        # what counts as the same file, and the same album
│   ├── roots.ts       # several folders: prefixes, merging, removing. Pure, tested
│   ├── search.ts      # what the search box matches — and so the tab counts too
│   ├── scan.ts        # the folder walk — header-only reads, streaming results
│   ├── library.ts     # IndexedDB: tracks / albums / roots / fixes / lyrics
│   ├── lyrics.ts      # LRC in, timed lines out — + the on-demand read. Pure, tested
│   ├── lrclib.ts      # ⚠️ THE ONLY FILE THAT TOUCHES THE NETWORK. Off by default
│   ├── art.ts         # extract → downscale → cache → object URLs (bounded)
│   ├── audio.ts       # two <audio> decks, the crossfade, a real shuffle, the fades
│   ├── audioGraph.ts  # the OPTIONAL Web Audio graph — boost + analyser. Read it first
│   ├── ceremony.ts    # when the record-changing animation runs. Pure, tested
│   ├── transition.ts  # what happens BETWEEN two tracks: blend or record change. Pure, tested
│   ├── exampleLibrary.ts # the demo library — generated music and sleeves, no assets
│   ├── tidy.ts        # the tidy-up rules. Pure, and mostly about what it refuses
│   ├── crackle.ts     # the four synthesised start-up cues — no asset, no licence
│   ├── decks.ts       # the decks as WORDS, + the Random rotation. Pure, tested
│   ├── applySettings.ts # the one place settings become audible
│   └── mediaSession.ts
├── stores/            # playerStore (owns the ceremony timeline) · libraryStore
│                      # · settingsStore · tidyStore · themeStore · lyricsStore
└── components/        # Landing · AlbumGrid · AlbumView · CoverFan · OpenGroup
                       # · Deck (the frame) · decks/ (Vinyl · Cd · Cassette · Jukebox)
                       # · NowPlaying · UpNextReel · PlayerBar · Lyrics
                       # · PreviewButton · Settings · Tidy
```

### Three things that are load-bearing

1. **Nothing may call `file.arrayBuffer()`.** A 5,000-track library is 40 GB.
   Every read in `scan.ts` is `file.slice(a, b).arrayBuffer()` — a range read
   off disk. `arrayBuffer()` is the obvious method and it works beautifully on
   the three files anyone tests with.
2. **One cover per *album*, downscaled.** 5,000 tracks × a 500 KB embedded JPEG
   is 2.5 GB. Art is extracted only for the first track met from each album and
   stored at 512px, which takes the same library to roughly 16 MB.
3. **`tags.ts` is a port**, and its twin is
   `Universal_Apps/Universal_Converter/src/lib/tags.ts`. A parsing change in
   either belongs in both. When a *third* app wants tags, extract it into
   `@unisim/media` rather than taking a third copy — the failure this is
   copying towards is a change over there rendering a different picture here,
   with nothing anywhere raising an error.

### Putting a record on

The turntable animation — the record is **lowered onto the deck**, fading in
from just above it, the platter spins up, the tonearm comes down, a 3 · 2 · 1
counts **beside** the deck while the first bytes come off disk, and a
synthesised needle drop as the arm lands.

The arrival is one CSS animation on **the medium alone** (`arrival` in
`components/decks/face.ts`) rather than on the whole deck: the record player has
to still be there while the record arrives. It is also what makes the record
CHANGE possible without any face holding two covers at once — the old record
fades out, the artwork underneath swaps while nothing can see it, and the new
one fades in.

**By default it runs on every play** (James, 2026-09-08). Press play on a track,
an album or a search result and you land on the deck and the arm is cued. Only
on an **explicit** start, though: `advance()` (next, previous, the natural end of
a track) never asks, so a running queue is never interrupted by the full
ceremony — it gets the shorter needle change below instead.

There was a **90-second cooldown**, and it is now **zero** — `CEREMONY_COOLDOWN_MS`
in `src/lib/ceremony.ts`, deliberately off so James can find the real limit by
ear. That constant is the only place a rate limit lives; put `90_000` back and
the old behaviour returns exactly, with the tests in `ceremony.test.ts` (which
pass their own cooldown, so they go on proving the knob while the shipping value
is zero) to say what it should do.

Any click or key skips it, `prefers-reduced-motion` drops it entirely (the arm
is simply down and the music starts), and there is a **Don't show this again**
on the animation itself as well as a slider in Settings along a frequency
ladder — *every track* · *when the album changes* · *when the artist changes* ·
*once per visit* · *never*. The same setting governs the change-over between
tracks and how often the start-up sound plays; the ladder's order lives in
`CEREMONY_LADDER` and nowhere else.

Its **timeline** lives in `playerStore`, not in the `Deck` component — the deck
is only mounted on Now Playing, so a ceremony owned by it never finished when
you pressed play from an album.

### ⚠️ When the file has gone, the music has to stop

Both file lookups in `playerStore` move the cursor **before** they check the
file. That is deliberate: the error then names the track you asked for rather
than the one that was already on. But it means the state has already moved when
the lookup fails, and for a while each one simply set `error` and returned.

Nothing told the `<audio>` element. The title changed, the level bars beside it
kept animating, the scrub bar kept moving — and **a different song went on
playing underneath a message saying it could not be played**. That reads as a
bug in the *message*, which is the one reading that leaves nobody able to fix
it.

`unreachable()` takes the whole transport down: the ceremony and change-over
timers (which would otherwise fire into the wreckage), `audio.stop()`, the OS
media card (which would otherwise still offer play/pause for a track that is not
on), and `previewTrackId`, since stopping the sound also stops a preview and its
button must not be left saying "stop" over nothing.

**Anything added to an error path here has to answer the same question:** what
was the old state driving, and who is going to tell it? A `set({ error })` and a
`return` is a label on a machine that is still running.

**It does act on the reason** (2026-09-10; it used to say one sentence for
both). `useMissingFile` reads the reason from the library rather than storing
it: a folder with **no** live files has lost its permission, and the error
carries **that folder's own button** — `FolderAccessButton`, the same one the
permission banner uses, which drops that folder's row while the error is up so
it never shows twice. A folder whose other files are fine has lost **this
file**, and the error says so, with nothing to press. Once the folder is back
the error offers **Play it**, because `unreachable()` left nothing loaded for
the play button to resume.

⚠️ Still **one button per folder**, never "reconnect everything" — see the
permission banner above. And the *Choose folder* route (Firefox, Safari, or a
library of picked files) passes the root's id through `addFiles`: before that,
re-choosing a stranded folder filed it as a new "Music (2)" and left the
original asking for itself forever. It rescans into the root only when the
chosen folder carries that root's name (`isFolderNamed`); anything else is
added as a new folder.

⚠️ **Still open:** "Add a folder…" from the app menu with a name you already
have *adds* "Music (2)" even though `uniqueLabel`'s comment says an exact match
means "rescan that one". Which of those is right for two different folders that
share a name is a decision, not a bug fix, so it was left alone.

### The needle, once the music is going

The arm is not decoration after the landing. It creeps **inward** across the
record as the track plays — the outer groove to just outside the label, driven
by `currentSec / durationSec` — and between tracks it lifts, goes back out to
the start, and lands again with the scratch on top.

Four things about that are worth knowing before changing it:

- The arm is **two nested rotations about the same bearing**, not one sum. Where
  on the record the needle is (slow, linear) and the arm being lifted and cued
  (springy, overshooting) need different transitions; added together they would
  have to share one, and either the landing crawls or the creep springs.
- **`HANDOVER.LIFT_MS` (420ms) is a real gap between two RECORDS.** It is the
  price of the arm going back to the start rather than teleporting, and of the
  record on the deck being seen to change. Skipped entirely when the animation is
  off or under `prefers-reduced-motion` — and it does not apply within an album,
  where the tracks overlap instead.
- **Two tracks of the same record genuinely crossfade** (2026-09-09). They
  overlap on two `<audio>` elements over 1.8s at a natural end, 0.9s when you
  press Next, and the needle goes back to the start while they cross. This used
  to be impossible and the README said so; what changed is that there are two
  decks now, not one.
- **A different record does NOT blend.** It fades out, the record lifts off and
  fades away, the new one fades in, and the needle resets — which is what
  `HANDOVER.LIFT_MS`'s 420ms of silence is for. Which of the two you get is
  decided in `lib/transition.ts`, from what changed and what the animation
  slider says.

**The records waiting their turn** are drawn beside the deck as a row of the
same medium — `UpNextReel`, one item per QUEUE ENTRY rather than per album,
because what goes on the player is a track. Each one is **named** underneath and
each one is a **button that plays that track**, so reaching track six no longer
means pressing next five times. As each one is loaded it shrinks out of the row
and the rest slide along to fill the gap; only as many as fit on one line are
shown, measured from the row with a `ResizeObserver` rather than guessed from
the viewport.

⚠️ The reel draws its own small record / 45 / disc / cassette rather than
reusing the deck faces, and that is deliberate: the faces draw the MACHINE — a
tonearm, a laser sled, a Discman body with buttons, a whole jukebox cabinet —
which at 76px is a smudge, and none of which is waiting to go on. Under
**Random** each item is resolved separately, so the row shows what each track
will actually be played on.

⚠️ It **used to be `aria-hidden`** and is not any more. That was right while it
was a picture of a queue that had a real list underneath it; now that each item
carries a name and plays its track, an `aria-hidden` button would be unreachable
by keyboard while still taking up the space. The row is exposed and the
*drawings inside it* stay hidden. What survives of the old argument is that this
is the short version — as many as fit on one line, no remove button, no scroll.
"Up next" underneath is still the complete list and still where the queue is
edited.

⚠️ The departing item's exit animation takes its starting width from
`--jb-item`, set by the component. It was a hard-coded `100px` in
`@keyframes jb-reel-out`, which only worked because the element also sets
`width` — widen the column past that number and the record hangs still for the
first part of the animation and then jumps, which reads as a dropped frame
rather than as a wrong constant.

Pause **freezes** all of it where it stands: the platter's `animation-play-state`
is paused rather than the animation being removed (removing it snaps the record
back to 0°), and the needle's angle comes from `currentSec`, so it simply stays.

### Previewing, the one play that isn't a play

Every other way of starting audio goes to the deck. The exception is the small
**headphones** button beside each track in the library and on every album: ten
seconds, taken **ten seconds in** — the first ten seconds of a track are the
part least like it — with no queue, no change of screen, and whatever you had on
still cued up behind it.

⚠️ It runs on a **second `<audio>` element**, which is a deliberate exception to
the one-element rule below. One extra element, reused for every preview and
emptied the moment one stops, pins nothing between previews; what it buys is the
queue surviving a listen. It does pause the music first — two records at once is
not a preview.

---

## Tidying up

`#/tidy`, from the app menu. It looks for two things and **proposes** them:

- **Missing artwork that is already on your disk** — a `cover.jpg` (or `folder`,
  `front`, `albumart`…) sitting beside the tracks, or art embedded in a *later*
  track of the album. The scan only asks the first track it meets for art, so an
  album whose sleeve is on track 2 shows nothing at all.
- **Records split in two by inconsistent tags** — two albums with the same name
  in the same folder under different artist spellings, and tracks with no album
  tag sitting in an album's folder.

### ⚠️ There is no artwork lookup, and there never will be

Every other player fixes missing artwork by asking MusicBrainz or the Cover Art
Archive, which means sending someone's album and artist names to a server. This
app's whole claim is that nothing leaves the machine, and *"we only send the
metadata"* is exactly the sentence people say when they have quietly started
sending something. If the art is not on the disk, the app says so.

> **⚠️ This heading used to say "there is no lookup", and the lyrics panel broke
> it.** Read [Lyrics](#lyrics) before deciding this section is merely out of
> date. The paragraph above was written as a warning about a sentence, and the
> Settings page now says almost that exact sentence — so the difference has to
> be argued rather than assumed, and it is argued there. What has **not**
> changed: the tidy-up still asks nothing of anybody, artwork is still never
> looked up, and nothing here is a precedent for the next feature that would
> find a server convenient.

### ⚠️ Everything is a proposal, and the refusals are the feature

`keys.ts` puts it plainly: **a wrongly merged album cannot be told apart
afterwards.** So `tidy.ts` finds candidates, explains each in a sentence, shows
the actual picture it would use — and a person presses the button. The rules are
deliberately narrow, and `tidy.test.ts` spends more of its length on what they
must *refuse* than on what they find:

| Refused | Why |
|---|---|
| Same album title in **different folders** | "Greatest Hits" by two artists, or one record owned twice |
| Two **different** albums sharing a folder | A folder of singles — merging destroys two records to make one that never existed |
| `Album` vs `Album (Deluxe Edition)` | Different releases with different track lists; somebody with both has both on purpose |
| Loose tracks where the folder holds **two** albums | No single right answer, so it says nothing |
| Any image that is not named like a cover | `IMG_4821.jpg` is a photo. A wrong picture is worse than an honest blank tile |
| Anything fuzzy-matched | Where a tidy-up feature starts destroying libraries |

### Your files are never touched

Tidying corrects the library *here*; it does not rewrite tags or move files. The
fixes live in their own IndexedDB store keyed by album id and track id — both
derived from the files themselves — so **a rescan re-applies them** rather than
undoing them. That is the whole reason they are stored apart from the library
they correct: a tidy-up you have to redo after every new album is worse than
none, because you have to remember whether you did it.

---

## Lyrics

The **Lyrics** button on Now Playing. The words come from one of two places, and
the order is the whole design:

1. **The file's own tags, always first.** ID3 `USLT` (and `TXXX:LYRICS`, which
   is where some taggers put it instead), the Vorbis `LYRICS` /
   `UNSYNCEDLYRICS` comment, and MP4's `©lyr`. This costs one range read, works
   with the network unplugged, and is right even when it disagrees with the
   internet, because it is the user's own data.
2. **lrclib.net, only if you turn it on.** Off by default. See below.

Where the sheet is **LRC** — a `[mm:ss.xx]` at the head of each line — the panel
follows the music, and clicking a line seeks to it. Most tagged sheets are plain
text and show as plain text; nothing pretends to follow a sheet that has no
times in it.

### ⚠️ Lyrics are read on demand, never during a scan

`readTags` will not give you lyrics unless you ask (`wantLyrics`), the same way
it will not give you a cover. A sheet is a few kilobytes; carried on every
`Track` in a 5,000-file library that is ~15 MB of strings held in the store and
written to IndexedDB, for text that is only ever looked at one track at a time.
Instead the file for the track on the deck is re-read when the panel opens.
There is a check in `scripts/selftest.mjs` that fails if lyrics ever start
arriving by default — it is guarding the memory decision, not the parser.

### ⚠️ The online lookup, and why it is a real exception

This is the only part of the app that touches the network, and it contradicts a
heading three sections up. It is worth being exact about what makes it
different, because "it's fine, it's opt-in" is not by itself an argument:

- **It is off until somebody turns it on**, having read one sentence saying what
  will be sent. The artwork lookup this app refuses is the kind that is simply
  *on*.
- **The browser talks to lrclib.net directly.** There is no key to hide, so
  there is no reason for a Worker of ours in the middle — and if there were one,
  UNI·SIM would hold a log of what everybody listens to, which is worse than the
  thing being avoided. This is also why LRCLIB rather than Musixmatch: a
  licensed API needs a secret, a secret needs a server, and the server is the
  part that cannot be made private.
- **Artist, title, album and length. Nothing else** — not the path, not the
  library, not an id for the person or the device.
- **Once per track, ever.** The answer, including "nobody has this one", goes in
  the `lyrics` IndexedDB store. Settings shows how many tracks have been looked
  up and has one button that forgets the lot.

**On the licensing.** LRCLIB is free, key-less and community-contributed, and it
is what open-source players use because every licensed alternative (Musixmatch,
LyricFind) is a commercial contract — Genius's API does not serve lyric text at
all. It is **not** a licensed source. James took that call knowingly on
2026-09-09; this paragraph exists so that whoever reads it next knows it was a
decision and not an oversight.

### The four ways this goes wrong quietly

All four are covered by `lyrics.test.ts`, and none of them look like a bug on
screen — they look like somebody else's badly made lyric file:

| Trap | What it looks like |
|---|---|
| A line stamped **twice** (`[00:09][02:17]`) read once | The chorus never comes back; the sheet is stuck three minutes from the end |
| `[offset:+500]` applied with the **wrong sign** | The sheet is a second out instead of correct — the correction doubles the error |
| A plain sheet with **one** stray `[00:00.00]` treated as timed | One line highlighted for the whole song |
| A **half**-timed sheet shown as synced | Every untimed line silently missing |

A fifth lives in `tags.ts`: `LYRICIST` is a person's name, one letter from
`LYRICS`, and reading it would put a songwriter's name on screen where a song
should be. The FLAC and v2.4 fixtures both carry one, next to the real field.

---

## Settings

`#/settings`, reachable from the app menu. Everything is per-device and written
straight through to `localStorage` on change; there is no Save button because
nothing here is a form.

| Setting | Notes |
|---|---|
| **Open my library on** | Artists · Albums · Tracks · Jukebox. Also set by double-tapping a tab |
| **Deck** | Vinyl · CD · Cassette · Jukebox · **Random**. Changes the picture on Now Playing and the start-up sound, never the music — see below |
| **Record-changing animation** | A slider along a frequency ladder: Every track (default) · When the album changes · When the artist changes · Once per visit · Never. Governs the ceremony, the change-over animation and how often the start-up sound plays |
| **Needle-drop sound** | The thunk and surface noise — on a new record, between tracks, and on a preview. Its level is a **±5** slider, 0 being the level it has always been |
| **Volume boost** | 1–4× on top of the volume slider, for quietly-mastered albums |
| **Fade in / Fade out** | 0–8s, at the ends of a track. Separate from the crossfade between two tracks of one album — see below |
| **Theme** | Light · Dark · Match my device |

Two rows **do** something rather than set it: **Tidy up library** (under *Your
library*) and **Show the tips again** (under *Appearance*, beside the theme).
Both moved out of the Actions menu on 2026-09-11, which now holds only the
library's folders, Settings and About.

**Adding one** should be a field and a default in `stores/settingsStore.ts` plus
one `<Choice>` / `<Slider>` / `<Toggle>` in `components/Settings.tsx`. The page
is a list of sections of rows precisely so that stays true.

Every section starts **shut**, and a shut section says what it is set to —
*Sound: Boost off, 1.5s fades* — through its `summary`. That line is written by
hand per section but built from the store with the same labels and formatters
the controls display, so it cannot say one thing while the slider says another.
A new setting that matters at a glance belongs in its section's summary too.
The folds deliberately do **not** remember which were open.

### Four decks, and a fifth option that is not a machine

**Vinyl · CD · Cassette · Jukebox.** One timeline, four skins: the ceremony's
beats, the progress driving them and every rule in `lib/ceremony.ts` are
identical for all four. The temptation is to let each medium have its own timing
"because a CD is quicker" — don't; the store's asserted beats and
`ceremony.test.ts` cover ONE timeline.

**Adding a fifth** is a row in `lib/decks.ts` (the words), a face in
`components/decks/` (the picture), a shape in `decks/face.ts` (the frame and
where the notes drift from), a cue in `lib/crackle.ts` (the sound) and a value in
the `DeckStyle` union. Every one of those tables is keyed through the union, so
leaving any of them out **fails the build** rather than shipping a blank deck.

⚠️ **`DeckStyle` and `DeckSetting` are two types on purpose.** `DeckStyle` is a
machine — always one of the four. `DeckSetting` is what the user picked, which
has one more value: `random`. `FACES`, `SHAPES` and `CUES` are all keyed on the
narrower type, so nothing that has to *draw* or *sound* a deck can be handed
`random` — it has to go through `resolveDeck()` first. The version of this that
made `random` a `DeckStyle` compiled fine and rendered nothing.

**Random is a rotation, not a dice roll** — vinyl → CD → cassette → jukebox →
round again, indexed by the track's position in `order`. A real random pick
repeats (three cassettes in a row is an ordinary outcome) and the complaint that
produces is "the random setting is broken", which it would not be. Being a pure
function of a *position* is also what lets the row of records waiting to go on
show the machine each one is headed for, and what makes it agree with the deck
after a reload: nothing is remembered, so nothing can disagree.

⚠️ **The jukebox's medium is a 45, not an LP** — a label half the width of the
disc, a hole you can see across a room, and 45 rpm against the turntable's 33⅓.
That is the only thing distinguishing the two record decks in the waiting row,
where neither machine is drawn: get it wrong and switching between them appears
to do nothing.

### The jukebox's side lights are a real meter

The two lit pilaster tubes down the sides of the jukebox move to the music —
bass in the left one, mids and top in the right — driven by `lib/useLevels.ts`
off the same `AnalyserNode` the visualiser uses. Three things about it are
load-bearing.

**It writes to the DOM, not to React.** The hook sets a `--jb-level` custom
property on the elements it is given, once a frame. Returning a per-frame value
as state would re-render the cabinet, the record, the arm and the whole SVG
sixty times a second to move two coloured bars. Same argument as
`Visualiser.tsx`, which owns a canvas for the same reason.

**The property is REMOVED when nothing is metering, never set to zero.** Each
tube is two elements — the glass, which is always there, and the light inside it
— and the light's height reads `var(--jb-level, 1)`. So a paused deck, a browser
that will not give an analyser, and `prefers-reduced-motion` all fall back to the
solid lit bar the tubes have always had. Zero would make all three of those
states a dark tube, i.e. a machine that looks switched off.

⚠️ **The band edges are geometric, and equal slices do not work.** The
analyser's bins are linear in frequency — at `fftSize: 128` each is about
345 Hz — so splitting the range in half puts everything a listener would call
bass, and most of what they would call the tune, in the *first* band, and hands
the second one 7 kHz upwards, where music is nearly silent. Split that way the
upper tube sits on its floor through whole tracks.

Also asymmetric on purpose: a rise is instant and only the *fall* is rate-limited
(`FALL_PER_FRAME`). That is what makes a meter read as a meter — it snaps to a
beat and sinks back between them — rather than as a wobble.

⚠️ **This is not an equaliser in the audio sense** and must not be described as
one anywhere it could be read as a tone control. Nothing in the signal path
changes; it is a read-only tap. The app has no EQ, no DSP chain and no
ReplayGain, and its comparison entry says so.

⚠️ **A hover lift inside a clipped row.** The waiting row lifts a record 3px on
hover, and `overflow-hidden` clips at the **padding box** — so with no padding
the clip line sat exactly on the record's top edge and took a slice off it. The
row carries `pt-1` with `-mt-1` to stay put. `overflow-x-hidden` is not the
alternative: setting one axis computes the other to `auto`, which clips anyway.

### Three things worth knowing before changing the audio

**The fades need no Web Audio, and the boost cannot avoid it.** An
`HTMLMediaElement`'s `volume` is hard-capped at 1.0 by the spec, so gain above
unity has to go through a `GainNode` — which means routing the element through
an `AudioContext`, and *that* is a one-way door whose failure mode is silence
(`createMediaElementSource` may be called once per element, ever, and once
called the element's audio no longer reaches the speakers by itself). So the
graph in `lib/audioGraph.ts` is built **only** when something actually asks:
a boost above 1×, or the visualiser. Someone who never touches the boost never
takes that risk. `ensureRunning()` is called on every play because a suspended
context is silence, not an error.

**The user's volume and the fade envelope are separate values**, multiplied to
give `element.volume`. The obvious implementation — a fade writing straight to
`element.volume` — has no memory of what the slider said, so a fade-out ends
with the slider's own value redefined as zero and the next track silent.

**There are two elements, and exactly two.** A crossfade needs two files
decoding at once, so `lib/audio.ts` keeps a deck A and a deck B, swaps which one
is "active" at every blend, and revokes the retiring one's object URL when its
ramp finishes — at most two files pinned however long the queue runs. Three
things follow that are easy to get wrong:

- **Every element event is gated on being the active deck.** A retiring deck is
  still playing and still firing `timeupdate` and `ended`; ungated, the scrub bar
  jumps between two tracks and the queue advances twice.
- **The graph captures BOTH elements in one go.** `createMediaElementSource` is
  once-per-element and permanent, so a graph built over only the active deck
  would silence the app the first time the other one took over.
- **The two halves of a crossfade are equal-power (√), not linear.** Two linear
  ramps crossing dip audibly in the middle — which is the seam the crossfade
  exists to hide.

Fade in / fade out are still linear, because a fade to or from silence has
nothing on the other side of it.

---

Free and open source, like every Universal App. Part of the
[UNI·SIM](https://www.unisim.co.uk) suite.

## Licence

[AGPL-3.0-or-later](LICENSE), with an added permission for app-store
distribution. Use it, change it, share it — and if you run a changed copy and
let other people use it over a network, offer them your source.
