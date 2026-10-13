// Spanish (es) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  'nothing_matching': 'Nada coincide con «{query}».',
  'no_genre_big_enough_one': 'Aquí ningún género tiene {count} canción o más, así que no hay nada que agrupar. Vuelve a A–Z.',
  'no_genre_big_enough_other': 'Aquí ningún género tiene {count} canciones o más, así que no hay nada que agrupar. Vuelve a A–Z.',
  'no_full_albums_one': 'No hay álbumes completos: todos los álbumes de aquí tienen menos de {count} pista. Toca «Álbumes completos» para ver todos los álbumes.',
  'no_full_albums_other': 'No hay álbumes completos: todos los álbumes de aquí tienen menos de {count} pistas. Toca «Álbumes completos» para ver todos los álbumes.',
  'no_albums_yet': 'Aún no hay álbumes.',
  'no_artist_matching': 'Ningún artista coincide con «{query}».',
  'no_big_artists_one': 'Aún no hay ningún artista con {count} canción o más. Toca «Mín. {count}» para ver todos los artistas.',
  'no_big_artists_other': 'Aún no hay ningún artista con {count} canciones o más. Toca «Mín. {count}» para ver todos los artistas.',
  'no_artists_yet': 'Aún no hay artistas.',
  'no_tracks_yet': 'Aún no hay pistas.',

  'no_genre': 'Sin género',
  'genre_footnote_one_genre_one': '{count} canción no se muestra: un género tiene menos de {min} canciones. En A–Z están todas.',
  'genre_footnote_one_genre_other': '{count} canciones no se muestran: un género tiene menos de {min} canciones. En A–Z están todas.',
  'genre_footnote_genres_one': '{count} canción no se muestra: {genres} géneros tienen menos de {min} canciones. En A–Z están todas.',
  'genre_footnote_genres_other': '{count} canciones no se muestran: {genres} géneros tienen menos de {min} canciones. En A–Z están todas.',
  'no_genre_matching': 'Ningún género coincide con «{query}».',
  'no_music_yet': 'Aún no hay música.',
  'no_genre_listed_one': 'Aquí ningún género tiene {count} canción o más. Toca «Mín. {count}» en las opciones de la lista para ver todos los géneros.',
  'no_genre_listed_other': 'Aquí ningún género tiene {count} canciones o más. Toca «Mín. {count}» en las opciones de la lista para ver todos los géneros.',
  'genre_list_hidden_one_genre_one': 'Un género tiene menos de {min} canciones ({count} canción en total). Toca «Mín. {min}» en las opciones de la lista para ver todos los géneros.',
  'genre_list_hidden_one_genre_other': 'Un género tiene menos de {min} canciones ({count} canciones en total). Toca «Mín. {min}» en las opciones de la lista para ver todos los géneros.',
  'genre_list_hidden_genres_one': '{genres} géneros tienen menos de {min} canciones ({count} canción en total). Toca «Mín. {min}» en las opciones de la lista para ver todos los géneros.',
  'genre_list_hidden_genres_other': '{genres} géneros tienen menos de {min} canciones ({count} canciones en total). Toca «Mín. {min}» en las opciones de la lista para ver todos los géneros.',

  'album_not_found': 'Ese álbum no está en la biblioteca.',
  'back_to_albums': 'Volver a los álbumes',
  'all_albums': 'Todos los álbumes',
  'search_album': 'Buscar en {title}',
  'open_jukebox_album_on': 'Abrir el jukebox: está sonando {title}',
  'play_album_on_deck': 'Reproducir {title} en el aparato',
  'click_to_open_jukebox': 'Haz clic para abrir el jukebox',
  'all_albums_by_one': 'El {count} álbum de {artist}',
  'all_albums_by_other': 'Los {count} álbumes de {artist}',
  'tracks_matching_one': 'Coincidencias con «{query}»: {found} de {count} pista',
  'tracks_matching_other': 'Coincidencias con «{query}»: {found} de {count} pistas',
  'find_on_record': 'Buscar una canción en este disco',
  'disc_number': 'Disco {number}',
  'nothing_on_record_matching': 'Nada de este disco coincide con «{query}».',

  'no_albums_by': 'No hay álbumes de {artist} en la biblioteca.',
  'back_to_library': 'Volver a tu biblioteca',
  'your_library': 'Tu biblioteca',
  'all_songs_by': 'Todas las canciones de {artist}',
  'play_all': 'Reproducir todo',
  'shuffle_all': 'Todo aleatorio',
  'their_albums_one': 'Su {count} álbum ›',
  'their_albums_other': 'Sus {count} álbumes ›',

  'showing_albums_one': 'Mostrando {count} álbum: toca para plegar',
  'showing_albums_other': 'Mostrando {count} álbumes: toca para plegar',
  'play_or_shuffle': 'Reproducir o en aleatorio',

  'showing_first': 'Se muestran las primeras {cap} de {total}. La búsqueda encuentra cualquiera de ellas.',
  'show_all_anyway': 'Mostrar las {count} igualmente',
  'unknown': 'Desconocido',

  'search_your_library': 'Busca en tu biblioteca',
  'clear_and_close_search': 'Borrar y cerrar el cuadro de búsqueda',
  'clear_and_close': 'Borrar y cerrar',

  'resume_listening': 'Seguir escuchando',

  'listen_to_this': 'Escucha esto',

  'another': 'Otra',

  'another_song': 'Otra canción al azar',
  'hide': 'Ocultar',
  'dont_show_again': 'No volver a mostrar',

  'shuffle_artists_all': 'Artistas en aleatorio: cada artista completo, con sus canciones mezcladas',
  'shuffle_artists_these': 'Estos artistas en aleatorio: cada artista completo, con sus canciones mezcladas',
  'shuffle_albums_all': 'Álbumes en aleatorio: cada álbum completo y en orden',
  'shuffle_albums_these': 'Estos álbumes en aleatorio: cada álbum completo y en orden',
  'shuffle_songs_all': 'Todas las canciones en aleatorio',
  'shuffle_songs_these': 'Estas canciones en aleatorio',

  'options_for': 'Opciones de {title}',

  'track_length': 'Duración {length}',
  'plays_next': 'Sonará a continuación',
  'play_now': 'Reproducir ahora',
  'play_next': 'Reproducir a continuación',
  'add_to_a_shelf': 'Añadir a un estante…',
  'go_to_album': 'Ir al álbum',
  'open_album': 'Abrir el álbum',
  'go_to_artist': 'Ir a {artist}',
  'view_albums': 'Ver sus álbumes',

  'add_to_queue': 'Añadir a la cola',
  'add_song_to_queue': 'Añadir «{title}» a la cola',
  'in_queue_one': '{count} canción en la cola',
  'in_queue_other': '{count} canciones en la cola',

  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} por fila',
  'layout_per_row_other': '{count} por fila',
  'shuffle_album': 'Álbum en aleatorio',
  'remove_from_jukebox': 'Quitar de Jukebox',
  'remove_confirm': '¿Quitar {name} de Jukebox?',
  'remove_explain': 'Dejará de mostrarse y de sonar. No se borra nada: puedes recuperarlo cuando quieras en Ajustar esta app, en Tu biblioteca.',
  'remove_yes': 'Quitar',
  'removed': 'Quitado',
}

export default library
