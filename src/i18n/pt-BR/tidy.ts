// Brazilian Portuguese (pt-BR) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Voltar para a sua biblioteca',
  'title': 'Arrumar a sua biblioteca',
  'intro': 'Capas que faltavam, encontradas no seu próprio disco, e discos que foram divididos em dois por tags inconsistentes. Nada é consultado on-line e {strong} — isto só corrige a biblioteca aqui.',
  'intro_strong': 'seus arquivos de música nunca são alterados',
  'looking': 'Examinando a sua biblioteca…',
  'covers_access': 'As capas que faltam são procuradas nos seus arquivos de música, e para isso a sua pasta é necessária de novo.',
  'allow_access': 'Permitir acesso',
  'covers_phone': 'No celular, a arrumação procura discos divididos em dois. As capas vêm dos seus arquivos quando são lidos.',
  'nothing_split': 'Nada a fazer: nenhum disco parece dividido em dois.',
  'applied_one': 'Pronto — {count} alteração aplicada. Ela vai continuar valendo depois de escanear de novo, porque fica guardada separada da biblioteca.',
  'applied_other': 'Pronto — {count} alterações aplicadas. Elas vão continuar valendo depois de escanear de novo, porque ficam guardadas separadas da biblioteca.',
  'look_again': 'Examinar de novo',
  'nothing_to_do_all_art': 'Nada a fazer — todos os álbuns já têm capa, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_checked_one': 'Nada a fazer — {count} álbum sem capa foi verificado e não há nada no disco para usar, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_checked_other': 'Nada a fazer — {count} álbuns sem capa foram verificados e não há nada no disco para usar, e nenhum disco parece ter sido dividido em dois.',
  'nothing_to_do_note': 'O app só usa capas que já estão nos seus arquivos ou na pasta ao lado deles — ele nunca consulta a internet, e é por isso também que não consegue inventar uma capa que não existe.',
  'suggestions_one': '{count} sugestão · selecionadas: {selected}',
  'suggestions_other': '{count} sugestões · selecionadas: {selected}',
  'select_all': 'Selecionar tudo',
  'select_none': 'Desmarcar tudo',
  'section_covers': 'Capas encontradas no seu disco ({count})',
  'section_merges': 'Discos divididos em dois ({count})',
  'cover_from_folder': '{file} encontrado na pasta do álbum.',
  'cover_from_track': 'Tirada da capa que já está dentro de {file}.',
  'move_tracks_into_one': 'Mover {count} faixa para “{title}”',
  'move_tracks_into_other': 'Mover {count} faixas para “{title}”',
  'reason_split_artists': 'Mesmo nome de álbum, mesma pasta ({folder}), tags de artista diferentes.',
  'reason_split_artists_root': 'Mesmo nome de álbum, mesma pasta (a pasta escolhida), tags de artista diferentes.',
  'reason_loose_track': 'Esta faixa não tem tag de álbum, mas está na mesma pasta ({folder}) que o resto do disco.',
  'reason_loose_track_root': 'Esta faixa não tem tag de álbum, mas está na mesma pasta (a pasta escolhida) que o resto do disco.',
  'reason_loose_tracks': 'Estas faixas não têm tag de álbum, mas estão na mesma pasta ({folder}) que o resto do disco.',
  'reason_loose_tracks_root': 'Estas faixas não têm tag de álbum, mas estão na mesma pasta (a pasta escolhida) que o resto do disco.',
  'apply_changes_one': 'Aplicar {count} alteração',
  'apply_changes_other': 'Aplicar {count} alterações',
  'apply_changes': 'Aplicar alterações',
  'files_not_touched': 'Seus arquivos não são alterados. Para desfazer, esqueça a biblioteca e escaneie de novo.',
}

export default tidy
