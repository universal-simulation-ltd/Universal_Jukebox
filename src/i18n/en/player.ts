// player strings: Now Playing, the player bar, the queue, the transport, the
// round buttons under the records (Sleep, Keep awake, Quiet, Loud, Output,
// the machine), Bedside, previews and the messages a song that will not play
// leaves behind. English (en-GB) is the source; every other language is typed
// against this file. Keys are snake_case; a comment after a key tells the
// translator where it shows and any length limit.
//
// A plural is a stem with one key per form (`_one`, `_other`), `{count}` in
// every form. Song, album and artist names arrive in `{title}` and are never
// translated; times like "1:23" arrive already formatted.
export default {
  // Now Playing (NowPlaying)
  'nothing_playing': 'Nothing playing.', // Now Playing with no song on
  'pick_an_album': 'Pick an album', // link under "Nothing playing." to the albums
  'cueing_up': 'Cueing up…', // under the 3, 2, 1 countdown before a record starts
  'dont_show_again': 'Don’t show this again', // under the countdown; turns it off
  'changing_records': 'Changing records…', // under the 3, 2, 1 while one record crossfades into the next
  'spec_size_mb': '{size} MB', // file size chip, megabytes: "8.4 MB"
  'spec_track': 'Track {number}', // chip: the track's number on its album, "Track 3"
  'queued_position_one': '{position} of {count} track queued', // desktop, under the transport: "3 of 12 tracks queued"
  'queued_position_other': '{position} of {count} tracks queued',
  'show_lyrics': 'Show the lyric sheet', // button, opens the lyrics as a sheet under the record — named so it isn't taken for the words going round the record (James, 2026-10-11)
  'hide_lyrics': 'Hide the lyric sheet',
  'back_to_library': 'Back to your library', // link above the record (desktop)

  // Transport (StageTransport, PlayerBar)
  'seek': 'Seek', // the progress slider, for screen readers
  'seek_position': '{position} of {duration}', // read by screen readers on the progress slider: "1:23 of 3:07"
  'queue_position_one': '{position} of {count} track', // under the progress slider on a phone: "3 of 12 tracks"; short
  'queue_position_other': '{position} of {count} tracks',
  'skip_intro': 'Skip the intro', // the play button while the 3, 2, 1 countdown runs (screen readers)
  'previous_track': 'Previous track', // transport button (screen readers and hover)
  'next_track': 'Next track',

  // Player bar (PlayerBar)
  'mute': 'Mute',
  'unmute': 'Unmute',
  'volume': 'Volume', // the volume slider, for screen readers
  'volume_on_device': 'Volume is on your device’s buttons', // small, in place of the volume slider; keep to ~35 characters
  'volume_on_device_hint': 'This device doesn’t let an app set the playback volume — that belongs to its own volume buttons.', // hover text on the line above
  'playing_next_show': 'What’s playing next', // queue button on the player bar
  'playing_next_hide': 'Hide what’s playing next',
  'playing_next': 'Playing next', // heading of the small queue popover; shown in capitals
  'shuffle_on': 'Shuffle on', // chip in the popover; keep to ~12 characters
  'shuffle_off': 'Shuffle off',
  'and_more_one': 'and {count} more', // last line of the popover: songs not listed
  'and_more_other': 'and {count} more',

  // Up next (Queue)
  'up_next': 'Up next', // heading of the queue list, shown in capitals; the count follows in brackets
  'hide': 'Hide', // closes the queue list
  'nothing_after': 'Nothing after this one.', // the queue list when the song on is the last
  'play_now': 'Play {title} now', // a song in the queue (screen readers)
  'remove_from_queue': 'Remove {title} from the queue', // the × beside a song in the queue (screen readers)
  'show_more_one': 'Show {count} more', // button under the queue
  'show_more_other': 'Show {count} more',
  'show_all_one': 'Show all {count}', // button under the queue: the whole list
  'show_all_other': 'Show all {count}',

  // Waiting to go on (UpNextReel)
  'waiting_to_go_on': 'Waiting to go on', // heading over the row of records still to play, shown in capitals
  'more_records_aria_one': 'Show the {count} more record in Up next', // the last record in the row (screen readers)
  'more_records_aria_other': 'Show the {count} more records in Up next',
  'more_records_one': '{count} more record', // under the last record in the row; the next line says "in the queue"
  'more_records_other': '{count} more records',
  'in_the_queue': 'in the queue', // second line under the last record, after "3 more records"

  // Sleep timer (SleepButton, lib/sleep.ts)
  'sleep': 'Sleep', // round button's word; keep to ~8 characters
  'sleep_aria_off': 'Sleep timer — tap for 15 minutes, hold to choose a time',
  'sleep_aria_next_one': 'The music stops in {left} — tap for {count} minute, hold to choose', // {left} is a time left, "14 min"
  'sleep_aria_next_other': 'The music stops in {left} — tap for {count} minutes, hold to choose',
  'sleep_aria_to_off': 'The music stops in {left} — tap for off, hold to choose',
  'sleep_left_min': '{min} min', // time left, under the Sleep button: "14 min"; keep short
  'sleep_left_hr_min': '{hr}h {min}', // time left of an hour or more: "1h 05" ({min} is always two digits); keep short
  'sleep_timer': 'Sleep timer', // title of the time picker
  'sleep_fade_note': 'The music fades out over the last minute, then stops.',
  'hours': 'Hours', // the picker's hours list (screen readers)
  'minutes': 'Minutes',
  'picker_hours': '{hours} h', // an option in the hours list: "2 h"
  'picker_minutes': '{minutes} min', // an option in the minutes list: "05 min"
  'preset_min': '{min} min', // quick-choice chip: "30 min"
  'preset_hr': '{hr}h', // quick-choice chip: "2h"
  'preset_hr_min': '{hr}h {min}', // quick-choice chip: "1h 30"
  'turn_off': 'Turn off', // turns a running sleep timer off
  'choose_a_time': 'Choose a time', // the start button while 0 is picked
  'stop_in': 'Stop in {left}', // the start button: "Stop in 2h 15"

  // Keep awake (KeepAwakeButton)
  'keep_awake': 'Keep awake', // round button's word; keep to ~10 characters
  'keep_awake_aria_on': 'The screen stays on while this page is open — tap to let it lock',
  'keep_awake_aria_off': 'Keep the screen on while this page is open',

  // Quiet and Loud (LevelButton) — each tap steps the music 10 dB further down or up
  'level_quiet': 'Quiet', // round button's word; keep to ~8 characters
  'level_loud': 'Loud', // round button's word; keep to ~8 characters
  'level_minus_db': '−{db} dB', // the word under Quiet while it is on: "−20 dB"
  'level_plus_db': '+{db} dB', // the word under Loud while it is on: "+20 dB"
  'level_quiet_aria_off': 'Quiet: off — tap for {db} dB',
  'level_quiet_aria_on_next': 'Quiet: {shown} — tap for {db} dB', // {shown} is "−20 dB"
  'level_quiet_aria_on_off': 'Quiet: {shown} — tap for off',
  'level_loud_aria_off': 'Loud: off — tap for {db} dB',
  'level_loud_aria_on_next': 'Loud: {shown} — tap for {db} dB', // {shown} is "+20 dB"
  'level_loud_aria_on_off': 'Loud: {shown} — tap for off',

  // Output (OutputButton) — opens the phone's or browser's own speaker picker
  'output': 'Output', // round button's word; keep to ~8 characters
  'output_aria_away': 'Sound is going to another device — choose where it comes out',
  'output_aria_here': 'Choose where the sound comes out',

  // The machine (PlayerButton) — {deck} and {next} are machine names: Vinyl, CD, Cassette…
  'player_aria': 'Player: {deck}. Tap for {next}, or hold to choose from them all',

  // Preview (PreviewButton) — a short listen from a song list
  'preview_stop_aria': 'Stop previewing {title}',
  'preview_aria_one': 'Preview {title} — {count} second from {start} seconds in', // {count} and {start} are both 10
  'preview_aria_other': 'Preview {title} — {count} seconds from {start} seconds in',
  'preview_stop_title': 'Stop the preview', // hover text
  'preview_title_one': 'Preview {count} second', // hover text: "Preview 10 seconds"
  'preview_title_other': 'Preview {count} seconds',

  // Bedside (Bedside) — the dimmed clock view for a bedside table
  'bedside': 'Bedside', // round button's word and the view's name; keep to ~8 characters
  'bedside_aria': 'Bedside: the record, the time and the sleep timer, dimmed, with the screen kept on',
  'close_bedside': 'Close bedside',
  'bedside_nothing_playing': 'Nothing playing', // under the clock when no song is on

  // Playback messages (lib/audio.ts, stores/playerStore.ts) — shown in a banner when a song will not play
  'error_cant_decode_browser': 'This browser can\'t decode that file. If it\'s an .m4a it may be Apple Lossless rather than AAC — Universal Converter can turn it into FLAC.',
  'error_cant_decode_app': 'The app can\'t decode that file. If it\'s an .m4a it may be Apple Lossless rather than AAC — Universal Converter can turn it into FLAC.', // the Windows app
  'error_damaged': 'That file looks damaged — the audio stopped partway through decoding.',
  'error_unreadable': 'The file could not be read. If it is on an external drive, check it is still connected.',
  'error_cancelled': 'Playback was cancelled.',
  'error_wont_play': 'That file wouldn\'t play.',
  'error_unreachable': 'That file isn’t reachable any more. If the folder moved or the drive was unplugged, choose the folder again.',
  'error_unreachable_restore': 'That file isn’t reachable any more. Choose the folder again to restore playback.',
  'error_unplayable_iphone': 'That song can’t be played — it isn’t on this iPhone any more, or it’s an Apple Music download, which iOS doesn’t let other apps play.',
  'skipped_not_on_iphone': 'not on this iPhone any more', // why a song was skipped, after its name: "Song · not on this iPhone any more"
  'skipped_file_missing': 'its file is missing', // why a song was skipped, after its name: "Song · its file is missing"
  'foldup_hint': 'Swipe up for more buttons', // a first-run hint at the foot of Now Playing on a phone: the row of round buttons (shuffle, repeat, sleep…) is folded away below and opens with a swipe up; tapping the hint opens it too. Keep short
} as const
