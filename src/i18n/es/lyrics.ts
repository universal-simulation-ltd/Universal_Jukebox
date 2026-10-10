// Spanish (es) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  'heading': 'Letra',
  'sing_along': 'Cantar',
  'more_options': 'Más opciones de letra',
  'fewer_options': 'Menos opciones de letra',
  'more_options_title': 'Sustituir la letra, alrededor del disco, seguimiento',

  'source_file': 'De las propias etiquetas de este archivo',
  'source_upload': 'De tu archivo de letra',
  'source_online': 'De lrclib.net',
  'following_along': 'siguiendo la canción',

  'looking': 'Buscando…',
  'instrumental': 'lrclib.net tiene esta como instrumental: no hay letra que mostrar.',
  'untagged': 'Esta pista no tiene artista ni título en sus etiquetas, así que no hay nada con lo que buscarla. Ponerle nombre en Ordenar la biblioteca lo arreglaría.',
  'error_fallback': 'No ha funcionado.',
  'none_in_file': 'No hay ninguna letra guardada en este archivo.',
  'none_anywhere': 'No hay letra en este archivo, y lrclib.net tampoco la tiene.',
  'offer_online': 'Jukebox puede buscarla en lrclib.net. Eso envía el artista, el título, el álbum y la duración de la pista; nada más, y nada en absoluto a menos que lo actives.',
  'look_up_online': 'Buscarla en internet',
  'more_in_settings': 'Más información en Ajustar esta app',

  'following': 'Siguiendo',
  'free_scroll': 'Libre',
  'following_title': 'Siguiendo la canción: desbloquea para desplazar la letra tú mismo',
  'free_scroll_title': 'Desplazamiento libre: bloquea para volver a seguir la canción',

  'add_file_hint': '¿Tienes tú la letra? Un archivo .lrc sincronizado sigue la canción; el texto sin formato se muestra como letra.',
  'add_file': 'Añadir un archivo de letra',
  'replace': 'Sustituir la letra',
  'not_lyrics': 'Eso no parece una letra. Hace falta un archivo de texto sin formato o un archivo .lrc.',
  'unreadable': 'No se ha podido leer ese archivo como texto.',

  'around': 'Alrededor del disco',
  'around_on_title': 'La letra está alrededor del disco: toca para quitarla',
  'around_off_title': 'Mostrar la letra alrededor del disco a medida que se canta',

  'sing_along_dialog': 'Cantar: {title}',
  'close_sing_along': 'Cerrar Cantar',

  'error_offline': 'No hay conexión, así que no se ha podido buscar nada.',
  'error_unreachable': 'No se ha podido conectar con lrclib.net.',
  'error_timeout': 'lrclib.net no ha respondido a tiempo.',
  'error_status': 'lrclib.net ha devuelto {status}.',
}

export default lyrics
