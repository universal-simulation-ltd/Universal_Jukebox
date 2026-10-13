// app strings: the website's shell (App.tsx — the library tabs, the list
// options, the footer), the actions menu in the navbar (AppMenu), and the
// banners and notices at the top of every page. Also the few words the phone
// screens share with them. English (en-GB) is the source; every other language
// is typed against this file. Keys are snake_case; a comment after a key tells
// the translator where it shows and any length limit.
//
// A `{placeholder}` that holds a name ({title}, {folder}) is the song's or the
// folder's own name, as it is. A sentence about "the browser" or "the app" has
// one key for each: the Windows app is not a browser.
export default {
  // Library tabs (App)
  'tabs_label': 'Library views', // screen reader: the row of tabs
  'tab_artists': 'Artists', // tab, keep to ~9 characters: all four share one line on a phone
  'tab_albums': 'Albums', // tab, keep to ~9 characters
  'tab_tracks': 'Tracks', // tab, keep to ~9 characters
  'tab_jukebox': 'Jukebox', // tab: your own shelves of songs. Stays "Jukebox" in every language (GLOSSARY)
  'tab_home_artists': 'Artists — the library opens here', // hover on the tab the library opens on
  'tab_home_albums': 'Albums — the library opens here',
  'tab_home_tracks': 'Tracks — the library opens here',
  'tab_home_jukebox': 'Jukebox — the library opens here',
  'tab_double_tap_artists': 'Double-tap to open the library on Artists', // hover on a tab: a double tap makes it the one the library opens on
  'tab_double_tap_albums': 'Double-tap to open the library on Albums',
  'tab_double_tap_tracks': 'Double-tap to open the library on Tracks',
  'tab_double_tap_jukebox': 'Double-tap to open the library on Jukebox',
  'tab_now_home_artists': 'The library now opens on Artists', // screen reader, after a double tap on a tab
  'tab_now_home_albums': 'The library now opens on Albums',
  'tab_now_home_tracks': 'The library now opens on Tracks',
  'tab_now_home_jukebox': 'The library now opens on Jukebox',

  // The list options, behind the icon after the tabs (App)
  'list_options': 'List options', // screen reader and hover: the icon that opens the row of options
  'order_now_az': 'In A to Z order.', // screen reader: what the order pill is on now; followed by one of the "Tap for…" sentences
  'order_now_random': 'In random order.',
  'order_now_genre': 'By genre.',
  'order_tap_az': 'Tap for A to Z', // hover and screen reader: what the order pill changes to
  'order_tap_random': 'Tap for random order',
  'order_tap_genre': 'Tap for the list of genres',
  'pill_az': 'A–Z', // pill: alphabetical order; keep very short
  'pill_random': 'Random', // pill, keep short
  'pill_genre': 'Genre', // pill, keep short
  'pill_min': 'Min. {n}', // pill: only those with at least {n} songs; {n} is a number (3); keep very short
  'pill_all_genres': 'All genres', // pill
  'pill_full_albums': 'Full albums', // pill: only albums, not singles
  'pill_all_albums': 'All albums', // pill: singles too
  'pill_all_artists': 'All artists', // pill
  'pill_jukebox': 'Jukebox', // pill: the shelf of records rather than a list. Stays "Jukebox" in every language (GLOSSARY)
  'pill_list': 'List', // pill: a plain list
  'genres_min_aria_one': 'Genres with {count} or more songs. Tap for all genres', // screen reader: the genre pill while it hides small genres
  'genres_min_aria_other': 'Genres with {count} or more songs. Tap for all genres',
  'genres_all_aria_one': 'All genres. Tap for only those with {count} or more songs',
  'genres_all_aria_other': 'All genres. Tap for only those with {count} or more songs',
  'genres_min_title_one': 'Genres with {count} or more songs — tap for all genres', // hover: the same pill
  'genres_min_title_other': 'Genres with {count} or more songs — tap for all genres',
  'genres_all_title_one': 'Every genre — tap for only those with {count} or more songs',
  'genres_all_title_other': 'Every genre — tap for only those with {count} or more songs',
  'full_albums_aria_one': 'Full albums, {count} or more tracks. Tap for all albums', // screen reader: the albums pill while singles are hidden
  'full_albums_aria_other': 'Full albums, {count} or more tracks. Tap for all albums',
  'all_albums_aria': 'All albums, singles too. Tap for full albums only',
  'full_albums_title_one': 'Albums with {count} or more tracks — tap for all albums', // hover: the same pill
  'full_albums_title_other': 'Albums with {count} or more tracks — tap for all albums',
  'all_albums_title': 'Every album, singles too — tap for full albums only',
  'artists_min_aria_one': 'Artists with {count} or more songs. Tap for all artists', // screen reader: the artists pill while small artists are hidden
  'artists_min_aria_other': 'Artists with {count} or more songs. Tap for all artists',
  'artists_all_aria_one': 'All artists. Tap for only those with {count} or more songs',
  'artists_all_aria_other': 'All artists. Tap for only those with {count} or more songs',
  'artists_min_title_one': 'Artists with {count} or more songs — tap for all artists', // hover: the same pill
  'artists_min_title_other': 'Artists with {count} or more songs — tap for all artists',
  'artists_all_title_one': 'Every artist — tap for only those with {count} or more songs',
  'artists_all_title_other': 'Every artist — tap for only those with {count} or more songs',
  'tracks_jukebox_aria': 'Jukebox. Tap for the list', // screen reader: the tracks layout pill on the shelf
  'tracks_list_aria': 'List. Tap for the jukebox',
  'tracks_layout_title': 'The list, or the shelf of records — tap to change', // hover: the tracks layout pill
  'pill_tap_for': '{now}. Tap for {next}', // screen reader on the layout pill: {now} and {next} are its labels ("3 per row. Tap for 4 per row")
  'columns_title': 'How many albums in a row — tap to change', // hover: the layout pill on Albums and Artists
  'search_library': 'Search your library', // placeholder of the search box
  'search_title': 'Search — or pull down from the top of the page', // hover: the magnifying glass on a phone
  'genres_back': 'Genres', // button back to the list of genres, after a ‹

  // Now playing on a very narrow window (App)
  'mini_stage_note': 'The player is at the bottom of the screen.',
  'back_to_library': 'Back to your library',

  // Footer (App)
  'footer_with_love': 'With {heart} from {site}', // {heart} is a ♥ (read out as the next key), {site} the link "UNISIM.co.uk"
  'footer_love': 'love', // what a screen reader says for the ♥
  'github_label': 'Universal Jukebox on GitHub', // screen reader: the GitHub link
  'github_title': 'View source on GitHub', // hover: the same link

  // Actions menu in the navbar (AppMenu); the phone's Tune tab shares some rows
  'menu_home': 'Jukebox Library', // first row: back to the library from anywhere
  'back_to_my_music': 'Back to my music', // button: leave the example library
  'leave_example': 'Leave the example library', // second line under it
  'back_to_my_music_title': 'Puts your own library back, exactly as you left it', // hover
  'complete_library': 'Your complete library', // row that opens to show the folders
  'remove_folder_title': 'Takes it out of Jukebox — the music files themselves stay where they are', // hover: Remove beside a folder
  'add_tracks_menu': 'Add tracks…', // menu row
  'add_tracks_title': 'Copies the songs you pick into the Universal Jukebox folder', // hover
  'add_folder_menu': 'Add a folder…', // menu row
  'add_folder_title': 'Adds a folder to your library — the ones you already have stay', // hover
  'add_tracks': 'Add tracks', // button on the phone's Tune tab
  'add_folder': 'Add a folder', // button on the phone's Tune tab
  'rescan_folders': 'Rescan my folders', // menu row or button, when there are several folders
  'rescan_folder': 'Rescan my music folder', // menu row, when there is one
  'rescan_title': 'Picks up anything added or changed since the last scan', // hover
  'music_library_title': 'The songs synced to this iPhone from your computer, as they are in the Music app', // hover: the Music Library row
  'refresh_library_phone': 'Refresh my phone’s Music Library', // menu row: re-read the music synced to this phone (Apple's Music app)
  'refresh_library_ipad': 'Refresh my iPad’s Music Library',
  'add_library_phone': 'Add my phone’s Music Library…',
  'add_library_ipad': 'Add my iPad’s Music Library…',
  'tune_menu': 'Tune this app…', // menu row: opens the settings (the suite's name for them)
  'advanced': 'Advanced', // menu row that opens a short submenu
  'about_jukebox': 'About Universal Jukebox', // menu row / phone Tune row
  'knowledge_base_menu': 'Knowledge base…', // menu row: opens the help articles
  'knowledge_base_detail': 'How music files, lyrics and background play work', // hover on that row; second line on the phone

  // Error banner at the top of the page (ErrorBanner)
  'play_it': 'Play it', // button: play the song whose folder is back
  'dismiss': 'Dismiss', // button: hide the banner
  'missing_music_library': '“{title}” can’t be played. It’s no longer in the Music library on this iPhone, or it’s an Apple Music download — those are protected, and iOS doesn’t let other apps play them. Refreshing the Music library from the menu brings the list up to date.', // {title} is the song
  'missing_back': '{folder} is back, and “{title}” with it.', // {folder} is the folder's name, {title} the song
  'missing_reopen_browser': '“{title}” is in {folder}, and the browser needs your permission again before anything in that folder can play. Nothing was lost.',
  'missing_reopen_app': '“{title}” is in {folder}, and the app needs your permission again before anything in that folder can play. Nothing was lost.', // in the Windows app
  'missing_choose_browser': '“{title}” is in {folder}, which this browser can’t reopen on its own — choose the folder again and it will play. Nothing has to be read twice.',
  'missing_choose_app': '“{title}” is in {folder}, which the app can’t reopen on its own — choose the folder again and it will play. Nothing has to be read twice.', // in the Windows app
  'missing_rescan': '“{title}” is listed under {folder}, but nothing in that folder can be found any more. Rescanning brings the library back in line with what’s there.',
  'missing_gone': '“{title}” isn’t in {folder} any more — it was moved, renamed or deleted since the folder was last read. Everything else in {folder} still plays.',

  // Skipped tracks banner (SkippedBanner)
  'skipped_one': '{count} track couldn’t play and was skipped', // tap it for the list
  'skipped_other': '{count} tracks couldn’t play and were skipped',
  'skipped_hide': 'Hide', // small, after the line above, while the list is open
  'skipped_more': 'Tell me more', // small, after the line above
  'skipped_explain': 'The music carried on with the next track. A song that has gone from the iPhone’s Music library, or a file that was moved or deleted, can’t be played — rescan from Actions, or choose the folder again.', // "Actions" is the menu's name in the navbar

  // Example library notice (ExampleNotice)
  'trying_lead': 'You’re trying the example library.', // bold
  'trying_body': 'Your own music is set aside exactly as it was, and nothing you do here is saved to it.',
  'example_label': 'Example library', // bold label
  'example_body': 'Four made-up artists, with music and sleeves generated on this device. To play your own music instead, add it and this steps aside.',
  'use_own_music': 'Use my own music', // link

  // Try the example library? (TryExampleDialog)
  'try_title': 'Try the example library?',
  'try_intro': 'Nine records by four artists that don’t exist — the music and the sleeves are both made on this device. Nothing is downloaded.',
  'try_safe': '{lead} It is set aside exactly as it is, and nothing you do in the example — shelves, what you play — is saved to it.', // {lead} is the next key, in bold
  'try_safe_lead': 'Your library stays safe.',
  'try_stops': '{lead} When you come back, “Resume listening” carries on from the same second.', // {lead} is the next key, in bold; “Resume listening” is the card's title in the library
  'try_stops_lead': 'What’s playing stops.',
  'try_back': '{lead} press “Back to my music” at the top of the page, or in the menu. Closing the app brings you back too.', // {lead} is the next key, in bold; “Back to my music” must match that button
  'try_back_lead': 'To come back,',
  'try_it': 'Try it', // button
  'cutting_records': 'Cutting the records…', // while the example library is being made (also on the phone's first screen)

  // Small pieces used everywhere
  'back_to_top': 'Back to the top', // screen reader and hover: the floating up arrow (ScrollTopButton)
  'tip_tap_here': 'Tap here', // first-run tip bubble (Tip), over one of the next lines
  'tip_cover': 'to open the jukebox', // the tip's second line, on an album cover
  'tip_record': 'to see the album', // the tip's second line, on the turning record
  'tip_record_queue': 'to see what’s up next', // the phone app's version: tapping the record opens the queue
  'tip_pull_down': 'Pull down for search and shuffle', // first-run hint at the top of Artists, Albums and Tracks on a phone: the search box and options fold away above the list until you pull down. Keep short
  'voice_not_found': 'Nothing called “{asked}” in your library.', // after "Hey Google, play … on Jukebox" found nothing; {asked} is what was said
} as const
