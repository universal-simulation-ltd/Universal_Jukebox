// Brazilian Portuguese (pt-BR) — lyrics strings. Every key in ../en/lyrics.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const lyrics: Draft['lyrics'] = {
  // The panel's header
  'heading': 'Letra',
  'sing_along': 'Cantar junto',
  'more_options': 'Mais opções de letra',
  'fewer_options': 'Menos opções de letra',
  'more_options_title': 'Substituir a letra, em volta do disco, acompanhando',

  // Where the words came from
  'source_file': 'Das tags do próprio arquivo',
  'source_upload': 'Do seu arquivo de letra',
  'source_online': 'Do lrclib.net',
  'following_along': 'acompanhando a música',

  // The panel's states
  'looking': 'Procurando…',
  'instrumental': 'O lrclib.net diz que esta é instrumental — não há letra para mostrar.',
  'untagged': 'Esta faixa não tem artista nem título nas tags, então não há por onde procurá-la. Dar um nome a ela na arrumação resolveria isso.',
  'error_fallback': 'Não deu certo.',
  'none_in_file': 'Não há letra salva neste arquivo.',
  'none_anywhere': 'Não há letra neste arquivo, e o lrclib.net também não tem esta.',
  'offer_online': 'O Jukebox pode procurá-la no lrclib.net. Para isso, envia o artista, o título, o álbum e a duração da faixa — nada mais, e nada se você não ativar.',
  'look_up_online': 'Procurar on-line',
  'more_in_settings': 'Mais sobre isso em Ajustar este app',

  // A timed sheet's lock
  'following': 'Acompanhando',
  'free_scroll': 'Rolagem livre',
  'following_title': 'Acompanhando a música — destrave para rolar a letra você mesmo',
  'free_scroll_title': 'Rolagem livre — trave para voltar a acompanhar a música',

  // Adding or replacing a lyrics file
  'add_file_hint': 'Tem a letra? Um arquivo .lrc sincronizado acompanha a música; texto simples aparece como a letra.',
  'lrcget_link': 'Como conseguir letras para toda a sua biblioteca',
  'add_file': 'Adicionar um arquivo de letra',
  'replace': 'Substituir a letra',
  'not_lyrics': 'Isso não parece uma letra. É preciso um arquivo de texto simples ou um arquivo .lrc.',
  'unreadable': 'Não foi possível ler esse arquivo como texto.',

  // "Around the record" chip
  'around': 'Em volta do disco',
  'around_on_title': 'A letra está em volta do disco — toque para tirá-la',
  'around_off_title': 'Mostrar a letra em volta do disco enquanto é cantada',

  // Sing along
  'sing_along_dialog': 'Cantar junto — {title}',
  'close_sing_along': 'Fechar o cantar junto',

  // lrclib.net lookup errors
  'error_offline': 'Sem conexão, então não deu para procurar nada.',
  'error_unreachable': 'Não foi possível acessar o lrclib.net.',
  'error_timeout': 'O lrclib.net não respondeu a tempo.',
  'error_status': 'O lrclib.net retornou {status}.',
}

export default lyrics
