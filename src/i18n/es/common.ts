// Spanish (es) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  'songs_one': '{count} canción',
  'songs_other': '{count} canciones',
  'tracks_one': '{count} pista',
  'tracks_other': '{count} pistas',
  'albums_one': '{count} álbum',
  'albums_other': '{count} álbumes',
  'artists_one': '{count} artista',
  'artists_other': '{count} artistas',
  'folders_one': '{count} carpeta',
  'folders_other': '{count} carpetas',
  'genres_one': '{count} género',
  'genres_other': '{count} géneros',

  'duration_min': '{min} min',
  'duration_hr': '{hr} h',
  'duration_hr_min': '{hr} h {min} min',
  'duration_unknown_suffix': '{time}+',

  'cancel': 'Cancelar',
  'close': 'Cerrar',
  'done': 'Listo',
  'ok': 'Aceptar',
  'back': 'Atrás',
  'play': 'Reproducir',
  'pause': 'Pausa',
  'shuffle': 'Aleatorio',
  'remove': 'Quitar',
  'delete': 'Eliminar',
  'rename': 'Cambiar nombre',
  'save': 'Guardar',
  'open': 'Abrir',
  'more': 'Más',
  'add': 'Añadir',
  'edit': 'Editar',
  'clear': 'Borrar',
  'undo': 'Deshacer',
  'yes': 'Sí',
  'no': 'No',
  'search': 'Buscar',
  'try_again': 'Volver a intentarlo',
  'loading': 'Cargando…',
  'next': 'Siguiente',
  'previous': 'Anterior',
  'show_more': 'Mostrar más',
  'show_less': 'Mostrar menos',
  'on': 'Activado',
  'off': 'Desactivado',

  'unknown_artist': 'Artista desconocido',
  'unknown_album': 'Álbum desconocido',
  'list_and': '{a} y {b}',
}

export default common
