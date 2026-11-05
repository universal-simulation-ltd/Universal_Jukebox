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
  'tab_set_default': 'Set as default', // bubble over a held tab: makes it the tab the app opens on
  'tab_is_default': 'The app opens here', // the same bubble, on the tab it already opens on
  'tab_bin_hint': 'Drop here to hide', // the bin that rises over the tab bar while a tab is held (2026-11-02, a suite rule)
  'tab_bin_drop': 'Let go to hide', // the same, with the finger over it
  'tab_binned': 'Tab hidden: {tab}. Bring it back in {tune}.', // toast after a tab is dropped on the bin; {tab} is its name, {tune} the Tune tab's name; has Undo
  'tabs_title': 'Tabs', // Tune this app ▸ Your library: the phone's tab order list
  'tabs_note': 'Hold a tab in the bar and drag it to move it, or drop it on the bin to hide it. {tune} stays last.', // under it
  'tab_up': 'Move {name} up', // button, screen reader
  'tab_down': 'Move {name} down', // button, screen reader
  'tab_hide': 'Hide', // tick box on each tab's row
  'tab_now_home_albums': 'The app now opens on Albums',
  'tab_now_home_tracks': 'The app now opens on Tracks',
  'tab_now_home_shelves': 'The app now opens on Shelves',

  // The bar along the top (NativeApp)
  'close_record': 'Close the record', // screen reader: the down arrow that leaves Now playing
  'now_playing': 'Now playing', // the top bar's title on the record's own screen
  'tune_title': 'Tune this app', // heading of the Tune tab — the suite's name for an app's settings
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
  'discography': 'Discography', // the first card on an artist’s shelf, standing for all their albums
  'play_discography': 'Play everything by {name}', // screen reader: that card; {name} is the artist
  'no_artist_match': 'None of their tracks matches.',

  // What's playing, above the tabs (MiniPlayer)
  'mini_open': 'Now playing: {title}. Open the record', // screen reader; {title} is the song
  'next_song': 'Next song', // screen reader: the skip button

  // Top of the Tune tab (TuneExtras)
  'your_music': 'Your music', // section heading (small capitals)
  'your_music_songs_one': 'Your music · {count} song', // the same heading with the library's size
  'your_music_songs_other': 'Your music · {count} songs',
  'tap_to_confirm': 'Tap to confirm', // the Remove button after one tap: a second tap removes the folder; short
  'remove_note': 'Only Jukebox forgets it. The music files stay where they are.', // under the folder list while Remove is being asked
  'rescan_music': 'Rescan my music', // button, when there is one folder
  'refresh_music': 'Refresh my music', // button: reads the folders AND the phone's Music library again, when there are both
  'refresh_library_phone': 'Refresh my phone’s Music library', // button: re-read the music synced to this phone (Apple's Music app)
  'refresh_library_ipad': 'Refresh my iPad’s Music library',
  'add_library_phone': 'Add my phone’s Music library',
  'add_library_ipad': 'Add my iPad’s Music library',
  'about_and_help': 'About and help', // screen reader: the section's name
  'knowledge_base': 'Knowledge base', // row: opens the help articles
  'help_sources': 'Sources', // heading over the papers and standards a help article draws on
  'help_missing': 'This article isn’t in the knowledge base any more.', // a help page opened from an old link
  'about_detail': 'What it plays, what it can’t, and why', // second line under "About Universal Jukebox"

  // First screen, before there is a library (WelcomeScreen)
  'welcome_title': 'Your music, on the turntable',
  'welcome_body': 'Jukebox plays the music already on your phone: a record turning, the words going round it. Nothing is uploaded and there is no account.',
  'copying': 'Copying {done} of {total}: {name}', // while picked songs are copied in; {name} is the file
  'where_is_music': 'Where is your music?', // small label over the list of places
  'way_music_library': 'My Apple Music library', // the songs synced to the phone, in Apple's Music app (not Apple Music streaming downloads — the second line says so)
  'way_music_library_sub': 'Songs synced to this phone from a computer',
  'way_folder': 'A folder of music',
  'way_folder_sub': 'In Files, iCloud Drive or on a drive you plug in', // "Files" is the iPhone's Files app
  'way_folder_sub_android': 'On this phone, an SD card or a USB drive', // Android's line under "A folder of music": no Files app or iCloud there
  'way_pick': 'Pick songs',
  'way_pick_sub': 'Choose files one at a time',
  'use_own_music': 'Use your own music', // row in Tune while the example library is loaded (shown lit up, with a red dot on the Tune tab)
  'use_own_music_sub': 'Replaces the example library', // second line under it
  'try_example': 'Try it with the example library', // big button
  'made_up': 'Made-up albums, so you can see every machine before adding your own.', // under that button; the "machines" are the turntables and players
  'cloud_help_title': 'Streaming services', // row title in Tune ▸ About & help; the question below it is cloud_help
  'cloud_help': 'Why can’t I sync it with a streaming service?', // the line under cloud_help_title; the row opens the help article on music in the cloud and on streaming services; 'it' = the app
  // The Mix tab (MixScreen): two turntables and a crossfader
  'tab_mix': 'Mix', // tab label, keep to ~8 characters: the two-turntable mixing screen
  'tab_home_mix': 'Mix: the app opens here',
  'tab_double_tap_mix': 'Double-tap to open the app on Mix',
  'tab_now_home_mix': 'The app now opens on Mix',
  'mix_heading': 'Mix', // heading of the Mix tab
  'mix_hint': 'Two records at once. Hold one to stop it and turn it to scratch or find your spot; turn the edge of a playing record to nudge it faster or slower.', // under the heading
  'mix_unsupported': 'Mixing needs a newer system: this one can’t play two records under your fingers.', // when the device's browser engine lacks what mixing needs
  'mix_deck': 'Deck {deck}', // {deck} is A or B
  'mix_choose': 'Choose a record', // inside the empty turntable, under the deck letter
  'mix_empty': 'No record yet', // under "Deck A" while nothing is on it
  'mix_loading': 'Loading…', // over the record while the song is read in
  'mix_unplayable': 'This song can’t be mixed', // over the record when the file can't be opened
  'mix_too_long': 'Longer than {minutes} minutes: too long to mix', // over the record
  'mix_record_aria': '{title}, on the turntable. Hold and turn to scratch.', // screen reader: the record
  'mix_clear': 'Take the record off deck {deck}', // screen reader: the ✕ beside the song name
  'mix_play': 'Play deck {deck}',
  'mix_pause': 'Stop deck {deck}',
  'mix_speed': 'Speed of deck {deck}', // screen reader: the speed slider
  'mix_speed_reset': 'Back to normal speed', // hover on the speed readout ("+3.2%")
  'mix_crossfader': 'Crossfader: deck A to deck B', // screen reader: the slider between the decks
  'mix_pick_title': 'A record for deck {deck}', // title of the song picker
  'mix_search': 'Search songs', // placeholder of the picker's search box
  'mix_more': '{count} more: type to narrow it down', // under the picker's list when it is cut short
  'mix_none': 'No songs match', // the picker, when nothing matches the search
  'mix_rec_start': 'Record the mix', // the button under the crossfader
  'mix_rec_stop': 'Stop and save', // the same button while recording; the running time sits beside it
  'mix_rec_saving': 'Saving…',
  'mix_rec_hint': 'Records what you hear, up to {minutes} minutes, as a new song on the Mixes album.', // under the Record button
  'mix_rec_saved': 'Saved “{title}” to the Mixes album.',
  'mix_rec_short': 'Too short to keep: record for at least a second.',
  'mix_rec_failed': 'The recording couldn’t be saved.',
  'mix_rec_album': 'Mixes', // album (and artist) name every recording is saved under
  'mix_rec_untitled': 'Mix, {when}', // a recording's title when no song was played into it; {when} is a date and time
} as const
