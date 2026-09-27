import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Audio formats, and why some songs won’t play',
    summary: 'MP3, FLAC, WAV and the rest — and what stops a file playing.',
    group: 'The basics',
    body: `A music file is recorded sound stored as numbers and packed up in a particular way. That packing is called the format, and the letters at the end of the file’s name usually tell you which one it is: .mp3, .m4a, .flac and so on.

## Two families of format

- **Lossy** formats, such as MP3 and AAC (usually found in .m4a files), make files much smaller by leaving out detail that most listeners are unlikely to notice. Most music bought or ripped from CDs over the last twenty years is in one of these.
- **Lossless** formats, such as FLAC, WAV and AIFF, keep every detail of the original recording. The files are bigger, but nothing has been thrown away.

## What Universal Jukebox plays

Universal Jukebox plays MP3, M4A and AAC, FLAC, WAV and AIFF. Ogg and Opus files play too wherever your device supports them, which most do but not all.

The app has no decoders of its own: it relies on the audio support built into your device. That is why the list above can vary slightly from one device to another.

## Why a song might not play

- **It is copy-protected.** Tracks sold with copy protection (older iTunes purchases with the .m4p ending, for example) and songs downloaded through a streaming subscription can only be played by the shop’s or service’s own app. No other player can open them.
- **Nothing on your device can decode it.** Windows Media Audio (.wma), Monkey’s Audio (.ape) and WavPack (.wv) files can’t be played. Universal Converter can turn WMA and APE files into formats this app plays, on your own device.
- **It is an audiobook file.** The .m4b audiobook format isn’t played.
- **It isn’t a recording at all.** A MIDI file (.mid) holds instructions — which notes to play, and when — rather than recorded sound, so there is nothing to hear.
- **The file is damaged**, for example a download that stopped part-way.

## Seeing the reason

By default, songs that can’t be played are skipped quietly. If you would rather know why, tick **Show error messages** in Settings, under Messages, and the app will name each file it couldn’t play and say what was wrong with it.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Tags and album art: where your library comes from',
    summary: 'How the app knows the artist, album and cover of each song.',
    group: 'The basics',
    body: `Universal Jukebox doesn’t look your music up anywhere. Everything you see in the library — titles, artists, albums, track numbers, years, genres and covers — is read from your own files.

## What tags are

Most music files carry a small label inside them, called tags. Tags hold facts about the recording: the song’s title, the artist, the album, the track and disc number, the year, the genre, and often a picture of the album cover. They are written by whatever made the file — the shop you bought it from, the program that ripped the CD, or a tag editor.

The app reads the common kinds of tag used by MP3, M4A, FLAC and Ogg files. Scanning reads only the part of each file where the tags are kept, rather than the whole song, so even a large library is quick to scan.

## When tags are missing or wrong

- **A file with no tags** is shown by its file name, with any track number at the front taken off. The app won’t guess an artist from a file name, because a wrong guess is worse than a blank.
- **An album split in two** usually means its tracks were tagged inconsistently — for example, the artist spelt two different ways.
- **A missing cover** can mean the picture was never stored in the files, or that it was stored in a later track rather than the first.

## Tidying up

**Tidy up library**, in Settings under Your library, looks for two things: covers that are already on your device but weren’t used (an image named like a cover, such as cover.jpg, beside the tracks, or art stored in a later track), and albums that inconsistent tags have split in two. It shows you each suggestion, with the picture it would use, and nothing changes until you press the button.

It deliberately refuses anything it can’t be sure of. Two albums with the same name in different folders, or a folder holding two different albums, are left alone.

## Your files are never changed

Tidying corrects the library inside the app only. It doesn’t rewrite tags, rename files or move anything, and your corrections are applied again automatically after a rescan.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Where your music lives',
    summary: 'Folders, phones and rescans — and why a browser may ask again.',
    group: 'How it works',
    body: `Universal Jukebox is not a streaming service and has no music of its own. It plays files that are already on your device, or on a drive your device can reach. The app never uploads, moves or edits them.

## Adding music

Open the menu and choose **Your complete library**. From there you can add a folder, rescan, or remove a folder. Adding a folder adds to your library rather than replacing it, and removing one takes away only that folder’s songs. How folders work depends on where you are using the app:

- **Chrome and Edge** can remember the folder you chose. When you come back you may be asked to confirm access once, with a single tap.
- **Firefox and Safari** can’t keep permission to read a folder between visits, so you choose the folder again each time. Your library, covers and settings are still remembered, so nothing has to be read twice.
- **The iPhone app** has its own folder, called Universal Jukebox, in the Files app. Anything you copy, AirDrop or save into it becomes part of your library. You can also add other folders, and play the songs in your iPhone’s Music library that are stored on the phone, such as ones synced from a computer.
- **The Android app** asks you to choose each folder once in the system picker, and Android remembers the permission.

## Rescanning

The app doesn’t notice on its own when files appear or disappear. After adding or deleting music outside the app, choose **Rescan**. A rescan picks up new songs, drops ones that are gone, and keeps any tidy-up corrections you have made.

## Songs from the iPhone’s Music library

Songs you sync to the iPhone from a computer can be played. The first time one plays, the app makes a working copy of it in a limited space on the phone. Songs downloaded through an Apple Music subscription, and songs that are in iCloud but not on the phone, can’t be played by any other app, and the app tells you how many it had to leave out.

## What the app keeps

The app keeps a catalogue of your library — titles, artists, albums and small copies of the covers — on your device, so it opens quickly next time. That catalogue isn’t backed up or shared between devices: each device builds its own. Clearing a browser’s data for this site clears the catalogue, but never your music.`,
  },
  {
    id: 'between-songs',
    title: 'Crossfades, fades and gaps between songs',
    summary: 'What crossfade and gapless mean, and what happens between tracks.',
    group: 'How it works',
    body: `What happens in the second or two between songs makes a surprising difference to how an album feels. A few terms are worth knowing.

## The terms

- **A gap** is the silence a player may leave between two tracks. On most albums it goes unnoticed, but on a live album or a continuous mix it breaks the music up.
- **Gapless playback** means playing one track straight into the next with no added silence, the way the album was meant to be heard.
- **A crossfade** overlaps the end of one song with the start of the next: the first fades down while the second fades up, so there is never a silence.
- **A fade in or fade out** brings a single song up from silence at its start, or down to silence at its end.

## What Universal Jukebox does

**Songs from the same album** run straight into one another with a short, gentle crossfade. The arriving song comes up only as the leaving one goes down, so the join is smooth rather than two songs playing loudly at once.

**When the next song is on a different record**, the two also crossfade by default, while the picture shows one player sliding out and the next sliding in. If you would rather have a clean break, tick **No crossfade between records** in Settings: the needle lifts, there is a moment’s silence, and it drops on the next record.

**Fade in** and **Fade out**, under Sound in Settings, add a fade of up to eight seconds at the start or end of every track, including the last song of an album. Both are off until you set them. On a device that doesn’t let the app control the volume, fades aren’t available, and Settings says so.

## The animation is separate

The record-changing animation, and how often it appears, is about the picture and its sound effect, not the music. Turning the animation off doesn’t add gaps: songs on one album still flow into each other.`,
  },
  {
    id: 'lyrics',
    title: 'Lyrics: where the words come from',
    summary: 'Lyrics stored in your files first, and an optional online lookup.',
    group: 'How it works',
    body: `Press **Lyrics** on Now Playing to see the words to the song that is playing. They can come from two places, always in this order.

## 1. Your own file

Many music files carry the lyrics inside their tags, put there by the shop, a ripping program or a tag editor. The app looks there first. This works with no internet connection, and because it is your own file, it is always preferred over anything found online.

The app reads lyrics stored inside the music file. Separate lyric files saved next to a song are not read.

## 2. An online lookup, only if you turn it on

If a song has no lyrics of its own, the app can ask lrclib.net, a free, community-run collection of lyrics. This is **off** until you tick **Look up missing lyrics online** in Settings, under Lyrics.

When it is on, looking a song up sends only its artist, title, album and length, straight from your device to lrclib.net. Nothing else about you, your device or your library is sent, and the request doesn’t pass through UNI·SIM. The answer is kept on your device, so each song is asked about only once. If no lyrics were found, the app may try again after a few days. Settings shows how many songs have been looked up, with a button to forget them all.

Because the collection is written by volunteers, an occasional sheet may be inaccurate or slightly out of time.

## Lyrics that follow the music

Some lyrics include a timestamp at the start of every line. These are called synced lyrics, often in a format known as LRC. With them, the lyrics panel follows the song as it plays, and tapping a line jumps to that point in the song. Lyrics without timestamps are shown as plain text.

Synced lyrics also make two optional extras possible, both in Settings under Lyrics: **Lyrics around the record**, which writes the words around the spinning record as they are sung, and **Lyrics on the lock screen**, which shows the line being sung in your phone’s music controls.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Playing with the screen off',
    summary: 'Background play, lock-screen controls, the sleep timer and more.',
    group: 'How it works',
    body: `A music player has to keep going when you put your phone in your pocket. Here is how Universal Jukebox behaves when it isn’t on screen.

## On a phone

- **iPhone:** the app keeps playing when you lock the phone or switch to another app. The song, artist and cover appear on the lock screen and in Control Centre, with play, pause and skip.
- **Android:** while music plays, the app shows a Now Playing notification with the same controls, which is what lets Android keep it running with the screen off. It stays until the queue ends or you swipe the app away. Headphone and Bluetooth buttons work too.

The app doesn’t take over your phone’s audio. A phone call or another music app pauses it, as you would expect.

## In a browser or on a computer

In a browser, the song usually appears in your computer’s or phone’s media controls, and media keys on a keyboard work. Whether a browser keeps playing in the background, particularly on a phone, is up to the browser. For reliable listening with the screen off, use the iPhone or Android app.

## The sleep timer

**Sleep**, among the round buttons on Now Playing, stops the music for you:

1. Tap it to step through 15, 30, 45 and 60 minutes, and then off.
2. Or press and hold it to choose any length of time, up to 12 hours.
3. Over the last minute the music fades gently, then pauses.

The timer keeps working when the phone is locked.

## Keeping the screen on

If you like to watch the record turn, **Keep awake** stops the screen dimming or locking while Now Playing is open.

## A notification for each song

**Notify me of each new song**, in Settings, shows the song, artist and cover as each new song starts while the app isn’t on screen. Only one is ever shown, replaced by the next, and it makes no sound. It is off until you turn it on, and turning it on is when your device asks for permission.`,
  },
  {
    id: 'privacy',
    title: 'What leaves your device',
    summary: 'Nothing is uploaded — and the three optional lookups, exactly.',
    group: 'Privacy and security',
    body: `Universal Jukebox is built to work entirely on your own device. Your music is never uploaded, no account is needed, and the app works without an internet connection.

## What stays on your device

- **Your music files.** They are read where they are and never copied to a server.
- **Your library catalogue**: titles, artists, albums, small copies of the covers, and any tidy-up corrections.
- **Your settings, your requests and where you left off.** They stay in the app on this device.

None of this is backed up or synced by the app. If you use Jukebox on two devices, each keeps its own library.

## The three lookups

Only three features ever send anything about your music, and none of them does anything until you ask. Each goes straight from your device to the service named, without passing through UNI·SIM, and each sends only what is listed.

- **Lyrics lookup** (off until you turn it on in Settings): sends a song’s artist, title, album and length to lrclib.net, for songs that have no lyrics of their own.
- **About this track** (off until you turn it on, in Settings or in the panel itself): sends the song’s title and the artist’s name to Wikipedia, to show what Wikipedia says about them. Answers are kept on the device for 90 days, and a song with no article is asked about again after a few days.
- **Find a picture**, on a request: sends the words you typed to Apple’s iTunes search, only when you tap it. The picture you choose is saved with the request.

Answers from the first two are kept on your device, so a song is looked up only once. Settings shows how many there are and lets you forget them. No audio ever leaves your device.

## Universal ID

Signing in with a Universal ID is optional. It keeps you signed in across the UNI·SIM apps. While you are signed in, the app records one “opened” event against your account each time it starts. That event says nothing about your music.

## Permissions

The app asks for access only when a feature needs it: a folder you choose, your iPhone’s Music library if you ask to play it, and notifications if you turn them on. You can withdraw any of these in your device’s settings.`,
  },
]

export default articles
