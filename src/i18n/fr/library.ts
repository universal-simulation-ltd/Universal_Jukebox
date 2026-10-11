// French (fr) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  // Empty lists (AlbumGrid, ArtistList, TrackList)
  'nothing_matching': 'Aucun résultat pour « {query} ».',
  'no_genre_big_enough_one': 'Aucun genre n’a ici {count} morceau ou plus : il n’y a rien à classer. Revenez à A–Z.',
  'no_genre_big_enough_other': 'Aucun genre n’a ici {count} morceaux ou plus : il n’y a rien à classer. Revenez à A–Z.',
  'no_full_albums_one': 'Aucun album complet — chaque album ici a moins de {count} piste. Touchez « Albums complets » pour afficher tous les albums.',
  'no_full_albums_other': 'Aucun album complet — chaque album ici a moins de {count} pistes. Touchez « Albums complets » pour afficher tous les albums.',
  'no_albums_yet': 'Aucun album pour l’instant.',
  'no_artist_matching': 'Aucun artiste ne correspond à « {query} ».',
  'no_big_artists_one': 'Aucun artiste n’a encore {count} morceau ou plus. Touchez « Min. {count} » pour afficher tous les artistes.',
  'no_big_artists_other': 'Aucun artiste n’a encore {count} morceaux ou plus. Touchez « Min. {count} » pour afficher tous les artistes.',
  'no_artists_yet': 'Aucun artiste pour l’instant.',
  'no_tracks_yet': 'Aucun morceau pour l’instant.',

  // Genres (GenreHeading, GenreIndex, lib/genres.ts)
  'no_genre': 'Sans genre',
  'genre_footnote_one_genre_one': '{count} morceau non affiché — un genre a moins de {min} morceaux. Tout est dans A–Z.',
  'genre_footnote_one_genre_other': '{count} morceaux non affichés — un genre a moins de {min} morceaux. Tout est dans A–Z.',
  'genre_footnote_genres_one': '{count} morceau non affiché — {genres} genres ont moins de {min} morceaux. Tout est dans A–Z.',
  'genre_footnote_genres_other': '{count} morceaux non affichés — {genres} genres ont moins de {min} morceaux. Tout est dans A–Z.',
  'no_genre_matching': 'Aucun genre ne correspond à « {query} ».',
  'no_music_yet': 'Aucune musique pour l’instant.',
  'no_genre_listed_one': 'Aucun genre n’a ici {count} morceau ou plus. Touchez « Min. {count} » dans les options de la liste pour afficher tous les genres.',
  'no_genre_listed_other': 'Aucun genre n’a ici {count} morceaux ou plus. Touchez « Min. {count} » dans les options de la liste pour afficher tous les genres.',
  'genre_list_hidden_one_genre_one': 'Un genre a moins de {min} morceaux ({count} morceau en tout). Touchez « Min. {min} » dans les options de la liste pour afficher tous les genres.',
  'genre_list_hidden_one_genre_other': 'Un genre a moins de {min} morceaux ({count} morceaux en tout). Touchez « Min. {min} » dans les options de la liste pour afficher tous les genres.',
  'genre_list_hidden_genres_one': '{genres} genres ont moins de {min} morceaux ({count} morceau en tout). Touchez « Min. {min} » dans les options de la liste pour afficher tous les genres.',
  'genre_list_hidden_genres_other': '{genres} genres ont moins de {min} morceaux ({count} morceaux en tout). Touchez « Min. {min} » dans les options de la liste pour afficher tous les genres.',

  // An album's page (AlbumView)
  'album_not_found': 'Cet album n’est pas dans la bibliothèque.',
  'back_to_albums': 'Retour aux albums',
  'all_albums': 'Tous les albums',
  'search_album': 'Rechercher dans {title}',
  'open_jukebox_album_on': 'Ouvrir le juke-box — {title} est en cours de lecture',
  'play_album_on_deck': 'Lire {title} sur la platine',
  'click_to_open_jukebox': 'Cliquez pour ouvrir le juke-box',
  'all_albums_by_one': '{count} album de {artist}',
  'all_albums_by_other': 'Les {count} albums de {artist}',
  'tracks_matching_one': '{found} sur {count} piste correspondant à « {query} »',
  'tracks_matching_other': '{found} sur {count} pistes correspondant à « {query} »',
  'find_on_record': 'Trouver un morceau sur ce disque',
  'disc_number': 'Disque {number}',
  'nothing_on_record_matching': 'Rien sur ce disque ne correspond à « {query} ».',

  // An artist's page (ArtistView)
  'no_albums_by': 'Aucun album de {artist} dans la bibliothèque.',
  'back_to_library': 'Retour à votre bibliothèque',
  'your_library': 'Votre bibliothèque',
  'all_songs_by': 'Tous les morceaux de {artist}',
  'play_all': 'Tout lire',
  'shuffle_all': 'Tout en aléatoire',
  'their_albums_one': 'Son album ({count}) ›',
  'their_albums_other': 'Ses albums ({count}) ›',

  // The Artists tab (ArtistList)
  'showing_albums_one': '{count} album affiché — touchez pour replier',
  'showing_albums_other': '{count} albums affichés — touchez pour replier',
  'play_or_shuffle': 'Lire ou lire en aléatoire',

  // The Tracks tab (TrackList)
  'showing_first': 'Affichage des {cap} premiers sur {total}. La recherche les trouve tous.',
  'show_all_anyway': 'Afficher les {count} quand même',
  'unknown': 'Inconnu',

  // The search boxes (FindWithin, PhoneSearch)
  'search_your_library': 'Rechercher dans votre bibliothèque',
  'clear_and_close_search': 'Effacer et fermer la recherche',
  'clear_and_close': 'Effacer et fermer',

  // Resume listening (ResumeCard)
  'resume_listening': 'Reprendre l’écoute',
  'hide': 'Masquer',
  'dont_show_again': 'Ne plus afficher',

  // The shuffle button beside the list options (ShuffleLibrary)
  'shuffle_artists_all': 'Artistes en aléatoire — chaque artiste en entier, ses morceaux mélangés',
  'shuffle_artists_these': 'Ces artistes en aléatoire — chaque artiste en entier, ses morceaux mélangés',
  'shuffle_albums_all': 'Albums en aléatoire — chaque album en entier, dans l’ordre',
  'shuffle_albums_these': 'Ces albums en aléatoire — chaque album en entier, dans l’ordre',
  'shuffle_songs_all': 'Tous les morceaux en aléatoire',
  'shuffle_songs_these': 'Ces morceaux en aléatoire',

  // A song's options (TrackOptions)
  'options_for': 'Options pour {title}',
  'track_length': 'Durée {length}',
  'plays_next': 'Sera lu ensuite',
  'play_now': 'Lire maintenant',
  'play_next': 'Lire ensuite',
  'add_to_a_shelf': 'Ajouter à une étagère…',
  'go_to_album': 'Aller à l’album',
  'open_album': 'Ouvrir l’album',
  'go_to_artist': 'Aller à {artist}',
  'view_albums': 'Voir ses albums',

  // Add to queue (AddToQueue, TrackOptions)
  'add_to_queue': 'Ajouter à la file d’attente',
  'add_song_to_queue': 'Ajouter « {title} » à la file d’attente',
  'in_queue_one': '{count} morceau dans la file d’attente',
  'in_queue_other': '{count} morceaux dans la file d’attente',

  // The layout button (lib/libraryView.ts columnsLabel)
  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} par ligne',
  'layout_per_row_other': '{count} par ligne',
}

export default library
