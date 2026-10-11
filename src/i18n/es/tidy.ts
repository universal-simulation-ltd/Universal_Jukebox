// Spanish (es) — tidy strings. Every key in ../en/tidy.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const tidy: Draft['tidy'] = {
  'back_to_library': 'Volver a tu biblioteca',
  'title': 'Ordenar tu biblioteca',
  'intro': 'Carátulas que faltan encontradas en tu propio disco, y discos que han quedado partidos en dos por etiquetas incoherentes. No se busca nada en internet y {strong}: esto solo corrige la biblioteca de aquí.',
  'intro_strong': 'tus archivos de música nunca se modifican',
  'looking': 'Revisando tu biblioteca…',
  'covers_access': 'Las carátulas que faltan se buscan en tus archivos de música, y para eso hace falta de nuevo tu carpeta.',
  'allow_access': 'Permitir el acceso',
  'covers_phone': 'En el teléfono, la limpieza busca discos partidos en dos. Las carátulas salen de tus archivos al analizarlos.',
  'nothing_split': 'Nada que hacer: ningún disco parece partido en dos.',
  'applied_one': 'Listo: se ha aplicado {count} cambio. Se mantendrá aunque vuelvas a escanear, porque se guarda aparte de la biblioteca.',
  'applied_other': 'Listo: se han aplicado {count} cambios. Se mantendrán aunque vuelvas a escanear, porque se guardan aparte de la biblioteca.',
  'look_again': 'Volver a revisar',
  'nothing_to_do_all_art': 'No hay nada que hacer: todos los álbumes ya tienen su carátula y ningún disco parece haber quedado partido en dos.',
  'nothing_to_do_checked_one': 'No hay nada que hacer: se ha revisado {count} álbum sin carátula y no se ha encontrado nada en el disco que usar, y ningún disco parece haber quedado partido en dos.',
  'nothing_to_do_checked_other': 'No hay nada que hacer: se han revisado {count} álbumes sin carátula y no se ha encontrado nada en el disco que usar, y ningún disco parece haber quedado partido en dos.',
  'nothing_to_do_note': 'La app solo usa carátulas que ya están en tus archivos o en la carpeta que los contiene; nunca pregunta a internet, y por eso tampoco puede inventarse una carátula que no existe.',
  'suggestions_one': '{count} sugerencia · seleccionadas: {selected}',
  'suggestions_other': '{count} sugerencias · seleccionadas: {selected}',
  'select_all': 'Seleccionar todo',
  'select_none': 'No seleccionar nada',
  'section_covers': 'Carátulas encontradas en tu disco ({count})',
  'section_merges': 'Discos partidos en dos ({count})',
  'cover_from_folder': 'Se ha encontrado {file} en la carpeta del álbum.',
  'cover_from_track': 'Tomada de la carátula que ya contiene {file}.',
  'move_tracks_into_one': 'Mover {count} pista a «{title}»',
  'move_tracks_into_other': 'Mover {count} pistas a «{title}»',
  'reason_split_artists': 'Mismo nombre de álbum, misma carpeta ({folder}), distintas etiquetas de artista.',
  'reason_split_artists_root': 'Mismo nombre de álbum, misma carpeta (la carpeta elegida), distintas etiquetas de artista.',
  'reason_loose_track': 'Esta pista no tiene etiqueta de álbum, pero está en la misma carpeta ({folder}) que el resto del disco.',
  'reason_loose_track_root': 'Esta pista no tiene etiqueta de álbum, pero está en la misma carpeta (la carpeta elegida) que el resto del disco.',
  'reason_loose_tracks': 'Estas pistas no tienen etiqueta de álbum, pero están en la misma carpeta ({folder}) que el resto del disco.',
  'reason_loose_tracks_root': 'Estas pistas no tienen etiqueta de álbum, pero están en la misma carpeta (la carpeta elegida) que el resto del disco.',
  'apply_changes_one': 'Aplicar {count} cambio',
  'apply_changes_other': 'Aplicar {count} cambios',
  'apply_changes': 'Aplicar cambios',
  'files_not_touched': 'Tus archivos no se tocan. Para deshacerlo, olvida la biblioteca y vuelve a escanear.',
}

export default tidy
