// French (fr) — decks strings. Every key in ../en/decks.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const RIDES = 'Suit votre volume, et ne se déclenche jamais tout seul.'

const decks: Draft['decks'] = {
  // Vinyl
  'vinyl_label': 'Vinyle',
  'vinyl_hint': 'Un disque qui tourne à 33⅓ tours, la pochette de l’album en guise d’étiquette centrale, et un bras de lecture qui avance vers le centre au fil du morceau.',
  'vinyl_start_title': 'Poser un disque',
  'vinyl_start_note': 'L’animation de la platine vinyle, le compte à rebours et le bruit de l’aiguille qui se pose.',
  'vinyl_sound_label': 'Son de pose de l’aiguille',
  'vinyl_sound_hint': `Un bruit sourd et une seconde de craquements quand le bras se pose — en posant un disque, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'vinyl_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et met le bras en place, et chaque changement de piste repose l’aiguille.',
  'vinyl_album_change_hint': 'Seulement quand un autre disque est posé. Les pistes d’un même album s’enchaînent en douceur.',
  'vinyl_animation_label': 'Afficher l’animation de changement de disque',
  'vinyl_animation_hint': 'Règle aussi la fréquence du son de pose de l’aiguille — les deux sont un seul et même événement.',
  'vinyl_mute_label': 'Couper le son de pose de l’aiguille',
  'vinyl_volume_label': 'Volume du son de pose de l’aiguille',
  'vinyl_volume_off_hint': 'Activez le son de pose de l’aiguille pour en régler le volume.',
  'vinyl_summary_off': '{mode}, son de pose de l’aiguille désactivé',
  'vinyl_summary_on': '{mode}, son de pose de l’aiguille activé',
  'vinyl_summary_at': '{mode}, son de pose de l’aiguille à {level}',

  // CD
  'cd_label': 'CD',
  'cd_hint': 'Un lecteur CD portable au couvercle ouvert, le disque dans son logement et le laser qui se déplace du centre vers l’extérieur — le sens dans lequel un CD est réellement lu.',
  'cd_start_title': 'Insérer un disque',
  'cd_start_note': 'L’animation du disque, le compte à rebours et le bruit du disque qui prend de la vitesse.',
  'cd_sound_label': 'Son de démarrage du disque',
  'cd_sound_hint': `Le clic du couvercle et le ronronnement d’un disque qui prend de la vitesse — en lançant un disque, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'cd_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et lance le disque, et chaque changement de piste remet le laser en place.',
  'cd_album_change_hint': 'Seulement quand un autre disque est inséré. Les pistes d’un même album s’enchaînent en douceur.',
  'cd_animation_label': 'Afficher l’animation de changement de disque',
  'cd_animation_hint': 'Règle aussi la fréquence du son de démarrage du disque — les deux sont un seul et même événement.',
  'cd_mute_label': 'Couper le son de démarrage du disque',
  'cd_volume_label': 'Volume du son de démarrage du disque',
  'cd_volume_off_hint': 'Activez le son de démarrage du disque pour en régler le volume.',
  'cd_summary_off': '{mode}, son de démarrage du disque désactivé',
  'cd_summary_on': '{mode}, son de démarrage du disque activé',
  'cd_summary_at': '{mode}, son de démarrage du disque à {level}',

  // Cassette
  'cassette_label': 'Cassette',
  'cassette_hint': 'Un baladeur cassette, la bande passant de la bobine de gauche à celle de droite : le remplissage des bobines montre où vous en êtes.',
  'cassette_start_title': 'Insérer une cassette',
  'cassette_start_note': 'L’animation de la cassette, le compte à rebours et le bruit de la touche lecture.',
  'cassette_sound_label': 'Son de la touche lecture',
  'cassette_sound_hint': `Le claquement de la touche lecture qui s’enclenche et un instant de souffle de bande — en insérant une cassette, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'cassette_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et enfonce la touche lecture, et chaque changement de piste remet la tête de lecture en place.',
  'cassette_album_change_hint': 'Seulement quand une autre cassette est insérée. Les pistes d’un même album s’enchaînent en douceur.',
  'cassette_animation_label': 'Afficher l’animation de changement de cassette',
  'cassette_animation_hint': 'Règle aussi la fréquence du son de la touche lecture — les deux sont un seul et même événement.',
  'cassette_mute_label': 'Couper le son de la touche lecture',
  'cassette_volume_label': 'Volume du son de la touche lecture',
  'cassette_volume_off_hint': 'Activez le son de la touche lecture pour en régler le volume.',
  'cassette_summary_off': '{mode}, son de la touche lecture désactivé',
  'cassette_summary_on': '{mode}, son de la touche lecture activé',
  'cassette_summary_at': '{mode}, son de la touche lecture à {level}',

  // Reel-to-reel — the label is "Magnétophone" (the glossary's "Magnétophone à bandes" does not fit ~12 characters)
  'reel_label': 'Magnétophone',
  'reel_hint': 'Un magnétophone à deux bobines ouvertes, la bande passant devant les têtes — la bobine de gauche se vide sur celle de droite au fil du morceau, en tournant de plus en plus vite.',
  'reel_start_title': 'Installer une bobine',
  'reel_start_note': 'L’animation du magnétophone à bandes, le compte à rebours et le bruit du mécanisme qui s’enclenche.',
  'reel_sound_label': 'Son du mécanisme',
  'reel_sound_hint': `Le claquement du solénoïde quand le mécanisme s’enclenche, les bobines qui tendent la bande et un léger souffle — en installant une bobine, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'reel_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et plaque le galet presseur contre le cabestan, et chaque changement de piste remet la tête de lecture en place.',
  'reel_album_change_hint': 'Seulement quand une autre bobine est installée. Les pistes d’un même album s’enchaînent en douceur.',
  'reel_animation_label': 'Afficher l’animation de changement de bobine',
  'reel_animation_hint': 'Règle aussi la fréquence du son du mécanisme — les deux sont un seul et même événement.',
  'reel_mute_label': 'Couper le son du mécanisme',
  'reel_volume_label': 'Volume du son du mécanisme',
  'reel_volume_off_hint': 'Activez le son du mécanisme pour en régler le volume.',
  'reel_summary_off': '{mode}, son du mécanisme désactivé',
  'reel_summary_on': '{mode}, son du mécanisme activé',
  'reel_summary_at': '{mode}, son du mécanisme à {level}',

  // Jukebox (the machine: "Juke-box" in French, per the glossary)
  'jukebox_label': 'Juke-box',
  'jukebox_hint': 'Le meuble qui a donné son nom à l’application — le 45 tours sorti du rack par la pince, posé sur le plateau sous l’arche lumineuse, puis joué.',
  'jukebox_start_title': 'Sortir un disque du rack',
  'jukebox_start_note': 'Le mécanisme de sélection, le compte à rebours et le bruit du disque qu’on charge.',
  'jukebox_sound_label': 'Son du mécanisme de chargement',
  'jukebox_sound_hint': `Le claquement de la pince, le disque qui pivote jusqu’au plateau et l’aiguille qui s’y pose — en sélectionnant un disque, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'jukebox_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et envoie la pince, et chaque changement de piste repose l’aiguille.',
  'jukebox_album_change_hint': 'Seulement quand un autre disque est posé. Les pistes d’un même album s’enchaînent en douceur.',
  'jukebox_animation_label': 'Afficher l’animation de changement de disque',
  'jukebox_animation_hint': 'Règle aussi la fréquence du son du mécanisme de chargement — les deux sont un seul et même événement.',
  'jukebox_mute_label': 'Couper le son du mécanisme de chargement',
  'jukebox_volume_label': 'Volume du son du mécanisme de chargement',
  'jukebox_volume_off_hint': 'Activez le son du mécanisme de chargement pour en régler le volume.',
  'jukebox_summary_off': '{mode}, son du mécanisme de chargement désactivé',
  'jukebox_summary_on': '{mode}, son du mécanisme de chargement activé',
  'jukebox_summary_at': '{mode}, son du mécanisme de chargement à {level}',

  // Pocket player
  'pocket_label': 'Baladeur',
  'pocket_hint': 'Un baladeur numérique avec la pochette de l’album à l’écran, une molette cliquable en dessous et la barre de progression qui se remplit au fil du morceau.',
  'pocket_start_title': 'Choisir un album',
  'pocket_start_note': 'Le baladeur qui se réveille, le compte à rebours et le clic de la molette.',
  'pocket_sound_label': 'Son de la molette cliquable',
  'pocket_sound_hint': `Le cliquetis de la molette et l’appui sur le bouton central — en lançant un album, en changeant de piste et en pré-écoutant un morceau. ${RIDES}`,
  'pocket_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et réveille l’écran, et chaque changement de piste remet le curseur de lecture au début.',
  'pocket_album_change_hint': 'Seulement quand un autre album est lancé. Les pistes d’un même album s’enchaînent en douceur.',
  'pocket_animation_label': 'Afficher l’animation de changement d’album',
  'pocket_animation_hint': 'Règle aussi la fréquence du son de la molette cliquable — les deux sont un seul et même événement.',
  'pocket_mute_label': 'Couper le son de la molette cliquable',
  'pocket_volume_label': 'Volume du son de la molette cliquable',
  'pocket_volume_off_hint': 'Activez le son de la molette cliquable pour en régler le volume.',
  'pocket_summary_off': '{mode}, son de la molette cliquable désactivé',
  'pocket_summary_on': '{mode}, son de la molette cliquable activé',
  'pocket_summary_at': '{mode}, son de la molette cliquable à {level}',

  // Automatic
  'automatic_label': 'Automatique',
  'automatic_hint': 'Chaque album sur la machine de son époque, selon l’année de l’album — un juke-box pour les plus anciens, puis le vinyle, la cassette, le CD et un baladeur. Vous choisissez à partir de quelle année chacun prend le relais.',
  'automatic_hint_no_pocket': 'Chaque album sur la machine de son époque, selon l’année de l’album — un juke-box pour les plus anciens, puis le vinyle, la cassette et le CD. Vous choisissez à partir de quelle année chacun prend le relais.',
  'automatic_start_title': 'Lancer la lecture',
  'automatic_start_note': 'L’animation de chargement, le compte à rebours et le son de la machine à laquelle appartient l’album.',
  'automatic_sound_label': 'Son de démarrage',
  'automatic_sound_hint': `La machine qui démarre\u202F: une pince de juke-box, une aiguille qui se pose, une touche lecture, un disque qui prend de la vitesse ou une molette cliquable, selon l’année de l’album. ${RIDES}`,
  'automatic_every_track_hint': 'Toute lecture — une piste, un album, un résultat de recherche — passe par la platine et démarre la machine de l’époque de l’album, et chaque changement de piste remet la tête de lecture en place.',
  'automatic_album_change_hint': 'Seulement quand un autre disque est posé. Les pistes d’un même album s’enchaînent en douceur.',
  'automatic_animation_label': 'Afficher l’animation de changement de disque',
  'automatic_animation_hint': 'Règle aussi la fréquence du son de démarrage — les deux sont un seul et même événement.',
  'automatic_mute_label': 'Couper le son de démarrage',
  'automatic_volume_label': 'Volume du son de démarrage',
  'automatic_volume_off_hint': 'Activez le son de démarrage pour en régler le volume.',
  'automatic_summary_off': '{mode}, son de démarrage désactivé',
  'automatic_summary_on': '{mode}, son de démarrage activé',
  'automatic_summary_at': '{mode}, son de démarrage à {level}',

  // Shared by every machine
  'mute_hint': 'Cochez pour vous en passer. {sound_hint}',

  // The deck on Now Playing (Deck.tsx, DeckSwiper.tsx)
  'open_album': 'Ouvrir l’album',
  'open_album_named': 'Ouvrir {album}',
  'peek_previous': 'Précédent : {album}',
  'peek_next': 'Suivant : {album}',

  // The machines' own controls (decks/*.tsx)
  'previous_track': 'Piste précédente',
  'next_track': 'Piste suivante',
  'scrub_tonearm': 'Bras de lecture — faites-le glisser sur le disque pour vous déplacer dans le morceau',
  'scrub_laser': 'Laser — faites-le glisser le long de son rail pour vous déplacer dans le morceau',
  'scrub_cassette': 'Bobine de la cassette — tournez dans le sens des aiguilles d’une montre pour avancer dans le morceau, dans le sens inverse pour revenir en arrière',
  'scrub_reel': 'Bobine de bande — tournez dans le sens inverse des aiguilles d’une montre pour avancer dans le morceau, dans le sens des aiguilles d’une montre pour revenir en arrière',
  'scrub_click_wheel': 'Molette cliquable — faites-en le tour dans le sens des aiguilles d’une montre pour avancer dans le morceau, dans le sens inverse pour revenir en arrière',
  'scrub_position': '{position} sur {duration}',
  'pocket_menu': 'MENU',

  // The deck picker (DeckPicker.tsx)
  'picker_title': 'Lire sur',

  // The row of round buttons under the song (PlayModes.tsx)
  'group_play_order': 'Ordre de lecture',
  'group_sound': 'Son',
  'group_screen': 'Écran',
  'customise': 'Modifier',
  'customise_aria': 'Choisir les boutons affichés ici, dans Régler cette application',
}

export default decks
