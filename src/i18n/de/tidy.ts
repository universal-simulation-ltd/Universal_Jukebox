// German (de) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Zurück zur Mediathek',
  'title': 'Mediathek aufräumen',
  'intro': 'Fehlende Cover, die auf deinem eigenen Laufwerk gefunden wurden, und Platten, die durch uneinheitliche Tags in zwei geteilt sind. Es wird nichts online nachgeschlagen, und {strong} – das hier korrigiert nur die Mediathek in der App.',
  'intro_strong': 'deine Musikdateien werden nie verändert',
  'looking': 'Deine Mediathek wird durchgesehen …',
  'covers_access': 'Fehlende Cover werden in deinen Musikdateien gesucht, dafür braucht es deinen Ordner erneut.',
  'allow_access': 'Zugriff erlauben',
  'covers_phone': 'Auf dem Telefon sucht das Aufräumen nach zweigeteilten Platten. Cover kommen beim Einlesen aus deinen Dateien.',
  'nothing_split': 'Nichts zu tun – keine Platte scheint in zwei geteilt zu sein.',
  'applied_one': 'Fertig – {count} Änderung übernommen. Sie bleibt auch beim neuen Einlesen erhalten, weil sie getrennt von der Mediathek gespeichert ist.',
  'applied_other': 'Fertig – {count} Änderungen übernommen. Sie bleiben auch beim neuen Einlesen erhalten, weil sie getrennt von der Mediathek gespeichert sind.',
  'look_again': 'Noch einmal suchen',
  'nothing_to_do_all_art': 'Nichts zu tun – jedes Album hat schon sein Cover, und keine Platte sieht aus, als wäre sie in zwei geteilt.',
  'nothing_to_do_checked_one': 'Nichts zu tun – {count} Album ohne Cover wurde geprüft, aber auf dem Laufwerk fand sich nichts Brauchbares, und keine Platte sieht aus, als wäre sie in zwei geteilt.',
  'nothing_to_do_checked_other': 'Nichts zu tun – {count} Alben ohne Cover wurden geprüft, aber auf dem Laufwerk fand sich nichts Brauchbares, und keine Platte sieht aus, als wäre sie in zwei geteilt.',
  'nothing_to_do_note': 'Die App verwendet nur Cover, die schon in deinen Dateien stecken oder im Ordner daneben liegen – sie fragt nie das Internet, und deshalb kann sie auch kein Cover erfinden, das es nicht gibt.',
  'suggestions_one': '{count} Vorschlag · {selected} ausgewählt',
  'suggestions_other': '{count} Vorschläge · {selected} ausgewählt',
  'select_all': 'Alle auswählen',
  'select_none': 'Keine auswählen',
  'section_covers': 'Cover auf deinem Laufwerk gefunden ({count})',
  'section_merges': 'In zwei geteilte Platten ({count})',
  'cover_from_folder': '{file} im Ordner des Albums gefunden.',
  'cover_from_track': 'Aus dem Cover übernommen, das schon in {file} steckt.',
  'move_tracks_into_one': '{count} Titel nach „{title}“ verschieben',
  'move_tracks_into_other': '{count} Titel nach „{title}“ verschieben',
  'reason_split_artists': 'Gleicher Albumname, gleicher Ordner ({folder}), unterschiedliche Interpreten-Tags.',
  'reason_split_artists_root': 'Gleicher Albumname, gleicher Ordner (der ausgewählte Ordner), unterschiedliche Interpreten-Tags.',
  'reason_loose_track': 'Dieser Titel hat keinen Album-Tag, liegt aber im selben Ordner ({folder}) wie der Rest der Platte.',
  'reason_loose_track_root': 'Dieser Titel hat keinen Album-Tag, liegt aber im selben Ordner (dem ausgewählten Ordner) wie der Rest der Platte.',
  'reason_loose_tracks': 'Diese Titel haben keinen Album-Tag, liegen aber im selben Ordner ({folder}) wie der Rest der Platte.',
  'reason_loose_tracks_root': 'Diese Titel haben keinen Album-Tag, liegen aber im selben Ordner (dem ausgewählten Ordner) wie der Rest der Platte.',
  'apply_changes_one': '{count} Änderung übernehmen',
  'apply_changes_other': '{count} Änderungen übernehmen',
  'apply_changes': 'Änderungen übernehmen',
  'files_not_touched': 'Deine Dateien bleiben unberührt. Zum Rückgängigmachen vergiss die Mediathek und lies sie neu ein.',
}

export default tidy
