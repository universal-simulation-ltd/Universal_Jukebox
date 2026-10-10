// Italian (it) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  'songs_one': '{count} brano',
  'songs_other': '{count} brani',
  'tracks_one': '{count} traccia',
  'tracks_other': '{count} tracce',
  'albums_one': '{count} album',
  'albums_other': '{count} album',
  'artists_one': '{count} artista',
  'artists_other': '{count} artisti',
  'folders_one': '{count} cartella',
  'folders_other': '{count} cartelle',
  'genres_one': '{count} genere',
  'genres_other': '{count} generi',

  'duration_min': '{min} min',
  'duration_hr': '{hr} h',
  'duration_hr_min': '{hr} h {min} min',
  'duration_unknown_suffix': '{time}+',

  'cancel': 'Annulla',
  'close': 'Chiudi',
  'done': 'Fine',
  'ok': 'OK',
  'back': 'Indietro',
  'play': 'Riproduci',
  'pause': 'Pausa',
  'shuffle': 'Casuale',
  'remove': 'Rimuovi',
  'delete': 'Elimina',
  'rename': 'Rinomina',
  'save': 'Salva',
  'open': 'Apri',
  'more': 'Altro',
  'add': 'Aggiungi',
  'edit': 'Modifica',
  'clear': 'Cancella',
  'undo': 'Annulla',
  'yes': 'Sì',
  'no': 'No',
  'search': 'Cerca',
  'try_again': 'Riprova',
  'loading': 'Caricamento…',
  'next': 'Successiva',
  'previous': 'Precedente',
  'show_more': 'Mostra di più',
  'show_less': 'Mostra meno',
  'on': 'Sì',
  'off': 'No',

  'unknown_artist': 'Artista sconosciuto',
  'unknown_album': 'Album sconosciuto',
  'list_and': '{a} e {b}',
}

export default common
