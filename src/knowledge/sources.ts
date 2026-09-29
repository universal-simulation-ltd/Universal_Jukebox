import type { Source } from './types'

// The research, standards and reports behind each article, keyed by article
// id. The same in every language, so kept once here and attached by index.ts.
//
// Original research papers first, then the standards, then guidance — and
// only sources for what the app really does (checked against src/ on
// 2026-09-29): no decoders of its own, so playback is the device's <audio>
// element; lib/tags.ts reads ID3v2.2–2.4 (APIC/PIC covers, USLT and
// TXXX:LYRICS), FLAC metadata blocks (Vorbis comment + PICTURE), Ogg/Opus
// Vorbis comments and MP4 `ilst` atoms, and never writes any of them;
// lib/fadeCurve.ts shapes crossfades as equal-power (sin/cos) or offset
// curves on the element's volume; lib/lrclib.ts calls lrclib.net/api/get and
// /api/search; lib/aboutTrack.ts calls the MediaWiki Action API
// (en.wikipedia.org/w/api.php); Find a picture calls itunes.apple.com/search.
// Folders come from showDirectoryPicker (File System Access), the catalogue is
// IndexedDB, lock-screen controls are Media Session on the web,
// MPNowPlayingInfoCenter on iPhone and a mediaPlayback foreground service on
// Android (androidx.media, not Media3), and Keep awake is the Screen Wake Lock
// API. There is no gapless/encoder-delay handling (no LAME/iTunSMPB parsing),
// so gapless-MP3 papers are deliberately not cited, and nothing uses loudness
// standards such as ITU-R BS.1770 (Stable volume is a plain gated RMS).
//
// Apple's archived QuickTime File Format pages (where `ilst` is documented)
// now render client-side and could not be verified, so MP4 tags go uncited.
//
// ⚠️ `pdf` (our hosted copy at opensource.unisim.co.uk/kb/papers/) ONLY where
// the licence allows redistribution: here, only RFC 9639 (RFC 6716 has no
// rfc-editor PDF, so it links the HTML). The AES, IBM/Microsoft and DAFx
// documents link to the authors' or a university's free copy instead.

const FLAC_RFC: Source = {
  kind: 'standard',
  title: 'Free Lossless Audio Codec (FLAC) (RFC 9639)',
  authors: 'Martijn van Beurden, Andrew Weaver',
  publisher: 'IETF',
  year: 2024,
  href: 'https://www.rfc-editor.org/rfc/rfc9639.html',
  pdf: 'papers/rfc-9639-flac.pdf',
  licence: 'IETF Trust — RFC, freely redistributable unmodified',
}

const ID3V24_FRAMES: Source = {
  kind: 'standard',
  title: 'ID3 tag version 2.4.0 — Native Frames',
  authors: 'Martin Nilsson',
  publisher: 'id3.org',
  year: 2000,
  href: 'https://id3.org/id3v2.4.0-frames',
}

const LOCAL_FIRST: Source = {
  kind: 'paper',
  title: 'Local-first software: You own your data, in spite of the cloud',
  authors: 'Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan',
  publisher: 'ACM Onward!',
  year: 2019,
  href: 'https://www.inkandswitch.com/local-first/static/local-first.pdf',
}

const LRCLIB: Source = {
  kind: 'guidance',
  title: 'LRCLIB API documentation — the lyrics service the optional lookup asks',
  publisher: 'LRCLIB',
  href: 'https://lrclib.net/docs',
}

export const SOURCES: Record<string, Source[]> = {
  'audio-formats': [
    {
      kind: 'paper',
      title: 'MP3 and AAC explained',
      authors: 'Karlheinz Brandenburg',
      publisher: 'AES 17th International Conference on High-Quality Audio Coding',
      year: 1999,
      href: 'https://www.ee.columbia.edu/~dpwe/papers/Brand99-mp3.pdf',
    },
    FLAC_RFC,
    {
      kind: 'standard',
      title: 'Definition of the Opus Audio Codec (RFC 6716)',
      authors: 'Jean-Marc Valin, Koen Vos, Timothy B. Terriberry',
      publisher: 'IETF',
      year: 2012,
      href: 'https://www.rfc-editor.org/rfc/rfc6716.html',
    },
    {
      kind: 'standard',
      title: 'Multimedia Programming Interface and Data Specifications 1.0 (RIFF and WAVE)',
      authors: 'IBM Corporation, Microsoft Corporation',
      publisher: 'IBM and Microsoft',
      year: 1991,
      href: 'https://mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/Docs/riffmci.pdf',
    },
  ],
  'tags-and-artwork': [
    {
      kind: 'standard',
      title: 'ID3 tag version 2.3.0',
      authors: 'Martin Nilsson',
      publisher: 'id3.org',
      year: 1999,
      href: 'https://id3.org/id3v2.3.0',
    },
    {
      kind: 'standard',
      title: 'Ogg Vorbis I format specification: comment field and header specification',
      publisher: 'Xiph.Org Foundation',
      href: 'https://www.xiph.org/vorbis/doc/v-comment.html',
    },
    { ...FLAC_RFC, title: 'Free Lossless Audio Codec (FLAC) (RFC 9639), §8: file-level metadata, Vorbis comment and picture blocks' },
  ],
  'where-your-music-lives': [
    LOCAL_FIRST,
    {
      kind: 'standard',
      title: 'File System Access (showDirectoryPicker)',
      publisher: 'W3C Web Incubator Community Group',
      href: 'https://wicg.github.io/file-system-access/',
    },
    {
      kind: 'standard',
      title: 'Indexed Database API 3.0',
      publisher: 'W3C',
      href: 'https://www.w3.org/TR/IndexedDB/',
    },
  ],
  'between-songs': [
    {
      kind: 'paper',
      title: 'Signal-Matched Power-Complementary Cross-Fading and Dry-Wet Mixing',
      authors: 'Marco Fink, Martin Holters, Udo Zölzer',
      publisher: 'DAFx',
      year: 2016,
      href: 'https://www.hsu-hh.de/ant/wp-content/uploads/sites/699/2017/10/Fink-Holters-Z%C3%B6lzer-2016-Signal-matched-power-complementary-cross-fading-and-dry-wet-mixing.pdf',
    },
  ],
  'lyrics': [
    { ...ID3V24_FRAMES, title: 'ID3 tag version 2.4.0 — Native Frames, §4.8: Unsynchronised lyrics (USLT)' },
    LRCLIB,
  ],
  'playing-in-the-background': [
    {
      kind: 'standard',
      title: 'Media Session',
      publisher: 'W3C',
      href: 'https://www.w3.org/TR/mediasession/',
    },
    {
      kind: 'standard',
      title: 'Screen Wake Lock API',
      publisher: 'W3C',
      href: 'https://www.w3.org/TR/screen-wake-lock/',
    },
    {
      kind: 'guidance',
      title: 'Configuring your app for media playback',
      publisher: 'Apple Developer Documentation',
      href: 'https://developer.apple.com/documentation/avfoundation/configuring-your-app-for-media-playback',
    },
    {
      kind: 'guidance',
      title: 'Foreground service types (mediaPlayback)',
      publisher: 'Android Developers',
      href: 'https://developer.android.com/develop/background-work/services/fgs/service-types',
    },
  ],
  'privacy': [
    LOCAL_FIRST,
    {
      kind: 'guidance',
      title: 'Principle (c): Data minimisation',
      publisher: 'Information Commissioner\'s Office',
      href: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/',
    },
    {
      kind: 'guidance',
      title: 'MediaWiki Action API — the Wikipedia interface About this track asks',
      publisher: 'Wikimedia Foundation',
      href: 'https://www.mediawiki.org/wiki/API:Main_page',
    },
    {
      kind: 'guidance',
      title: 'iTunes Search API — the search Find a picture asks',
      publisher: 'Apple',
      href: 'https://performance-partners.apple.com/search-api',
    },
  ],
}
