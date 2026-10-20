// library strings: the website's library lists and pages — the Albums, Artists
// and Tracks tabs, the genre list, an album's and an artist's page, the search
// boxes, "Resume listening", the shuffle button, a song's options and "Add to
// queue". English (en-GB) is the source; every other language is typed against
// this file. Keys are snake_case; a comment after a key tells the translator
// where it shows and any length limit.
//
// Several sentences quote a button by its label ("Full albums", "Min. 3",
// A–Z). Use the same words your language's list options use for it.
export default {
  // Empty lists (AlbumGrid, ArtistList, TrackList)
  'nothing_matching': 'Nothing matching “{query}”.', // a search found nothing; {query} is what was typed
  'no_genre_big_enough_one': 'No genre here has {count} song or more, so there is nothing to file. Switch back to A–Z.', // {count} is always 3; "A–Z" is the list order button
  'no_genre_big_enough_other': 'No genre here has {count} songs or more, so there is nothing to file. Switch back to A–Z.',
  'no_full_albums_one': 'No full albums — every album here has fewer than {count} track. Tap “Full albums” to show all albums.', // {count} is always 3
  'no_full_albums_other': 'No full albums — every album here has fewer than {count} tracks. Tap “Full albums” to show all albums.',
  'no_albums_yet': 'No albums yet.',
  'no_artist_matching': 'No artist matching “{query}”.',
  'no_big_artists_one': 'No artist has {count} song or more yet. Tap “Min. {count}” to show all artists.', // {count} is always 3; “Min. 3” is a list option
  'no_big_artists_other': 'No artist has {count} songs or more yet. Tap “Min. {count}” to show all artists.',
  'no_artists_yet': 'No artists yet.',
  'no_tracks_yet': 'No tracks yet.',

  // Genres (GenreHeading, GenreIndex, lib/genres.ts)
  'no_genre': 'No genre', // the genre that holds the songs whose files carry no genre at all; a heading, keep it short
  // The note under a genre-grouped list. {count} songs are hidden; {min} is always 3. Chosen by the
  // number of songs; "one genre" and "{genres} genres" are separate keys.
  'genre_footnote_one_genre_one': '{count} song not shown — one genre has fewer than {min} songs. They are all there in A–Z.',
  'genre_footnote_one_genre_other': '{count} songs not shown — one genre has fewer than {min} songs. They are all there in A–Z.',
  'genre_footnote_genres_one': '{count} song not shown — {genres} genres have fewer than {min} songs. They are all there in A–Z.',
  'genre_footnote_genres_other': '{count} songs not shown — {genres} genres have fewer than {min} songs. They are all there in A–Z.',
  'no_genre_matching': 'No genre matching “{query}”.',
  'no_music_yet': 'No music yet.',
  'no_genre_listed_one': 'No genre here has {count} song or more. Tap “Min. {count}” in the list options to show all genres.', // {count} is always 3
  'no_genre_listed_other': 'No genre here has {count} songs or more. Tap “Min. {count}” in the list options to show all genres.',
  // The note under the genre list. {count} songs in all are left out; {min} is always 3.
  'genre_list_hidden_one_genre_one': 'One genre has fewer than {min} songs ({count} song in all). Tap “Min. {min}” in the list options to show all genres.',
  'genre_list_hidden_one_genre_other': 'One genre has fewer than {min} songs ({count} songs in all). Tap “Min. {min}” in the list options to show all genres.',
  'genre_list_hidden_genres_one': '{genres} genres have fewer than {min} songs ({count} song in all). Tap “Min. {min}” in the list options to show all genres.',
  'genre_list_hidden_genres_other': '{genres} genres have fewer than {min} songs ({count} songs in all). Tap “Min. {min}” in the list options to show all genres.',

  // An album's page (AlbumView)
  'album_not_found': 'That album isn’t in the library.',
  'back_to_albums': 'Back to albums',
  'all_albums': 'All albums', // the back link at the top of an album's page
  'search_album': 'Search {title}', // the search box inside an album's page; {title} is the album's name
  'open_jukebox_album_on': 'Open the jukebox — {title} is on', // the album cover, for a screen reader, while that album is playing
  'play_album_on_deck': 'Play {title} on the deck', // the album cover, for a screen reader
  'click_to_open_jukebox': 'Click to open jukebox', // over the album cover on hover
  'all_albums_by_one': 'All {count} album by {artist}', // a link to the artist's page; only shown for 2 or more
  'all_albums_by_other': 'All {count} albums by {artist}',
  'tracks_matching_one': '{found} of {count} track matching “{query}”', // a search inside an album
  'tracks_matching_other': '{found} of {count} tracks matching “{query}”',
  'find_on_record': 'Find a song on this record', // tooltip on the search button
  'disc_number': 'Disc {number}', // a heading over each disc's tracks on a multi-disc album; shown in capitals
  'nothing_on_record_matching': 'Nothing on this record matching “{query}”.',

  // An artist's page (ArtistView)
  'no_albums_by': 'No albums by {artist} in the library.',
  'back_to_library': 'Back to your library',
  'your_library': 'Your library', // the back link at the top of an artist's page
  'all_songs_by': 'All songs by {artist}', // a page title, and a card on the Artists tab
  'play_all': 'Play all',
  'shuffle_all': 'Shuffle all',
  'their_albums_one': 'Their {count} album ›', // a link from an artist's songs to their albums
  'their_albums_other': 'Their {count} albums ›',

  // The Artists tab (ArtistList)
  'showing_albums_one': 'Showing {count} album — tap to fold up', // under an artist opened in place; one short line
  'showing_albums_other': 'Showing {count} albums — tap to fold up',
  'play_or_shuffle': 'Play or shuffle', // under the “All songs by …” card

  // The Tracks tab (TrackList)
  'showing_first': 'Showing the first {cap} of {total}. Search finds any of them.', // a long list is cut short; {cap} is 400
  'show_all_anyway': 'Show all {count} anyway',
  'unknown': 'Unknown', // a song with neither an artist nor an album tag

  // The search boxes (FindWithin, PhoneSearch)
  'search_your_library': 'Search your library',
  'clear_and_close_search': 'Clear and close the search box', // the X in a search box, for a screen reader
  'clear_and_close': 'Clear and close', // tooltip on the X in a search box

  // Resume listening (ResumeCard)
  'resume_listening': 'Resume listening', // a card naming the last song played; shown in capitals
  'listen_to_this': 'Listen to this', // the card's heading when there is nothing to resume: a song picked at random
  'lyrics_available': 'Lyrics available', // the speech-bubble mark after a song or album name: its words can be shown
  'another': 'Another', // small button on the “Listen to this” card: shows a different random song; short
  'another_song': 'Another song at random', // screen reader and hover for that button
  'hide': 'Hide', // hides the card until the app is next opened
  'dont_show_again': 'Don’t show again',

  // The shuffle button beside the list options (ShuffleLibrary). "These" is a list narrowed by a
  // search, a genre, “Full albums” or “Min. 3”.
  'shuffle_artists_all': 'Shuffle artists — each artist in full, their songs shuffled',
  'shuffle_artists_these': 'Shuffle these artists — each artist in full, their songs shuffled',
  'shuffle_albums_all': 'Shuffle albums — each album in full, in order',
  'shuffle_albums_these': 'Shuffle these albums — each album in full, in order',
  'shuffle_songs_all': 'Shuffle all songs',
  'shuffle_songs_these': 'Shuffle these songs',

  // A song's options, from a tap and hold on its record (TrackOptions)
  'options_for': 'Options for {title}', // the sheet, for a screen reader; {title} is the song's
  'track_length': 'Length {length}', // screen reader: the song's length beside its name in the ⋯ sheet; {length} is like 2:23
  'plays_next': 'Plays next', // confirmation after “Play next”
  'play_now': 'Play now',
  'play_next': 'Play next',
  'add_to_a_shelf': 'Add to a shelf…',
  'go_to_album': 'Go to the album',
  'open_album': 'Open the album', // in the sheet a held album opens
  'go_to_artist': 'Go to {artist}', // the same sheet; {artist} is the album's artist
  'view_albums': 'View their albums', // in the sheet a held artist opens
  'shuffle_album': 'Shuffle the album', // in the sheet a held album opens
  // Remove from Jukebox (RemoveRow, in every long-press sheet; lib/hidden.ts)
  'remove_from_jukebox': 'Remove from Jukebox', // the sheet's last row: hides a song, album or artist from the app without deleting any file
  'remove_confirm': 'Remove {name} from Jukebox?', // the question that row asks first; {name} is the song's, album's or artist's name
  'remove_explain': 'It won’t show or play any more. Nothing is deleted: put it back any time from Tune this app, under Your library.',
  'remove_yes': 'Remove', // button that confirms
  'removed': 'Removed', // confirmation after removing

  // Add to queue (AddToQueue, TrackOptions)
  'add_to_queue': 'Add to queue',
  'add_song_to_queue': 'Add “{title}” to the queue', // for a screen reader; {title} is the song's
  'in_queue_one': '{count} song in queue', // confirmation: how many songs are now waiting to play
  'in_queue_other': '{count} songs in queue',

  // The layout button (lib/libraryView.ts columnsLabel)
  'layout_jukebox': 'Jukebox', // the shelf layout button. Stays "Jukebox" in every language (GLOSSARY)
  'layout_per_row_one': '{count} per row', // tiles across; a button, keep to ~10 characters
  'layout_per_row_other': '{count} per row',
} as const
