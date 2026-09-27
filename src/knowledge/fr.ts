import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Les formats audio, et pourquoi certains morceaux ne se lisent pas',
    summary: 'MP3, FLAC, WAV et les autres — et ce qui empêche un fichier de se lire.',
    group: 'Les bases',
    body: `Un fichier musical, c’est du son enregistré, converti en nombres puis rangé d’une certaine manière. Cette manière de ranger s’appelle le format, et les lettres à la fin du nom du fichier l’indiquent généralement : .mp3, .m4a, .flac, etc.

## Deux familles de formats

- Les formats **avec perte**, comme le MP3 et l’AAC (le plus souvent dans des fichiers .m4a), rendent les fichiers beaucoup plus légers en supprimant des détails que la plupart des auditeurs ne remarquent pas. La majorité de la musique achetée ou extraite de CD depuis vingt ans est dans l’un de ces formats.
- Les formats **sans perte**, comme le FLAC, le WAV et l’AIFF, conservent chaque détail de l’enregistrement d’origine. Les fichiers sont plus lourds, mais rien n’a été supprimé.

## Ce que Universal Jukebox lit

Universal Jukebox lit le MP3, le M4A et l’AAC, le FLAC, le WAV et l’AIFF. Les fichiers Ogg et Opus se lisent aussi lorsque votre appareil les prend en charge, ce qui est le cas de la plupart, mais pas de tous.

L’application n’a pas de décodeurs à elle : elle s’appuie sur la lecture audio intégrée à votre appareil. C’est pourquoi la liste ci-dessus peut varier légèrement d’un appareil à l’autre.

## Pourquoi un morceau peut refuser de se lire

- **Il est protégé contre la copie.** Les titres vendus avec une protection (par exemple d’anciens achats iTunes au format .m4p) et les morceaux téléchargés via un abonnement de streaming ne peuvent être lus que par l’application de la boutique ou du service. Aucun autre lecteur ne peut les ouvrir.
- **Rien sur votre appareil ne sait le décoder.** Les fichiers Windows Media Audio (.wma), Monkey’s Audio (.ape) et WavPack (.wv) ne peuvent pas être lus. Universal Converter peut convertir les fichiers WMA et APE dans des formats que cette application lit, directement sur votre appareil.
- **C’est un livre audio.** Le format de livre audio .m4b n’est pas lu.
- **Ce n’est pas un enregistrement.** Un fichier MIDI (.mid) contient des instructions — quelles notes jouer, et quand — plutôt que du son enregistré : il n’y a donc rien à entendre.
- **Le fichier est endommagé**, par exemple un téléchargement interrompu en cours de route.

## Connaître la raison

Par défaut, les morceaux illisibles sont ignorés sans message. Si vous préférez savoir pourquoi, cochez **Show error messages** dans Settings, rubrique Messages : l’application indiquera alors chaque fichier qu’elle n’a pas pu lire et ce qui n’allait pas.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Tags et pochettes : d’où vient votre bibliothèque',
    summary: 'Comment l’application connaît l’artiste, l’album et la pochette de chaque morceau.',
    group: 'Les bases',
    body: `Universal Jukebox ne va chercher vos morceaux nulle part. Tout ce que vous voyez dans la bibliothèque — titres, artistes, albums, numéros de piste, années, genres et pochettes — est lu dans vos propres fichiers.

## Ce que sont les tags

La plupart des fichiers musicaux contiennent une petite étiquette, appelée tags. Les tags regroupent des informations sur l’enregistrement : le titre, l’artiste, l’album, le numéro de piste et de disque, l’année, le genre, et souvent une image de la pochette. Ils sont écrits par ce qui a créé le fichier : la boutique où vous l’avez acheté, le logiciel qui a extrait le CD ou un éditeur de tags.

L’application lit les types de tags courants utilisés par les fichiers MP3, M4A, FLAC et Ogg. L’analyse ne lit que la partie de chaque fichier où se trouvent les tags, et non le morceau entier : même une grande bibliothèque s’analyse donc rapidement.

## Quand les tags manquent ou sont faux

- **Un fichier sans tags** est affiché sous son nom de fichier, sans le numéro de piste éventuel placé au début. L’application ne devine pas l’artiste à partir du nom de fichier, car une mauvaise supposition est pire qu’un champ vide.
- **Un album coupé en deux** signifie généralement que ses pistes ont été étiquetées de façon incohérente — par exemple, le nom de l’artiste écrit de deux manières.
- **Une pochette manquante** peut signifier que l’image n’a jamais été enregistrée dans les fichiers, ou qu’elle se trouve dans une piste ultérieure plutôt que dans la première.

## Faire le ménage

**Tidy up library**, dans Settings, rubrique Your library, recherche deux choses : des pochettes déjà présentes sur votre appareil mais inutilisées (une image nommée comme une pochette, par exemple cover.jpg, à côté des pistes, ou une image enregistrée dans une piste ultérieure), et des albums que des tags incohérents ont coupés en deux. Chaque suggestion vous est présentée avec l’image qui serait utilisée, et rien ne change tant que vous n’appuyez pas sur le bouton.

L’outil refuse volontairement tout ce dont il ne peut pas être sûr. Deux albums du même nom dans des dossiers différents, ou un dossier contenant deux albums différents, restent tels quels.

## Vos fichiers ne sont jamais modifiés

Le ménage corrige uniquement la bibliothèque dans l’application. Il ne réécrit aucun tag, ne renomme aucun fichier et ne déplace rien, et vos corrections sont automatiquement réappliquées après une nouvelle analyse.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Où se trouve votre musique',
    summary: 'Dossiers, téléphones et nouvelles analyses — et pourquoi un navigateur peut redemander l’accès.',
    group: 'Fonctionnement',
    body: `Universal Jukebox n’est pas un service de streaming et ne possède aucune musique. Il lit des fichiers déjà présents sur votre appareil, ou sur un disque auquel votre appareil a accès. L’application ne les envoie jamais en ligne, ne les déplace pas et ne les modifie pas.

## Ajouter de la musique

Ouvrez le menu et choisissez **Your complete library**. De là, vous pouvez ajouter un dossier, relancer une analyse ou retirer un dossier. Ajouter un dossier complète votre bibliothèque au lieu de la remplacer, et en retirer un n’enlève que les morceaux de ce dossier. Le fonctionnement des dossiers dépend de l’endroit où vous utilisez l’application :

- **Chrome et Edge** peuvent mémoriser le dossier choisi. À votre retour, il peut vous être demandé de confirmer l’accès une fois, d’un simple geste.
- **Firefox et Safari** ne peuvent pas conserver l’autorisation de lire un dossier d’une visite à l’autre : vous choisissez donc à nouveau le dossier à chaque fois. Votre bibliothèque, vos pochettes et vos réglages restent en mémoire, si bien que rien n’a besoin d’être relu.
- **L’application iPhone** dispose de son propre dossier, nommé Universal Jukebox, dans l’app Fichiers. Tout ce que vous y copiez, envoyez par AirDrop ou enregistrez rejoint votre bibliothèque. Vous pouvez aussi ajouter d’autres dossiers et lire les morceaux de la bibliothèque Musique de votre iPhone qui sont stockés sur le téléphone, comme ceux synchronisés depuis un ordinateur.
- **L’application Android** vous demande de choisir chaque dossier une fois dans le sélecteur du système, et Android mémorise l’autorisation.

## Relancer une analyse

L’application ne remarque pas d’elle-même l’arrivée ou la disparition de fichiers. Après avoir ajouté ou supprimé de la musique en dehors de l’application, choisissez **Rescan**. Une nouvelle analyse prend en compte les nouveaux morceaux, retire ceux qui ont disparu et conserve les corrections de ménage que vous avez faites.

## Les morceaux de la bibliothèque Musique de l’iPhone

Les morceaux synchronisés sur l’iPhone depuis un ordinateur peuvent être lus. La première fois que l’un d’eux est joué, l’application en crée une copie de travail dans un espace limité sur le téléphone. Les morceaux téléchargés avec un abonnement Apple Music, et ceux qui sont dans iCloud mais pas sur le téléphone, ne peuvent être lus par aucune autre application ; l’application vous indique combien elle a dû en laisser de côté.

## Ce que l’application conserve

L’application conserve sur votre appareil un catalogue de votre bibliothèque — titres, artistes, albums et petites copies des pochettes — pour s’ouvrir rapidement la fois suivante. Ce catalogue n’est ni sauvegardé ni partagé entre appareils : chaque appareil construit le sien. Effacer les données de ce site dans un navigateur efface le catalogue, mais jamais votre musique.`,
  },
  {
    id: 'between-songs',
    title: 'Fondus enchaînés, fondus et silences entre les morceaux',
    summary: 'Ce que signifient fondu enchaîné et lecture sans blanc, et ce qui se passe entre deux pistes.',
    group: 'Fonctionnement',
    body: `Ce qui se passe pendant la seconde ou deux entre deux morceaux change étonnamment la manière dont on ressent un album. Quelques termes méritent d’être connus.

## Les termes

- **Un blanc** est le silence qu’un lecteur peut laisser entre deux pistes. Sur la plupart des albums, il passe inaperçu, mais sur un album live ou un mix continu, il hache la musique.
- **La lecture sans blanc** (gapless) consiste à enchaîner une piste sur la suivante sans ajouter de silence, comme l’album a été conçu pour être écouté.
- **Un fondu enchaîné** (crossfade) fait se chevaucher la fin d’un morceau et le début du suivant : le premier baisse pendant que le second monte, si bien qu’il n’y a jamais de silence.
- **Un fondu d’entrée ou de sortie** fait monter un morceau depuis le silence à son début, ou le fait descendre jusqu’au silence à sa fin.

## Ce que fait Universal Jukebox

**Les morceaux d’un même album** s’enchaînent directement avec un fondu enchaîné court et doux. Le morceau qui arrive ne monte qu’à mesure que celui qui part descend : la transition est fluide, sans deux morceaux joués fort en même temps.

**Lorsque le morceau suivant est sur un autre disque**, les deux s’enchaînent aussi en fondu par défaut, pendant qu’à l’écran un lecteur glisse vers la sortie et le suivant fait son entrée. Si vous préférez une vraie coupure, cochez **No crossfade between records** dans Settings : le bras se lève, un court silence s’installe, puis il se pose sur le disque suivant.

**Fade in** et **Fade out**, dans Settings, rubrique Sound, ajoutent un fondu pouvant aller jusqu’à huit secondes au début ou à la fin de chaque piste, y compris le dernier morceau d’un album. Tous deux sont désactivés tant que vous ne les réglez pas. Sur un appareil qui ne permet pas à l’application de régler le volume, les fondus ne sont pas disponibles, et Settings l’indique.

## L’animation est indépendante

L’animation de changement de disque, et la fréquence à laquelle elle apparaît, concerne l’image et son effet sonore, pas la musique. Désactiver l’animation n’ajoute pas de blancs : les morceaux d’un même album continuent de s’enchaîner.`,
  },
  {
    id: 'lyrics',
    title: 'Paroles : d’où viennent les mots',
    summary: 'D’abord les paroles enregistrées dans vos fichiers, puis une recherche en ligne facultative.',
    group: 'Fonctionnement',
    body: `Appuyez sur **Lyrics** dans l’écran Now Playing pour voir les paroles du morceau en cours. Elles peuvent venir de deux sources, toujours dans cet ordre.

## 1. Votre propre fichier

De nombreux fichiers musicaux contiennent les paroles dans leurs tags, placées là par la boutique, un logiciel d’extraction ou un éditeur de tags. L’application regarde d’abord à cet endroit. Cela fonctionne sans connexion Internet et, puisqu’il s’agit de votre propre fichier, c’est toujours préféré à ce qui pourrait être trouvé en ligne.

L’application lit les paroles enregistrées à l’intérieur du fichier musical. Les fichiers de paroles séparés, placés à côté d’un morceau, ne sont pas lus.

## 2. Une recherche en ligne, seulement si vous l’activez

Si un morceau n’a pas de paroles à lui, l’application peut interroger lrclib.net, une collection de paroles gratuite et gérée par une communauté. Cette option est **désactivée** tant que vous ne cochez pas **Look up missing lyrics online** dans Settings, rubrique Lyrics.

Lorsqu’elle est activée, la recherche d’un morceau n’envoie que son artiste, son titre, son album et sa durée, directement de votre appareil vers lrclib.net. Rien d’autre sur vous, votre appareil ou votre bibliothèque n’est envoyé, et la demande ne passe pas par UNI·SIM. La réponse est conservée sur votre appareil, si bien que chaque morceau n’est demandé qu’une fois. Si aucune parole n’a été trouvée, l’application peut réessayer quelques jours plus tard. Settings indique combien de morceaux ont été recherchés, avec un bouton pour tout oublier.

Comme la collection est rédigée par des bénévoles, il arrive qu’un texte soit inexact ou légèrement décalé.

## Des paroles qui suivent la musique

Certaines paroles comportent un repère temporel au début de chaque ligne. On parle de paroles synchronisées, souvent dans un format appelé LRC. Avec elles, le panneau des paroles suit le morceau pendant la lecture, et toucher une ligne fait sauter à ce moment du morceau. Les paroles sans repères s’affichent comme du texte simple.

Les paroles synchronisées permettent aussi deux options, toutes deux dans Settings, rubrique Lyrics : **Lyrics around the record**, qui écrit les mots autour du disque qui tourne à mesure qu’ils sont chantés, et **Lyrics on the lock screen**, qui affiche la ligne chantée dans les commandes de musique de votre téléphone.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Écouter avec l’écran éteint',
    summary: 'Lecture en arrière-plan, commandes sur l’écran verrouillé, minuterie de mise en veille et plus.',
    group: 'Fonctionnement',
    body: `Un lecteur de musique doit continuer à jouer quand le téléphone est dans votre poche. Voici comment Universal Jukebox se comporte lorsqu’il n’est pas à l’écran.

## Sur un téléphone

- **iPhone :** l’application continue de jouer lorsque vous verrouillez le téléphone ou passez à une autre application. Le morceau, l’artiste et la pochette apparaissent sur l’écran verrouillé et dans le Centre de contrôle, avec lecture, pause et morceau suivant ou précédent.
- **Android :** pendant la lecture, l’application affiche une notification de lecture en cours avec les mêmes commandes ; c’est ce qui permet à Android de la laisser tourner écran éteint. Elle reste jusqu’à la fin de la file d’attente ou jusqu’à ce que vous fermiez l’application d’un glissement. Les boutons des écouteurs et des appareils Bluetooth fonctionnent aussi.

L’application ne prend pas le contrôle de l’audio de votre téléphone. Un appel ou une autre application de musique la met en pause, comme on peut s’y attendre.

## Dans un navigateur ou sur un ordinateur

Dans un navigateur, le morceau apparaît généralement dans les commandes multimédias de votre ordinateur ou de votre téléphone, et les touches multimédias du clavier fonctionnent. La poursuite de la lecture en arrière-plan, surtout sur un téléphone, dépend du navigateur. Pour une écoute fiable écran éteint, utilisez l’application iPhone ou Android.

## La minuterie de mise en veille

**Sleep**, parmi les boutons ronds de l’écran Now Playing, arrête la musique pour vous :

1. Touchez-le pour passer successivement à 15, 30, 45 et 60 minutes, puis le désactiver.
2. Ou maintenez-le appuyé pour choisir n’importe quelle durée, jusqu’à 12 heures.
3. Pendant la dernière minute, la musique baisse doucement, puis se met en pause.

La minuterie continue de fonctionner lorsque le téléphone est verrouillé.

## Garder l’écran allumé

Si vous aimez regarder le disque tourner, **Keep awake** empêche l’écran de s’assombrir ou de se verrouiller tant que l’écran Now Playing est ouvert.

## Une notification pour chaque morceau

**Notify me of each new song**, dans Settings, affiche le morceau, l’artiste et la pochette au début de chaque nouveau morceau lorsque l’application n’est pas à l’écran. Une seule notification est affichée à la fois, remplacée par la suivante, et elle n’émet aucun son. L’option est désactivée tant que vous ne l’activez pas, et c’est à ce moment-là que votre appareil vous demande l’autorisation.`,
  },
  {
    id: 'privacy',
    title: 'Ce qui quitte votre appareil',
    summary: 'Rien n’est envoyé en ligne — et le détail exact des trois recherches facultatives.',
    group: 'Confidentialité et sécurité',
    body: `Universal Jukebox est conçu pour fonctionner entièrement sur votre propre appareil. Votre musique n’est jamais envoyée en ligne, aucun compte n’est nécessaire, et l’application fonctionne sans connexion Internet.

## Ce qui reste sur votre appareil

- **Vos fichiers musicaux.** Ils sont lus là où ils se trouvent et ne sont jamais copiés sur un serveur.
- **Le catalogue de votre bibliothèque** : titres, artistes, albums, petites copies des pochettes et éventuelles corrections de ménage.
- **Vos réglages, vos demandes et l’endroit où vous vous étiez arrêté.** Ils restent dans l’application sur cet appareil.

Rien de tout cela n’est sauvegardé ni synchronisé par l’application. Si vous utilisez Jukebox sur deux appareils, chacun garde sa propre bibliothèque.

## Les trois recherches

Seules trois fonctions envoient quoi que ce soit au sujet de votre musique, et aucune ne fait rien tant que vous ne le demandez pas. Chacune va directement de votre appareil au service indiqué, sans passer par UNI·SIM, et n’envoie que ce qui est précisé.

- **Recherche de paroles** (désactivée tant que vous ne l’activez pas dans Settings) : envoie l’artiste, le titre, l’album et la durée d’un morceau à lrclib.net, pour les morceaux qui n’ont pas de paroles à eux.
- **About this track** (désactivée tant que vous ne l’activez pas, dans Settings ou dans le panneau lui-même) : envoie le titre du morceau et le nom de l’artiste à Wikipedia, pour afficher ce que Wikipedia en dit. Les réponses sont conservées sur l’appareil pendant 90 jours, et un morceau sans article est redemandé quelques jours plus tard.
- **Find a picture**, pour une demande : envoie les mots que vous avez saisis à la recherche iTunes d’Apple, uniquement lorsque vous appuyez dessus. L’image que vous choisissez est enregistrée avec la demande.

Les réponses des deux premières sont conservées sur votre appareil, si bien qu’un morceau n’est recherché qu’une fois. Settings indique combien il y en a et vous permet de les oublier. Aucun son ne quitte jamais votre appareil.

## Universal ID

La connexion avec un Universal ID est facultative. Elle vous garde connecté dans toutes les applications UNI·SIM. Pendant que vous êtes connecté, l’application enregistre un événement « ouverture » sur votre compte à chaque démarrage. Cet événement ne dit rien de votre musique.

## Autorisations

L’application ne demande un accès que lorsqu’une fonction en a besoin : un dossier que vous choisissez, la bibliothèque Musique de votre iPhone si vous demandez à la lire, et les notifications si vous les activez. Vous pouvez retirer chacune de ces autorisations dans les réglages de votre appareil.`,
  },
]

export default articles
