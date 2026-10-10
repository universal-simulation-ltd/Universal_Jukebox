// Italian (it) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  'heading': 'Testo',
  'sing_along': 'Canta insieme',
  'more_options': 'Altre opzioni del testo',
  'fewer_options': 'Meno opzioni del testo',
  'more_options_title': 'Sostituisci il testo, intorno al disco, segui',

  'source_file': 'Dai tag di questo file',
  'source_upload': 'Dal tuo file di testo',
  'source_online': 'Da lrclib.net',
  'following_along': 'sincronizzato',

  'looking': 'Ricerca…',
  'instrumental': 'Per lrclib.net questo è uno strumentale: non ci sono parole da mostrare.',
  'untagged': 'I tag di questa traccia non hanno artista né titolo, quindi non c’è niente con cui cercarla. Assegnarle un nome nel riordino della libreria risolverebbe il problema.',
  'error_fallback': 'Non ha funzionato.',
  'none_in_file': 'In questo file non c’è nessun testo salvato.',
  'none_anywhere': 'Nessun testo in questo file, e nemmeno lrclib.net ce l’ha.',
  'offer_online': 'Jukebox può invece cercarlo su lrclib.net. Vengono inviati artista, titolo, album e durata della traccia: nient’altro, e niente del tutto se non lo attivi.',
  'look_up_online': 'Cercalo online',
  'more_in_settings': 'Maggiori informazioni in Regola questa app',

  'following': 'Segue',
  'free_scroll': 'Scorri liberamente',
  'following_title': 'Segue il brano: sblocca per scorrere il testo da solo',
  'free_scroll_title': 'Scorrimento libero: blocca per seguire di nuovo il brano',

  'add_file_hint': 'Hai il testo? Un file .lrc sincronizzato segue il brano; il testo semplice viene mostrato così com’è.',
  'add_file': 'Aggiungi un file di testo',
  'replace': 'Sostituisci il testo',
  'not_lyrics': 'Non sembra un testo di una canzone. Serve un file di testo semplice o un file .lrc.',
  'unreadable': 'Impossibile leggere quel file come testo.',

  'around': 'Intorno al disco',
  'around_on_title': 'Le parole sono intorno al disco: tocca per toglierle',
  'around_off_title': 'Mostra le parole intorno al disco mentre vengono cantate',

  'sing_along_dialog': 'Canta insieme: {title}',
  'close_sing_along': 'Chiudi Canta insieme',

  'error_offline': 'Nessuna connessione, quindi non è stato possibile cercare nulla.',
  'error_unreachable': 'Impossibile raggiungere lrclib.net.',
  'error_timeout': 'lrclib.net non ha risposto in tempo.',
  'error_status': 'lrclib.net ha restituito {status}.',
}

export default lyrics
