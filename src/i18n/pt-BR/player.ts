// Brazilian Portuguese (pt-BR) — player strings. Every key in ../en/player.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const player: Draft['player'] = {
  // Now Playing
  'nothing_playing': 'Nada tocando.',
  'pick_an_album': 'Escolha um álbum',
  'cueing_up': 'Preparando…',
  'dont_show_again': 'Não mostrar isto de novo',
  'changing_records': 'Trocando de disco…',
  'spec_size_mb': '{size} MB',
  'spec_track': 'Faixa {number}',
  'queued_position_one': '{position} de {count} faixa na fila',
  'queued_position_other': '{position} de {count} faixas na fila',
  'show_lyrics': 'Mostrar a folha da letra',
  'hide_lyrics': 'Ocultar a folha da letra',
  'back_to_library': 'Voltar para a sua biblioteca',

  // Transport
  'seek': 'Posição',
  'seek_position': '{position} de {duration}',
  'queue_position_one': '{position} de {count} faixa',
  'queue_position_other': '{position} de {count} faixas',
  'skip_intro': 'Pular a introdução',
  'previous_track': 'Faixa anterior',
  'next_track': 'Próxima faixa',

  // Player bar
  'mute': 'Silenciar',
  'unmute': 'Ativar o som',
  'volume': 'Volume',
  'volume_on_device': 'O volume fica nos botões do aparelho',
  'volume_on_device_hint': 'Este aparelho não deixa um app definir o volume de reprodução — isso fica com os próprios botões de volume.',
  'playing_next_show': 'O que toca a seguir',
  'playing_next_hide': 'Ocultar o que toca a seguir',
  'playing_next': 'Tocando a seguir',
  'shuffle_on': 'Aleatório: sim',
  'shuffle_off': 'Aleatório: não',
  'and_more_one': 'e mais {count}',
  'and_more_other': 'e mais {count}',

  // Up next
  'up_next': 'A seguir',
  'hide': 'Ocultar',
  'nothing_after': 'Nada depois desta.',
  'play_now': 'Tocar {title} agora',
  'remove_from_queue': 'Remover {title} da fila',
  'show_more_one': 'Mostrar mais {count}',
  'show_more_other': 'Mostrar mais {count}',
  'show_all_one': 'Mostrar {count}',
  'show_all_other': 'Mostrar todas as {count}',

  // Waiting to go on
  'waiting_to_go_on': 'Esperando a vez',
  'more_records_aria_one': 'Mostrar mais {count} disco em A seguir',
  'more_records_aria_other': 'Mostrar mais {count} discos em A seguir',
  'more_records_one': 'mais {count} disco',
  'more_records_other': 'mais {count} discos',
  'in_the_queue': 'na fila',

  // Sleep timer
  'sleep': 'Dormir',
  'sleep_aria_off': 'Timer de desligamento — toque para 15 minutos, segure para escolher um tempo',
  'sleep_aria_next_one': 'A música para em {left} — toque para {count} minuto, segure para escolher',
  'sleep_aria_next_other': 'A música para em {left} — toque para {count} minutos, segure para escolher',
  'sleep_aria_to_off': 'A música para em {left} — toque para desligar, segure para escolher',
  'sleep_left_min': '{min} min',
  'sleep_left_hr_min': '{hr}h{min}',
  'sleep_timer': 'Timer de desligamento',
  'sleep_fade_note': 'A música vai sumindo no último minuto e depois para.',
  'hours': 'Horas',
  'minutes': 'Minutos',
  'picker_hours': '{hours} h',
  'picker_minutes': '{minutes} min',
  'preset_min': '{min} min',
  'preset_hr': '{hr}h',
  'preset_hr_min': '{hr}h{min}',
  'turn_off': 'Desligar',
  'choose_a_time': 'Escolha um tempo',
  'stop_in': 'Parar em {left}',

  // Keep awake
  'keep_awake': 'Tela ligada',
  'keep_awake_aria_on': 'A tela fica ligada enquanto esta página estiver aberta — toque para deixá-la bloquear',
  'keep_awake_aria_off': 'Manter a tela ligada enquanto esta página estiver aberta',

  // Quiet and Loud
  'level_quiet': 'Baixo',
  'level_loud': 'Alto',
  'level_minus_db': '−{db} dB',
  'level_plus_db': '+{db} dB',
  'level_quiet_aria_off': 'Baixo: desativado — toque para {db} dB',
  'level_quiet_aria_on_next': 'Baixo: {shown} — toque para {db} dB',
  'level_quiet_aria_on_off': 'Baixo: {shown} — toque para desativar',
  'level_loud_aria_off': 'Alto: desativado — toque para {db} dB',
  'level_loud_aria_on_next': 'Alto: {shown} — toque para {db} dB',
  'level_loud_aria_on_off': 'Alto: {shown} — toque para desativar',

  // Output
  'output': 'Saída',
  'output_aria_away': 'O som está indo para outro aparelho — escolha por onde ele sai',
  'output_aria_here': 'Escolha por onde o som sai',

  // The machine
  'player_aria': 'Aparelho: {deck}. Toque para {next}, ou toque e segure para escolher entre todos',

  // Preview
  'preview_stop_aria': 'Parar a prévia de {title}',
  'preview_aria_one': 'Prévia de {title} — {count} segundo a partir do segundo {start}',
  'preview_aria_other': 'Prévia de {title} — {count} segundos a partir do segundo {start}',
  'preview_stop_title': 'Parar a prévia',
  'preview_title_one': 'Prévia de {count} segundo',
  'preview_title_other': 'Prévia de {count} segundos',

  // Bedside
  'bedside': 'Cabeceira',
  'bedside_aria': 'Cabeceira: o disco, a hora e o timer de desligamento, com pouca luz e a tela sempre ligada',
  'close_bedside': 'Fechar a cabeceira',
  'bedside_nothing_playing': 'Nada tocando',

  // Playback messages
  'error_cant_decode_browser': 'Este navegador não consegue decodificar esse arquivo. Se for um .m4a, pode ser Apple Lossless em vez de AAC — o Universal Converter pode convertê-lo em FLAC.',
  'error_cant_decode_app': 'O app não consegue decodificar esse arquivo. Se for um .m4a, pode ser Apple Lossless em vez de AAC — o Universal Converter pode convertê-lo em FLAC.',
  'error_damaged': 'Esse arquivo parece danificado — o áudio parou no meio da decodificação.',
  'error_unreadable': 'Não foi possível ler o arquivo. Se ele estiver num disco externo, confira se o disco continua conectado.',
  'error_cancelled': 'A reprodução foi cancelada.',
  'error_wont_play': 'Esse arquivo não tocou.',
  'error_unreachable': 'Não dá mais para acessar esse arquivo. Se a pasta mudou de lugar ou o disco foi desconectado, escolha a pasta de novo.',
  'error_unreachable_restore': 'Não dá mais para acessar esse arquivo. Escolha a pasta de novo para voltar a tocar.',
  'error_unplayable_iphone': 'Não dá para tocar essa música — ela não está mais neste iPhone, ou é um download do Apple Music, que o iOS não deixa outros apps tocarem.',
  'skipped_not_on_iphone': 'não está mais neste iPhone',
  'skipped_file_missing': 'o arquivo sumiu',
  'foldup_hint': 'Deslize para cima para ver mais botões',
}

export default player
