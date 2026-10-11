// French (fr) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  // The panel's header (Lyrics)
  'heading': 'Paroles',
  'sing_along': 'Chanter',
  'more_options': 'Plus d’options de paroles',
  'fewer_options': 'Moins d’options de paroles',
  'more_options_title': 'Remplacer les paroles, autour du disque, suivi',

  // Where the words came from
  'source_file': 'Depuis les tags de ce fichier',
  'source_upload': 'Depuis votre fichier de paroles',
  'source_online': 'Depuis lrclib.net',
  'following_along': 'synchronisées',

  // The panel's states
  'looking': 'Recherche…',
  'instrumental': 'Selon lrclib.net, ce morceau est un instrumental — il n’y a pas de paroles à afficher.',
  'untagged': 'Cette piste n’a ni artiste ni titre dans ses tags : il n’y a rien pour la rechercher. Lui donner un nom dans le rangement de la bibliothèque réglerait le problème.',
  'error_fallback': 'Ça n’a pas marché.',
  'none_in_file': 'Aucune parole n’est enregistrée dans ce fichier.',
  'none_anywhere': 'Pas de paroles dans ce fichier, et lrclib.net ne les a pas non plus.',
  'offer_online': 'Jukebox peut plutôt les rechercher sur lrclib.net. Cela envoie l’artiste, le titre, l’album et la durée de la piste — rien d’autre, et rien du tout si vous ne l’activez pas.',
  'look_up_online': 'Les rechercher en ligne',
  'more_in_settings': 'En savoir plus dans Régler cette application',

  // A timed sheet's lock (chip)
  'following': 'Suivi',
  'free_scroll': 'Défilement libre',
  'following_title': 'Suit le morceau — déverrouillez pour faire défiler les paroles vous-même',
  'free_scroll_title': 'Défilement libre — verrouillez pour suivre à nouveau le morceau',

  // Adding or replacing a lyrics file
  'add_file_hint': 'Vous avez les paroles ? Un fichier .lrc synchronisé suit le morceau ; un texte brut s’affiche tel quel.',
  'lrcget_link': 'Obtenir les paroles de toute votre bibliothèque',
  'add_file': 'Ajouter un fichier de paroles',
  'replace': 'Remplacer les paroles',
  'not_lyrics': 'Cela ne ressemble pas à des paroles. Il faut un fichier texte brut ou un fichier .lrc.',
  'unreadable': 'Ce fichier n’a pas pu être lu comme du texte.',

  // "Around the record" chip
  'around': 'Autour du disque',
  'around_on_title': 'Les paroles sont autour du disque — touchez pour les retirer',
  'around_off_title': 'Afficher les paroles autour du disque au moment où elles sont chantées',

  // Sing along (full screen)
  'sing_along_dialog': 'Chanter — {title}',
  'close_sing_along': 'Fermer le mode karaoké',

  // lrclib.net lookup errors (lib/lrclib.ts)
  'error_offline': 'Pas de connexion : rien n’a pu être recherché.',
  'error_unreachable': 'Impossible de joindre lrclib.net.',
  'error_timeout': 'lrclib.net n’a pas répondu à temps.',
  'error_status': 'lrclib.net a renvoyé {status}.',
}

export default lyrics
