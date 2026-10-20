// French (fr) — about strings. Every key in ../en/about.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const about: Draft['about'] = {
  // About this track — the panel (AboutTrack)
  'track_heading': 'À propos de ce morceau',
  'toggle_label': 'À propos',
  'toggle_hide': 'Masquer les infos du morceau',
  'from_wikipedia': 'D’après Wikipedia',
  'looking': 'Recherche de ce morceau…',
  'untagged': 'Cette piste n’a pas d’artiste dans ses tags : il n’y a rien pour la rechercher.',
  'none_artist': 'Wikipedia ne semble avoir d’article ni sur ce morceau, ni sur {artist}.',
  'none_unnamed': 'Wikipedia ne semble avoir d’article ni sur ce morceau, ni sur cet artiste.',
  'song_label': 'Le morceau',
  'artist_label': 'L’artiste',
  'article_more': 'Plus',
  'article_less': 'Moins',
  'read_on_wikipedia': 'Lire sur Wikipedia',
  'licence': 'Texte de Wikipedia, sous licence {licence}. Trouvé d’après le titre du morceau et l’artiste : il peut donc arriver qu’il porte sur un autre morceau du même nom.',
  'offer_what': 'Jukebox peut rechercher ce morceau sur Wikipedia : qui l’a écrit, qui l’a interprété en premier, son parcours dans les classements, et qui le chante.',
  'offer_sends': 'Cela envoie le titre du morceau et le nom de l’artiste à Wikipedia — rien d’autre, et rien du tout si vous ne l’activez pas. Chaque morceau n’est recherché qu’une fois.',
  'look_up': 'Rechercher sur Wikipedia',
  'more_in_settings': 'En savoir plus dans Régler cette application',

  // Wikipedia lookup errors (lib/aboutTrack.ts)
  'error_offline': 'Pas de connexion : rien n’a pu être recherché.',
  'error_unreachable': 'Impossible de joindre Wikipedia.',
  'error_status': 'Wikipedia a renvoyé {status}.',

  // About this app — the page (About)
  'app_back': 'Retour à votre bibliothèque',
  'app_title': 'Un lecteur pour la musique que vous avez déjà',
  'app_intro': 'Universal Jukebox est un lecteur de musique, rien de plus. Vous lui indiquez un dossier sur votre propre appareil ; il lit les tags et les pochettes directement dans les fichiers, construit une bibliothèque que vous pouvez parcourir, et la fait jouer.',
  'app_nothing_uploaded': 'Rien n’est envoyé en ligne.',
  'app_privacy': '{nothing_uploaded} Pas une piste, pas une pochette, pas un nom de fichier. La lecture se fait sur votre propre appareil. Trois recherches font seules exception, et chacune attend que vous l’activiez ou la touchiez : les paroles, À propos de ce morceau et Trouver une image envoient l’artiste et le titre d’un morceau, jamais la musique. Il n’y a rien à quoi s’inscrire. La connexion avec un Universal ID est facultative : elle vous garde connecté dans les applications UNI·SIM et nous indique que l’application a été ouverte, et elle ne voit jamais votre musique.',
  'app_not_word': 'pas',
  'app_not': 'Ce n’est {not} un service de streaming, et il n’a aucun catalogue à lui. Il ne peut pas vous trouver de musique que vous n’avez pas déjà, et il n’est lié à aucune maison de disques, boutique ou abonnement. Si vos fichiers sont ailleurs, cette application ne peut pas les atteindre.',
  'app_plays_heading': 'Ce qu’il lit',
  'app_plays': 'MP3, M4A/AAC, FLAC, WAV et AIFF — tout ce qu’un navigateur actuel décode seul. Ogg et Opus se lisent là où le navigateur les prend en charge, ce que font la plupart, et Safari rarement.',
  'app_cant_heading': 'Ce qu’il ne peut pas lire, et pourquoi',
  'app_drm_name': 'Les pistes protégées par DRM',
  'app_drm': '{name} — les anciens achats iTunes et tout ce qui est lié à une licence. Aucun navigateur ne peut les décoder, et aucun lecteur local non plus.',
  'app_codecs': '{formats} — aucun navigateur n’intègre de décodeur. {converter} les convertit en un format lisible ici, là encore sans rien envoyer en ligne.',
  'app_midi': '{midi} — un fichier MIDI est une partition, pas un enregistrement. Il ne contient aucun son à lire.',
  'app_folder_heading': 'À propos du dossier',
  'app_folder': 'Chrome et Edge peuvent mémoriser le dossier choisi : la bibliothèque est toujours là la fois suivante, après une simple confirmation. Firefox et Safari n’ont aucun moyen de le faire — c’est l’autorisation elle-même qui ne peut pas être enregistrée —, donc vous choisissez à nouveau le dossier à chaque visite. Dans les deux cas, la bibliothèque et ses pochettes sont conservées : elle revient immédiatement au lieu d’être reconstruite.',
  'app_turntable_heading': 'La platine',
  'app_turntable': 'Lancez la lecture de n’importe quoi — une piste, un album, un résultat de recherche — et vous arrivez sur la platine : elle prend de la vitesse, le bras descend, et la musique démarre. L’aiguille avance ensuite vers le centre au fil du morceau, puis se lève et revient au bord extérieur pour le suivant. Un clic ou une touche quelconque passe l’intro, et vous pouvez ne la garder que pour un nouvel album, qu’une fois par visite, ou jamais, dans {settings}, avec les fondus et une amplification du volume pour les albums mixés trop bas.',
  'app_tune_this_app': 'Régler cette application',
  'app_preview': 'L’exception, c’est le petit bouton en forme de casque à côté de chaque piste de votre bibliothèque. Il joue dix secondes, prises à partir de la dixième seconde — assez pour savoir si c’est bien celle que vous vouliez — sans vous faire quitter la page ni interrompre ce qui était déjà en cours de lecture.',
  'app_privacy_phone': '{nothing_uploaded} Pas une piste, pas une pochette, pas un nom de fichier. La lecture se fait sur cet appareil. Les seules exceptions sont des recherches, et chacune attend que vous la demandiez : À propos de ce morceau envoie le titre et l’artiste d’un morceau à Wikipédia, et Trouver une image envoie les mots que vous tapez à la recherche iTunes d’Apple. Il n’y a pas de compte ni rien à quoi se connecter. Elle n’envoie pas non plus de comptage d’utilisation : rien ne nous signale quand vous l’ouvrez.',
  'app_privacy_lyrics_android': 'Les paroles en ligne, désactivées tant que vous ne les activez pas, envoient l’artiste, le titre, l’album et la durée d’un morceau à lrclib.net.',
  'app_folder_phone': 'L’application garde l’accès aux dossiers que vous choisissez : votre bibliothèque et ses pochettes sont là à chaque ouverture. Ajoutez ou retirez des dossiers dans Régler ▸ Votre musique.',
  'app_plays_phone': 'MP3, M4A/AAC, FLAC, WAV et AIFF. Ogg et Opus se lisent sur Android, et le plus souvent pas sur iPhone ni iPad.',
  'app_codecs_phone': '{formats} — le téléphone n’a pas de décodeur pour ces formats. Convertissez-les d’abord en FLAC ou en MP3 sur un ordinateur, et ils se liront.',
  'app_built_with_heading': 'Développée avec',
  'app_built_with': 'Cette application repose sur le travail de ces projets open source.',
  'app_all_packages': 'Les {count} paquets et leurs licences',
  'app_footer': 'Gratuit et open source, comme toutes les Universal Apps. Créé par {james} et {team} · {source}.',
  'app_footer_source': 'le code source sur GitHub',
  'app_footer_team': 'l’équipe UNI·SIM',
  'app_made_by': 'Créé par {james} et {team}',
}

export default about
