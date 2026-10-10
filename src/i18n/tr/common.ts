// Turkish (tr) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  'songs_one': '{count} şarkı',
  'songs_other': '{count} şarkı',
  'tracks_one': '{count} parça',
  'tracks_other': '{count} parça',
  'albums_one': '{count} albüm',
  'albums_other': '{count} albüm',
  'artists_one': '{count} sanatçı',
  'artists_other': '{count} sanatçı',
  'folders_one': '{count} klasör',
  'folders_other': '{count} klasör',
  'genres_one': '{count} tür',
  'genres_other': '{count} tür',

  'duration_min': '{min} dk',
  'duration_hr': '{hr} sa',
  'duration_hr_min': '{hr} sa {min} dk',
  'duration_unknown_suffix': '{time}+',

  'cancel': 'İptal',
  'close': 'Kapat',
  'done': 'Bitti',
  'ok': 'Tamam',
  'back': 'Geri',
  'play': 'Çal',
  'pause': 'Duraklat',
  'shuffle': 'Karıştır',
  'remove': 'Kaldır',
  'delete': 'Sil',
  'rename': 'Yeniden adlandır',
  'save': 'Kaydet',
  'open': 'Aç',
  'more': 'Diğer',
  'add': 'Ekle',
  'edit': 'Düzenle',
  'clear': 'Temizle',
  'undo': 'Geri al',
  'yes': 'Evet',
  'no': 'Hayır',
  'search': 'Ara',
  'try_again': 'Yeniden dene',
  'loading': 'Yükleniyor…',
  'next': 'Sonraki',
  'previous': 'Önceki',
  'show_more': 'Daha fazla göster',
  'show_less': 'Daha az göster',
  'on': 'Açık',
  'off': 'Kapalı',

  'unknown_artist': 'Bilinmeyen sanatçı',
  'unknown_album': 'Bilinmeyen albüm',
  'list_and': '{a} ve {b}',
}

export default common
