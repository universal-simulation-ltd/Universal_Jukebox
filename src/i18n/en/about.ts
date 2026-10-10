// about strings: "About this track" on Now Playing (components/AboutTrack.tsx,
// lib/aboutTrack.ts) and the About this app page (components/About.tsx).
// English (en-GB) is the source; every other language is typed against this
// file. Keys are snake_case; a comment after a key tells the translator where
// it shows and any length limit.
//
// Wikipedia's own text is never translated — only what the app says around it.
// A `{placeholder}` in a sentence is a link, a button or a bold phrase whose
// own words are a separate key (or a name that stays as it is): move it to
// wherever your sentence needs it.
export default {
  // About this track — the panel (AboutTrack)
  'track_heading': 'About this track', // the panel's heading (shown in capitals), and the screen reader name of its "i" button
  'toggle_label': 'About', // the "i" button's caption, under a round button; very short (about 8 characters)
  'toggle_hide': 'Hide track info', // screen reader / hover: the "i" button while the panel is open
  'from_wikipedia': 'From Wikipedia', // beside the heading once an answer has come back
  'looking': 'Looking this song up…',
  'untagged': 'This track has no artist in its tags, so there’s nothing to look it up by.',
  'none_artist': 'Wikipedia doesn’t seem to have an article about this song, or about {artist}.', // {artist} is the artist's name
  'none_unnamed': 'Wikipedia doesn’t seem to have an article about this song, or about this artist.',
  'song_label': 'The song', // small label (capitals) over the article about the song
  'artist_label': 'The artist', // small label (capitals) over the article about the artist
  'article_more': 'More', // shows the rest of an article's opening
  'article_less': 'Less', // shows just the first paragraphs again
  'read_on_wikipedia': 'Read it on Wikipedia', // link to the full article
  'licence': 'Text from Wikipedia, under {licence}. Found by the song’s title and artist, so now and then it may be about a different song of the same name.', // {licence} is a link reading "CC BY-SA 4.0"
  'offer_what': 'Jukebox can look this song up on Wikipedia: who wrote it, whose song it was first, how it did in the charts, and who’s singing it.',
  'offer_sends': 'That sends the song’s title and the artist’s name to Wikipedia — nothing else, and nothing at all unless you turn it on. Each song is only looked up once.',
  'look_up': 'Look it up on Wikipedia', // button: turns the Wikipedia lookup on
  'more_in_settings': 'More about this in Tune this app', // link to the settings page

  // Wikipedia lookup errors (lib/aboutTrack.ts), shown above "Try again"
  'error_offline': 'No connection, so nothing could be looked up.',
  'error_unreachable': 'Couldn’t reach Wikipedia.',
  'error_status': 'Wikipedia returned {status}.', // {status} is an HTTP status code, e.g. 503

  // About this app — the page (About)
  'app_back': 'Back to your library', // the way back, at the top and the foot of the page
  'app_title': 'A player for the music you already have', // the page's main heading
  'app_intro': 'Universal Jukebox is a music player, and nothing more than that. You point it at a folder on your own device; it reads the tags and the album art out of the files themselves, builds a library you can browse, and plays it.',
  'app_nothing_uploaded': 'Nothing is uploaded.', // in bold, opening the next paragraph
  'app_privacy': '{nothing_uploaded} Not a track, not a cover, not a filename. The reading happens on your own device. Three lookups are the only exceptions, and each waits until you turn it on or tap it: lyrics, About this track and Find a picture send a song’s artist and title, never the music. There is nothing to sign up for. Signing in with a Universal ID is optional: it keeps you signed in across the UNI·SIM apps and tells us the app was opened, and it never sees your music.', // {nothing_uploaded} is "Nothing is uploaded." in bold; "About this track" and "Find a picture" are feature names — use the same words as those features
  'app_not_word': 'not', // the one bold word in the next sentence
  'app_not': 'It is {not} a streaming service and has no catalogue of its own. It cannot find you music you do not already have, and it is not connected to any record label, shop or subscription. If your files are somewhere else, this app cannot reach them.', // {not} is the word "not", in bold for emphasis; if your language's negation is not one word, bold whatever carries it
  'app_plays_heading': 'What it plays',
  'app_plays': 'MP3, M4A/AAC, FLAC, WAV and AIFF — everything a current browser decodes on its own. Ogg and Opus play where the browser supports them, which most do and Safari mostly doesn’t.',
  'app_cant_heading': 'What it can’t play, and why',
  'app_drm_name': 'DRM-protected tracks', // bold, starting the list item below
  'app_drm': '{name} — older iTunes purchases and anything else with a licence attached. No browser can decode these, and no local player can either.', // {name} is "DRM-protected tracks" in bold
  'app_codecs': '{formats} — no browser ships a decoder. {converter} will turn them into something this can play, also without uploading anything.', // {formats} is "WMA, Monkey’s Audio, WavPack" in bold; {converter} is a link reading "Universal Converter" (another app)
  'app_midi': '{midi} — a MIDI file is a score, not a recording. There is no audio in it to play.', // {midi} is "MIDI" in bold
  'app_folder_heading': 'About the folder',
  'app_folder': 'Chrome and Edge can remember which folder you chose, so the library is still there next time behind one confirmation. Firefox and Safari have no way to do that — the permission itself is the thing that cannot be saved — so you pick the folder again each visit. Either way the library and its artwork are kept, so it comes back immediately rather than being rebuilt.',
  'app_turntable_heading': 'The turntable',
  'app_turntable': 'Press play on anything — a track, an album, a search result — and you land on the deck: it spins up, the arm comes down, and the music starts. The needle then works its way in as the track plays, and comes off and back to the outside edge for the next one. Any click or key skips the intro, and you can have it only on a new album, only once a visit, or never at all in {settings}, along with fades and a volume boost for quietly-mastered albums.', // {settings} is a link reading "Tune this app"
  'app_tune_this_app': 'Tune this app', // the settings page's name, as a link — use the same words as the page's own title
  'app_preview': 'The exception is the small headphones button beside every track in your library. That plays ten seconds, taken ten seconds in — enough to know whether it is the one you meant — without moving you off the page or disturbing whatever you already had playing.',
  'app_footer': 'Free and open source, like every Universal App. Built by {unisim} · {source}.', // {unisim} is a link reading "UNI·SIM"; {source} is a link reading "the source on GitHub"
  'app_footer_source': 'the source on GitHub', // link to the app's code
} as const
