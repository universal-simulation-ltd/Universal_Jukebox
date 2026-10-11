// German (de) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  'heading': 'Songtext',
  'sing_along': 'Mitsingen',
  'more_options': 'Mehr Songtext-Optionen',
  'fewer_options': 'Weniger Songtext-Optionen',
  'more_options_title': 'Songtext ersetzen, rund um die Platte, mitlaufen',

  'source_file': 'Aus den Tags dieser Datei',
  'source_upload': 'Aus deiner Songtext-Datei',
  'source_online': 'Von lrclib.net',
  'following_along': 'läuft mit',

  'looking': 'Wird gesucht …',
  'instrumental': 'Laut lrclib.net ist dieser Titel ein Instrumental – es gibt keinen Text zum Anzeigen.',
  'untagged': 'Dieser Titel hat weder Interpret noch Titel in seinen Tags, also gibt es nichts, wonach gesucht werden kann. Ihn beim Aufräumen zu benennen, würde das beheben.',
  'error_fallback': 'Das hat nicht geklappt.',
  'none_in_file': 'In dieser Datei ist kein Songtext gespeichert.',
  'none_anywhere': 'Kein Songtext in dieser Datei, und lrclib.net hat auch keinen dafür.',
  'offer_online': 'Jukebox kann ihn stattdessen auf lrclib.net suchen. Dabei werden Interpret, Titel, Album und Länge des Titels gesendet – sonst nichts, und gar nichts, solange du es nicht einschaltest.',
  'look_up_online': 'Online suchen',
  'more_in_settings': 'Mehr dazu in „Diese App anpassen“',

  'following': 'Mitlaufen',
  'free_scroll': 'Frei scrollen',
  'following_title': 'Läuft mit dem Song mit – entsperren, um den Songtext selbst zu scrollen',
  'free_scroll_title': 'Freies Scrollen – sperren, um wieder dem Song zu folgen',

  'add_file_hint': 'Hast du den Text selbst? Eine .lrc-Datei mit Zeitangaben läuft mit dem Song mit; einfacher Text wird als Songtext angezeigt.',

  'lrcget_link': 'So bekommst du Liedtexte für deine ganze Bibliothek',
  'add_file': 'Songtext-Datei hinzufügen',
  'replace': 'Songtext ersetzen',
  'not_lyrics': 'Das sieht nicht nach einem Songtext aus. Gebraucht wird eine einfache Textdatei oder eine .lrc-Datei.',
  'unreadable': 'Diese Datei konnte nicht als Text gelesen werden.',

  'around': 'Rund um die Platte',
  'around_on_title': 'Der Text steht rund um die Platte – tippen, um ihn zu entfernen',
  'around_off_title': 'Den Text beim Singen rund um die Platte anzeigen',

  'sing_along_dialog': 'Mitsingen – {title}',
  'close_sing_along': 'Mitsingen schließen',

  'error_offline': 'Keine Verbindung, also konnte nichts gesucht werden.',
  'error_unreachable': 'lrclib.net war nicht erreichbar.',
  'error_timeout': 'lrclib.net hat nicht rechtzeitig geantwortet.',
  'error_status': 'lrclib.net hat {status} zurückgegeben.',
}

export default lyrics
