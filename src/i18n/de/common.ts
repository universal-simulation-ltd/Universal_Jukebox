// German (de) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  'songs_one': '{count} Song',
  'songs_other': '{count} Songs',
  'tracks_one': '{count} Titel',
  'tracks_other': '{count} Titel',
  'albums_one': '{count} Album',
  'albums_other': '{count} Alben',
  'artists_one': '{count} Interpret',
  'artists_other': '{count} Interpreten',
  'folders_one': '{count} Ordner',
  'folders_other': '{count} Ordner',
  'genres_one': '{count} Genre',
  'genres_other': '{count} Genres',

  'duration_min': '{min} Min.',
  'duration_hr': '{hr} Std.',
  'duration_hr_min': '{hr} Std. {min} Min.',
  'duration_unknown_suffix': '{time}+',

  'cancel': 'Abbrechen',
  'close': 'Schließen',
  'done': 'Fertig',
  'ok': 'OK',
  'back': 'Zurück',
  'play': 'Abspielen',
  'pause': 'Pause',
  'shuffle': 'Zufällig',
  'remove': 'Entfernen',
  'delete': 'Löschen',
  'rename': 'Umbenennen',
  'save': 'Speichern',
  'open': 'Öffnen',
  'more': 'Mehr',
  'add': 'Hinzufügen',
  'edit': 'Bearbeiten',
  'clear': 'Leeren',
  'undo': 'Rückgängig',
  'yes': 'Ja',
  'no': 'Nein',
  'search': 'Suchen',
  'try_again': 'Erneut versuchen',
  'loading': 'Wird geladen …',
  'next': 'Weiter',
  'previous': 'Zurück',
  'show_more': 'Mehr anzeigen',
  'show_less': 'Weniger anzeigen',
  'on': 'An',
  'off': 'Aus',

  'unknown_artist': 'Unbekannter Interpret',
  'unknown_album': 'Unbekanntes Album',
  'list_and': '{a} und {b}',
}

export default common
