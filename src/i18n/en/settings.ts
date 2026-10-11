// settings strings: Tune this app (components/Settings.tsx), its Fine-tune
// crossfade sheet (CrossfadeDialog.tsx), the backup messages (lib/backupIo.ts)
// and the button names under Now Playing (settingsStore's MODE_LABELS).
// English (en-GB) is the source; every other language is typed against this
// file. Keys are snake_case; a comment after a key tells the translator where
// it shows and any length limit.
//
// Section titles show in capitals (CSS), so write them in sentence case. A
// "summary" is the one line a SHUT section shows beside its title, saying what
// it is set to; the parts in lower case are joined with ", " and the first
// letter raised, so write them as list items, not sentences.
//
// ⚠️ The sentences that name the machine ("Show the record-changing
// animation", "Mute the needle-drop sound", the start-up section's summary)
// are in the decks namespace, one key per deck (lib/decks.ts).
export default {
  // Page (Settings)
  'back_to_library': 'Back to your library', // link at the top, wide screens only
  'title': 'Tune this app', // the page heading: the same words as the menu row that opens it
  'intro': 'Everything here is kept on this device, unless you back it up under Backup.',
  'something_wrong': 'Something went wrong.', // an error with no message of its own

  // Your library (section)
  'library_title': 'Your library', // section title
  'library_note': 'Where the app takes you, and what it opens on.',
  'summary_opens_on_artists': 'Opens on Artists', // summary; Artists, Albums, Tracks and Jukebox are the library's tabs
  'summary_opens_on_albums': 'Opens on Albums',
  'summary_opens_on_tracks': 'Opens on Tracks',
  'summary_opens_on_jukebox': 'Opens on Jukebox',
  'open_library_on': 'Open my library on', // a choice of the library's four tabs
  'home_artists': 'Artists', // the library tab, as named on the tab
  'home_albums': 'Albums',
  'home_tracks': 'Tracks',
  'home_jukebox': 'Jukebox', // the library tab's name. Stays "Jukebox" in every language (GLOSSARY)
  'hide_resume': 'Hide “Resume listening”', // tick box; “Resume listening” is the card's title
  'hide_resume_hint': 'Tick to take away the card above your albums, artists and tracks that shows the song you were last playing, on its machine, so you can tap it to carry on where you left off.',
  'hide_most_played': 'Hide the Most played shelf', // tick box; “Most played” is the shelf's name
  'hide_most_played_hint': 'Tick to take away the shelf at the top of Shelves that fills itself with the songs you play most. Plays are counted on this device only.',
  'tidy_up': 'Tidy up library', // row with an Open button
  'trying_example': 'Trying the example library',
  'trying_example_hint': 'Your own music is set aside exactly as it was.',
  'back_to_my_music': 'Back to my music', // button, leaves the example library
  'try_example': 'Try the example library',
  'try_example_hint': 'Nine made-up records to explore. Your own library is set aside, untouched, until you come back.',
  'try_it': 'Try it', // button

  // Backup (section)
  'backup_title': 'Backup', // section title
  'backup_note': 'Keep your music in your own cloud. Back up your shelves, requests and settings here.',
  'summary_backed_up': 'Backed up {when}', // summary; {when} is a date and time
  'summary_backup_none': 'Your music stays on your devices', // summary, when nothing is backed up online
  'your_music': 'Your music',
  'your_music_hint': 'Jukebox never uploads your music, so keep a copy somewhere safe yourself: Proton Drive, iCloud Drive, Google Drive or OneDrive all work. Make the music folder available offline on your phone, then add it from Your complete library in the menu. On a new phone, do the same and restore a backup below to get your shelves back.',
  'backup_blocked_trying': 'Go back to your own music first — the example library is being tried.',
  'backup_blocked_loading': 'Available once your library has loaded.',
  'save_file': 'Save a backup file',
  'save_file_hint': 'Your shelves, requests, settings and any lyrics you added, as one small file. No account needed.',
  'saved_native': 'Saved as {name} in the app’s Documents folder. You can move it from the Files app.', // {name} is the file name; Documents and Files are what the phone calls them
  'saved': 'Saved as {name}.',
  'restore_file': 'Restore from a file', // row with an Open button that picks the file
  'restore_file_hint': 'Puts back the shelves and requests from a backup file, and its settings.',
  'backup_online': 'Back up to your Universal ID',
  'backup_online_hint': 'The same backup, kept with your account and replaced each time you tap Back up. It isn’t end-to-end encrypted: like your account details, UNI·SIM could see it.', // followed by one of the next two
  'last_backed_up': 'Last backed up {when}.',
  'nothing_backed_up': 'Nothing backed up yet.',
  'back_up': 'Back up', // button
  'backup_too_big': 'Your shelves are too big to keep with your account. Save a backup file instead — it has no limit.',
  'backed_up': 'Backed up.',
  'backed_up_except': 'Backed up, except {list}, which didn’t fit. A backup file keeps everything.', // {list} is one or both of the next two
  'left_lyrics_one': '{count} added lyrics', // lyrics the person added to songs
  'left_lyrics_other': '{count} added lyrics',
  'left_pictures_one': '{count} request picture', // pictures attached to requests
  'left_pictures_other': '{count} request pictures',
  'restore_online': 'Restore from your Universal ID',
  'restore_from_when': 'From {when}.', // when the online backup was made
  'restore': 'Restore', // button
  'no_online_backup': 'There’s no backup on your account to restore.',
  'delete_online': 'Delete the online backup', // link
  'deleted_online': 'Your online backup has been deleted. Nothing on this device has changed.',
  'backup_sign_in_hint': 'Sign in to keep a backup with your account, ready for a new phone. Optional: a backup file works without one.',
  'sign_in': 'Sign in', // button
  'restore_confirm_file': 'Restore the backup from the file, made {when}?',
  'restore_confirm_online': 'Restore the backup from your Universal ID, made {when}?',
  'restore_confirm_detail': 'Its settings replace the ones here. Its shelves and requests are added to yours, and nothing you have now is removed. A song only goes back on a shelf if it’s in your library, so restore again after adding more music to bring back the rest.',
  // After a restore: "Settings restored, 12 songs back on your shelves, 2 requests added." — the parts are joined with ", "
  'restored_settings': 'Settings restored',
  'restored_found_one': '{count} song back on your shelves',
  'restored_found_other': '{count} songs back on your shelves',
  'restored_requests_one': '{count} request added',
  'restored_requests_other': '{count} requests added',
  'restored_lyrics_one': 'lyrics for {count} song',
  'restored_lyrics_other': 'lyrics for {count} songs',
  'restored_missing_one': '{count} song isn’t in your library yet: add the music, then restore again to put it back.',
  'restored_missing_other': '{count} songs aren’t in your library yet: add the music, then restore again to put them back.',
  // Backup errors (lib/backupIo.ts)
  'restore_wait_loading': 'Wait for your library to finish loading, then restore.',
  'not_a_backup': 'That file isn’t a Jukebox backup.',
  'not_a_backup_or_newer': 'That file isn’t a Jukebox backup, or it was made by a newer version of the app.',
  'backup_failed': 'Couldn’t back up: {message}', // {message} is the server's own error, in English
  'read_failed': 'Couldn’t read your backup: {message}',
  'delete_failed': 'Couldn’t delete your backup: {message}',

  // What you're playing on (section)
  'deck_title': 'What you’re playing on', // section title
  'deck_note': 'The deck on Now Playing. It changes the picture and the sound it makes starting up — never the music.',
  'deck_choice': 'Deck', // the choice of machine
  // The years each machine takes over, under Automatic
  'eras_note': 'Albums from before {year} go on the jukebox. An album with no year goes on vinyl.',
  'era_vinyl': 'Vinyl from', // beside a year box
  'era_cassette': 'Cassette from',
  'era_cd': 'CD from',
  'era_pocket': 'Pocket player from',

  // The start-up section (its title, note and the rows that name the machine are in the decks namespace)
  // The animation slider's five settings, most often to least
  'ladder_always': 'Every track', // keep short: also shown at the slider's left end
  'ladder_album': 'When the album changes',
  'ladder_artist': 'When the artist changes',
  'ladder_first': 'Once per visit',
  'ladder_off': 'Never', // keep short: also shown at the slider's right end
  'ladder_artist_hint': 'Only when somebody new comes on — a whole discography plays through without interruption.',
  'ladder_first_hint': 'Only the first time you press play after opening the app.',
  'ladder_off_hint': 'Music starts immediately, every time. Tracks on one album still run into each other with no gap — that is the crossfade, not the animation.',
  'no_crossfade': 'No crossfade between records', // tick box
  'no_crossfade_hint': 'Tick and, when the next song is on a different record, the needle lifts, there’s a moment’s silence, and it drops on the next record. Unticked, the two play together while one machine slides out and the next slides in, counting 3, 2, 1 — with the start-up sound as it arrives.',
  'crossfade_timing': 'Crossfade timing',
  'crossfade_timing_hint': '{track} s within a record, {record} s between records, {skip} s when you press Next.', // s = seconds; each number is like 1.8
  'fine_tune': 'Fine-tune…', // button, opens the crossfade sheet
  'sound_volume_hint': '0 is the level it has always been. Drag it to hear it — it still rides your main volume, so turning the music down turns this down with it.',

  // Sound (section)
  'sound_title': 'Sound', // section title
  'sound_note': 'Applied as the music plays. Nothing here changes your files.',
  'original_levels': 'Original sound levels', // tick box
  'original_levels_hint': 'Tick to play every song exactly as loud as it was made. Unticked, loud songs are turned down to meet the rest, so a track doesn’t blast your ears off — each song is measured once, on this device, the first time it plays, and quiet songs are left as they are.',
  'quiet_loud': 'Quiet or loud', // slider
  'quiet_loud_hint': 'Left of centre turns the music down further than the phone’s lowest volume, for listening in bed. Right of centre turns it up; past +10 dB most songs will distort.',
  'no_graph_app': 'The app couldn’t get the audio graph this needs. Everything else still works.', // “audio graph”: the browser's audio processing
  'no_graph_browser': 'This browser wouldn’t give the app the audio graph this needs. Everything else still works.',
  'volume_boost': 'Volume boost', // slider
  'volume_boost_hint': 'Extra gain on top of the volume slider, for quietly-mastered albums. Above about 2× a loud record will start to distort — that is the recording clipping, not a fault.',
  'no_boost_graph_app': 'The app couldn’t get the audio graph a boost needs. Everything else still works.',
  'no_boost_graph_browser': 'This browser wouldn’t give the app the audio graph a boost needs. Everything else still works.',
  'no_boost_iphone': 'Not in the iPhone app — the boost would stop your music playing when the app is in the background.',
  'fade_in': 'Fade in', // slider
  'fade_in_hint': 'Each track rises from silence when it starts.',
  'fade_out': 'Fade out', // slider
  'fade_out_hint': 'Each track falls away before it ends — including the last one of an album. Two tracks of the SAME record already blend into each other; this is for the ends of things.',
  'no_fades_hint': 'This device doesn’t let an app set the playback volume — that belongs to the hardware buttons — so a fade can’t be heard. Tracks change over cleanly instead.',
  // The Sound summary: "Stable volume, quiet −10 dB, boost off, 1.5s fades" — lower-case list items
  'summary_stable': 'stable volume',
  'summary_original': 'original sound levels',
  'summary_quiet': 'quiet {level}', // {level} is like “−10 dB”
  'summary_loud': 'loud {level}', // {level} is like “+5 dB”
  'summary_no_boost_device': 'no boost on this device',
  'summary_boost_off': 'boost off',
  'summary_boost': 'boost {boost}', // {boost} is like “1.5×”
  'summary_no_fades_device': 'no fades on this device',
  'summary_no_fades': 'no fades',
  'summary_fades': '{fade} fades', // fade in and fade out the same length; {fade} is like “1.5s”
  'summary_fade_in': '{fade} fade in',
  'summary_fade_out': '{fade} fade out',
  // The sliders' readings
  'level_down': '−{db} dB', // the Quiet or loud slider, turned down: “−10 dB” (a minus sign)
  'level_up': '+{db} dB',
  'boost_value': '{value}×', // the boost multiplier: “1.5×”
  'fade_value': '{value}s', // a fade length in seconds: “1.5s”, keep short
  'seconds_value': '{value} s', // a length in seconds: “1.8 s”, keep short

  // Buttons under the song (section)
  'buttons_title': 'Buttons under the song', // section title
  'buttons_note': 'Tap a button to show or hide it in the row under Now Playing.',
  'summary_buttons_all': 'All shown', // summary: every button is shown
  'summary_buttons_shown_one': '{count} of {total} shown', // summary: how many of the buttons are shown
  'summary_buttons_shown_other': '{count} of {total} shown',
  // The buttons' names: under each button on Now Playing, and in this section. Keep to ~12 characters
  'mode_shuffle': 'Shuffle',
  'mode_repeat_all': 'Repeat all',
  'mode_repeat_one': 'Repeat one',
  'mode_shelf': 'Add to shelf',
  'mode_about': 'About', // opens About this track
  'mode_output': 'Output', // where the sound goes: speaker, headphones, AirPlay
  'mode_quiet': 'Quiet',
  'mode_loud': 'Loud',
  'mode_player': 'Player', // changes the deck
  'mode_keep_awake': 'Keep awake', // keeps the screen on
  'mode_sleep': 'Sleep', // the sleep timer
  'mode_bedside': 'Bedside', // the bedside clock screen

  // Lyrics (section)
  'lyrics_title': 'Lyrics', // section title
  'lyrics_note': 'Jukebox reads the lyrics your files were tagged with, and a .lrc file saved beside a song under the same name (rescan after adding them). Most files have neither.',
  'lyrics_online': 'Look up missing lyrics online', // tick box
  'lyrics_online_hint': 'When a track has no lyrics of its own, ask lrclib.net for them. This sends that track’s artist, title, album and length — nothing else, and nothing at all while this is off. Answers are kept on this device so each track is only ever asked about once.',
  'lyrics_around': 'Lyrics around the record', // tick box
  'lyrics_around_hint': 'On Now Playing, the words appear around the spinning record as they are sung — in one of three styles, chosen below. Needs lyrics with timings.',
  'lyrics_style': 'Style',
  'style_arc': 'First line, then around the record',
  'style_lines': 'Every line, word by word',
  'style_orbit': 'Turning around the record',
  'style_orbit_hint': 'The whole song written once around the record, turning anti-clockwise so the word being sung is at the top. Lines rise from the bottom, cross the top and go back down the other side, blurring away as they leave. Holds still and shows the arc instead if your device asks for less motion.',
  'lock_lyrics': 'Lyrics on the lock screen', // tick box
  'lock_lyrics_hint': 'While a song plays, the line being sung takes the artist’s place on the lock screen and in the phone’s music controls — the artist comes back between lines. Needs lyrics with timings. With this on, each song’s lyrics are found as it starts, even if you never open them.',
  'lyrics_looked_up_one': '{count} track has been looked up on lrclib.net.',
  'lyrics_looked_up_other': '{count} tracks have been looked up on lrclib.net.',
  'forget_them': 'Forget them', // link: deletes the answers kept on this device
  // The Lyrics summary: "Your files only, around the record, on the lock screen"
  'summary_lyrics_online': 'Your files, then lrclib.net',
  'summary_lyrics_files': 'Your files only',
  'summary_style_arc': 'around the record',
  'summary_style_lines': 'every line on the record',
  'summary_style_orbit': 'turning around the record',
  'summary_lock_screen': 'on the lock screen',

  // About this track (section)
  'about_title': 'About this track', // section title; the same name as the button on Now Playing
  'about_note': 'The story of the song on the deck, and of who’s singing it, from Wikipedia.',
  'about_online': 'Look songs up on Wikipedia', // tick box
  'about_online_hint': 'When you open “About this track” on Now Playing, ask Wikipedia about the song and the artist. This sends the song’s title and the artist’s name — nothing else, and nothing at all while this is off. Answers are kept on this device, so each song is only looked up once.',
  'summary_about_on': 'Looks songs up on Wikipedia', // summary
  'songs_looked_up_one': '{count} song has been looked up on Wikipedia.',
  'songs_looked_up_other': '{count} songs have been looked up on Wikipedia.',

  // Messages (section)
  'messages_title': 'Messages', // section title
  'messages_note': 'What’s playing as each song starts, and whether to hear about things that went wrong.',
  'summary_notify_on': 'a notification for each new song', // summary list item
  'summary_notify_off': 'no song notifications',
  'summary_errors_hidden': 'errors hidden',
  'summary_errors_shown': 'errors shown',
  'notify': 'Notify me of each new song', // tick box
  'notify_hint': 'The song, the artist and the cover, as each song starts — while Jukebox isn’t on screen, since when it is, the song is right in front of you. There’s only ever one: the next song’s takes its place, rather than a pile building up. It makes no sound of its own.',
  'notify_no_support': 'This browser won’t let a web page show notifications. On an iPhone or iPad, add Jukebox to your Home Screen (Share, then Add to Home Screen) and turn this on from there.', // Share and Add to Home Screen: Safari's own words in your language
  'notify_off_native': 'Notifications are off for Jukebox. Turn them on in your phone’s Settings, under Notifications, then come back here.',
  'notify_off_desktop': 'Notifications are off for Universal Jukebox. Turn them on in Windows Settings, under System › Notifications, then come back here.', // Windows' own words in your language
  'notify_blocked_site': 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back here.',
  'show_errors': 'Show error messages', // tick box
  'show_errors_hint': 'Tick to see banners about songs that couldn’t play, folders that couldn’t be opened and files that were skipped. Unticked, songs that can’t play are skipped quietly and nothing is said.',
  'copy_log': 'Copy playback log', // phone apps only
  'copy_log_hint': 'What happened to the music recently: plays, pauses, skips, the lock screen’s buttons and the song titles it was given. It goes only where you paste it.',
  'copy_log_copied_hint': 'Copied. Paste it into your message about what went wrong.',
  'copy': 'Copy', // button
  'copied': 'Copied', // the same button, after copying
  'copy_log_failed': 'This device wouldn’t let the app copy it. Select it all below and copy it yourself.',

  // Appearance (section)
  'appearance_title': 'Appearance', // section title
  'language': 'Language',
  'language_hint': 'The language of Jukebox’s pages, menus and dialogs.',
  'colour_scheme': 'Colour scheme',
  'theme_light': 'Light', // the same words as the menu's App preferences
  'theme_dark': 'Dark',
  'theme_system': 'System',
  'theme_system_hint': 'Matches your device.',
  'follow_global': 'Follow global: {value}', // an option: use the setting chosen for every app; {value} is that setting (“Dark”, “Français”)
  'follow_global_hint': 'Set once for every Universal App under Global Tuning, in the menu when signed in.',
  'summary_following_global': 'Following global: {value}', // summary
  'show_tips': 'Show the tips again',
  'show_tips_hint': 'The “Tap here” pointers you have dismissed come back.', // “Tap here” is the pointers' own words
  'show_tips_none_hint': 'None of the “Tap here” pointers have been dismissed.',
  'show_them': 'Show them', // button

  // Reset to defaults (its link and question are the SDK's)
  'reset_note': 'Puts everything on this page back to its default, with the tab the library opens on and the kind new requests start as. Your library, your requests, the volume and shuffle are left alone.',

  // Fine-tune crossfade (CrossfadeDialog)
  'xf_dialog_label': 'Fine-tune crossfade', // the sheet's name for screen readers
  'xf_title': 'Crossfade',
  'xf_intro': 'How one song hands over to the next. The preview shows the song ending and the song arriving.',
  'xf_preview': 'Preview', // names the row of three buttons below, for screen readers
  'xf_same_record': 'Same record', // preview button and slider label, keep short
  'xf_new_record': 'New record', // preview button and slider label, keep short
  'xf_next_pressed': 'Next pressed', // preview button, keep short
  'xf_same_record_hint': 'Between two songs on one album, at the end of a song.',
  'xf_new_record_hint': 'When the next song is on a different album. Unused if “No crossfade between records” is ticked.', // quotes the tick box's name
  'xf_skip': 'When you press Next',
  'xf_skip_hint': 'Starts the moment you press. A little longer across records.',
  'xf_intro_wait': 'Wait for a quiet opening',
  'xf_intro_wait_hint': 'If the next song starts softly, the ending song keeps playing at full for up to this long, until the music arrives.',
  'xf_outro_skip': 'Skip silence at the end',
  'xf_outro_skip_hint': 'If a song ends on silence, the crossfade starts up to this much earlier so the silence isn’t played.',
  'xf_shape': 'Shape',
  'xf_shape_hint': 'At the end of a song. Pressing Next always brings the next song in at once.',
  'xf_staggered': 'Staggered',
  'xf_staggered_hint': 'The next song waits a moment, then rises as the old one falls. Never both loud at once.',
  'xf_even': 'Even',
  'xf_even_hint': 'Both move together and stay as loud as one song all the way across.',
  'xf_straight': 'Straight',
  'xf_straight_hint': 'A plain straight-line fade. Dips a little in the middle.',
  'xf_iphone_note': 'On iPhone the fades may not be heard yet: the phone ignores the app’s volume changes, so the two songs can overlap at full volume for this long.',
  'xf_reset': 'Reset', // puts the sheet's numbers back
  'xf_seconds_aria': '{value} seconds', // a slider's value read aloud: “1.8 seconds”
  'xf_curve_label': 'A {value} second crossfade', // the picture, for screen readers: “A 1.8 second crossfade”
  'xf_curve_start': 'start', // under the picture, where the blend begins; very short
  'xf_song_ending': 'Song ending', // the picture's legend
  'xf_next_song': 'Next song',
  'xf_note_staggered': 'next song silent for the first {value} s', // beside the legend
  'xf_note_lead_out': 'old song gone after {value} s',
} as const
