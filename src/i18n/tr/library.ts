// Turkish (tr) — library strings. Every key in ../en/library.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const library: Draft['library'] = {
  'nothing_matching': '“{query}” ile eşleşen bir şey yok.',
  'no_genre_big_enough_one': 'Burada {count} veya daha fazla şarkısı olan tür yok, bu yüzden gruplanacak bir şey yok. A–Z sıralamasına geri dönün.',
  'no_genre_big_enough_other': 'Burada {count} veya daha fazla şarkısı olan tür yok, bu yüzden gruplanacak bir şey yok. A–Z sıralamasına geri dönün.',
  'no_full_albums_one': 'Tam albüm yok — buradaki her albümde {count} parçadan az var. Tüm albümleri göstermek için “Tam albümler” düğmesine dokunun.',
  'no_full_albums_other': 'Tam albüm yok — buradaki her albümde {count} parçadan az var. Tüm albümleri göstermek için “Tam albümler” düğmesine dokunun.',
  'no_albums_yet': 'Henüz albüm yok.',
  'no_artist_matching': '“{query}” ile eşleşen sanatçı yok.',
  'no_big_artists_one': 'Henüz {count} veya daha fazla şarkısı olan sanatçı yok. Tüm sanatçıları göstermek için “En az {count}” düğmesine dokunun.',
  'no_big_artists_other': 'Henüz {count} veya daha fazla şarkısı olan sanatçı yok. Tüm sanatçıları göstermek için “En az {count}” düğmesine dokunun.',
  'no_artists_yet': 'Henüz sanatçı yok.',
  'no_tracks_yet': 'Henüz parça yok.',

  'no_genre': 'Tür yok',
  'genre_footnote_one_genre_one': '{count} şarkı gösterilmiyor — bir türde {min} şarkıdan az var. Hepsi A–Z listesinde duruyor.',
  'genre_footnote_one_genre_other': '{count} şarkı gösterilmiyor — bir türde {min} şarkıdan az var. Hepsi A–Z listesinde duruyor.',
  'genre_footnote_genres_one': '{count} şarkı gösterilmiyor — {genres} türde {min} şarkıdan az var. Hepsi A–Z listesinde duruyor.',
  'genre_footnote_genres_other': '{count} şarkı gösterilmiyor — {genres} türde {min} şarkıdan az var. Hepsi A–Z listesinde duruyor.',
  'no_genre_matching': '“{query}” ile eşleşen tür yok.',
  'no_music_yet': 'Henüz müzik yok.',
  'no_genre_listed_one': 'Burada {count} veya daha fazla şarkısı olan tür yok. Tüm türleri göstermek için liste seçeneklerindeki “En az {count}” düğmesine dokunun.',
  'no_genre_listed_other': 'Burada {count} veya daha fazla şarkısı olan tür yok. Tüm türleri göstermek için liste seçeneklerindeki “En az {count}” düğmesine dokunun.',
  'genre_list_hidden_one_genre_one': 'Bir türde {min} şarkıdan az var (toplam {count} şarkı). Tüm türleri göstermek için liste seçeneklerindeki “En az {min}” düğmesine dokunun.',
  'genre_list_hidden_one_genre_other': 'Bir türde {min} şarkıdan az var (toplam {count} şarkı). Tüm türleri göstermek için liste seçeneklerindeki “En az {min}” düğmesine dokunun.',
  'genre_list_hidden_genres_one': '{genres} türde {min} şarkıdan az var (toplam {count} şarkı). Tüm türleri göstermek için liste seçeneklerindeki “En az {min}” düğmesine dokunun.',
  'genre_list_hidden_genres_other': '{genres} türde {min} şarkıdan az var (toplam {count} şarkı). Tüm türleri göstermek için liste seçeneklerindeki “En az {min}” düğmesine dokunun.',

  'album_not_found': 'O albüm kitaplıkta yok.',
  'back_to_albums': 'Albümlere dön',
  'all_albums': 'Tüm albümler',
  'search_album': '{title} içinde ara',
  'open_jukebox_album_on': 'Jukebox’ı aç — {title} çalıyor',
  'play_album_on_deck': '{title} albümünü çalara koy',
  'click_to_open_jukebox': 'Jukebox’ı açmak için tıklayın',
  'all_albums_by_one': '{artist} sanatçısının tüm albümleri ({count})',
  'all_albums_by_other': '{artist} sanatçısının tüm albümleri ({count})',
  'tracks_matching_one': '{count} parçadan {found} tanesi “{query}” ile eşleşiyor',
  'tracks_matching_other': '{count} parçadan {found} tanesi “{query}” ile eşleşiyor',
  'find_on_record': 'Bu plakta bir şarkı bul',
  'disc_number': 'Disk {number}',
  'nothing_on_record_matching': 'Bu plakta “{query}” ile eşleşen bir şey yok.',

  'no_albums_by': 'Kitaplıkta {artist} sanatçısına ait albüm yok.',
  'back_to_library': 'Kitaplığınıza dönün',
  'your_library': 'Kitaplığınız',
  'all_songs_by': '{artist} sanatçısının tüm şarkıları',
  'play_all': 'Tümünü çal',
  'shuffle_all': 'Tümünü karıştır',
  'their_albums_one': 'Sanatçının {count} albümü ›',
  'their_albums_other': 'Sanatçının {count} albümü ›',

  'showing_albums_one': '{count} albüm gösteriliyor — kapatmak için dokunun',
  'showing_albums_other': '{count} albüm gösteriliyor — kapatmak için dokunun',
  'play_or_shuffle': 'Çal ya da karıştır',

  'showing_first': '{total} parçanın ilk {cap} tanesi gösteriliyor. Arama hepsini bulur.',
  'show_all_anyway': 'Yine de tümünü göster ({count})',
  'unknown': 'Bilinmiyor',

  'search_your_library': 'Kitaplığınızda arayın',
  'clear_and_close_search': 'Arama kutusunu temizle ve kapat',
  'clear_and_close': 'Temizle ve kapat',

  'resume_listening': 'Dinlemeye devam et',
  'hide': 'Gizle',
  'dont_show_again': 'Bir daha gösterme',

  'shuffle_artists_all': 'Sanatçıları karıştır — her sanatçı eksiksiz, şarkıları karışık',
  'shuffle_artists_these': 'Bu sanatçıları karıştır — her sanatçı eksiksiz, şarkıları karışık',
  'shuffle_albums_all': 'Albümleri karıştır — her albüm eksiksiz ve sırasıyla',
  'shuffle_albums_these': 'Bu albümleri karıştır — her albüm eksiksiz ve sırasıyla',
  'shuffle_songs_all': 'Tüm şarkıları karıştır',
  'shuffle_songs_these': 'Bu şarkıları karıştır',

  'options_for': '{title} için seçenekler',

  'track_length': 'Süre {length}',
  'plays_next': 'Sonra çalacak',
  'play_now': 'Şimdi çal',
  'play_next': 'Sonra çal',
  'add_to_a_shelf': 'Bir rafa ekle…',
  'go_to_album': 'Albüme git',
  'open_album': 'Albümü aç',
  'go_to_artist': '{artist} sayfasına git',
  'view_albums': 'Albümlerini gör',

  'add_to_queue': 'Kuyruğa ekle',
  'add_song_to_queue': '“{title}” şarkısını kuyruğa ekle',
  'in_queue_one': 'Kuyrukta {count} şarkı',
  'in_queue_other': 'Kuyrukta {count} şarkı',

  'layout_jukebox': 'Jukebox',
  'layout_per_row_one': 'Sırada {count}',
  'layout_per_row_other': 'Sırada {count}',
}

export default library
