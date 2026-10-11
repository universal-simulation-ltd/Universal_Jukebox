// shelves strings: the record shelves you swipe along (Shelf.tsx), the Jukebox
// tab's shelves — a person's own collections, each a playlist (JukeboxShelves,
// AddToShelf) — and Requests, the reminder list of music to get. English
// (en-GB) is the source; every other language is typed against this file.
// Keys are snake_case; a comment after a key tells the translator where it
// shows and any length limit.
//
// A shelf a person has named shows that name, untranslated; an unnamed one is
// "Shelf 1, 2…" by its place (`shelf_n`), which is never stored.
export default {
  // The swipeable shelf (Shelf.tsx) — screen-reader names for each shelf
  'albums_on_the_shelf': 'Albums on the shelf',
  'artists_on_the_shelf': 'Artists on the shelf',
  'songs_on_the_shelf': 'Songs on the shelf',
  'shelf_n_of_m': 'Shelf {n} of {total}', // screen-reader name of one of several stacked shelves
  'genre_shelf_one': '{genre} — {count} on the shelf', // screen-reader name of a genre's shelf: "Blues — 12 on the shelf"
  'genre_shelf_other': '{genre} — {count} on the shelf',
  // The caption under the record in the middle of the shelf
  'album_caption': '{detail} — tap the record to open it', // {detail} is "artist · year"
  'artist_caption_one': '{count} album — tap the record to open it',
  'artist_caption_other': '{count} albums — tap the record to open it',
  'track_caption_hint': '{artist} — tap to play, hold for options', // shown until the person has held a record once
  // A record's button name for screen readers: {name} is the album, artist or song
  'item_open': 'Open {name}',
  'item_play': 'Play {name}',
  'item_play_from': 'Play from {name}', // plays the shelf starting from this song
  'item_pick': 'Pick {name}', // picks a record to move or take off
  'item_choose': 'Choose {name}', // a request, to show its buttons
  'item_show': 'Show {name}', // a record at the side: brings it to the middle

  // Jukebox tab (JukeboxShelves.tsx)
  'shelf_n': 'Shelf {n}', // an unnamed shelf, by its place: "Shelf 3"
  'jukebox_intro': 'Your jukebox. Tap + to put a song on the shelf — each shelf plays as a playlist.',
  'start_another_shelf': 'Start another shelf',
  'starter_name': 'A few to start with', // the name of the shelf the app fills with five songs the first time, to show what a shelf is
  'starter_hint': 'A shelf is your own playlist. Tap + to add a song, Fine-tune to take these off, or tap the name to rename it.', // under that shelf; “Fine-tune” is the shelf's button
  'most_played': 'Most played', // the shelf that fills itself with the songs played most
  'most_played_empty': 'Songs you play twice or more gather here, the most played first.', // that shelf while nothing has been played twice
  'most_played_remove': 'Remove', // small button on that shelf; short
  'most_played_remove_label': 'Remove the Most played shelf', // screen reader for that button
  'most_played_removed': 'Most played is gone. Bring it back in Tune this app, under Your library.', // said after removing it
  'played_times_one': 'Played once',
  'played_times_other': 'Played {count} times', // under a record on the Most played shelf
  'name_for_shelf': 'Name for {name}', // screen-reader name of the box for renaming a shelf
  'tap_to_rename': 'Tap to rename', // tooltip on a shelf's name
  'shelf_empty': 'empty', // lower case, after the shelf's name where its song count would be
  'fine_tune': 'Fine-tune', // button: rearrange or take records off the shelf; short
  'add_song_to_shelf': 'Add a song to {name}', // screen-reader name of the + tile
  'add_another_song': 'Add another song', // caption under the + tile
  'an_empty_shelf': 'An empty shelf', // caption under the + tile of an empty shelf
  'tap_plus_to_add': 'Tap + to put a song on it',
  'record_caption_editing': '{artist} — tap a record to move it or take it off',
  'record_caption_hint': '{artist} — tap the record to play the shelf from here', // shown until the person has played from a shelf once
  'move_left': '‹ Move left', // keep the arrow on the side it points to
  'move_right': 'Move right ›',
  'take_off': 'Take off', // removes the record from the shelf
  'add_songs_to': 'Add songs to {name}', // heading of the song picker
  'search_your_songs': 'Search your songs',
  'picker_more_one': '{count} more — search to find them', // under a capped list of songs
  'picker_more_other': '{count} more — search to find them',

  // Add to shelf (AddToShelf.tsx) — from a song, an album or Now Playing
  'add_to_shelf': 'Add to shelf', // button; short
  'added_to_shelf': 'Added to shelf', // the button's confirmation; short
  'add_song_title_to_a_shelf': 'Add “{title}” to a shelf', // screen-reader name; {title} is the song
  'add_title_to_a_shelf': 'Add {title} to a shelf', // screen-reader name of the sheet; {title} is the song
  'add_songs_to_a_shelf_one': 'Add {count} song to a shelf',
  'add_songs_to_a_shelf_other': 'Add {count} songs to a shelf',
  'add_to_a_shelf': 'Add to a shelf', // heading of the sheet of shelves
  'new_shelf': 'New shelf…',
  'name_for_new_shelf': 'Name for the new shelf', // screen-reader name of the name box
  'create': 'Create', // makes the new shelf

  // Requests (Requests.tsx) — music to get, ticked off once the library has it
  'requests': 'Requests', // the section's heading
  'your_requests': 'Your requests', // screen-reader name of the section
  'to_add_to_library': 'to add to library', // lower case, after the heading "Requests" when nothing is requested yet
  'n_to_add_to_library_one': '{count} to add to library', // lower case, after the heading "Requests"
  'n_to_add_to_library_other': '{count} to add to library',
  'all_added': 'all added', // lower case, after the heading "Requests"
  'clear_added_one': 'Clear {count} added', // button: removes the ticked requests
  'clear_added_other': 'Clear {count} added',
  'request_plus_label': 'Request a song, album or artist', // screen-reader name of the + tile
  'not_got_yet': 'Not got yet', // button: untick a request
  'got_it': '✓ Got it', // button: tick a request off
  'request_another': 'Request another', // caption under the + tile
  'nothing_requested': 'Nothing requested yet',
  'requests_explainer': 'Use this area to remind yourself to add items to your library at a later date.',
  'request_caption_got': '{what} — in your library ✓', // {what} is "Album · The Beatles"
  'request_caption_to_get': '{what} — tick it once it’s in your library',
  // The kinds of request (the three-way switch, and captions)
  'kind_track': 'Song', // short
  'kind_album': 'Album', // short
  'kind_artist': 'Artist', // short
  'kind_default_track': 'Song — new requests start here', // tooltip on the default kind
  'kind_default_album': 'Album — new requests start here',
  'kind_default_artist': 'Artist — new requests start here',
  'kind_double_tap_track': 'Double-tap to start new requests on Song', // tooltip on the other kinds
  'kind_double_tap_album': 'Double-tap to start new requests on Album',
  'kind_double_tap_artist': 'Double-tap to start new requests on Artist',
  // The Request music dialog
  'request_music': 'Request music', // dialog heading
  'what_to_get': 'What to get', // screen-reader name of the Song / Album / Artist switch
  'double_tap_hint': 'Double-tap one to start there every time — it’s the orange one.',
  'field_song': 'Song', // placeholder of the title box
  'field_album': 'Album',
  'field_artist': 'Artist',
  'field_song_title': 'Song title', // screen-reader name of the title box
  'field_album_title': 'Album title',
  'field_artist_optional': 'Artist (optional)', // placeholder of the second box
  'find_a_picture': 'Find a picture', // button
  'searching': 'Searching…',
  'picture_privacy': 'Finding a picture sends what you typed to Apple’s iTunes Search — nothing else, and only when you tap it. The picture you pick is kept on this device.',
  'no_pictures': 'No pictures found. Try other words, or add it without one.',
  'pick_cover_for_artist': 'Pick one of their covers to stand for them.',
  'error_iphone_browser': 'Apple’s search sends iPhone browsers to the Music app instead of answering, so pictures can’t be found here. They can in the Jukebox app, or on an iPad or computer. You can still add it without one.',
  'error_search': 'The search didn’t get an answer. Check the connection and try again — or add it without a picture.',
  'error_download': 'That picture wouldn’t download. Pick another, or add it without one.',
  'adding': 'Adding…',
  'add_with_picture': 'Add with this picture', // button
  'add_request': 'Add request', // button
} as const
