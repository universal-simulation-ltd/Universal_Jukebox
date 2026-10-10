// French (fr) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Retour à votre bibliothèque',
  'title': 'Ranger votre bibliothèque',
  'intro': 'Les pochettes manquantes retrouvées sur votre propre disque, et les disques coupés en deux par des tags incohérents. Rien n’est recherché en ligne et {strong} — seule la bibliothèque d’ici est corrigée.',
  'intro_strong': 'vos fichiers musicaux ne sont jamais modifiés',
  'looking': 'Examen de votre bibliothèque…',
  'unavailable': 'Le rangement lit vos fichiers pour trouver les pochettes : il a besoin d’accéder à votre dossier de musique. Choisissez-le à nouveau depuis le bandeau de votre bibliothèque, puis revenez.',
  'applied_one': 'Terminé — {count} modification appliquée. Elle résistera aux nouvelles analyses, car elle est enregistrée à part de la bibliothèque.',
  'applied_other': 'Terminé — {count} modifications appliquées. Elles résisteront aux nouvelles analyses, car elles sont enregistrées à part de la bibliothèque.',
  'look_again': 'Chercher à nouveau',
  'nothing_to_do_all_art': 'Rien à faire — chaque album a déjà sa pochette, et aucun disque ne semble coupé en deux.',
  'nothing_to_do_checked_one': 'Rien à faire — {count} album sans pochette vérifié, rien d’utilisable trouvé sur le disque, et aucun disque ne semble coupé en deux.',
  'nothing_to_do_checked_other': 'Rien à faire — {count} albums sans pochette vérifiés, rien d’utilisable trouvé sur le disque, et aucun disque ne semble coupé en deux.',
  'nothing_to_do_note': 'L’application n’utilise que les pochettes déjà présentes dans vos fichiers ou dans le dossier à côté d’eux — elle n’interroge jamais Internet, et c’est aussi pourquoi elle ne peut pas inventer une pochette qui n’existe pas.',
  'suggestions_one': '{count} suggestion · sélection : {selected}',
  'suggestions_other': '{count} suggestions · sélection : {selected}',
  'select_all': 'Tout sélectionner',
  'select_none': 'Ne rien sélectionner',
  'section_covers': 'Pochettes trouvées sur votre disque ({count})',
  'section_merges': 'Disques coupés en deux ({count})',
  'cover_from_folder': '{file} trouvé dans le dossier de l’album.',
  'cover_from_track': 'Reprise de la pochette déjà intégrée à {file}.',
  'move_tracks_into_one': 'Déplacer {count} piste dans « {title} »',
  'move_tracks_into_other': 'Déplacer {count} pistes dans « {title} »',
  'reason_split_artists': 'Même nom d’album, même dossier ({folder}), tags d’artiste différents.',
  'reason_split_artists_root': 'Même nom d’album, même dossier (le dossier choisi), tags d’artiste différents.',
  'reason_loose_track': 'Cette piste n’a pas de tag d’album, mais se trouve dans le même dossier ({folder}) que le reste du disque.',
  'reason_loose_track_root': 'Cette piste n’a pas de tag d’album, mais se trouve dans le même dossier (le dossier choisi) que le reste du disque.',
  'reason_loose_tracks': 'Ces pistes n’ont pas de tag d’album, mais se trouvent dans le même dossier ({folder}) que le reste du disque.',
  'reason_loose_tracks_root': 'Ces pistes n’ont pas de tag d’album, mais se trouvent dans le même dossier (le dossier choisi) que le reste du disque.',
  'apply_changes_one': 'Appliquer {count} modification',
  'apply_changes_other': 'Appliquer {count} modifications',
  'apply_changes': 'Appliquer les modifications',
  'files_not_touched': 'Vos fichiers ne sont pas touchés. Pour annuler, oubliez la bibliothèque et relancez l’analyse.',
}

export default tidy
