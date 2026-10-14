// decks strings: the machines (decks) on Now Playing, the deck picker, the
// play modes, and the words that change with the deck. English (en-GB) is the
// source; every other language is typed against this file. Keys are
// snake_case; a comment after a key tells the translator where it shows and
// any length limit. The machines' names follow GLOSSARY.md ▸ The machines.
//
// ⚠️ ONE WHOLE SENTENCE PER MACHINE. The Settings page used to build these
// sentences from fragments — "a different ___ goes on", "Show the
// ___-changing animation", "Mute the ___" — which only works in English
// (gender, articles, case, a lower-cased German noun). So each machine has
// its own copy of every sentence that mentions it, read through `DECKS` in
// `lib/decks.ts`. Translate each one as a sentence in its own right.
export default {
  // ── Each machine, as Tune this app ▸ What you're playing on and the
  // start-up section under it talk about it (lib/decks.ts DECKS) ──

  // Vinyl
  'vinyl_label': 'Vinyl', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'vinyl_hint': 'A record turning at 33⅓ with the album art as its centre label, and a tonearm creeping in towards the middle as the track plays.', // under the name in Tune this app ▸ What you’re playing on
  'vinyl_start_title': 'Putting a record on', // heading of the start-up animation section in Tune this app
  'vinyl_start_note': 'The turntable animation, the countdown, and the sound of the needle landing.', // the line under that heading
  'vinyl_sound_label': 'Needle-drop sound', // the start-up sound’s name
  'vinyl_sound_hint': 'A low thunk and a second of surface noise as the arm lands — putting a record on, changing track, and previewing one. Rides your volume, and never plays on its own.', // what that sound is
  'vinyl_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and cues the arm, and every track change gets the needle put back.', // the “Every track” stop on the animation slider
  'vinyl_album_change_hint': 'Only when a different record goes on. Tracks within one album blend into each other quietly.', // the “When the album changes” stop on the animation slider
  'vinyl_animation_label': 'Show the record-changing animation', // the animation slider’s label
  'vinyl_animation_hint': 'Also how often you hear the needle-drop sound — the two are the same event.', // under that slider
  'vinyl_mute_label': 'Mute the needle-drop sound', // tick box
  'vinyl_volume_label': 'Needle-drop sound volume', // slider label
  'vinyl_volume_off_hint': 'Turn the needle-drop sound on to set how loud it is.', // shown on that slider while the sound is muted
  'vinyl_summary_off': '{mode}, needle-drop sound off', // the closed section’s one-line summary; {mode} is the animation slider’s setting, e.g. “Every track”
  'vinyl_summary_on': '{mode}, needle-drop sound on', // the same summary, sound at its normal level
  'vinyl_summary_at': '{mode}, needle-drop sound at {level}', // the same summary, sound turned up or down; {level} is a step such as “+2”

  // CD (the same places as Vinyl above)
  'cd_label': 'CD', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'cd_hint': 'A portable CD player with the lid open, the disc in its well, and the laser tracking outwards from the middle — the direction a CD is actually read.',
  'cd_start_title': 'Putting a disc in',
  'cd_start_note': 'The disc animation, the countdown, and the sound of it spinning up.',
  'cd_sound_label': 'Disc spin-up sound',
  'cd_sound_hint': 'The lid click and the whirr of a disc coming up to speed — starting a disc, changing track, and previewing one. Rides your volume, and never plays on its own.',
  'cd_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and spins the disc up, and every track change gets the laser put back.',
  'cd_album_change_hint': 'Only when a different disc goes on. Tracks within one album blend into each other quietly.',
  'cd_animation_label': 'Show the disc-changing animation',
  'cd_animation_hint': 'Also how often you hear the disc spin-up sound — the two are the same event.',
  'cd_mute_label': 'Mute the disc spin-up sound',
  'cd_volume_label': 'Disc spin-up sound volume',
  'cd_volume_off_hint': 'Turn the disc spin-up sound on to set how loud it is.',
  'cd_summary_off': '{mode}, disc spin-up sound off',
  'cd_summary_on': '{mode}, disc spin-up sound on',
  'cd_summary_at': '{mode}, disc spin-up sound at {level}',

  // Cassette (the same places as Vinyl above)
  'cassette_label': 'Cassette', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'cassette_hint': 'A personal stereo with the tape spooling from the left reel to the right, so how far through you are is how full the reels are.',
  'cassette_start_title': 'Putting a cassette in',
  'cassette_start_note': 'The cassette animation, the countdown, and the sound of the play key.',
  'cassette_sound_label': 'Play-key sound',
  'cassette_sound_hint': 'The clunk of the play key latching and a moment of tape hiss — putting a cassette in, changing track, and previewing one. Rides your volume, and never plays on its own.',
  'cassette_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and clunks the play key down, and every track change gets the tape head put back.',
  'cassette_album_change_hint': 'Only when a different cassette goes on. Tracks within one album blend into each other quietly.',
  'cassette_animation_label': 'Show the cassette-changing animation',
  'cassette_animation_hint': 'Also how often you hear the play-key sound — the two are the same event.',
  'cassette_mute_label': 'Mute the play-key sound',
  'cassette_volume_label': 'Play-key sound volume',
  'cassette_volume_off_hint': 'Turn the play-key sound on to set how loud it is.',
  'cassette_summary_off': '{mode}, play-key sound off',
  'cassette_summary_on': '{mode}, play-key sound on',
  'cassette_summary_at': '{mode}, play-key sound at {level}',

  // Reel-to-reel (the same places as Vinyl above)
  'reel_label': 'Reel-to-reel', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'reel_hint': 'A tape deck with two open spools and the tape threaded across the heads — the left reel empties onto the right as the track plays, turning faster as it goes.',
  'reel_start_title': 'Threading a reel',
  'reel_start_note': 'The reel-to-reel animation, the countdown, and the sound of the transport engaging.',
  'reel_sound_label': 'Transport sound',
  'reel_sound_hint': 'The solenoid thunk of the transport engaging, the reels taking up the slack, and a breath of tape hiss — threading a reel, changing track, and previewing one. Rides your volume, and never plays on its own.',
  'reel_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and swings the pinch roller up to the capstan, and every track change gets the tape head put back.',
  'reel_album_change_hint': 'Only when a different reel goes on. Tracks within one album blend into each other quietly.',
  'reel_animation_label': 'Show the reel-changing animation',
  'reel_animation_hint': 'Also how often you hear the transport sound — the two are the same event.',
  'reel_mute_label': 'Mute the transport sound',
  'reel_volume_label': 'Transport sound volume',
  'reel_volume_off_hint': 'Turn the transport sound on to set how loud it is.',
  'reel_summary_off': '{mode}, transport sound off',
  'reel_summary_on': '{mode}, transport sound on',
  'reel_summary_at': '{mode}, transport sound at {level}',

  // Jukebox (the same places as Vinyl above)
  'jukebox_label': 'Jukebox', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'jukebox_hint': 'The cabinet the app is named after — the 45 swung out of the rack by the gripper, laid on the platter under the lit arch, and played.',
  'jukebox_start_title': 'Pulling a record from the rack',
  'jukebox_start_note': 'The selection mechanism, the countdown, and the sound of the record being loaded.',
  'jukebox_sound_label': 'Loading-mechanism sound',
  'jukebox_sound_hint': 'The clack of the gripper, the swing of the record across to the platter, and the needle landing on it — selecting a record, changing track, and previewing one. Rides your volume, and never plays on its own.',
  'jukebox_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and sends the gripper out, and every track change gets the needle put back.',
  'jukebox_album_change_hint': 'Only when a different record goes on. Tracks within one album blend into each other quietly.',
  'jukebox_animation_label': 'Show the record-changing animation',
  'jukebox_animation_hint': 'Also how often you hear the loading-mechanism sound — the two are the same event.',
  'jukebox_mute_label': 'Mute the loading-mechanism sound',
  'jukebox_volume_label': 'Loading-mechanism sound volume',
  'jukebox_volume_off_hint': 'Turn the loading-mechanism sound on to set how loud it is.',
  'jukebox_summary_off': '{mode}, loading-mechanism sound off',
  'jukebox_summary_on': '{mode}, loading-mechanism sound on',
  'jukebox_summary_at': '{mode}, loading-mechanism sound at {level}',

  // Pocket player (the same places as Vinyl above)
  'pocket_label': 'Pocket player', // the machine’s name, also the word under the Player button: keep to ~12 characters
  'pocket_hint': 'A pocket music player with the album art on its screen, a click wheel under it, and the progress bar filling as the track plays.',
  'pocket_start_title': 'Picking an album',
  'pocket_start_note': 'The player waking up, the countdown, and the click of the wheel.',
  'pocket_sound_label': 'Click-wheel sound',
  'pocket_sound_hint': 'The tick of the wheel and the centre button pressed — starting an album, changing track, and previewing one. Rides your volume, and never plays on its own.',
  'pocket_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and wakes the screen, and every track change gets the playhead put back.',
  'pocket_album_change_hint': 'Only when a different album goes on. Tracks within one album blend into each other quietly.',
  'pocket_animation_label': 'Show the album-changing animation',
  'pocket_animation_hint': 'Also how often you hear the click-wheel sound — the two are the same event.',
  'pocket_mute_label': 'Mute the click-wheel sound',
  'pocket_volume_label': 'Click-wheel sound volume',
  'pocket_volume_off_hint': 'Turn the click-wheel sound on to set how loud it is.',
  'pocket_summary_off': '{mode}, click-wheel sound off',
  'pocket_summary_on': '{mode}, click-wheel sound on',
  'pocket_summary_at': '{mode}, click-wheel sound at {level}',

  // Automatic (the same places as Vinyl above). Whichever machine the album’s
  // year picks, so these sentences name no one mechanism.
  'automatic_label': 'Automatic', // the option that picks the machine by the album’s year; under a button too, keep to ~12 characters
  'automatic_hint': 'Each album on the machine of its day, by the year on the album — a jukebox for the oldest, then vinyl, cassette, CD and a pocket player. You choose the years each one takes over.',
  'automatic_hint_no_pocket': 'Each album on the machine of its day, by the year on the album — a jukebox for the oldest, then vinyl, cassette and CD. You choose the years each one takes over.',  // the same sentence where there is no pocket player (iPhone and iPad)
  'automatic_start_title': 'Putting something on',
  'automatic_start_note': 'The loading animation, the countdown, and the sound of whichever machine the album belongs to.',
  'automatic_sound_label': 'Start-up sound',
  'automatic_sound_hint': 'The machine starting: a jukebox gripper, a needle landing, a play key, a disc spinning up or a click wheel, depending on the album’s year. Rides your volume, and never plays on its own.',
  'automatic_every_track_hint': 'Any play — a track, an album, a search result — goes to the deck and starts the machine of the album’s day, and every track change gets the pickup put back.',
  'automatic_album_change_hint': 'Only when a different record goes on. Tracks within one album blend into each other quietly.',
  'automatic_animation_label': 'Show the record-changing animation',
  'automatic_animation_hint': 'Also how often you hear the start-up sound — the two are the same event.',
  'automatic_mute_label': 'Mute the start-up sound',
  'automatic_volume_label': 'Start-up sound volume',
  'automatic_volume_off_hint': 'Turn the start-up sound on to set how loud it is.',
  'automatic_summary_off': '{mode}, start-up sound off',
  'automatic_summary_on': '{mode}, start-up sound on',
  'automatic_summary_at': '{mode}, start-up sound at {level}',

  // Shared by every machine
  'mute_hint': 'Tick to go without it. {sound_hint}', // under the “Mute the … sound” tick box; {sound_hint} is the machine’s sound description above, a whole sentence or two

  // ── The deck on Now Playing (Deck.tsx, DeckSwiper.tsx) ──
  'open_album': 'Open album', // the deck is a button that opens its album; also the faint hint under it
  'open_album_named': 'Open {album}', // screen reader: the same button, naming the album
  'peek_previous': 'Previous: {album}', // screen reader: the record peeking in at the left edge, the previous track’s album
  'peek_next': 'Next: {album}', // screen reader: the record peeking in at the right edge, the next track’s album

  // ── The machines' own controls (decks/*.tsx) — screen reader and hover text ──
  'previous_track': 'Previous track', // a button on the pocket player's wheel and the reel-to-reel's keys
  'next_track': 'Next track',
  'scrub_tonearm': 'Tonearm — drag it across the record to move through the song', // vinyl: the arm is a slider
  'scrub_laser': 'Laser — drag it along its rail to move through the song', // CD
  'scrub_cassette': 'Cassette reel — circle it clockwise to wind on through the song, anticlockwise to wind back', // cassette
  'scrub_reel': 'Tape spool — circle it anticlockwise to wind on through the song, clockwise to wind back', // reel-to-reel (the direction really is the other way round from the cassette)
  'scrub_click_wheel': 'Click wheel — go round it clockwise to move on through the song, anticlockwise to go back', // pocket player
  'scrub_position': '{position} of {duration}', // screen reader: where those sliders are, e.g. “1:12 of 3:40”
  'pocket_menu': 'MENU', // printed on the pocket player's click wheel. Stays "MENU" in every language (GLOSSARY)

  // ── The deck picker (DeckPicker.tsx), from a long press on the deck ──
  'picker_title': 'Play on', // heading of the sheet listing the machines; keep short

  // ── The row of round buttons under the song (PlayModes.tsx) ──
  // The buttons' own words come from MODE_LABELS (stores/settingsStore.ts), shared with Tune this app.
  'group_play_order': 'Play order', // screen reader: names the shuffle and repeat buttons as a group
  'group_sound': 'Sound', // screen reader: names the output, quiet and loud buttons as a group
  'group_screen': 'Screen', // screen reader: names the player, keep-awake, sleep and bedside buttons as a group
  'customise': 'Customise', // the word under a button; keep to ~10 characters
  'customise_aria': 'Choose which buttons show here, in Tune this app', // screen reader and hover text for that button
} as const
