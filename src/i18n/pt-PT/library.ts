// European Portuguese (pt-PT) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  'nothing_matching': 'Nada corresponde a «{query}».',
  'no_genre_big_enough_one': 'Nenhum género aqui tem {count} música ou mais, por isso não há nada para agrupar. Volte a A–Z.',
  'no_genre_big_enough_other': 'Nenhum género aqui tem {count} músicas ou mais, por isso não há nada para agrupar. Volte a A–Z.',
  'no_full_albums_one': 'Não há álbuns completos — todos os álbuns aqui têm menos de {count} faixa. Toque em «Álbuns completos» para mostrar todos os álbuns.',
  'no_full_albums_other': 'Não há álbuns completos — todos os álbuns aqui têm menos de {count} faixas. Toque em «Álbuns completos» para mostrar todos os álbuns.',
  'no_albums_yet': 'Ainda não há álbuns.',
  'no_artist_matching': 'Nenhum artista corresponde a «{query}».',
  'no_big_artists_one': 'Ainda nenhum artista tem {count} música ou mais. Toque em «Mín. {count}» para mostrar todos os artistas.',
  'no_big_artists_other': 'Ainda nenhum artista tem {count} músicas ou mais. Toque em «Mín. {count}» para mostrar todos os artistas.',
  'no_artists_yet': 'Ainda não há artistas.',
  'no_tracks_yet': 'Ainda não há faixas.',

  'no_genre': 'Sem género',
  'genre_footnote_one_genre_one': '{count} música não mostrada — um género tem menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_one_genre_other': '{count} músicas não mostradas — um género tem menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_genres_one': '{count} música não mostrada — {genres} géneros têm menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_genres_other': '{count} músicas não mostradas — {genres} géneros têm menos de {min} músicas. Estão todas em A–Z.',
  'no_genre_matching': 'Nenhum género corresponde a «{query}».',
  'no_music_yet': 'Ainda não há música.',
  'no_genre_listed_one': 'Nenhum género aqui tem {count} música ou mais. Toque em «Mín. {count}» nas opções da lista para mostrar todos os géneros.',
  'no_genre_listed_other': 'Nenhum género aqui tem {count} músicas ou mais. Toque em «Mín. {count}» nas opções da lista para mostrar todos os géneros.',
  'genre_list_hidden_one_genre_one': 'Um género tem menos de {min} músicas ({count} música no total). Toque em «Mín. {min}» nas opções da lista para mostrar todos os géneros.',
  'genre_list_hidden_one_genre_other': 'Um género tem menos de {min} músicas ({count} músicas no total). Toque em «Mín. {min}» nas opções da lista para mostrar todos os géneros.',
  'genre_list_hidden_genres_one': '{genres} géneros têm menos de {min} músicas ({count} música no total). Toque em «Mín. {min}» nas opções da lista para mostrar todos os géneros.',
  'genre_list_hidden_genres_other': '{genres} géneros têm menos de {min} músicas ({count} músicas no total). Toque em «Mín. {min}» nas opções da lista para mostrar todos os géneros.',

  'album_not_found': 'Esse álbum não está na biblioteca.',
  'back_to_albums': 'Voltar aos álbuns',
  'all_albums': 'Todos os álbuns',
  'search_album': 'Pesquisar em {title}',
  'open_jukebox_album_on': 'Abrir o jukebox — {title} está a tocar',
  'play_album_on_deck': 'Reproduzir {title} na aparelhagem',
  'click_to_open_jukebox': 'Clique para abrir o jukebox',
  'all_albums_by_one': 'O {count} álbum de {artist}',
  'all_albums_by_other': 'Todos os {count} álbuns de {artist}',
  'tracks_matching_one': '{found} de {count} faixa corresponde a «{query}»',
  'tracks_matching_other': '{found} de {count} faixas correspondem a «{query}»',
  'find_on_record': 'Encontrar uma música neste disco',
  'disc_number': 'Disco {number}',
  'nothing_on_record_matching': 'Nada neste disco corresponde a «{query}».',

  'no_albums_by': 'Não há álbuns de {artist} na biblioteca.',
  'back_to_library': 'Voltar à sua biblioteca',
  'your_library': 'A sua biblioteca',
  'all_songs_by': 'Todas as músicas de {artist}',
  'play_all': 'Reproduzir tudo',
  'shuffle_all': 'Tudo aleatório',
  'their_albums_one': 'O seu {count} álbum ›',
  'their_albums_other': 'Os seus {count} álbuns ›',

  'showing_albums_one': 'A mostrar {count} álbum — toque para recolher',
  'showing_albums_other': 'A mostrar {count} álbuns — toque para recolher',
  'play_or_shuffle': 'Reproduzir ou aleatório',

  'showing_first': 'A mostrar as primeiras {cap} de {total}. A pesquisa encontra qualquer uma delas.',
  'show_all_anyway': 'Mostrar todas as {count} mesmo assim',
  'unknown': 'Desconhecido',

  'search_your_library': 'Pesquisar na sua biblioteca',
  'clear_and_close_search': 'Limpar e fechar a caixa de pesquisa',
  'clear_and_close': 'Limpar e fechar',

  'resume_listening': 'Continuar a ouvir',

  'listen_to_this': 'Ouça esta',
  'hide': 'Ocultar',
  'dont_show_again': 'Não mostrar novamente',

  'shuffle_artists_all': 'Artistas aleatórios — cada artista completo, com as músicas em ordem aleatória',
  'shuffle_artists_these': 'Estes artistas em ordem aleatória — cada artista completo, com as músicas em ordem aleatória',
  'shuffle_albums_all': 'Álbuns aleatórios — cada álbum completo, por ordem',
  'shuffle_albums_these': 'Estes álbuns em ordem aleatória — cada álbum completo, por ordem',
  'shuffle_songs_all': 'Todas as músicas em ordem aleatória',
  'shuffle_songs_these': 'Estas músicas em ordem aleatória',

  'options_for': 'Opções de {title}',

  'track_length': 'Duração {length}',
  'plays_next': 'Toca a seguir',
  'play_now': 'Reproduzir agora',
  'play_next': 'Reproduzir a seguir',
  'add_to_a_shelf': 'Adicionar a uma prateleira…',
  'go_to_album': 'Ir para o álbum',
  'open_album': 'Abrir o álbum',
  'go_to_artist': 'Ir para {artist}',
  'view_albums': 'Ver os álbuns',

  'add_to_queue': 'Adicionar à fila',
  'add_song_to_queue': 'Adicionar «{title}» à fila',
  'in_queue_one': '{count} música na fila',
  'in_queue_other': '{count} músicas na fila',

  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} por fila',
  'layout_per_row_other': '{count} por fila',
}

export default library
