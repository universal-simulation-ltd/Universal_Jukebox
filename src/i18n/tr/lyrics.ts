// Turkish (tr) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  'heading': 'Şarkı sözleri',
  'sing_along': 'Birlikte söyle',
  'more_options': 'Diğer şarkı sözü seçenekleri',
  'fewer_options': 'Daha az şarkı sözü seçeneği',
  'more_options_title': 'Sözleri değiştir, plağın çevresinde, takip',

  'source_file': 'Bu dosyanın kendi etiketlerinden',
  'source_upload': 'Şarkı sözü dosyanızdan',
  'source_online': 'lrclib.net’ten',
  'following_along': 'şarkıyla birlikte ilerliyor',

  'looking': 'Aranıyor…',
  'instrumental': 'lrclib.net’e göre bu parça enstrümantal — gösterilecek söz yok.',
  'untagged': 'Bu parçanın etiketlerinde sanatçı ya da başlık yok, bu yüzden arama yapmak için bir bilgi yok. Kitaplığı düzenle sayfasında ona bir ad vermek bunu düzeltir.',
  'error_fallback': 'Bu işe yaramadı.',
  'none_in_file': 'Bu dosyada kayıtlı şarkı sözü yok.',
  'none_anywhere': 'Bu dosyada şarkı sözü yok ve lrclib.net’te de bulunmuyor.',
  'offer_online': 'Jukebox bunun yerine sözleri lrclib.net’te arayabilir. Bunun için parçanın sanatçısı, başlığı, albümü ve süresi gönderilir — başka hiçbir şey gönderilmez, siz açmadıkça da hiçbir şey gönderilmez.',
  'look_up_online': 'Sözleri çevrimiçi ara',
  'more_in_settings': 'Bu konuda daha fazlası: Bu uygulamayı ayarla',

  'following': 'Takipte',
  'free_scroll': 'Serbest kaydırma',
  'following_title': 'Şarkı takip ediliyor — sözleri kendiniz kaydırmak için kilidi açın',
  'free_scroll_title': 'Serbest kaydırma — şarkıyı yeniden takip etmek için kilitleyin',

  'add_file_hint': 'Sözler sizde mi var? Zamanlamalı bir .lrc dosyası şarkıyla birlikte ilerler; düz metin ise sözler olarak gösterilir.',

  'lrcget_link': 'Tüm kitaplığınız için şarkı sözleri nasıl alınır',
  'add_file': 'Şarkı sözü dosyası ekle',
  'replace': 'Sözleri değiştir',
  'not_lyrics': 'Bu, şarkı sözüne benzemiyor. Düz metin dosyası ya da .lrc dosyası gerekiyor.',
  'unreadable': 'O dosya metin olarak okunamadı.',

  'around': 'Plağın çevresinde',
  'around_on_title': 'Sözler plağın çevresinde — kaldırmak için dokunun',
  'around_off_title': 'Sözleri söylendikçe plağın çevresinde göster',

  'sing_along_dialog': 'Birlikte söyle — {title}',
  'close_sing_along': 'Birlikte söyle görünümünü kapat',

  'error_offline': 'Bağlantı yok, bu yüzden hiçbir şey aranamadı.',
  'error_unreachable': 'lrclib.net’e ulaşılamadı.',
  'error_timeout': 'lrclib.net’e zamanında ulaşılamadı.',
  'error_status': 'lrclib.net şu yanıtı döndürdü: {status}.',
}

export default lyrics
