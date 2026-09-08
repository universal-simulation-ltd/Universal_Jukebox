# Universal Jukebox

**A player for the music already on your device.** Point it at a folder and it
reads the tags and the embedded album art out of your own files, builds a
library you can browse, and plays it — with lock-screen and media-key controls.

Nothing is uploaded. There is no account. **It is not a streaming service and
has no catalogue of its own** — it plays files you already have, and it cannot
reach music that is anywhere else.

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

## The folder problem

This is the honest bit, and the app is designed around it rather than
discovering it later.

| Browser | What you get |
|---|---|
| Chrome / Edge | Pick the folder **once**. The directory handle is stored, so the library is still there next launch behind one permission confirmation. |
| Firefox / Safari | Pick the folder **every session**. Neither ships File System Access, and the permission is the thing that cannot be saved — no polyfill can invent it. |

**On both, the library and the artwork survive**, cached in IndexedDB and keyed
by path + size + mtime. What a Firefox visitor loses is a click, not their
library: the covers are already there and nothing is read twice. The button and
the copy differ per browser rather than failing at the moment of use.

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

---

## How it is put together

```
src/
├── lib/
│   ├── tags.ts        # ID3v2 · MP4 ilst · Vorbis comments, + cover art. Pure, no DOM
│   ├── keys.ts        # what counts as the same file, and the same album
│   ├── scan.ts        # the folder walk — header-only reads, streaming results
│   ├── library.ts     # IndexedDB: tracks / albums / roots
│   ├── art.ts         # extract → downscale → cache → object URLs (bounded)
│   ├── audio.ts       # one <audio> element, the queue, a real shuffle, the fades
│   ├── audioGraph.ts  # the OPTIONAL Web Audio graph — boost + analyser. Read it first
│   ├── ceremony.ts    # when the record-changing animation runs. Pure, tested
│   ├── crackle.ts     # the synthesised needle drop — no asset, no licence
│   ├── applySettings.ts # the one place settings become audible
│   └── mediaSession.ts
├── stores/            # playerStore (owns the ceremony timeline) · libraryStore
│                      # · settingsStore · themeStore
└── components/        # Landing · AlbumGrid · AlbumView · Deck · NowPlaying
                       # · PlayerBar · Settings
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

The turntable animation — platter spins up, tonearm comes down, a 3 · 2 · 1
counts **beside** the deck while the first bytes come off disk, and a
synthesised needle drop as the arm lands.

By default it runs **when you put a different record on**, which is not the same
as "whenever the album changes":

- Only on an **explicit** start — pressing play on an album, a track or a search
  result. `advance()` (next, previous, the natural end of a track) never runs
  it, so crossing an album boundary *inside* a running queue is silent. You did
  not put that record on; the queue did.
- Only if the album differs from the one the **last ceremony** was for.
- And **at most once every 90 seconds**. This is the limit that makes the rule
  safe to offer at all: shuffle a whole library and nearly every track is a new
  album, browse the grid and every click is a new album. Without the cooldown
  the animation stops being an arrival and becomes a 2.3-second toll booth.

Any click or key skips it, `prefers-reduced-motion` drops it entirely (the arm
is simply down and the music starts), and there is a **Don't show this again**
on the animation itself as well as three choices in Settings.

The rule lives in `src/lib/ceremony.ts`, pure and tested — the shuffle and
browse cases are `ceremony.test.ts`, because "does it stay quiet through a
shuffled library" takes an hour of listening to check by hand and one test to
check properly.

Its **timeline** lives in `playerStore`, not in the `Deck` component — the deck
is only mounted on Now Playing, so a ceremony owned by it never finished when
you pressed play from an album.

---

## Settings

`#/settings`, reachable from the app menu. Everything is per-device and written
straight through to `localStorage` on change; there is no Save button because
nothing here is a form.

| Setting | Notes |
|---|---|
| **Record-changing animation** | On a new album (default) · Once per visit · Never |
| **Needle-drop sound** | The thunk and surface noise. Greys out when the animation is off, with the reason |
| **Volume boost** | 1–4× on top of the volume slider, for quietly-mastered albums |
| **Fade in / Fade out** | 0–8s. A fade, **not** a crossfade — see below |
| **Theme** | Light · Dark · Match my device |

**Adding one** should be a field and a default in `stores/settingsStore.ts` plus
one `<Choice>` / `<Slider>` / `<Toggle>` in `components/Settings.tsx`. The page
is a list of sections of rows precisely so that stays true.

### Two things worth knowing before changing the audio

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

The fade is a **fade, not a crossfade**. A crossfade needs two elements decoding
at once and this app has exactly one on purpose; what changes is that a track no
longer starts or stops at full volume, not that the gap between tracks closes.

---

Free and open source, like every Universal App. Part of the
[UNI·SIM](https://www.unisim.co.uk) suite.
