// European Portuguese (pt-PT) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Voltar à sua biblioteca',
  'title': 'Arrumar a sua biblioteca',
  'intro': 'Capas em falta encontradas no seu próprio disco, e discos que foram divididos em dois por etiquetas inconsistentes. Nada é procurado online e {strong} — isto só corrige a biblioteca aqui.',
  'intro_strong': 'os seus ficheiros de música nunca são alterados',
  'looking': 'A percorrer a sua biblioteca…',
  'unavailable': 'A arrumação lê os seus ficheiros para encontrar capas, por isso precisa de acesso à pasta de música. Escolha-a novamente a partir do aviso na biblioteca e volte aqui.',
  'applied_one': 'Concluído — {count} alteração aplicada. Resiste a uma nova análise, porque fica guardada à parte da biblioteca.',
  'applied_other': 'Concluído — {count} alterações aplicadas. Resistem a uma nova análise, porque ficam guardadas à parte da biblioteca.',
  'look_again': 'Procurar novamente',
  'nothing_to_do_all_art': 'Nada a fazer — todos os álbuns já têm capa, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_checked_one': 'Nada a fazer — foi verificado {count} álbum sem capa e não se encontrou nada no disco para usar, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_checked_other': 'Nada a fazer — foram verificados {count} álbuns sem capa e não se encontrou nada no disco para usar, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_note': 'A aplicação só usa capas que já estejam nos seus ficheiros ou na pasta ao lado deles — nunca pergunta à internet, e é também por isso que não consegue inventar uma capa que não existe.',
  'suggestions_one': '{count} sugestão · selecionadas: {selected}',
  'suggestions_other': '{count} sugestões · selecionadas: {selected}',
  'select_all': 'Selecionar tudo',
  'select_none': 'Não selecionar nada',
  'section_covers': 'Capas encontradas no seu disco ({count})',
  'section_merges': 'Discos divididos em dois ({count})',
  'cover_from_folder': '{file} encontrado na pasta do álbum.',
  'cover_from_track': 'Retirada da capa que já está dentro de {file}.',
  'move_tracks_into_one': 'Mover {count} faixa para «{title}»',
  'move_tracks_into_other': 'Mover {count} faixas para «{title}»',
  'reason_split_artists': 'Mesmo nome de álbum, mesma pasta ({folder}), etiquetas de artista diferentes.',
  'reason_split_artists_root': 'Mesmo nome de álbum, mesma pasta (a pasta escolhida), etiquetas de artista diferentes.',
  'reason_loose_track': 'Esta faixa não tem etiqueta de álbum, mas está na mesma pasta ({folder}) que o resto do disco.',
  'reason_loose_track_root': 'Esta faixa não tem etiqueta de álbum, mas está na mesma pasta (a pasta escolhida) que o resto do disco.',
  'reason_loose_tracks': 'Estas faixas não têm etiqueta de álbum, mas estão na mesma pasta ({folder}) que o resto do disco.',
  'reason_loose_tracks_root': 'Estas faixas não têm etiqueta de álbum, mas estão na mesma pasta (a pasta escolhida) que o resto do disco.',
  'apply_changes_one': 'Aplicar {count} alteração',
  'apply_changes_other': 'Aplicar {count} alterações',
  'apply_changes': 'Aplicar alterações',
  'files_not_touched': 'Os seus ficheiros não são tocados. Para anular, esqueça a biblioteca e analise novamente.',
}

export default tidy
