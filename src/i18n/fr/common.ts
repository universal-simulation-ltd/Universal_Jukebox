// French (fr) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  'songs_one': '{count} morceau',
  'songs_other': '{count} morceaux',
  'tracks_one': '{count} piste',
  'tracks_other': '{count} pistes',
  'albums_one': '{count} album',
  'albums_other': '{count} albums',
  'artists_one': '{count} artiste',
  'artists_other': '{count} artistes',
  'folders_one': '{count} dossier',
  'folders_other': '{count} dossiers',
  'genres_one': '{count} genre',
  'genres_other': '{count} genres',

  // Durations
  'duration_min': '{min} min',
  'duration_hr': '{hr} h',
  'duration_hr_min': '{hr} h {min} min',
  'duration_unknown_suffix': '{time}+',

  // Everyday buttons
  'cancel': 'Annuler',
  'close': 'Fermer',
  'done': 'Terminé',
  'ok': 'OK',
  'back': 'Retour',
  'play': 'Lire',
  'pause': 'Pause',
  'shuffle': 'Aléatoire',
  'remove': 'Retirer',
  'delete': 'Supprimer',
  'rename': 'Renommer',
  'save': 'Enregistrer',
  'open': 'Ouvrir',
  'more': 'Plus',
  'add': 'Ajouter',
  'edit': 'Modifier',
  'clear': 'Effacer',
  'undo': 'Annuler',
  'yes': 'Oui',
  'no': 'Non',
  'search': 'Rechercher',
  'try_again': 'Réessayer',
  'loading': 'Chargement…',
  'next': 'Suivant',
  'previous': 'Précédent',
  'show_more': 'Afficher plus',
  'show_less': 'Afficher moins',
  'on': 'Activé',
  'off': 'Désactivé',

  'unknown_artist': 'Artiste inconnu',
  'unknown_album': 'Album inconnu',
  'list_and': '{a} et {b}',
}

export default common
