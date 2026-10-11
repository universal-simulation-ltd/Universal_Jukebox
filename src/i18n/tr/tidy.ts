// Turkish (tr) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Kitaplığınıza dönün',
  'title': 'Kitaplığınızı düzenleyin',
  'intro': 'Kendi diskinizde bulunan eksik kapaklar ve tutarsız etiketler yüzünden ikiye bölünmüş plaklar. Çevrimiçi hiçbir şey aranmaz ve {strong} — bu yalnızca buradaki kitaplığı düzeltir.',
  'intro_strong': 'müzik dosyalarınız asla değiştirilmez',
  'looking': 'Kitaplığınız inceleniyor…',
  'covers_access': 'Eksik kapaklar müzik dosyalarınızda aranır; bunun için klasörünüze yeniden erişim gerekir.',
  'allow_access': 'Erişime izin ver',
  'covers_phone': 'Telefonda düzenleme, ikiye bölünmüş plakları arar. Kapaklar, dosyalarınız taranırken onlardan gelir.',
  'nothing_split': 'Yapılacak bir şey yok; ikiye bölünmüş görünen plak yok.',
  'applied_one': 'Bitti — {count} değişiklik uygulandı. Kitaplıktan ayrı saklandıkları için yeniden taramadan etkilenmezler.',
  'applied_other': 'Bitti — {count} değişiklik uygulandı. Kitaplıktan ayrı saklandıkları için yeniden taramadan etkilenmezler.',
  'look_again': 'Yeniden bak',
  'nothing_to_do_all_art': 'Yapılacak bir şey yok — her albümün kapağı zaten var ve ikiye bölünmüş görünen plak yok.',
  'nothing_to_do_checked_one': 'Yapılacak bir şey yok — kapağı olmayan {count} albüm denetlendi ve diskte kullanılabilecek bir şey bulunamadı; ikiye bölünmüş görünen plak da yok.',
  'nothing_to_do_checked_other': 'Yapılacak bir şey yok — kapağı olmayan {count} albüm denetlendi ve diskte kullanılabilecek bir şey bulunamadı; ikiye bölünmüş görünen plak da yok.',
  'nothing_to_do_note': 'Uygulama yalnızca dosyalarınızda zaten bulunan ya da yanlarındaki klasörde duran kapakları kullanır — internete asla sormaz; bu yüzden orada olmayan bir kapağı da uyduramaz.',
  'suggestions_one': '{count} öneri · {selected} seçili',
  'suggestions_other': '{count} öneri · {selected} seçili',
  'select_all': 'Tümünü seç',
  'select_none': 'Hiçbirini seçme',
  'section_covers': 'Diskinizde bulunan kapaklar ({count})',
  'section_merges': 'İkiye bölünmüş plaklar ({count})',
  'cover_from_folder': 'Albümün klasöründe bulundu: {file}.',
  'cover_from_track': 'Şu dosyanın içindeki kapaktan alındı: {file}.',
  'move_tracks_into_one': '{count} parçayı “{title}” albümüne taşı',
  'move_tracks_into_other': '{count} parçayı “{title}” albümüne taşı',
  'reason_split_artists': 'Aynı albüm adı, aynı klasör ({folder}), farklı sanatçı etiketleri.',
  'reason_split_artists_root': 'Aynı albüm adı, aynı klasör (seçilen klasör), farklı sanatçı etiketleri.',
  'reason_loose_track': 'Bu parçanın albüm etiketi yok, ama plağın geri kalanıyla aynı klasörde ({folder}) duruyor.',
  'reason_loose_track_root': 'Bu parçanın albüm etiketi yok, ama plağın geri kalanıyla aynı klasörde (seçilen klasör) duruyor.',
  'reason_loose_tracks': 'Bu parçaların albüm etiketi yok, ama plağın geri kalanıyla aynı klasörde ({folder}) duruyorlar.',
  'reason_loose_tracks_root': 'Bu parçaların albüm etiketi yok, ama plağın geri kalanıyla aynı klasörde (seçilen klasör) duruyorlar.',
  'apply_changes_one': '{count} değişikliği uygula',
  'apply_changes_other': '{count} değişikliği uygula',
  'apply_changes': 'Değişiklikleri uygula',
  'files_not_touched': 'Dosyalarınıza dokunulmaz. Geri almak için kitaplığı unutun ve yeniden tarayın.',
}

export default tidy
