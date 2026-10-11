// native strings: the phone app's own screens (src/native: tabs, lists, album
// and artist pages, the welcome screen, the mini player, the top of the Tune
// tab). English (en-GB) is the source; every other language is typed against
// this file. Keys are snake_case; a comment after a key tells the translator
// where it shows and any length limit.
//
// The phone has room for little: tab names and chips sit side by side on a
// 360px screen, so keep to the length notes. Words the website shares (Back to
// my music, Add a folder, About Universal Jukebox…) are in `app.ts`.
export default {
  // Tabs along the bottom (NativeApp)
  'tab_artists': 'Artists', // tab label under an icon, keep to ~8 characters; also the back button on an artist's page
  'tab_albums': 'Albums', // tab label, keep to ~8 characters; also the back button on an album's page
  'tab_tracks': 'Tracks', // tab label, keep to ~8 characters
  'tab_shelves': 'Shelves', // tab label, keep to ~8 characters: your own shelves of songs
  'tab_tune': 'Tune', // tab label, keep to ~8 characters: short for "Tune this app", the settings; also the back button on About and Tidy up
  'tab_count_found_one': '{count} found', // screen reader: the small number on a tab while searching
  'tab_count_found_other': '{count} found',
  'found_in': 'Results on each tab', // screen reader: the row under the search box with how many artists, albums and tracks match
  'tab_home_artists': 'Artists: the app opens here', // hover on the tab the app opens on ("Artists" is the tab name)
  'tab_home_albums': 'Albums: the app opens here',
  'tab_home_tracks': 'Tracks: the app opens here',
  'tab_home_shelves': 'Shelves: the app opens here',
  'tab_double_tap_artists': 'Double-tap to open the app on Artists', // hover on a tab: a double tap makes it the tab the app opens on
  'tab_double_tap_albums': 'Double-tap to open the app on Albums',
  'tab_double_tap_tracks': 'Double-tap to open the app on Tracks',
  'tab_double_tap_shelves': 'Double-tap to open the app on Shelves',
  'tab_now_home_artists': 'The app now opens on Artists', // screen reader, after a double tap on a tab
  'tab_now_home_albums': 'The app now opens on Albums',
  'tab_now_home_tracks': 'The app now opens on Tracks',
  'tab_now_home_shelves': 'The app now opens on Shelves',

  // The bar along the top (NativeApp)
  'close_record': 'Close the record', // screen reader: the down arrow that leaves Now playing
  'now_playing': 'Now playing', // the top bar's title on the record's own screen
  'tune_title': 'Tune this app', // heading of the Tune tab, and a link on the welcome screen — the suite's name for an app's settings
  'shelves_heading': 'Shelves', // heading of the Shelves tab

  // Library tabs (LibraryScreens)
  'heading_artists': 'Artists', // the screen's big heading
  'heading_albums': 'Albums',
  'heading_tracks': 'Tracks',
  'search_artists': 'Search artists', // placeholder of the search box pulled down from the top
  'search_albums': 'Search albums',
  'search_tracks': 'Search tracks',
  'search_genre_artists': 'Search {genre} artists', // inside one genre; {genre} is its name as tagged ("Blues")
  'search_genre_albums': 'Search {genre} albums',
  'search_genre_tracks': 'Search {genre} tracks',
  'clear_and_close': 'Clear and close', // screen reader: the ✕ in the search box
  'genres_back': 'Genres', // back button from one genre to the list of genres, keep short
  'options_group': 'Play and list options', // screen reader: the row of chips under the search box
  'chip_az': 'A–Z', // chip: the list is in alphabetical order; keep very short
  'chip_random': 'Random', // chip: the list is in a random order; keep short
  'chip_genre': 'Genre', // chip: the list of genres; keep short
  'chip_min': 'Min. {n}', // chip: only those with at least {n} songs; {n} is a number (3); keep very short
  'chip_all_genres': 'All genres', // chip
  'chip_full_albums': 'Full albums', // chip: only albums, not singles
  'chip_all_albums': 'All albums', // chip: singles too
  'chip_all_artists': 'All artists', // chip
  'layout_jukebox': 'Jukebox', // chip: the shelf layout. Stays "Jukebox" in every language (GLOSSARY)
  'layout_list': 'List', // chip: a plain list of rows
  'chip_tap_for': '{now}. Tap for {next}', // screen reader on a chip: {now} and {next} are chip names ("A–Z. Tap for Random")
  'default_set': 'The app now opens with {value}', // shown for a moment after holding a chip: {value} is the chip's name ("Random", "3 per row", "Full albums")
  'hold_hint': 'Hold an option to make it what the app opens with', // small line under the chips until someone has held one; keep short
  'nothing_matches': 'Nothing in your library matches “{query}”.', // {query} is what was typed
  'options_for': 'Options for {title}', // screen reader: the ⋯ on a song's row; {title} is the song
  'stop_preview': 'Stop previewing {title}', // screen reader: the headphones while a preview is playing
  'preview': 'Preview {title}, {run} seconds from {start} seconds in', // screen reader: the headphones; {run} and {start} are numbers of seconds
  'show_more_one': 'Show {count} more', // button under a long list
  'show_more_other': 'Show {count} more',

  // An album's and an artist's page (DetailScreens)
  'search_named': 'Search {name}', // placeholder: search inside one album or artist; {name} is its title or name
  'search_this_album': 'Search this album',
  'album_gone': 'This album isn’t in your library any more.',
  'go_to_record': 'Go to the record', // screen reader: the big cover while that album is already playing
  'play_on_jukebox': 'Play {title} on the jukebox', // screen reader: the big cover; {title} is the album
  'no_album_match': 'No track on this album matches.',
  'artist_gone': 'This artist isn’t in your library any more.',
  'matching_tracks': 'Matching tracks', // small label over the songs while searching
  'all_tracks': 'All tracks', // small label over all of an artist's songs
  'no_artist_match': 'None of their tracks matches.',

  // What's playing, above the tabs (MiniPlayer)
  'mini_open': 'Now playing: {title}. Open the record', // screen reader; {title} is the song
  'next_song': 'Next song', // screen reader: the skip button

  // Top of the Tune tab (TuneExtras)
  'your_music': 'Your music', // section heading (small capitals)
  'your_music_songs_one': 'Your music · {count} song', // the same heading with the library's size
  'your_music_songs_other': 'Your music · {count} songs',
  'keep': 'Keep', // beside Remove, asked before a folder is taken out: keep the folder
  'remove_note': 'Only Jukebox forgets it. The music files stay where they are.', // under the folder list while Remove is being asked
  'rescan_music': 'Rescan my music', // button, when there is one folder
  'refresh_library_phone': 'Refresh my phone’s Music library', // button: re-read the music synced to this phone (Apple's Music app)
  'refresh_library_ipad': 'Refresh my iPad’s Music library',
  'add_library_phone': 'Add my phone’s Music library',
  'add_library_ipad': 'Add my iPad’s Music library',
  'about_and_help': 'About and help', // screen reader: the section's name
  'knowledge_base': 'Knowledge base', // row: opens the help articles
  'about_detail': 'What it plays, what it can’t, and why', // second line under "About Universal Jukebox"

  // First screen, before there is a library (WelcomeScreen)
  'welcome_title': 'Your music, on the turntable',
  'welcome_body': 'Jukebox plays the music already on your phone: a record turning, the words going round it. Nothing is uploaded and there is no account.',
  'copying': 'Copying {done} of {total}: {name}', // while picked songs are copied in; {name} is the file
  'where_is_music': 'Where is your music?', // small label over the list of places
  'way_music_library': 'My Music library', // the songs synced to the phone, in Apple's Music app
  'way_music_library_sub': 'Songs synced to this phone from a computer',
  'way_folder': 'A folder of music',
  'way_folder_sub': 'In Files, iCloud Drive or on a drive you plug in', // "Files" is the iPhone's Files app
  'way_jukebox_folder': 'The Jukebox folder',
  'way_jukebox_folder_sub': 'Files › On My iPhone › Jukebox', // the path in the iPhone's Files app: use the words iOS itself shows in your language
  'way_pick': 'Pick songs',
  'way_pick_sub': 'Choose files one at a time',
  'try_example': 'Try it with the example library', // big button
  'made_up': 'Made-up albums, so you can see every machine before adding your own.', // under that button; the "machines" are the turntables and players
  'cloud_help': 'Music in the cloud or on a streaming service?', // link: opens the help articles
} as const
