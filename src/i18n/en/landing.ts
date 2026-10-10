// landing strings: the landing page (Landing — "Where is your music?"), choosing
// and scanning a folder (ScanBanner, FolderAccessButton), and the messages the
// app gives while it reads the library — folder permission, an empty or
// unreadable folder, the Music library on an iPhone, the files a scan had to
// skip (libraryStore, scan, appleMusic, nativeFile). English (en-GB) is the
// source; every other language is typed against this file. Keys are
// snake_case; a comment after a key tells the translator where it shows and
// any length limit.
//
// A `{folder}` placeholder is the folder's own name, as it is. A sentence about
// "the browser" or "the app" has one key for each: the Windows app is not a
// browser. A sentence that names the device has one key per device ("phone",
// "iPad"). "On My iPhone", "Settings → Apps → …" and the Finder's folder names
// are Apple's own words: use the names iOS and macOS show in your language.
export default {
  // Heading and intro (Landing)
  'title_native_phone': 'Plays the music on your phone', // the landing page's heading, in the phone app
  'title_native_ipad': 'Plays the music on your iPad', // the same, on an iPad
  'title_desktop': 'Plays the music on your computer', // the same, in the Windows app
  'title_web': 'Plays your whole music library, in your browser', // the same, on the website
  'intro': 'It reads the tags and the real album art out of your own music files and plays them — MP3, M4A, FLAC and WAV. Nothing is uploaded, and you don’t need an account.',
  'find_my_music': 'Find my music', // the big button on the landing page; opens "Where is your music?"
  'where_is_your_music': 'Where is your music?', // the question above the list of answers
  'not_streaming': 'Not a streaming service. It plays files you already have.', // small print at the bottom of the landing page
  'turntable_alt': 'A record on a turntable', // screen reader: the drawing at the top of the landing page
  'copying_progress': 'Copying {done} of {total}…', // phone app, while files are copied into the music folder
  'copying_progress_named': 'Copying {done} of {total} — {name}…', // the same, with the file's name

  // Answer: on this device (Landing)
  'device_title_phone': 'On this phone', // an answer to "Where is your music?"
  'device_title_ipad': 'On this iPad',
  'device_title_device': 'On this device', // in a phone's or tablet's browser
  'device_title_computer': 'On this computer',
  'device_sub_native': 'Music files you’ve copied or downloaded', // the line under the answer, phone app
  'device_sub_web': 'A folder of music files', // the line under the answer, website
  'device_say_own_iphone': 'Put it in the Files app, under On My iPhone → Universal Jukebox — AirDrop it, or drag it across from a computer. Folders are fine.',
  'device_say_own_ipad': 'Put it in the Files app, under On My iPad → Universal Jukebox — AirDrop it, or drag it across from a computer. Folders are fine.',
  'device_say_jukebox_folder': 'Put it in the Universal Jukebox folder in the Files app — folders are fine.',
  'device_say_native': 'Choose the folder your music is in — usually Music. Folders inside it are fine, and the app keeps permission to read it.',
  'device_say_web': 'Choose the folder your music is in — usually Music. Folders inside it are fine.', // followed by one of the remembers_* sentences
  'remembers_desktop': 'The app remembers it, so your library will still be here next time.',
  'remembers_browser': 'This browser can remember the folder, so your library will still be here next time — you’ll just be asked to confirm access once.',
  'remembers_browser_install': 'This browser can remember the folder, so your library will still be here next time — you’ll just be asked to confirm access once. Install it as an app from Chrome’s address bar and it won’t ask even that.',
  'remembers_never': 'This browser can’t remember a folder, so you’ll choose it again each visit. Your library and its artwork are kept, so it comes back instantly.',
  'scan_jukebox_folder': 'Scan the Jukebox folder', // button
  'choose_the_folder': 'Choose the folder', // button: opens the folder picker
  'choose_different_folder': 'Choose a different folder', // link under the button
  'add_songs_one_at_a_time': 'Add songs one at a time', // link under the button: picks single files
  'pick_individual_files': 'Or pick individual files', // link under the button

  // Answer: in my Apple Music library (Landing)
  'apple_ios_title': 'In my Apple Music library', // an answer to "Where is your music?", on an iPhone or iPad
  'apple_ios_sub_phone': 'Songs synced to this phone from a computer',
  'apple_ios_sub_ipad': 'Songs synced to this iPad from a computer',
  'apple_ios_say_phone': 'The songs synced to this phone, as they are in the Music app. Apple Music subscription downloads are protected, and iOS doesn’t let other apps play them.',
  'apple_ios_say_ipad': 'The songs synced to this iPad, as they are in the Music app. Apple Music subscription downloads are protected, and iOS doesn’t let other apps play them.',
  'use_music_library': 'Use my Music library', // button
  'apple_computer_title': 'In my Apple Music or iTunes library', // the same answer, on a computer
  'apple_computer_sub': 'The Music or iTunes app on this computer',
  'apple_computer_say': 'Those songs are files in a folder. Choose your {music} folder, then {media} (or {itunes}). Songs you’ve bought or added yourself will play; Apple Music subscription downloads are protected and can’t.', // {music}, {media}, {itunes} are the three folder names below, in bold
  'apple_folder_music': 'Music', // the Mac's Music folder, as the Finder names it
  'apple_folder_media': 'Music → Media', // folders inside it, as the Finder names them
  'apple_folder_itunes': 'iTunes → iTunes Media', // the older iTunes folders, as the Finder names them

  // Answer: in the cloud (Landing)
  'cloud_title': 'In the cloud', // an answer to "Where is your music?"
  'cloud_sub': 'iCloud Drive, Google Drive, Dropbox, OneDrive…',
  'cloud_say_ios_phone': 'If your cloud shows up in the Files app — iCloud Drive always does — choose your music folder there. If it doesn’t, download the music to this phone first.',
  'cloud_say_ios_ipad': 'If your cloud shows up in the Files app — iCloud Drive always does — choose your music folder there. If it doesn’t, download the music to this iPad first.',
  'cloud_say_android': 'Cloud apps on Android usually can’t share a whole folder, so download the music to this phone first — into Music or Downloads — then choose that folder.',
  'cloud_say_own_folder': 'Download the music to this phone first, then put it in the Universal Jukebox folder in the Files app.',
  'cloud_say_touch': 'Download the music to this device first, then choose the folder it’s in.', // in a phone's or tablet's browser
  'cloud_say_computer': 'If your cloud’s app is installed on this computer, it keeps a folder here — choose your music inside it. If not, download the music first.',

  // Answer: on a streaming service, and the example library (Landing)
  'streaming_title': 'On a streaming service', // an answer to "Where is your music?"
  'streaming_sub': 'Spotify, Apple Music, YouTube Music, Amazon Music…',
  'streaming_sorry': 'Sorry, we can’t help with this one.', // in bold, before streaming_say
  'streaming_say': 'Streaming services lock their songs inside their own apps — even downloaded ones — so no other player can open them. Jukebox plays music files you own: CDs you’ve copied, or albums bought as downloads.',
  'try_example': 'Try the example library', // button
  'cutting_records': 'Cutting the records…', // while the example library is being made
  'example_title': 'I just want to try it', // the last answer: loads the example library at once
  'example_sub': 'Nine made-up records, made on this device — nothing is downloaded',

  // Scanning (ScanBanner)
  'scan_progress_one': '{added} / {count} tracks', // while a folder is read: tracks taken / files looked at so far. English keeps "tracks" for one too
  'scan_progress_other': '{added} / {count} tracks',
  'scan_starting': 'Starting…', // under the count, before the first folder is reached (then the folder's name shows)
  'scan_stop': 'Stop', // small link under the count
  'scan_stop_label': 'Stop reading your folder', // screen reader: the "Stop and…" choice
  'scan_stop_and': 'Stop and…', // then a choice: keep what is read / delete / carry on
  'scan_keep_one': 'Keep {count} track', // button
  'scan_keep_other': 'Keep {count} tracks',
  'scan_keep_read': 'Keep what’s read', // button, before any track is found
  'scan_carry_on': 'Carry on', // button: do not stop after all
  'stopped_early_music_library': 'Stopped early — every song is in your library and plays normally, but some records have no sleeve yet. Refreshing fetches the rest.',
  'stopped_early_folder': 'Stopped early — everything found up to that point is in your library and plays normally. Scanning again reads the whole folder from the start.',
  'fetch_sleeves': 'Fetch the sleeves', // button: read the rest of the album art ("sleeve" = album cover)
  'scan_rest': 'Scan the rest', // button

  // Folder permission (ScanBanner)
  'stranded_heading_one': '{count} folder is still here, but each one has to be reconnected before it can be played.', // only shown for two or more folders
  'stranded_heading_other': '{count} folders are still here, but each one has to be reconnected before it can be played.',
  'stranded_chosen': '{folder} can’t be read right now — it may have been moved or renamed, or access to it withdrawn. Rescanning reads it again, and asks you to choose it if it can’t be found.', // {folder} is in bold
  'stranded_native': '{folder} lists tracks that aren’t in the music folder any more. Rescanning will bring the library back in line with what’s actually there.',
  'stranded_reopen_browser': '{folder} is here, but the browser needs your permission again before it can be read.',
  'stranded_reopen_app': '{folder} is here, but the app needs your permission again before it can be read.',
  'stranded_choose_grouped_browser': '{folder} — this browser can’t reopen a folder on its own, so choose it again. Nothing has to be read twice.', // one of several folders in a list
  'stranded_choose_grouped_app': '{folder} — the app can’t reopen a folder on its own, so choose it again. Nothing has to be read twice.',
  'stranded_choose_browser': '{folder} and its artwork are still here, but this browser can’t reopen a folder on its own — choose it again to play anything from it. It will be quick: nothing has to be read twice.',
  'stranded_choose_app': '{folder} and its artwork are still here, but the app can’t reopen a folder on its own — choose it again to play anything from it. It will be quick: nothing has to be read twice.',
  'start_new_library': 'Start a new library', // link under the folder list
  'start_new_library_title': 'Forget this library and go back to the start', // hover on "Start a new library"
  'forget_library_ask': 'Forget this library and start again? Your music files aren’t touched.',
  'forget_it': 'Forget it', // button: yes, forget the library
  'keep_it': 'Keep it', // button: no, keep it

  // One folder's button (FolderAccessButton)
  'allow_access': 'Allow access', // button, keep it short: gives the browser's permission back
  'choose_folder': 'Choose folder', // button, keep it short: pick the same folder again
  'rescan': 'Rescan', // button, keep it short: read the folder again
  'access_allowed': 'Access allowed', // shown briefly in place of the button, with a tick

  // Files a scan skipped (ScanBanner; the reasons from scan and libraryStore)
  'skipped_heading': 'Some files were skipped',
  'skipped_line': '{label} ({count}) — {why}', // {label} is a file type (".WMA") or a kind of song, in bold; {why} is one of the reasons below
  'refused_wma': 'Windows Media audio — no browser decodes it. Universal Converter can turn it into MP3.', // why .WMA files were skipped
  'refused_m4p': 'This track is protected by DRM and no browser can play it.',
  'refused_m4b': 'An audiobook container — no browser decodes it.',
  'refused_ape': "Monkey's Audio — no browser decodes it. Universal Converter can turn it into FLAC.",
  'refused_wv': 'WavPack — no browser decodes it.',
  'refused_midi': 'MIDI is a score, not a recording — there is no audio in the file to play.',
  'skip_protected_label': 'Apple Music downloads', // a kind of song the Music library import skipped, in bold before skip_protected_why
  'skip_protected_why': 'protected, and iOS doesn’t let other apps play them. Songs synced from your Mac aren’t affected.',
  'skip_icloud_label': 'iCloud-only songs',
  'skip_icloud_why': 'not downloaded to this iPhone. Download them in the Music app, then refresh the Music library.',

  // Folder names the app gives itself (lib/roots shownRootLabel). Kept in
  // English in the saved library; these are how they are shown.
  'root_example_library': 'Example library',
  'root_music_library': 'Music library', // the iPhone's Music app library; also shown while it is read
  'root_chosen_files': 'Chosen files', // songs picked one by one rather than as a folder
  'root_your_music': 'Your music', // songs from an older version of the app with no folder name

  // Reading the Music library (appleMusic) — under the scan count
  'reading_art': 'Reading the album art…',
  'reading_art_count': 'Reading the album art — {done} of {total}',

  // Errors while reading the library (libraryStore) — shown in the banner at the top
  'error_no_access': 'Without access to {folder} its tracks cannot be played. Nothing was lost — the library is still here.',
  'error_cannot_open': '{folder} could not be opened. It may have been moved, renamed, or be on a drive that is no longer connected.',
  'error_choose_again_browser': 'This browser can’t reopen a folder on its own — choose {folder} again to rescan it. Your library and covers are kept, so it will be quick.',
  'error_choose_again_app': 'The app can’t reopen a folder on its own — choose {folder} again to rescan it. Your library and covers are kept, so it will be quick.',
  'error_picker_failed': 'That folder could not be used — the phone would not let the app keep access to it. Try again, or choose a different folder.',
  'error_none_copied': 'None of those files could be copied into the music folder.',
  'error_copy_failed': 'Those files could not be copied into the music folder.',
  'error_native_folder_lost': '{folder} could not be opened — it may have been moved or renamed, or access to it was withdrawn. Choose it again.',
  'error_native_folder_unreadable': 'The music folder could not be read. If the app was just installed, try opening it again.',
  'error_scan_incomplete': 'That folder could not be read all the way through. Anything found before the problem is in the library.',
  'error_nothing_playable_refused': 'Nothing playable in {folder} — checked every file.', // every file was looked at and none could be played
  'error_nothing_playable': 'Nothing playable in {folder} — checked the whole folder.',
  'empty_chosen_folder': 'No music in that folder. Copy albums into it from a computer or with the Files app — Artist/Album/track.mp3 is exactly right — then scan again, or choose a different folder.',
  'empty_own_folder_ios': 'No music in your folder yet. Open the Files app, go to On My iPhone → Universal Jukebox, and copy an album in. Folders are kept, so Artist/Album/track.mp3 is exactly right — then scan again. Or tap “{button}” to pick files here.', // {button} is "Add songs one at a time"
  'empty_own_folder': 'No music in your folder yet. Copy an album into the Universal Jukebox folder in your Files app. Folders are kept, so Artist/Album/track.mp3 is exactly right — then scan again. Or tap “{button}” to pick files here.', // {button} is "Add songs one at a time"

  // The iPhone's Music library (libraryStore)
  'error_music_library_open': 'The Music library could not be opened.',
  'error_music_library_read': 'The Music library could not be read.',
  'error_music_library_restricted': 'Access to the Music library is restricted on this iPhone (Screen Time or a device profile), so Universal Jukebox can’t read it.',
  'error_music_library_denied': 'Universal Jukebox isn’t allowed to read your Music library. Turn it on in Settings → Apps → Universal Jukebox → Media & Apple Music, then try again.', // the path is the iPhone's Settings app, in its own words
  'music_library_empty': 'There are no songs in the Music library on this iPhone. Sync them from your Mac (Finder → your iPhone → Music), then try again.',
  // {total}, {protected} and {cloud} are numbers of songs, any of which can be
  // 1: word it so the sentence works for any number.
  'music_library_unplayable_protected': 'None of the {total} songs in your Music library can be played here: {protected} are Apple Music downloads, which are protected and can’t be played by other apps. Songs synced from your Mac play fine.',
  'music_library_unplayable_cloud': 'None of the {total} songs in your Music library can be played here: {cloud} are in iCloud but not downloaded to this iPhone. Songs synced from your Mac play fine.',
  'music_library_unplayable_both': 'None of the {total} songs in your Music library can be played here: {protected} are Apple Music downloads, which are protected and can’t be played by other apps, and {cloud} are in iCloud but not downloaded to this iPhone. Songs synced from your Mac play fine.',

  // The note the iPhone app leaves in its empty music folder (nativeFile) — a
  // plain text file the person opens in the Files app. Line breaks are optional.
  'readme_title': 'Universal Jukebox — your music goes in this folder.',
  'readme_how': 'Copy albums in here, AirDrop them, unzip them here, or drag them across\nfrom a computer. Folders are fine and are kept — Artist/Album/track.mp3 is\nexactly right.',
  'readme_formats': 'It plays MP3, M4A, FLAC and WAV.',
  'readme_then': 'Then open Universal Jukebox, tap "Find my music", then "On this iPhone" and\n"Scan the Jukebox folder". Anything you add later needs another scan: the\napp cannot tell that a file appeared while it was closed.', // the quoted words are the buttons: use the same words as find_my_music, device_title_phone and scan_jukebox_folder
  'readme_delete': 'This note is not needed for anything and can be deleted.',
} as const
