// Brazilian Portuguese (pt-BR) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  // Empty lists
  'nothing_matching': 'Nada corresponde a “{query}”.',
  'no_genre_big_enough_one': 'Nenhum gênero aqui tem {count} música ou mais, então não há nada para agrupar. Volte para A–Z.',
  'no_genre_big_enough_other': 'Nenhum gênero aqui tem {count} músicas ou mais, então não há nada para agrupar. Volte para A–Z.',
  'no_full_albums_one': 'Nenhum álbum completo — todos os álbuns aqui têm menos de {count} faixa. Toque em “Álbuns completos” para mostrar todos os álbuns.',
  'no_full_albums_other': 'Nenhum álbum completo — todos os álbuns aqui têm menos de {count} faixas. Toque em “Álbuns completos” para mostrar todos os álbuns.',
  'no_albums_yet': 'Ainda não há álbuns.',
  'no_artist_matching': 'Nenhum artista corresponde a “{query}”.',
  'no_big_artists_one': 'Nenhum artista tem {count} música ou mais ainda. Toque em “Mín. {count}” para mostrar todos os artistas.',
  'no_big_artists_other': 'Nenhum artista tem {count} músicas ou mais ainda. Toque em “Mín. {count}” para mostrar todos os artistas.',
  'no_artists_yet': 'Ainda não há artistas.',
  'no_tracks_yet': 'Ainda não há faixas.',

  // Genres
  'no_genre': 'Sem gênero',
  'genre_footnote_one_genre_one': '{count} música não aparece — um gênero tem menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_one_genre_other': '{count} músicas não aparecem — um gênero tem menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_genres_one': '{count} música não aparece — {genres} gêneros têm menos de {min} músicas. Estão todas em A–Z.',
  'genre_footnote_genres_other': '{count} músicas não aparecem — {genres} gêneros têm menos de {min} músicas. Estão todas em A–Z.',
  'no_genre_matching': 'Nenhum gênero corresponde a “{query}”.',
  'no_music_yet': 'Ainda não há músicas.',
  'no_genre_listed_one': 'Nenhum gênero aqui tem {count} música ou mais. Toque em “Mín. {count}” nas opções da lista para mostrar todos os gêneros.',
  'no_genre_listed_other': 'Nenhum gênero aqui tem {count} músicas ou mais. Toque em “Mín. {count}” nas opções da lista para mostrar todos os gêneros.',
  'genre_list_hidden_one_genre_one': 'Um gênero tem menos de {min} músicas ({count} música no total). Toque em “Mín. {min}” nas opções da lista para mostrar todos os gêneros.',
  'genre_list_hidden_one_genre_other': 'Um gênero tem menos de {min} músicas ({count} músicas no total). Toque em “Mín. {min}” nas opções da lista para mostrar todos os gêneros.',
  'genre_list_hidden_genres_one': '{genres} gêneros têm menos de {min} músicas ({count} música no total). Toque em “Mín. {min}” nas opções da lista para mostrar todos os gêneros.',
  'genre_list_hidden_genres_other': '{genres} gêneros têm menos de {min} músicas ({count} músicas no total). Toque em “Mín. {min}” nas opções da lista para mostrar todos os gêneros.',

  // An album's page
  'album_not_found': 'Esse álbum não está na biblioteca.',
  'back_to_albums': 'Voltar para os álbuns',
  'all_albums': 'Todos os álbuns',
  'search_album': 'Buscar em {title}',
  'open_jukebox_album_on': 'Abrir o jukebox — {title} está tocando',
  'play_album_on_deck': 'Tocar {title} no aparelho de som',
  'click_to_open_jukebox': 'Clique para abrir o jukebox',
  'all_albums_by_one': '{count} álbum de {artist}',
  'all_albums_by_other': 'Todos os {count} álbuns de {artist}',
  'tracks_matching_one': '{found} de {count} faixa corresponde a “{query}”',
  'tracks_matching_other': '{found} de {count} faixas correspondem a “{query}”',
  'find_on_record': 'Encontrar uma música neste disco',
  'disc_number': 'Disco {number}',
  'nothing_on_record_matching': 'Nada neste disco corresponde a “{query}”.',

  // An artist's page
  'no_albums_by': 'Nenhum álbum de {artist} na biblioteca.',
  'back_to_library': 'Voltar para a sua biblioteca',
  'your_library': 'Sua biblioteca',
  'all_songs_by': 'Todas as músicas de {artist}',
  'play_all': 'Tocar tudo',
  'shuffle_all': 'Tudo aleatório',
  'their_albums_one': '{count} álbum ›',
  'their_albums_other': 'Os {count} álbuns ›',

  // The Artists tab
  'showing_albums_one': 'Mostrando {count} álbum — toque para recolher',
  'showing_albums_other': 'Mostrando {count} álbuns — toque para recolher',
  'play_or_shuffle': 'Tocar ou embaralhar',

  // The Tracks tab
  'showing_first': 'Mostrando as primeiras {cap} de {total}. A busca encontra qualquer uma delas.',
  'show_all_anyway': 'Mostrar todas as {count} mesmo assim',
  'unknown': 'Desconhecido',

  // The search boxes
  'search_your_library': 'Buscar na sua biblioteca',
  'clear_and_close_search': 'Limpar e fechar a caixa de busca',
  'clear_and_close': 'Limpar e fechar',

  // Resume listening
  'resume_listening': 'Continuar ouvindo',
  'listen_to_this': 'Ouça esta',
  'another': 'Outra',
  'another_song': 'Outra música aleatória',
  'hide': 'Ocultar',
  'dont_show_again': 'Não mostrar de novo',

  // The shuffle button beside the list options
  'shuffle_artists_all': 'Artistas em ordem aleatória — cada artista inteiro, com as músicas embaralhadas',
  'shuffle_artists_these': 'Estes artistas em ordem aleatória — cada artista inteiro, com as músicas embaralhadas',
  'shuffle_albums_all': 'Álbuns em ordem aleatória — cada álbum inteiro, na ordem',
  'shuffle_albums_these': 'Estes álbuns em ordem aleatória — cada álbum inteiro, na ordem',
  'shuffle_songs_all': 'Todas as músicas em ordem aleatória',
  'shuffle_songs_these': 'Estas músicas em ordem aleatória',

  // A song's options
  'options_for': 'Opções de {title}',
  'track_length': 'Duração {length}',
  'plays_next': 'Toca a seguir',
  'play_now': 'Tocar agora',
  'play_next': 'Tocar a seguir',
  'add_to_a_shelf': 'Adicionar a uma estante…',
  'go_to_album': 'Ir para o álbum',
  'open_album': 'Abrir o álbum',
  'go_to_artist': 'Ir para {artist}',
  'view_albums': 'Ver os álbuns',

  // Add to queue
  'add_to_queue': 'Adicionar à fila',
  'add_song_to_queue': 'Adicionar “{title}” à fila',
  'in_queue_one': '{count} música na fila',
  'in_queue_other': '{count} músicas na fila',

  // The layout button
  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} por linha',
  'layout_per_row_other': '{count} por linha',
}

export default library
