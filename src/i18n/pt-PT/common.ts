// European Portuguese (pt-PT) — common strings. Every key in ../en/common.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
//
// Plurals: `_one` and `_other` only (English has no `_many`, so `_other` covers round millions).
import type { Draft } from '../en/index.ts'

const common: Draft['common'] = {
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
  'genres_one': '{count} género',
  'genres_other': '{count} géneros',

  'duration_min': '{min} min',
  'duration_hr': '{hr} h',
  'duration_hr_min': '{hr} h {min} min',
  'duration_unknown_suffix': '{time}+',

  'cancel': 'Cancelar',
  'close': 'Fechar',
  'done': 'Concluído',
  'ok': 'OK',
  'back': 'Voltar',
  'play': 'Reproduzir',
  'pause': 'Pausa',
  'shuffle': 'Aleatório',
  'remove': 'Remover',
  'delete': 'Eliminar',
  'rename': 'Mudar o nome',
  'save': 'Guardar',
  'open': 'Abrir',
  'more': 'Mais',
  'add': 'Adicionar',
  'edit': 'Editar',
  'clear': 'Limpar',
  'undo': 'Anular',
  'yes': 'Sim',
  'no': 'Não',
  'search': 'Pesquisar',
  'try_again': 'Tentar novamente',
  'loading': 'A carregar…',
  'next': 'Seguinte',
  'previous': 'Anterior',
  'show_more': 'Mostrar mais',
  'show_less': 'Mostrar menos',
  'on': 'Ligado',
  'off': 'Desligado',

  'unknown_artist': 'Artista desconhecido',
  'unknown_album': 'Álbum desconhecido',
  'list_and': '{a} e {b}',
}

export default common
