// European Portuguese (pt-PT) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  'heading': 'Letra',
  'sing_along': 'Cantar',
  'more_options': 'Mais opções da letra',
  'fewer_options': 'Menos opções da letra',
  'more_options_title': 'Substituir a letra, à volta do disco, acompanhar',

  'source_file': 'Das etiquetas deste ficheiro',
  'source_upload': 'Do seu ficheiro de letra',
  'source_online': 'Do lrclib.net',
  'following_along': 'a acompanhar',

  'looking': 'A procurar…',
  'instrumental': 'O lrclib.net tem esta como instrumental — não há letra para mostrar.',
  'untagged': 'Esta faixa não tem artista nem título nas etiquetas, por isso não há nada por onde a procurar. Dar-lhe um nome na arrumação resolveria isso.',
  'error_fallback': 'Isso não funcionou.',
  'none_in_file': 'Não há letra guardada neste ficheiro.',
  'none_anywhere': 'Não há letra neste ficheiro, e o lrclib.net também não a tem.',
  'offer_online': 'Em vez disso, o Jukebox pode procurá-la no lrclib.net. Isso envia o artista, o título, o álbum e a duração da faixa — mais nada, e nada de todo se não o ativar.',
  'look_up_online': 'Procurar online',
  'more_in_settings': 'Mais sobre isto em Ajustar esta aplicação',

  'following': 'A acompanhar',
  'free_scroll': 'Livre',
  'following_title': 'A acompanhar a música — desbloquear para percorrer a letra manualmente',
  'free_scroll_title': 'A percorrer livremente — bloquear para voltar a acompanhar a música',

  'add_file_hint': 'Tem a letra? Um ficheiro .lrc sincronizado acompanha a música; o texto simples aparece como letra.',
  'add_file': 'Adicionar um ficheiro de letra',
  'replace': 'Substituir a letra',
  'not_lyrics': 'Isso não parece uma letra. É preciso um ficheiro de texto simples ou um ficheiro .lrc.',
  'unreadable': 'Não foi possível ler esse ficheiro como texto.',

  'around': 'À volta do disco',
  'around_on_title': 'A letra está à volta do disco — tocar para a retirar',
  'around_off_title': 'Mostrar a letra à volta do disco à medida que é cantada',

  'sing_along_dialog': 'Cantar — {title}',
  'close_sing_along': 'Fechar o modo cantar',

  'error_offline': 'Sem ligação, por isso não foi possível procurar nada.',
  'error_unreachable': 'Não foi possível contactar o lrclib.net.',
  'error_timeout': 'O lrclib.net não respondeu a tempo.',
  'error_status': 'O lrclib.net devolveu {status}.',
}

export default lyrics
