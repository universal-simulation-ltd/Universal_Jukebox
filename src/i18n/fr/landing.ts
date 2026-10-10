// French (fr) — landing strings. Every key in ../en/landing.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const landing: Draft['landing'] = {
  // Heading and intro (Landing)
  'title_native_phone': 'Lit la musique de votre téléphone',
  'title_native_ipad': 'Lit la musique de votre iPad',
  'title_desktop': 'Lit la musique de votre ordinateur',
  'title_web': 'Lit toute votre bibliothèque musicale, dans votre navigateur',
  'intro': 'Il récupère les tags et les vraies pochettes dans vos propres fichiers musicaux, puis les lit — MP3, M4A, FLAC et WAV. Rien n’est envoyé en ligne, et vous n’avez pas besoin de compte.',
  'find_my_music': 'Trouver ma musique',
  'where_is_your_music': 'Où est votre musique ?',
  'not_streaming': 'Ce n’est pas un service de streaming. Il lit les fichiers que vous avez déjà.',
  'turntable_alt': 'Un disque sur une platine vinyle',
  'copying_progress': 'Copie de {done} sur {total}…',
  'copying_progress_named': 'Copie de {done} sur {total} — {name}…',

  // Answer: on this device (Landing)
  'device_title_phone': 'Sur ce téléphone',
  'device_title_ipad': 'Sur cet iPad',
  'device_title_device': 'Sur cet appareil',
  'device_title_computer': 'Sur cet ordinateur',
  'device_sub_native': 'Des fichiers musicaux copiés ou téléchargés',
  'device_sub_web': 'Un dossier de fichiers musicaux',
  'device_say_own_iphone': 'Placez-la dans l’app Fichiers, sous Sur mon iPhone → Universal Jukebox — par AirDrop, ou en la glissant depuis un ordinateur. Les dossiers sont acceptés.',
  'device_say_own_ipad': 'Placez-la dans l’app Fichiers, sous Sur mon iPad → Universal Jukebox — par AirDrop, ou en la glissant depuis un ordinateur. Les dossiers sont acceptés.',
  'device_say_jukebox_folder': 'Placez-la dans le dossier Universal Jukebox de l’app Fichiers — les dossiers sont acceptés.',
  'device_say_native': 'Choisissez le dossier où se trouve votre musique — en général, Musique. Les sous-dossiers sont acceptés, et l’application garde l’autorisation de le lire.',
  'device_say_web': 'Choisissez le dossier où se trouve votre musique — en général, Musique. Les sous-dossiers sont acceptés.',
  'remembers_desktop': 'L’application s’en souvient : votre bibliothèque sera toujours là la prochaine fois.',
  'remembers_browser': 'Ce navigateur peut mémoriser le dossier : votre bibliothèque sera toujours là la prochaine fois — il vous suffira de confirmer l’accès une fois.',
  'remembers_browser_install': 'Ce navigateur peut mémoriser le dossier : votre bibliothèque sera toujours là la prochaine fois — il vous suffira de confirmer l’accès une fois. Installez-le comme application depuis la barre d’adresse de Chrome, et même cela ne vous sera plus demandé.',
  'remembers_never': 'Ce navigateur ne peut pas mémoriser de dossier : vous le choisirez à nouveau à chaque visite. Votre bibliothèque et ses pochettes sont conservées, elle revient donc instantanément.',
  'scan_jukebox_folder': 'Analyser le dossier Jukebox',
  'choose_the_folder': 'Choisir le dossier',
  'choose_different_folder': 'Choisir un autre dossier',
  'add_songs_one_at_a_time': 'Ajouter des morceaux un par un',
  'pick_individual_files': 'Ou choisir des fichiers un par un',

  // Answer: in my Apple Music library (Landing)
  'apple_ios_title': 'Dans ma bibliothèque Apple Music',
  'apple_ios_sub_phone': 'Morceaux synchronisés sur ce téléphone depuis un ordinateur',
  'apple_ios_sub_ipad': 'Morceaux synchronisés sur cet iPad depuis un ordinateur',
  'apple_ios_say_phone': 'Les morceaux synchronisés sur ce téléphone, tels qu’ils apparaissent dans l’app Musique. Les téléchargements de l’abonnement Apple Music sont protégés, et iOS ne laisse pas les autres apps les lire.',
  'apple_ios_say_ipad': 'Les morceaux synchronisés sur cet iPad, tels qu’ils apparaissent dans l’app Musique. Les téléchargements de l’abonnement Apple Music sont protégés, et iOS ne laisse pas les autres apps les lire.',
  'use_music_library': 'Utiliser ma bibliothèque musicale',
  'apple_computer_title': 'Dans ma bibliothèque Apple Music ou iTunes',
  'apple_computer_sub': 'L’app Musique ou iTunes de cet ordinateur',
  'apple_computer_say': 'Ces morceaux sont des fichiers dans un dossier. Choisissez votre dossier {music}, puis {media} (ou {itunes}). Les morceaux achetés ou ajoutés par vous seront lus ; les téléchargements de l’abonnement Apple Music sont protégés et ne peuvent pas l’être.',
  'apple_folder_music': 'Musique',
  'apple_folder_media': 'Musique → Media',
  'apple_folder_itunes': 'iTunes → iTunes Media',

  // Answer: in the cloud (Landing)
  'cloud_title': 'Dans le cloud',
  'cloud_sub': 'iCloud Drive, Google Drive, Dropbox, OneDrive…',
  'cloud_say_ios_phone': 'Si votre cloud apparaît dans l’app Fichiers — c’est toujours le cas d’iCloud Drive —, choisissez-y votre dossier de musique. Sinon, téléchargez d’abord la musique sur ce téléphone.',
  'cloud_say_ios_ipad': 'Si votre cloud apparaît dans l’app Fichiers — c’est toujours le cas d’iCloud Drive —, choisissez-y votre dossier de musique. Sinon, téléchargez d’abord la musique sur cet iPad.',
  'cloud_say_android': 'Sur Android, les apps de cloud ne peuvent généralement pas partager un dossier entier : téléchargez d’abord la musique sur ce téléphone — dans Music ou Download —, puis choisissez ce dossier.',
  'cloud_say_own_folder': 'Téléchargez d’abord la musique sur ce téléphone, puis placez-la dans le dossier Universal Jukebox de l’app Fichiers.',
  'cloud_say_touch': 'Téléchargez d’abord la musique sur cet appareil, puis choisissez le dossier où elle se trouve.',
  'cloud_say_computer': 'Si l’application de votre cloud est installée sur cet ordinateur, elle y garde un dossier — choisissez votre musique à l’intérieur. Sinon, téléchargez d’abord la musique.',

  // Answer: on a streaming service, and the example library (Landing)
  'streaming_title': 'Sur un service de streaming',
  'streaming_sub': 'Spotify, Apple Music, YouTube Music, Amazon Music…',
  'streaming_sorry': 'Désolé, nous ne pouvons rien faire pour celui-ci.',
  'streaming_say': 'Les services de streaming enferment leurs morceaux dans leurs propres apps — même ceux téléchargés —, si bien qu’aucun autre lecteur ne peut les ouvrir. Jukebox lit les fichiers musicaux qui vous appartiennent : des CD que vous avez copiés, ou des albums achetés en téléchargement.',
  'try_example': 'Essayer la bibliothèque d’exemple',
  'cutting_records': 'Gravure des disques…',
  'example_title': 'Je veux juste essayer',
  'example_sub': 'Neuf disques imaginaires, créés sur cet appareil — rien n’est téléchargé',

  // Scanning (ScanBanner)
  'scan_progress_one': '{added} / {count} pistes',
  'scan_progress_other': '{added} / {count} pistes',
  'scan_starting': 'Démarrage…',
  'scan_stop': 'Arrêter',
  'scan_stop_label': 'Arrêter la lecture de votre dossier',
  'scan_stop_and': 'Arrêter et…',
  'scan_keep_one': 'Garder {count} piste',
  'scan_keep_other': 'Garder {count} pistes',
  'scan_keep_read': 'Garder ce qui a été lu',
  'scan_carry_on': 'Continuer',
  'stopped_early_music_library': 'Arrêt anticipé — chaque morceau est dans votre bibliothèque et se lit normalement, mais certains disques n’ont pas encore de pochette. Une actualisation récupère le reste.',
  'stopped_early_folder': 'Arrêt anticipé — tout ce qui a été trouvé jusque-là est dans votre bibliothèque et se lit normalement. Une nouvelle analyse relit tout le dossier depuis le début.',
  'fetch_sleeves': 'Récupérer les pochettes',
  'scan_rest': 'Analyser le reste',

  // Folder permission (ScanBanner)
  'stranded_heading_one': '{count} dossier est toujours là, mais chacun doit être reconnecté avant de pouvoir être lu.',
  'stranded_heading_other': '{count} dossiers sont toujours là, mais chacun doit être reconnecté avant de pouvoir être lu.',
  'stranded_chosen': '{folder} est illisible pour le moment — il a peut-être été déplacé ou renommé, ou son accès a été retiré. Une nouvelle analyse le relit, et vous demande de le choisir s’il est introuvable.',
  'stranded_native': '{folder} répertorie des pistes qui ne sont plus dans le dossier de musique. Une nouvelle analyse remettra la bibliothèque en accord avec ce qui s’y trouve réellement.',
  'stranded_reopen_browser': '{folder} est là, mais le navigateur a de nouveau besoin de votre autorisation avant de pouvoir le lire.',
  'stranded_reopen_app': '{folder} est là, mais l’application a de nouveau besoin de votre autorisation avant de pouvoir le lire.',
  'stranded_choose_grouped_browser': '{folder} — ce navigateur ne peut pas rouvrir un dossier de lui-même : choisissez-le à nouveau. Rien n’a besoin d’être relu.',
  'stranded_choose_grouped_app': '{folder} — l’application ne peut pas rouvrir un dossier d’elle-même : choisissez-le à nouveau. Rien n’a besoin d’être relu.',
  'stranded_choose_browser': '{folder} et ses pochettes sont toujours là, mais ce navigateur ne peut pas rouvrir un dossier de lui-même — choisissez-le à nouveau pour en lire le contenu. Ce sera rapide : rien n’a besoin d’être relu.',
  'stranded_choose_app': '{folder} et ses pochettes sont toujours là, mais l’application ne peut pas rouvrir un dossier d’elle-même — choisissez-le à nouveau pour en lire le contenu. Ce sera rapide : rien n’a besoin d’être relu.',
  'start_new_library': 'Commencer une nouvelle bibliothèque',
  'start_new_library_title': 'Oublier cette bibliothèque et revenir au début',
  'forget_library_ask': 'Oublier cette bibliothèque et recommencer ? Vos fichiers musicaux ne sont pas touchés.',
  'forget_it': 'L’oublier',
  'keep_it': 'La garder',

  // One folder's button (FolderAccessButton)
  'allow_access': 'Autoriser l’accès',
  'choose_folder': 'Choisir le dossier',
  'rescan': 'Réanalyser',
  'access_allowed': 'Accès autorisé',

  // Files a scan skipped
  'skipped_heading': 'Certains fichiers ont été ignorés',
  'skipped_line': '{label} ({count}) — {why}',
  'refused_wma': 'Windows Media Audio — aucun navigateur ne le décode. Universal Converter peut le convertir en MP3.',
  'refused_m4p': 'Cette piste est protégée par DRM et aucun navigateur ne peut la lire.',
  'refused_m4b': 'Un format de livre audio — aucun navigateur ne le décode.',
  'refused_ape': 'Monkey’s Audio — aucun navigateur ne le décode. Universal Converter peut le convertir en FLAC.',
  'refused_wv': 'WavPack — aucun navigateur ne le décode.',
  'refused_midi': 'Le MIDI est une partition, pas un enregistrement — le fichier ne contient aucun son à lire.',
  'skip_protected_label': 'Téléchargements Apple Music',
  'skip_protected_why': 'protégés, et iOS ne laisse pas les autres apps les lire. Les morceaux synchronisés depuis votre Mac ne sont pas concernés.',
  'skip_icloud_label': 'Morceaux uniquement sur iCloud',
  'skip_icloud_why': 'non téléchargés sur cet iPhone. Téléchargez-les dans l’app Musique, puis actualisez la bibliothèque musicale.',

  // Folder names the app gives itself
  'root_example_library': 'Bibliothèque d’exemple',
  'root_music_library': 'Bibliothèque musicale',
  'root_chosen_files': 'Fichiers choisis',
  'root_your_music': 'Votre musique',

  // Reading the Music library (appleMusic)
  'reading_art': 'Lecture des pochettes…',
  'reading_art_count': 'Lecture des pochettes — {done} sur {total}',

  // Errors while reading the library (libraryStore)
  'error_no_access': 'Sans accès à {folder}, ses pistes ne peuvent pas être lues. Rien n’a été perdu — la bibliothèque est toujours là.',
  'error_cannot_open': 'Impossible d’ouvrir {folder}. Il a peut-être été déplacé ou renommé, ou se trouve sur un disque qui n’est plus branché.',
  'error_choose_again_browser': 'Ce navigateur ne peut pas rouvrir un dossier de lui-même — choisissez à nouveau {folder} pour le réanalyser. Votre bibliothèque et vos pochettes sont conservées, ce sera donc rapide.',
  'error_choose_again_app': 'L’application ne peut pas rouvrir un dossier d’elle-même — choisissez à nouveau {folder} pour le réanalyser. Votre bibliothèque et vos pochettes sont conservées, ce sera donc rapide.',
  'error_picker_failed': 'Ce dossier n’a pas pu être utilisé — le téléphone n’a pas laissé l’application en garder l’accès. Réessayez, ou choisissez un autre dossier.',
  'error_none_copied': 'Aucun de ces fichiers n’a pu être copié dans le dossier de musique.',
  'error_copy_failed': 'Ces fichiers n’ont pas pu être copiés dans le dossier de musique.',
  'error_native_folder_lost': 'Impossible d’ouvrir {folder} — il a peut-être été déplacé ou renommé, ou son accès a été retiré. Choisissez-le à nouveau.',
  'error_native_folder_unreadable': 'Le dossier de musique n’a pas pu être lu. Si l’application vient d’être installée, essayez de la rouvrir.',
  'error_scan_incomplete': 'Ce dossier n’a pas pu être lu jusqu’au bout. Tout ce qui a été trouvé avant le problème est dans la bibliothèque.',
  'error_nothing_playable_refused': 'Rien de lisible dans {folder} — chaque fichier a été vérifié.',
  'error_nothing_playable': 'Rien de lisible dans {folder} — tout le dossier a été vérifié.',
  'empty_chosen_folder': 'Aucune musique dans ce dossier. Copiez-y des albums depuis un ordinateur ou avec l’app Fichiers — Artiste/Album/piste.mp3 est parfait —, puis relancez l’analyse, ou choisissez un autre dossier.',
  'empty_own_folder_ios': 'Votre dossier ne contient pas encore de musique. Ouvrez l’app Fichiers, allez dans Sur mon iPhone → Universal Jukebox et copiez-y un album. Les dossiers sont conservés, donc Artiste/Album/piste.mp3 est parfait — puis relancez l’analyse. Ou touchez « {button} » pour choisir des fichiers ici.',
  'empty_own_folder': 'Votre dossier ne contient pas encore de musique. Copiez un album dans le dossier Universal Jukebox de votre app Fichiers. Les dossiers sont conservés, donc Artiste/Album/piste.mp3 est parfait — puis relancez l’analyse. Ou touchez « {button} » pour choisir des fichiers ici.',

  // The iPhone's Music library (libraryStore)
  'error_music_library_open': 'Impossible d’ouvrir la bibliothèque musicale.',
  'error_music_library_read': 'Impossible de lire la bibliothèque musicale.',
  'error_music_library_restricted': 'L’accès à la bibliothèque musicale est restreint sur cet iPhone (Temps d’écran ou profil de l’appareil) : Universal Jukebox ne peut donc pas la lire.',
  'error_music_library_denied': 'Universal Jukebox n’est pas autorisé à lire votre bibliothèque musicale. Activez l’accès dans Réglages → Apps → Universal Jukebox → Médias et Apple Music, puis réessayez.',
  'music_library_empty': 'Il n’y a aucun morceau dans la bibliothèque musicale de cet iPhone. Synchronisez-les depuis votre Mac (Finder → votre iPhone → Musique), puis réessayez.',
  'music_library_unplayable_protected': 'Aucun des morceaux de votre bibliothèque musicale (total : {total}) ne peut être lu ici. Téléchargements Apple Music : {protected} — ils sont protégés et ne peuvent pas être lus par d’autres apps. Les morceaux synchronisés depuis votre Mac se lisent sans problème.',
  'music_library_unplayable_cloud': 'Aucun des morceaux de votre bibliothèque musicale (total : {total}) ne peut être lu ici. Sur iCloud mais non téléchargés sur cet iPhone : {cloud}. Les morceaux synchronisés depuis votre Mac se lisent sans problème.',
  'music_library_unplayable_both': 'Aucun des morceaux de votre bibliothèque musicale (total : {total}) ne peut être lu ici. Téléchargements Apple Music, protégés et illisibles par d’autres apps : {protected}. Sur iCloud mais non téléchargés sur cet iPhone : {cloud}. Les morceaux synchronisés depuis votre Mac se lisent sans problème.',

  // The note the iPhone app leaves in its empty music folder (nativeFile)
  'readme_title': 'Universal Jukebox — votre musique se place dans ce dossier.',
  'readme_how': 'Copiez des albums ici, envoyez-les par AirDrop, décompressez-les ici ou glissez-les\ndepuis un ordinateur. Les dossiers sont acceptés et conservés —\nArtiste/Album/piste.mp3 est parfait.',
  'readme_formats': 'Il lit les formats MP3, M4A, FLAC et WAV.',
  'readme_then': 'Ouvrez ensuite Universal Jukebox, touchez « Trouver ma musique », puis « Sur ce téléphone »\net « Analyser le dossier Jukebox ». Tout ce que vous ajoutez plus tard demande une nouvelle\nanalyse : l’application ne peut pas savoir qu’un fichier est apparu pendant qu’elle était fermée.',
  'readme_delete': 'Cette note ne sert à rien d’autre et peut être supprimée.',
}

export default landing
