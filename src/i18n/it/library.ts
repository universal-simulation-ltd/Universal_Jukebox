// Italian (it) — library strings. Every key in ../en/library.ts, translated; a
// key not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  'nothing_matching': 'Nessun risultato per «{query}».',
  'no_genre_big_enough_one': 'Nessun genere qui ha almeno {count} brano, quindi non c’è niente da raggruppare. Torna ad A–Z.',
  'no_genre_big_enough_other': 'Nessun genere qui ha almeno {count} brani, quindi non c’è niente da raggruppare. Torna ad A–Z.',
  'no_full_albums_one': 'Nessun album intero: ogni album qui ha meno di {count} traccia. Tocca «Album interi» per mostrare tutti gli album.',
  'no_full_albums_other': 'Nessun album intero: ogni album qui ha meno di {count} tracce. Tocca «Album interi» per mostrare tutti gli album.',
  'no_albums_yet': 'Ancora nessun album.',
  'no_artist_matching': 'Nessun artista corrisponde a «{query}».',
  'no_big_artists_one': 'Ancora nessun artista ha almeno {count} brano. Tocca «Min. {count}» per mostrare tutti gli artisti.',
  'no_big_artists_other': 'Ancora nessun artista ha almeno {count} brani. Tocca «Min. {count}» per mostrare tutti gli artisti.',
  'no_artists_yet': 'Ancora nessun artista.',
  'no_tracks_yet': 'Ancora nessun brano.',

  'no_genre': 'Senza genere',
  'genre_footnote_one_genre_one': '{count} brano non mostrato: un genere ha meno di {min} brani. In A–Z ci sono tutti.',
  'genre_footnote_one_genre_other': '{count} brani non mostrati: un genere ha meno di {min} brani. In A–Z ci sono tutti.',
  'genre_footnote_genres_one': '{count} brano non mostrato: {genres} generi hanno meno di {min} brani. In A–Z ci sono tutti.',
  'genre_footnote_genres_other': '{count} brani non mostrati: {genres} generi hanno meno di {min} brani. In A–Z ci sono tutti.',
  'no_genre_matching': 'Nessun genere corrisponde a «{query}».',
  'no_music_yet': 'Ancora nessuna musica.',
  'no_genre_listed_one': 'Nessun genere qui ha almeno {count} brano. Tocca «Min. {count}» nelle opzioni elenco per mostrare tutti i generi.',
  'no_genre_listed_other': 'Nessun genere qui ha almeno {count} brani. Tocca «Min. {count}» nelle opzioni elenco per mostrare tutti i generi.',
  'genre_list_hidden_one_genre_one': 'Un genere ha meno di {min} brani ({count} brano in tutto). Tocca «Min. {min}» nelle opzioni elenco per mostrare tutti i generi.',
  'genre_list_hidden_one_genre_other': 'Un genere ha meno di {min} brani ({count} brani in tutto). Tocca «Min. {min}» nelle opzioni elenco per mostrare tutti i generi.',
  'genre_list_hidden_genres_one': '{genres} generi hanno meno di {min} brani ({count} brano in tutto). Tocca «Min. {min}» nelle opzioni elenco per mostrare tutti i generi.',
  'genre_list_hidden_genres_other': '{genres} generi hanno meno di {min} brani ({count} brani in tutto). Tocca «Min. {min}» nelle opzioni elenco per mostrare tutti i generi.',

  'album_not_found': 'Quell’album non è nella libreria.',
  'back_to_albums': 'Torna agli album',
  'all_albums': 'Tutti gli album',
  'search_album': 'Cerca in {title}',
  'open_jukebox_album_on': 'Apri il jukebox: {title} è in riproduzione',
  'play_album_on_deck': 'Riproduci {title} sull’apparecchio',
  'click_to_open_jukebox': 'Fai clic per aprire il jukebox',
  'all_albums_by_one': 'Tutti i {count} album di {artist}',
  'all_albums_by_other': 'Tutti i {count} album di {artist}',
  'tracks_matching_one': '{found} di {count} traccia corrisponde a «{query}»',
  'tracks_matching_other': '{found} di {count} tracce corrispondono a «{query}»',
  'find_on_record': 'Trova un brano in questo disco',
  'disc_number': 'Disco {number}',
  'nothing_on_record_matching': 'Niente in questo disco corrisponde a «{query}».',

  'no_albums_by': 'Nessun album di {artist} nella libreria.',
  'back_to_library': 'Torna alla tua libreria',
  'your_library': 'La tua libreria',
  'all_songs_by': 'Tutti i brani di {artist}',
  'play_all': 'Riproduci tutto',
  'shuffle_all': 'Tutto in casuale',
  'their_albums_one': 'Il suo {count} album ›',
  'their_albums_other': 'I suoi {count} album ›',

  'showing_albums_one': '{count} album mostrato: tocca per richiudere',
  'showing_albums_other': '{count} album mostrati: tocca per richiudere',
  'play_or_shuffle': 'Riproduci o in casuale',

  'showing_first': 'Sono mostrati i primi {cap} di {total}. La ricerca li trova tutti.',
  'show_all_anyway': 'Mostrali comunque tutti e {count}',
  'unknown': 'Sconosciuto',

  'search_your_library': 'Cerca nella tua libreria',
  'clear_and_close_search': 'Cancella e chiudi la casella di ricerca',
  'clear_and_close': 'Cancella e chiudi',

  'resume_listening': 'Riprendi l’ascolto',
  'hide': 'Nascondi',
  'dont_show_again': 'Non mostrare più',

  'shuffle_artists_all': 'Artisti in casuale: ogni artista per intero, con i brani in ordine casuale',
  'shuffle_artists_these': 'Questi artisti in casuale: ogni artista per intero, con i brani in ordine casuale',
  'shuffle_albums_all': 'Album in casuale: ogni album per intero, in ordine',
  'shuffle_albums_these': 'Questi album in casuale: ogni album per intero, in ordine',
  'shuffle_songs_all': 'Tutti i brani in casuale',
  'shuffle_songs_these': 'Questi brani in casuale',

  'options_for': 'Opzioni per {title}',

  'track_length': 'Durata {length}',
  'plays_next': 'Sarà il prossimo',
  'play_now': 'Riproduci ora',
  'play_next': 'Riproduci dopo',
  'add_to_a_shelf': 'Aggiungi a uno scaffale…',
  'go_to_album': 'Vai all’album',

  'add_to_queue': 'Aggiungi alla coda',
  'add_song_to_queue': 'Aggiungi «{title}» alla coda',
  'in_queue_one': '{count} brano in coda',
  'in_queue_other': '{count} brani in coda',

  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} per riga',
  'layout_per_row_other': '{count} per riga',
}

export default library
