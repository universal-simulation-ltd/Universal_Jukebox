// common strings: words used all over the app — the counts, durations and the
// everyday buttons. English (en-GB) is the source; every other language is
// typed against this file. Keys are snake_case; a comment after a key tells the
// translator where it shows and any length limit.
//
// A plural is a stem with one key per form: `songs_one`, `songs_other`. Add
// the forms your language needs (`_few`, `_many`) only if Intl.PluralRules
// returns them for it; `_other` is always the fallback. `{count}` arrives
// already formatted for the language ("1,204" in English).
export default {
  // Counts (lib/format.ts and everywhere a number of things is shown)
  'songs_one': '{count} song',
  'songs_other': '{count} songs',
  'tracks_one': '{count} track', // a track and a song are the same thing; "track" is used for an album's running order
  'tracks_other': '{count} tracks',
  'albums_one': '{count} album',
  'albums_other': '{count} albums',
  'artists_one': '{count} artist',
  'artists_other': '{count} artists',
  'folders_one': '{count} folder',
  'folders_other': '{count} folders',
  'genres_one': '{count} genre',
  'genres_other': '{count} genres',

  // Durations (lib/format.ts totalTime) — short, shown after a track count: "12 tracks · 48 min"
  'duration_min': '{min} min', // minutes, abbreviated
  'duration_hr': '{hr} hr', // hours, abbreviated, for an exact number of hours
  'duration_hr_min': '{hr} hr {min} min', // hours and minutes, abbreviated
  'duration_unknown_suffix': '{time}+', // a total where some tracks' lengths are not yet known: "48 min+"

  // Everyday buttons
  'cancel': 'Cancel',
  'close': 'Close',
  'done': 'Done',
  'ok': 'OK',
  'back': 'Back',
  'play': 'Play',
  'pause': 'Pause',
  'shuffle': 'Shuffle',
  'remove': 'Remove',
  'delete': 'Delete',
  'rename': 'Rename',
  'save': 'Save',
  'open': 'Open',
  'more': 'More',
  'add': 'Add',
  'edit': 'Edit',
  'clear': 'Clear', // empties a search box or a list
  'undo': 'Undo',
  'yes': 'Yes',
  'no': 'No',
  'search': 'Search',
  'try_again': 'Try again',
  'loading': 'Loading…',
  'next': 'Next', // next track
  'previous': 'Previous', // previous track
  'show_more': 'Show more',
  'show_less': 'Show less',
  'on': 'On', // a setting that is switched on, in a short summary
  'off': 'Off', // a setting that is switched off, in a short summary

  // Lists are joined with ` · ` (a middle dot); that needs no translation.
  'unknown_artist': 'Unknown artist', // a track with no artist tag
  'unknown_album': 'Unknown album', // a track with no album tag
  'list_and': '{a} and {b}', // joins two names: "Vinyl and CD"
} as const
