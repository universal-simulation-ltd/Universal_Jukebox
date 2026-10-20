// German (de) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  'nothing_matching': 'Nichts passt zu „{query}“.',
  'no_genre_big_enough_one': 'Kein Genre hier hat mindestens {count} Song, also gibt es nichts einzusortieren. Schalte zurück auf A–Z.',
  'no_genre_big_enough_other': 'Kein Genre hier hat mindestens {count} Songs, also gibt es nichts einzusortieren. Schalte zurück auf A–Z.',
  'no_full_albums_one': 'Keine ganzen Alben – jedes Album hier hat weniger als {count} Titel. Tippe auf „Ganze Alben“, um alle Alben zu zeigen.',
  'no_full_albums_other': 'Keine ganzen Alben – jedes Album hier hat weniger als {count} Titel. Tippe auf „Ganze Alben“, um alle Alben zu zeigen.',
  'no_albums_yet': 'Noch keine Alben.',
  'no_artist_matching': 'Kein Interpret passt zu „{query}“.',
  'no_big_artists_one': 'Noch kein Interpret hat mindestens {count} Song. Tippe auf „Min. {count}“, um alle Interpreten zu zeigen.',
  'no_big_artists_other': 'Noch kein Interpret hat mindestens {count} Songs. Tippe auf „Min. {count}“, um alle Interpreten zu zeigen.',
  'no_artists_yet': 'Noch keine Interpreten.',
  'no_tracks_yet': 'Noch keine Titel.',

  'no_genre': 'Kein Genre',
  'genre_footnote_one_genre_one': '{count} Song nicht angezeigt – ein Genre hat weniger als {min} Songs. Unter A–Z ist alles da.',
  'genre_footnote_one_genre_other': '{count} Songs nicht angezeigt – ein Genre hat weniger als {min} Songs. Unter A–Z ist alles da.',
  'genre_footnote_genres_one': '{count} Song nicht angezeigt – {genres} Genres haben weniger als {min} Songs. Unter A–Z ist alles da.',
  'genre_footnote_genres_other': '{count} Songs nicht angezeigt – {genres} Genres haben weniger als {min} Songs. Unter A–Z ist alles da.',
  'no_genre_matching': 'Kein Genre passt zu „{query}“.',
  'no_music_yet': 'Noch keine Musik.',
  'no_genre_listed_one': 'Kein Genre hier hat mindestens {count} Song. Tippe in den Listenoptionen auf „Min. {count}“, um alle Genres zu zeigen.',
  'no_genre_listed_other': 'Kein Genre hier hat mindestens {count} Songs. Tippe in den Listenoptionen auf „Min. {count}“, um alle Genres zu zeigen.',
  'genre_list_hidden_one_genre_one': 'Ein Genre hat weniger als {min} Songs (insgesamt {count} Song). Tippe in den Listenoptionen auf „Min. {min}“, um alle Genres zu zeigen.',
  'genre_list_hidden_one_genre_other': 'Ein Genre hat weniger als {min} Songs (insgesamt {count} Songs). Tippe in den Listenoptionen auf „Min. {min}“, um alle Genres zu zeigen.',
  'genre_list_hidden_genres_one': '{genres} Genres haben weniger als {min} Songs (insgesamt {count} Song). Tippe in den Listenoptionen auf „Min. {min}“, um alle Genres zu zeigen.',
  'genre_list_hidden_genres_other': '{genres} Genres haben weniger als {min} Songs (insgesamt {count} Songs). Tippe in den Listenoptionen auf „Min. {min}“, um alle Genres zu zeigen.',

  'album_not_found': 'Dieses Album ist nicht in der Mediathek.',
  'back_to_albums': 'Zurück zu den Alben',
  'all_albums': 'Alle Alben',
  'search_album': 'In {title} suchen',
  'open_jukebox_album_on': 'Jukebox öffnen – {title} läuft',
  'play_album_on_deck': '{title} auf dem Abspielgerät abspielen',
  'click_to_open_jukebox': 'Klicken, um die Jukebox zu öffnen',
  'all_albums_by_one': '{count} Album von {artist}',
  'all_albums_by_other': 'Alle {count} Alben von {artist}',
  'tracks_matching_one': '{found} von {count} Titel passt zu „{query}“',
  'tracks_matching_other': '{found} von {count} Titeln passen zu „{query}“',
  'find_on_record': 'Einen Song auf dieser Platte finden',
  'disc_number': 'CD {number}',
  'nothing_on_record_matching': 'Nichts auf dieser Platte passt zu „{query}“.',

  'no_albums_by': 'Keine Alben von {artist} in der Mediathek.',
  'back_to_library': 'Zurück zur Mediathek',
  'your_library': 'Deine Mediathek',
  'all_songs_by': 'Alle Songs von {artist}',
  'play_all': 'Alle abspielen',
  'shuffle_all': 'Alle zufällig',
  'their_albums_one': '{count} Album ›',
  'their_albums_other': '{count} Alben ›',

  'showing_albums_one': '{count} Album angezeigt – tippen zum Einklappen',
  'showing_albums_other': '{count} Alben angezeigt – tippen zum Einklappen',
  'play_or_shuffle': 'Abspielen oder zufällig',

  'showing_first': 'Die ersten {cap} von {total} werden angezeigt. Die Suche findet jeden davon.',
  'show_all_anyway': 'Trotzdem alle {count} anzeigen',
  'unknown': 'Unbekannt',

  'search_your_library': 'Mediathek durchsuchen',
  'clear_and_close_search': 'Suchfeld leeren und schließen',
  'clear_and_close': 'Leeren und schließen',

  'resume_listening': 'Weiterhören',

  'listen_to_this': 'Hör mal rein',
  'lyrics_available': 'Songtext vorhanden',

  'another': 'Anderer',

  'another_song': 'Ein anderer Song per Zufall',
  'hide': 'Ausblenden',
  'dont_show_again': 'Nicht mehr anzeigen',

  'shuffle_artists_all': 'Interpreten mischen – jeder Interpret komplett, seine Songs zufällig',
  'shuffle_artists_these': 'Diese Interpreten mischen – jeder Interpret komplett, seine Songs zufällig',
  'shuffle_albums_all': 'Alben mischen – jedes Album komplett, in seiner Reihenfolge',
  'shuffle_albums_these': 'Diese Alben mischen – jedes Album komplett, in seiner Reihenfolge',
  'shuffle_songs_all': 'Alle Songs zufällig abspielen',
  'shuffle_songs_these': 'Diese Songs zufällig abspielen',

  'options_for': 'Optionen für {title}',

  'track_length': 'Länge {length}',
  'plays_next': 'Wird als Nächstes gespielt',
  'play_now': 'Jetzt abspielen',
  'play_next': 'Als Nächstes spielen',
  'add_to_a_shelf': 'Zu einem Regal hinzufügen …',
  'go_to_album': 'Zum Album',
  'open_album': 'Album öffnen',
  'go_to_artist': 'Zu {artist}',
  'view_albums': 'Alben ansehen',

  'add_to_queue': 'Zur Warteschlange hinzufügen',
  'add_song_to_queue': '„{title}“ zur Warteschlange hinzufügen',
  'in_queue_one': '{count} Song in der Warteschlange',
  'in_queue_other': '{count} Songs in der Warteschlange',

  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': '{count} pro Reihe',
  'layout_per_row_other': '{count} pro Reihe',
  'shuffle_album': 'Album zufällig abspielen',
  'remove_from_jukebox': 'Aus Jukebox entfernen',
  'remove_confirm': '{name} aus Jukebox entfernen?',
  'remove_explain': 'Es wird nicht mehr angezeigt oder abgespielt. Nichts wird gelöscht: Du kannst es jederzeit unter „Diese App anpassen“ › „Deine Mediathek“ zurückholen.',
  'remove_yes': 'Entfernen',
  'removed': 'Entfernt',
}

export default library
