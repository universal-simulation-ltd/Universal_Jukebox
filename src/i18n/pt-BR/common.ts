// Brazilian Portuguese (pt-BR) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
//
// Portuguese picks the "one" form for 0 as well as 1; "many" (round millions) falls back to
// `_other`, as English has no `_many` key.
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
  // Counts
  'songs_one': '{count} música',
  'songs_other': '{count} músicas',
  'tracks_one': '{count} faixa',
  'tracks_other': '{count} faixas',
  'albums_one': '{count} álbum',
  'albums_other': '{count} álbuns',
  'artists_one': '{count} artista',
  'artists_other': '{count} artistas',
  'folders_one': '{count} pasta',
  'folders_other': '{count} pastas',
  'genres_one': '{count} gênero',
  'genres_other': '{count} gêneros',

  // Durations
  'duration_min': '{min} min',
  'duration_hr': '{hr} h',
  'duration_hr_min': '{hr} h {min} min',
  'duration_unknown_suffix': '{time}+',

  // Everyday buttons
  'cancel': 'Cancelar',
  'close': 'Fechar',
  'done': 'Concluído',
  'ok': 'OK',
  'back': 'Voltar',
  'play': 'Tocar',
  'pause': 'Pausar',
  'shuffle': 'Aleatório',
  'remove': 'Remover',
  'delete': 'Excluir',
  'rename': 'Renomear',
  'save': 'Salvar',
  'open': 'Abrir',
  'more': 'Mais',
  'add': 'Adicionar',
  'edit': 'Editar',
  'clear': 'Limpar',
  'undo': 'Desfazer',
  'yes': 'Sim',
  'no': 'Não',
  'search': 'Buscar',
  'try_again': 'Tentar de novo',
  'loading': 'Carregando…',
  'next': 'Próxima',
  'previous': 'Anterior',
  'show_more': 'Mostrar mais',
  'show_less': 'Mostrar menos',
  'on': 'Ativado',
  'off': 'Desativado',

  'unknown_artist': 'Artista desconhecido',
  'unknown_album': 'Álbum desconhecido',
  'list_and': '{a} e {b}',
}

export default common
