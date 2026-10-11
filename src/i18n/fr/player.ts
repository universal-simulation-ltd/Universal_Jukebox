// French (fr) — player strings. Every key in ../en/player.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const player: Draft['player'] = {
  // Now Playing (NowPlaying)
  'nothing_playing': 'Aucune lecture en cours.',
  'pick_an_album': 'Choisir un album',
  'cueing_up': 'Mise en place…',
  'dont_show_again': 'Ne plus afficher',
  'changing_records': 'Changement de disque…',
  'spec_size_mb': '{size} Mo',
  'spec_track': 'Piste {number}',
  'queued_position_one': '{position} sur {count} piste en file d’attente',
  'queued_position_other': '{position} sur {count} pistes en file d’attente',
  'show_lyrics': 'Afficher la feuille de paroles',
  'hide_lyrics': 'Masquer la feuille de paroles',
  'back_to_library': 'Retour à votre bibliothèque',

  // Transport (StageTransport, PlayerBar)
  'seek': 'Position',
  'seek_position': '{position} sur {duration}',
  'queue_position_one': '{position} sur {count} piste',
  'queue_position_other': '{position} sur {count} pistes',
  'skip_intro': 'Passer l’intro',
  'previous_track': 'Piste précédente',
  'next_track': 'Piste suivante',

  // Player bar (PlayerBar)
  'mute': 'Couper le son',
  'unmute': 'Rétablir le son',
  'volume': 'Volume',
  'volume_on_device': 'Volume : boutons de votre appareil',
  'volume_on_device_hint': 'Cet appareil ne laisse pas une app régler le volume de lecture — il dépend de ses propres boutons de volume.',
  'playing_next_show': 'Afficher la suite',
  'playing_next_hide': 'Masquer la suite',
  'playing_next': 'À suivre',
  'shuffle_on': 'Aléatoire',
  'shuffle_off': 'Dans l’ordre',
  'and_more_one': 'et {count} autre',
  'and_more_other': 'et {count} autres',

  // Up next (Queue)
  'up_next': 'À suivre',
  'hide': 'Masquer',
  'nothing_after': 'Rien après celui-ci.',
  'play_now': 'Lire {title} maintenant',
  'remove_from_queue': 'Retirer {title} de la file d’attente',
  'show_more_one': 'Afficher {count} de plus',
  'show_more_other': 'Afficher {count} de plus',
  'show_all_one': 'Afficher les {count}',
  'show_all_other': 'Afficher les {count}',

  // Waiting to go on (UpNextReel)
  'waiting_to_go_on': 'En attente',
  'more_records_aria_one': 'Afficher le {count} autre disque dans À suivre',
  'more_records_aria_other': 'Afficher les {count} autres disques dans À suivre',
  'more_records_one': '{count} autre disque',
  'more_records_other': '{count} autres disques',
  'in_the_queue': 'dans la file d’attente',

  // Sleep timer (SleepButton, lib/sleep.ts)
  'sleep': 'Veille',
  'sleep_aria_off': 'Minuteur de veille — touchez pour 15 minutes, maintenez pour choisir une durée',
  'sleep_aria_next_one': 'La musique s’arrête dans {left} — touchez pour {count} minute, maintenez pour choisir',
  'sleep_aria_next_other': 'La musique s’arrête dans {left} — touchez pour {count} minutes, maintenez pour choisir',
  'sleep_aria_to_off': 'La musique s’arrête dans {left} — touchez pour désactiver, maintenez pour choisir',
  'sleep_left_min': '{min} min',
  'sleep_left_hr_min': '{hr} h {min}',
  'sleep_timer': 'Minuteur de veille',
  'sleep_fade_note': 'La musique baisse progressivement pendant la dernière minute, puis s’arrête.',
  'hours': 'Heures',
  'minutes': 'Minutes',
  'picker_hours': '{hours} h',
  'picker_minutes': '{minutes} min',
  'preset_min': '{min} min',
  'preset_hr': '{hr} h',
  'preset_hr_min': '{hr} h {min}',
  'turn_off': 'Désactiver',
  'choose_a_time': 'Choisir une durée',
  'stop_in': 'Arrêt dans {left}',

  // Keep awake (KeepAwakeButton)
  'keep_awake': 'Anti-veille',
  'keep_awake_aria_on': 'L’écran reste allumé tant que cette page est ouverte — touchez pour le laisser se verrouiller',
  'keep_awake_aria_off': 'Garder l’écran allumé tant que cette page est ouverte',

  // Quiet and Loud (LevelButton)
  'level_quiet': 'Plus bas',
  'level_loud': 'Plus fort',
  'level_minus_db': '−{db} dB',
  'level_plus_db': '+{db} dB',
  'level_quiet_aria_off': 'Plus bas : désactivé — touchez pour {db} dB',
  'level_quiet_aria_on_next': 'Plus bas : {shown} — touchez pour {db} dB',
  'level_quiet_aria_on_off': 'Plus bas : {shown} — touchez pour désactiver',
  'level_loud_aria_off': 'Plus fort : désactivé — touchez pour {db} dB',
  'level_loud_aria_on_next': 'Plus fort : {shown} — touchez pour {db} dB',
  'level_loud_aria_on_off': 'Plus fort : {shown} — touchez pour désactiver',

  // Output (OutputButton)
  'output': 'Sortie',
  'output_aria_away': 'Le son est envoyé vers un autre appareil — choisissez où il sort',
  'output_aria_here': 'Choisissez où sort le son',

  // The machine (PlayerButton)
  'player_aria': 'Platine : {deck}. Touchez pour {next}, ou maintenez pour choisir parmi toutes',

  // Preview (PreviewButton)
  'preview_stop_aria': 'Arrêter la pré-écoute de {title}',
  'preview_aria_one': 'Pré-écouter {title} — {count} seconde à partir de la seconde {start}',
  'preview_aria_other': 'Pré-écouter {title} — {count} secondes à partir de la seconde {start}',
  'preview_stop_title': 'Arrêter la pré-écoute',
  'preview_title_one': 'Pré-écouter {count} seconde',
  'preview_title_other': 'Pré-écouter {count} secondes',

  // Bedside (Bedside)
  'bedside': 'Chevet',
  'bedside_aria': 'Chevet : le disque, l’heure et le minuteur de veille, en lumière tamisée, avec l’écran maintenu allumé',
  'close_bedside': 'Fermer Chevet',
  'bedside_nothing_playing': 'Aucune lecture en cours',

  // Playback messages (lib/audio.ts, stores/playerStore.ts)
  'error_cant_decode_browser': 'Ce navigateur ne peut pas décoder ce fichier. S’il s’agit d’un .m4a, il est peut-être en Apple Lossless plutôt qu’en AAC — Universal Converter peut le convertir en FLAC.',
  'error_cant_decode_app': 'L’application ne peut pas décoder ce fichier. S’il s’agit d’un .m4a, il est peut-être en Apple Lossless plutôt qu’en AAC — Universal Converter peut le convertir en FLAC.',
  'error_damaged': 'Ce fichier semble endommagé — le son s’est interrompu en cours de décodage.',
  'error_unreadable': 'Le fichier n’a pas pu être lu. S’il se trouve sur un disque externe, vérifiez qu’il est toujours branché.',
  'error_cancelled': 'La lecture a été annulée.',
  'error_wont_play': 'Ce fichier n’a pas voulu se lire.',
  'error_unreachable': 'Ce fichier n’est plus accessible. Si le dossier a été déplacé ou le disque débranché, choisissez à nouveau le dossier.',
  'error_unreachable_restore': 'Ce fichier n’est plus accessible. Choisissez à nouveau le dossier pour rétablir la lecture.',
  'error_unplayable_iphone': 'Ce morceau ne peut pas être lu — il n’est plus sur cet iPhone, ou c’est un téléchargement Apple Music, qu’iOS ne laisse pas les autres apps lire.',
  'skipped_not_on_iphone': 'n’est plus sur cet iPhone',
  'skipped_file_missing': 'fichier introuvable',
  'foldup_hint': 'Balayez vers le haut pour plus de boutons',
}

export default player
