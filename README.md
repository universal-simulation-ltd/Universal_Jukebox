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

### ⚠️ Permission is per folder, so the banner is per folder

One row per unreachable folder, each with its own button, each naming the folder.
A single "Allow access" that looped over them would fire several permission
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

**Nothing to hand?** The landing page offers an example library: eleven records
by four artists who do not exist, with the music AND the sleeves generated in
the browser (`lib/exampleLibrary.ts`). Not one byte of it is shipped or
downloaded — which is the only honest way for this app to have a demo, since
bundling real music means licensing real music, and an app whose pitch is "it
plays your own files" should not quietly fetch somebody else's.

⚠️ **It stands aside for real music.** Adding a folder ADDS to the library, and
the one thing that must never add is the demo — eleven records by artists who do
not exist, mixed in among somebody's own albums, indistinguishable in the grid
and removable only by knowing which names were fake. So the first real folder
takes its place.

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
│   ├── roots.ts       # several folders: prefixes, merging, removing. Pure, tested
│   ├── search.ts      # what the search box matches — and so the tab counts too
│   ├── scan.ts        # the folder walk — header-only reads, streaming results
│   ├── library.ts     # IndexedDB: tracks / albums / roots
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
│                      # · settingsStore · tidyStore · themeStore
└── components/        # Landing · AlbumGrid · AlbumView · CoverFan · OpenGroup
                       # · Deck (the frame) · decks/ (Vinyl · Cd · Cassette · Jukebox)
                       # · NowPlaying · UpNextReel · PlayerBar
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

### ⚠️ There is no lookup, and there never will be

Every other player fixes missing artwork by asking MusicBrainz or the Cover Art
Archive, which means sending someone's album and artist names to a server. This
app's whole claim is that nothing leaves the machine, and *"we only send the
metadata"* is exactly the sentence people say when they have quietly started
sending something. If the art is not on the disk, the app says so.

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

## Settings

`#/settings`, reachable from the app menu. Everything is per-device and written
straight through to `localStorage` on change; there is no Save button because
nothing here is a form.

| Setting | Notes |
|---|---|
| **Open my library on** | Albums · Artists · Tracks. Also settable from the star beside each tab |
| **Deck** | Vinyl · CD · Cassette · Jukebox · **Random**. Changes the picture on Now Playing and the start-up sound, never the music — see below |
| **Record-changing animation** | A slider along a frequency ladder: Every track (default) · When the album changes · When the artist changes · Once per visit · Never. Governs the ceremony, the change-over animation and how often the start-up sound plays |
| **Needle-drop sound** | The thunk and surface noise — on a new record, between tracks, and on a preview. Its level is a **±5** slider, 0 being the level it has always been |
| **Volume boost** | 1–4× on top of the volume slider, for quietly-mastered albums |
| **Fade in / Fade out** | 0–8s, at the ends of a track. Separate from the crossfade between two tracks of one album — see below |
| **Theme** | Light · Dark · Match my device |

**Adding one** should be a field and a default in `stores/settingsStore.ts` plus
one `<Choice>` / `<Slider>` / `<Toggle>` in `components/Settings.tsx`. The page
is a list of sections of rows precisely so that stays true.

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
