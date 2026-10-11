// Italian (it) — tidy strings. Every key in ../en/tidy.ts, translated; a key not
// here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Torna alla tua libreria',
  'title': 'Riordina la tua libreria',
  'intro': 'Copertine mancanti trovate sul tuo disco e dischi divisi in due da tag incoerenti. Non viene cercato nulla online e {strong}: questo corregge solo la libreria qui.',
  'intro_strong': 'i tuoi file musicali non vengono mai modificati',
  'looking': 'Analisi della libreria in corso…',
  'covers_access': 'Le copertine mancanti si cercano nei tuoi file musicali, che richiedono di nuovo la tua cartella.',
  'allow_access': 'Consenti l’accesso',
  'covers_phone': 'Sul telefono, il riordino cerca i dischi divisi in due. Le copertine arrivano dai tuoi file durante la scansione.',
  'nothing_split': 'Niente da fare: nessun disco sembra diviso in due.',
  'applied_one': 'Fatto: {count} modifica applicata. Resisterà a una nuova scansione, perché le modifiche sono conservate separatamente dalla libreria.',
  'applied_other': 'Fatto: {count} modifiche applicate. Resisteranno a una nuova scansione, perché sono conservate separatamente dalla libreria.',
  'look_again': 'Cerca di nuovo',
  'nothing_to_do_all_art': 'Niente da fare: ogni album ha già la sua copertina e nessun disco sembra diviso in due.',
  'nothing_to_do_checked_one': 'Niente da fare: controllato {count} album senza copertina senza trovare nulla da usare sul disco, e nessun disco sembra diviso in due.',
  'nothing_to_do_checked_other': 'Niente da fare: controllati {count} album senza copertina senza trovare nulla da usare sul disco, e nessun disco sembra diviso in due.',
  'nothing_to_do_note': 'L’app usa solo copertine già presenti nei tuoi file o nella cartella accanto a loro: non chiede mai a internet, ed è anche per questo che non può inventare una copertina che non c’è.',
  'suggestions_one': '{count} suggerimento · {selected} selezionati',
  'suggestions_other': '{count} suggerimenti · {selected} selezionati',
  'select_all': 'Seleziona tutto',
  'select_none': 'Deseleziona tutto',
  'section_covers': 'Copertine trovate sul tuo disco ({count})',
  'section_merges': 'Dischi divisi in due ({count})',
  'cover_from_folder': 'Trovato {file} nella cartella dell’album.',
  'cover_from_track': 'Presa dalla copertina già contenuta in {file}.',
  'move_tracks_into_one': 'Sposta {count} traccia in «{title}»',
  'move_tracks_into_other': 'Sposta {count} tracce in «{title}»',
  'reason_split_artists': 'Stesso nome dell’album, stessa cartella ({folder}), tag dell’artista diversi.',
  'reason_split_artists_root': 'Stesso nome dell’album, stessa cartella (la cartella scelta), tag dell’artista diversi.',
  'reason_loose_track': 'Questa traccia non ha il tag dell’album, ma si trova nella stessa cartella ({folder}) del resto del disco.',
  'reason_loose_track_root': 'Questa traccia non ha il tag dell’album, ma si trova nella stessa cartella (la cartella scelta) del resto del disco.',
  'reason_loose_tracks': 'Queste tracce non hanno il tag dell’album, ma si trovano nella stessa cartella ({folder}) del resto del disco.',
  'reason_loose_tracks_root': 'Queste tracce non hanno il tag dell’album, ma si trovano nella stessa cartella (la cartella scelta) del resto del disco.',
  'apply_changes_one': 'Applica {count} modifica',
  'apply_changes_other': 'Applica {count} modifiche',
  'apply_changes': 'Applica le modifiche',
  'files_not_touched': 'I tuoi file non vengono toccati. Per annullare, dimentica la libreria e ripeti la scansione.',
}

export default tidy
