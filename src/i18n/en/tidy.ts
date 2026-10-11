// tidy strings: Tidy up library (Tidy.tsx) — missing covers found on the
// person's own disk, and records split in two by inconsistent tags, offered
// as suggestions to tick. English (en-GB) is the source; every other language
// is typed against this file. Keys are snake_case; a comment after a key tells
// the translator where it shows and any length limit.
export default {
  'back_to_library': 'Back to your library',
  'title': 'Tidy up your library', // page heading
  'intro': 'Missing covers found on your own disk, and records that have been split in two by inconsistent tags. Nothing is looked up online and {strong} — this only corrects the library here.', // {strong} is intro_strong, in bold
  'intro_strong': 'your music files are never changed',
  'looking': 'Looking through your library…',
  'covers_access': 'Missing covers are looked for in your music files, which need your folder again.', // above the tidy-up's results on the website, before the button
  'allow_access': 'Allow access', // button: asks the browser for the music folder again, then looks for covers
  'covers_phone': 'On the phone, the tidy-up looks for records split in two. Covers come from your files when they are scanned.', // the tidy-up on iPhone and Android
  'nothing_split': 'Nothing to do — no records look like they have been split in two.',
  'applied_one': 'Done — {count} change applied. They will survive rescanning, because they are stored separately from the library.', // followed by the "Look again" button
  'applied_other': 'Done — {count} changes applied. They will survive rescanning, because they are stored separately from the library.',
  'look_again': 'Look again', // button
  'nothing_to_do_all_art': 'Nothing to do — every album already has its artwork, and no records look like they have been split in two.',
  'nothing_to_do_checked_one': 'Nothing to do — checked {count} album with no artwork and found nothing on disk to use, and no records look like they have been split in two.',
  'nothing_to_do_checked_other': 'Nothing to do — checked {count} albums with no artwork and found nothing on disk to use, and no records look like they have been split in two.',
  'nothing_to_do_note': 'The app only uses artwork that is already in your files or sitting in the folder beside them — it never asks the internet, which is also why it can’t invent a cover that isn’t there.',
  'suggestions_one': '{count} suggestion · {selected} selected', // {selected} is how many are ticked
  'suggestions_other': '{count} suggestions · {selected} selected',
  'select_all': 'Select all',
  'select_none': 'Select none',
  'section_covers': 'Artwork found on your disk ({count})', // section heading, shown in capitals
  'section_merges': 'Records split in two ({count})', // section heading, shown in capitals
  'cover_from_folder': 'Found {file} in the album’s folder.', // {file} is an image's path, e.g. "Abbey Road/cover.jpg"
  'cover_from_track': 'Taken from the artwork already inside {file}.', // {file} is a music file's name
  'move_tracks_into_one': 'Move {count} track into “{title}”', // {title} is the album
  'move_tracks_into_other': 'Move {count} tracks into “{title}”',
  // Why a merge is safe. {folder} is a folder's path; the _root forms are for
  // the top of the music folder the person chose, which has no path of its own.
  'reason_split_artists': 'Same album name, same folder ({folder}), different artist tags.',
  'reason_split_artists_root': 'Same album name, same folder (the chosen folder), different artist tags.',
  'reason_loose_track': 'This track has no album tag, but sits in the same folder ({folder}) as the rest of the record.', // exactly one track
  'reason_loose_track_root': 'This track has no album tag, but sits in the same folder (the chosen folder) as the rest of the record.',
  'reason_loose_tracks': 'These tracks have no album tag, but sit in the same folder ({folder}) as the rest of the record.', // two or more tracks
  'reason_loose_tracks_root': 'These tracks have no album tag, but sit in the same folder (the chosen folder) as the rest of the record.',
  'apply_changes_one': 'Apply {count} change', // button
  'apply_changes_other': 'Apply {count} changes',
  'apply_changes': 'Apply changes', // the button while nothing is ticked
  'files_not_touched': 'Your files are not touched. To undo, forget the library and scan again.',
} as const
