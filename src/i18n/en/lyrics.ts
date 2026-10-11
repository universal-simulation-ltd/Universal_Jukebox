// lyrics strings: the lyrics panel under the deck (components/Lyrics.tsx), Sing
// along (components/SingAlong.tsx) and the lrclib.net lookup's messages
// (lib/lrclib.ts). English (en-GB) is the source; every other language is typed
// against this file. Keys are snake_case; a comment after a key tells the
// translator where it shows and any length limit.
//
// The words of a song are never translated — only what the app says about them.
// lrclib.net / LRCLIB, Jukebox and "Tune this app" (the settings page's name)
// stay as they are written here.
export default {
  // The panel's header (Lyrics)
  'heading': 'Lyrics', // the panel's heading, shown in capitals
  'sing_along': 'Sing along', // button over a timed sheet that opens the full-screen sing-along; short, a pill button
  'more_options': 'More lyrics options', // screen reader: the "…" button, closed
  'fewer_options': 'Fewer lyrics options', // screen reader: the "…" button, open
  'more_options_title': 'Replace lyrics, around the record, following', // hover text on "…": lists what is behind it

  // Where the words came from, under the heading. Shown as "From lrclib.net · following along".
  'source_file': 'From this file’s own tags', // the words were saved inside the music file
  'source_upload': 'From your lyrics file', // a lyrics file the person added
  'source_online': 'From lrclib.net', // looked up on lrclib.net
  'following_along': 'following along', // added after the source when the words are timed and follow the song

  // The panel's states
  'looking': 'Looking…', // while the words are being found
  'instrumental': 'lrclib.net has this one down as an instrumental — there are no words to show.',
  'untagged': 'This track has no artist or title in its tags, so there is nothing to look it up by. Naming it in the tidy-up would fix that.', // "the tidy-up" is the app's Tidy page
  'error_fallback': 'That didn’t work.', // a lookup failed with no reason given
  'none_in_file': 'There are no lyrics saved in this file.',
  'none_anywhere': 'No lyrics in this file, and lrclib.net doesn’t have this one either.',
  'offer_online': 'Jukebox can look them up on lrclib.net instead. That sends the track’s artist, title, album and length — nothing else, and nothing at all unless you turn it on.',
  'look_up_online': 'Look them up online', // button: turns the online lookup on
  'more_in_settings': 'More about this in Tune this app', // link to the settings page

  // A timed sheet's lock (chip)
  'following': 'Following', // chip, locked: the sheet follows the song; short
  'free_scroll': 'Free scroll', // chip, unlocked: scroll the sheet by hand; short
  'following_title': 'Following the song — unlock to scroll the lyrics yourself', // hover text, locked
  'free_scroll_title': 'Scrolling freely — lock to follow the song again', // hover text, unlocked

  // Adding or replacing a lyrics file
  'add_file_hint': 'Got the words yourself? A timed .lrc file follows along with the song; plain text shows as the words.',
  'lrcget_link': 'How to get lyrics for your whole library', // link to the help article on LRCGET, in the lyrics panel and in Tune this app ▸ Lyrics
  'add_file': 'Add a lyrics file', // button
  'replace': 'Replace lyrics', // small link: pick a different lyrics file for this song
  'not_lyrics': 'That doesn’t look like lyrics. A plain text file or an .lrc file is what’s needed.',
  'unreadable': 'That file could not be read as text.',

  // "Around the record" chip — the words drawn around the spinning record
  'around': 'Around the record', // chip; short
  'around_on_title': 'The words are around the record — tap to take them off', // hover text, on
  'around_off_title': 'Show the words around the record as they are sung', // hover text, off

  // Sing along (full screen)
  'sing_along_dialog': 'Sing along — {title}', // screen reader name of the full-screen view; {title} is the song's title
  'close_sing_along': 'Close sing along', // screen reader: the × button

  // lrclib.net lookup errors (lib/lrclib.ts), shown in the panel above "Try again"
  'error_offline': 'No connection, so nothing could be looked up.',
  'error_unreachable': 'Couldn’t reach lrclib.net.',
  'error_timeout': 'Couldn’t reach lrclib.net in time.', // the server took too long to answer
  'error_status': 'lrclib.net returned {status}.', // {status} is an HTTP status code, e.g. 503
} as const
