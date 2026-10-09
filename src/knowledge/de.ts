import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Audioformate, und warum manche Titel nicht abspielen',
    summary: 'MP3, FLAC, WAV und die anderen – und was die Wiedergabe einer Datei verhindert.',
    group: 'Grundlagen',
    body: `Eine Musikdatei ist aufgenommener Klang, der als Zahlen gespeichert und auf eine bestimmte Weise verpackt wurde. Diese Verpackung nennt man Format, und die Buchstaben am Ende des Dateinamens verraten meist, welches es ist: .mp3, .m4a, .flac und so weiter.

## Zwei Familien von Formaten

- **Verlustbehaftete** Formate wie MP3 und AAC (meist in .m4a-Dateien) machen Dateien deutlich kleiner, indem sie Details weglassen, die den meisten Hörern kaum auffallen. Die meiste Musik, die in den letzten zwanzig Jahren gekauft oder von CDs gerippt wurde, liegt in einem dieser Formate vor.
- **Verlustfreie** Formate wie FLAC, WAV und AIFF bewahren jedes Detail der Originalaufnahme. Die Dateien sind größer, aber es wurde nichts weggelassen.

## Was Universal Jukebox abspielt

Universal Jukebox spielt MP3, M4A und AAC, FLAC, WAV und AIFF ab. Ogg- und Opus-Dateien werden ebenfalls abgespielt, sofern Ihr Gerät sie unterstützt – das tun die meisten, aber nicht alle.

Die App hat keine eigenen Decoder: Sie nutzt die in Ihr Gerät eingebaute Audiowiedergabe. Deshalb kann die obige Liste von Gerät zu Gerät leicht abweichen.

## Warum ein Titel nicht abspielt

- **Er ist kopiergeschützt.** Titel, die mit Kopierschutz verkauft wurden (zum Beispiel ältere iTunes-Käufe mit der Endung .m4p), und Songs, die über ein Streaming-Abo heruntergeladen wurden, lassen sich nur mit der App des Shops oder Dienstes abspielen. Kein anderer Player kann sie öffnen.
- **Nichts auf Ihrem Gerät kann ihn dekodieren.** Dateien im Format Windows Media Audio (.wma), Monkey’s Audio (.ape) und WavPack (.wv) können nicht abgespielt werden. Universal Converter kann WMA- und APE-Dateien direkt auf Ihrem Gerät in Formate umwandeln, die diese App abspielt.
- **Es ist ein Hörbuch.** Das Hörbuchformat .m4b wird nicht abgespielt.
- **Es ist gar keine Aufnahme.** Eine MIDI-Datei (.mid) enthält Anweisungen – welche Noten wann gespielt werden – statt aufgenommenen Klangs, es gibt also nichts zu hören.
- **Die Datei ist beschädigt**, zum Beispiel ein Download, der mittendrin abgebrochen ist.

## Den Grund erfahren

Standardmäßig werden Titel, die sich nicht abspielen lassen, stillschweigend übersprungen. Wenn Sie lieber wissen möchten, warum, setzen Sie in Tune this app unter Messages ein Häkchen bei **Show error messages**. Die App nennt dann jede Datei, die sie nicht abspielen konnte, und was damit nicht stimmte.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Tags und Cover: woher Ihre Mediathek kommt',
    summary: 'Wie die App Interpret, Album und Cover jedes Titels kennt.',
    group: 'Grundlagen',
    body: `Universal Jukebox schlägt Ihre Musik nirgendwo nach. Alles, was Sie in der Mediathek sehen – Titel, Interpreten, Alben, Titelnummern, Jahre, Genres und Cover –, wird aus Ihren eigenen Dateien gelesen.

## Was Tags sind

Die meisten Musikdateien tragen ein kleines Etikett in sich, die sogenannten Tags. Tags enthalten Angaben zur Aufnahme: den Titel des Songs, den Interpreten, das Album, die Titel- und CD-Nummer, das Jahr, das Genre und oft ein Bild des Albumcovers. Geschrieben werden sie von dem, was die Datei erstellt hat – dem Shop, bei dem Sie sie gekauft haben, dem Programm, das die CD gerippt hat, oder einem Tag-Editor.

Die App liest die gängigen Tag-Arten von MP3-, M4A-, FLAC- und Ogg-Dateien. Beim Einlesen wird nur der Teil jeder Datei gelesen, in dem die Tags stehen, nicht der ganze Song – so ist selbst eine große Mediathek schnell eingelesen.

## Wenn Tags fehlen oder falsch sind

- **Eine Datei ohne Tags** wird mit ihrem Dateinamen angezeigt, wobei eine vorangestellte Titelnummer entfernt wird. Die App errät keinen Interpreten aus dem Dateinamen, denn eine falsche Vermutung ist schlimmer als ein leeres Feld.
- **Ein zweigeteiltes Album** bedeutet meist, dass seine Titel uneinheitlich getaggt wurden – zum Beispiel mit zwei verschiedenen Schreibweisen des Interpreten.
- **Ein fehlendes Cover** kann bedeuten, dass das Bild nie in den Dateien gespeichert wurde oder dass es in einem späteren Titel statt im ersten steckt.

## Aufräumen

**Tidy up library** in Tune this app unter Your library sucht nach zwei Dingen: Covern, die bereits auf Ihrem Gerät liegen, aber nicht verwendet wurden (ein Bild mit einem typischen Cover-Namen wie cover.jpg neben den Titeln oder ein Bild in einem späteren Titel), und Alben, die durch uneinheitliche Tags zweigeteilt wurden. Jeder Vorschlag wird Ihnen mit dem Bild angezeigt, das verwendet würde, und nichts ändert sich, bevor Sie auf die Schaltfläche tippen.

Alles, worüber sie sich nicht sicher sein kann, lehnt die Funktion bewusst ab. Zwei gleichnamige Alben in verschiedenen Ordnern oder ein Ordner mit zwei verschiedenen Alben bleiben unverändert.

## Ihre Dateien werden nie verändert

Das Aufräumen korrigiert nur die Mediathek in der App. Es schreibt keine Tags um, benennt keine Dateien um und verschiebt nichts, und Ihre Korrekturen werden nach einem erneuten Einlesen automatisch wieder angewendet.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Wo Ihre Musik liegt',
    summary: 'Ordner, Smartphones und erneutes Einlesen – und warum ein Browser erneut fragen kann.',
    group: 'So funktioniert es',
    body: `Universal Jukebox ist kein Streamingdienst und hat keine eigene Musik. Die App spielt Dateien ab, die bereits auf Ihrem Gerät liegen oder auf einem Laufwerk, auf das Ihr Gerät zugreifen kann. Sie lädt sie nie hoch, verschiebt sie nicht und bearbeitet sie nicht.

## Musik hinzufügen

Öffnen Sie das Menü und wählen Sie **Your complete library**. Dort können Sie einen Ordner hinzufügen, neu einlesen oder einen Ordner entfernen. Ein hinzugefügter Ordner ergänzt Ihre Mediathek, statt sie zu ersetzen, und beim Entfernen verschwinden nur die Titel dieses Ordners. Wie Ordner funktionieren, hängt davon ab, wo Sie die App nutzen:

- **Chrome und Edge** können sich den gewählten Ordner merken. Wenn Sie wiederkommen, werden Sie eventuell einmal gebeten, den Zugriff mit einem Tippen zu bestätigen.
- **Firefox und Safari** können die Berechtigung, einen Ordner zu lesen, nicht über Besuche hinweg behalten, daher wählen Sie den Ordner jedes Mal neu. Mediathek, Cover und Einstellungen bleiben trotzdem erhalten, sodass nichts erneut gelesen werden muss.
- **Die iPhone-App** hat einen eigenen Ordner namens Universal Jukebox in der Dateien-App. Alles, was Sie dort hineinkopieren, per AirDrop senden oder speichern, wird Teil Ihrer Mediathek. Sie können auch weitere Ordner hinzufügen und die Songs aus der Musik-Mediathek Ihres iPhones abspielen, die auf dem Gerät gespeichert sind, etwa solche, die von einem Computer synchronisiert wurden.
- **Die Android-App** bittet Sie, jeden Ordner einmal in der Systemauswahl zu wählen, und Android merkt sich die Berechtigung.

## Neu einlesen

Die App bemerkt nicht von selbst, wenn Dateien hinzukommen oder verschwinden. Nachdem Sie außerhalb der App Musik hinzugefügt oder gelöscht haben, wählen Sie **Rescan**. Beim erneuten Einlesen werden neue Titel aufgenommen, verschwundene entfernt und Ihre Aufräum-Korrekturen beibehalten.

## Titel aus der Musik-Mediathek des iPhones

Titel, die Sie von einem Computer auf das iPhone synchronisieren, können abgespielt werden. Beim ersten Abspielen legt die App eine Arbeitskopie in einem begrenzten Speicherbereich auf dem Gerät an. Titel, die über ein Apple-Music-Abo heruntergeladen wurden, und Titel, die in iCloud, aber nicht auf dem Gerät liegen, kann keine andere App abspielen; die App teilt Ihnen mit, wie viele sie auslassen musste.

## Was die App speichert

Die App speichert auf Ihrem Gerät einen Katalog Ihrer Mediathek – Titel, Interpreten, Alben und kleine Kopien der Cover –, damit sie beim nächsten Mal schnell startet. Dieser Katalog wird weder gesichert noch zwischen Geräten geteilt: Jedes Gerät erstellt seinen eigenen. Wenn Sie in einem Browser die Daten dieser Website löschen, wird der Katalog gelöscht, aber nie Ihre Musik.`,
  },
  {
    id: 'between-songs',
    title: 'Überblendungen, Ein- und Ausblenden und Pausen zwischen Titeln',
    summary: 'Was Überblenden und lückenlose Wiedergabe bedeuten, und was zwischen zwei Titeln passiert.',
    group: 'So funktioniert es',
    body: `Was in den ein, zwei Sekunden zwischen zwei Titeln passiert, verändert erstaunlich stark, wie sich ein Album anfühlt. Ein paar Begriffe sind nützlich.

## Die Begriffe

- **Eine Pause** ist die Stille, die ein Player zwischen zwei Titeln lassen kann. Auf den meisten Alben fällt sie nicht auf, aber bei einem Live-Album oder einem durchgehenden Mix zerreißt sie die Musik.
- **Lückenlose Wiedergabe** (gapless) bedeutet, dass ein Titel ohne zusätzliche Stille in den nächsten übergeht – so, wie das Album gedacht ist.
- **Eine Überblendung** (Crossfade) lässt das Ende eines Songs und den Anfang des nächsten überlappen: Der erste wird leiser, während der zweite lauter wird, sodass nie Stille entsteht.
- **Ein- oder Ausblenden** lässt einen einzelnen Song am Anfang aus der Stille ansteigen oder am Ende in die Stille abklingen.

## Was Universal Jukebox macht

**Titel desselben Albums** gehen mit einer kurzen, sanften Überblendung direkt ineinander über. Der neue Titel wird erst lauter, während der alte leiser wird – der Übergang ist also fließend, statt dass zwei Songs gleichzeitig laut spielen.

**Wenn der nächste Titel auf einer anderen Platte ist**, werden die beiden standardmäßig ebenfalls überblendet, während im Bild ein Player hinausgleitet und der nächste hereingleitet. Wenn Sie lieber einen klaren Schnitt möchten, setzen Sie in Tune this app ein Häkchen bei **No crossfade between records**: Die Nadel hebt sich, es folgt ein Moment der Stille, und sie setzt auf der nächsten Platte auf.

**Fade in** und **Fade out** in Tune this app unter Sound fügen am Anfang oder Ende jedes Titels eine Blende von bis zu acht Sekunden hinzu, auch beim letzten Song eines Albums. Beide sind aus, bis Sie sie einstellen. Auf einem Gerät, auf dem die App die Lautstärke nicht steuern kann, sind Blenden nicht verfügbar, und Tune this app weist darauf hin.

## Die Animation ist davon getrennt

Die Plattenwechsel-Animation und wie oft sie erscheint, betrifft das Bild und seinen Soundeffekt, nicht die Musik. Wenn Sie die Animation ausschalten, entstehen keine Pausen: Titel desselben Albums gehen weiterhin ineinander über.`,
  },
  {
    id: 'lyrics',
    title: 'Songtexte: woher die Worte kommen',
    summary: 'Zuerst die Texte in Ihren Dateien, dazu eine optionale Online-Suche.',
    group: 'So funktioniert es',
    body: `Tippen Sie in Now Playing auf **Lyrics**, um den Text des laufenden Songs zu sehen. Er kann aus zwei Quellen stammen, immer in dieser Reihenfolge.

## 1. Ihre eigene Datei

Viele Musikdateien enthalten den Songtext in ihren Tags, eingetragen vom Shop, einem Ripping-Programm oder einem Tag-Editor. Die App sieht zuerst dort nach. Das funktioniert ohne Internetverbindung, und weil es Ihre eigene Datei ist, hat es immer Vorrang vor allem, was online gefunden wird.

Die App liest Songtexte, die in der Musikdatei selbst gespeichert sind. Separate Textdateien, die neben einem Song liegen, werden nicht gelesen.

## 2. Eine Online-Suche, nur wenn Sie sie einschalten

Hat ein Song keinen eigenen Text, kann die App bei lrclib.net nachfragen, einer kostenlosen, von einer Community gepflegten Sammlung von Songtexten. Diese Funktion ist **aus**, bis Sie in Tune this app unter Lyrics ein Häkchen bei **Look up missing lyrics online** setzen.

Ist sie eingeschaltet, sendet die Suche nach einem Song nur Interpret, Titel, Album und Länge, direkt von Ihrem Gerät an lrclib.net. Nichts weiter über Sie, Ihr Gerät oder Ihre Mediathek wird gesendet, und die Anfrage läuft nicht über UNI·SIM. Die Antwort wird auf Ihrem Gerät gespeichert, sodass jeder Song nur einmal abgefragt wird. Wurde kein Text gefunden, versucht es die App eventuell nach einigen Tagen erneut. Tune this app zeigt, wie viele Songs abgefragt wurden, und bietet eine Schaltfläche, um alle zu vergessen.

Da die Sammlung von Freiwilligen erstellt wird, kann ein Text gelegentlich ungenau oder leicht verschoben sein.

## Songtexte, die der Musik folgen

Manche Songtexte haben am Anfang jeder Zeile eine Zeitmarke. Man spricht von synchronisierten Songtexten, oft in einem Format namens LRC. Damit folgt die Textanzeige dem Song während der Wiedergabe, und ein Tippen auf eine Zeile springt an diese Stelle im Song. Texte ohne Zeitmarken werden als normaler Text angezeigt.

Synchronisierte Texte ermöglichen außerdem zwei optionale Extras, beide in Tune this app unter Lyrics: **Lyrics around the record** schreibt die Worte beim Singen rund um die sich drehende Platte, und **Lyrics on the lock screen** zeigt die gerade gesungene Zeile in den Musiksteuerelementen Ihres Smartphones.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Musik bei ausgeschaltetem Bildschirm',
    summary: 'Wiedergabe im Hintergrund, Steuerung auf dem Sperrbildschirm, Sleep-Timer und mehr.',
    group: 'So funktioniert es',
    body: `Ein Musikplayer muss weiterspielen, wenn das Smartphone in der Tasche steckt. So verhält sich Universal Jukebox, wenn die App nicht im Vordergrund ist.

## Auf dem Smartphone

- **iPhone:** Die App spielt weiter, wenn Sie das Gerät sperren oder zu einer anderen App wechseln. Song, Interpret und Cover erscheinen auf dem Sperrbildschirm und im Kontrollzentrum, mit Wiedergabe, Pause und Titelsprung.
- **Android:** Während Musik läuft, zeigt die App eine Wiedergabe-Benachrichtigung mit denselben Steuerelementen an; dadurch kann Android sie bei ausgeschaltetem Bildschirm weiterlaufen lassen. Sie bleibt, bis die Warteschlange endet oder Sie die App wegwischen. Tasten an Kopfhörern und Bluetooth-Geräten funktionieren ebenfalls.

Die App übernimmt nicht die Audiowiedergabe Ihres Smartphones. Ein Anruf oder eine andere Musik-App pausiert sie, wie man es erwartet.

## Im Browser oder am Computer

Im Browser erscheint der Song meist in den Mediensteuerelementen Ihres Computers oder Smartphones, und Medientasten auf der Tastatur funktionieren. Ob ein Browser im Hintergrund weiterspielt, besonders auf dem Smartphone, liegt am Browser. Für zuverlässiges Hören bei ausgeschaltetem Bildschirm nutzen Sie die iPhone- oder Android-App.

## Der Sleep-Timer

**Sleep** unter den runden Schaltflächen in Now Playing beendet die Musik für Sie:

1. Tippen Sie darauf, um nacheinander 15, 30, 45 und 60 Minuten und dann Aus einzustellen.
2. Oder halten Sie die Schaltfläche gedrückt, um eine beliebige Dauer bis zu 12 Stunden zu wählen.
3. In der letzten Minute wird die Musik sanft leiser und pausiert dann.

Der Timer läuft auch bei gesperrtem Smartphone weiter.

## Bildschirm eingeschaltet lassen

Wenn Sie der Platte gern beim Drehen zusehen, verhindert **Keep awake**, dass der Bildschirm dunkler wird oder sich sperrt, solange Now Playing geöffnet ist.

## Eine Benachrichtigung pro Song

**Notify me of each new song** in Tune this app zeigt Song, Interpret und Cover an, sobald ein neuer Song beginnt, während die App nicht im Vordergrund ist. Es wird immer nur eine angezeigt, die vom nächsten Song ersetzt wird, und sie gibt keinen Ton von sich. Die Funktion ist aus, bis Sie sie einschalten – und erst dann fragt Ihr Gerät nach der Berechtigung.`,
  },
  {
    id: 'privacy',
    title: 'Was Ihr Gerät verlässt',
    summary: 'Nichts wird hochgeladen – und die drei optionalen Abfragen im Einzelnen.',
    group: 'Datenschutz und Sicherheit',
    body: `Universal Jukebox ist so gebaut, dass alles auf Ihrem eigenen Gerät passiert. Ihre Musik wird nie hochgeladen, Sie brauchen kein Konto, und die App funktioniert ohne Internetverbindung.

## Was auf Ihrem Gerät bleibt

- **Ihre Musikdateien.** Sie werden dort gelesen, wo sie liegen, und nie auf einen Server kopiert.
- **Der Katalog Ihrer Mediathek**: Titel, Interpreten, Alben, kleine Kopien der Cover und etwaige Aufräum-Korrekturen.
- **Ihre Einstellungen, Ihre Wünsche und die Stelle, an der Sie aufgehört haben.** Sie bleiben in der App auf diesem Gerät.

Nichts davon wird von der App gesichert oder synchronisiert. Wenn Sie Jukebox auf zwei Geräten nutzen, hat jedes seine eigene Mediathek.

## Die drei Abfragen

Nur drei Funktionen senden überhaupt etwas über Ihre Musik, und keine davon tut etwas, bevor Sie es möchten. Jede geht direkt von Ihrem Gerät an den genannten Dienst, ohne Umweg über UNI·SIM, und sendet nur das Aufgeführte.

- **Songtext-Suche** (aus, bis Sie sie in Tune this app einschalten): sendet Interpret, Titel, Album und Länge eines Songs an lrclib.net, für Songs ohne eigenen Text.
- **About this track** (aus, bis Sie es einschalten – in Tune this app oder direkt im Bereich selbst): sendet den Songtitel und den Namen des Interpreten an Wikipedia, um anzuzeigen, was Wikipedia darüber schreibt. Antworten werden 90 Tage auf dem Gerät gespeichert, und nach einem Song ohne Artikel wird nach einigen Tagen erneut gefragt.
- **Find a picture** bei einem Wunsch: sendet die von Ihnen eingegebenen Wörter an Apples iTunes-Suche, und zwar nur, wenn Sie darauf tippen. Das gewählte Bild wird mit dem Wunsch gespeichert.

Die Antworten der ersten beiden werden auf Ihrem Gerät gespeichert, sodass ein Song nur einmal abgefragt wird. Tune this app zeigt, wie viele es sind, und lässt Sie sie vergessen. Audio verlässt Ihr Gerät nie.

## Universal ID

Die Anmeldung mit einer Universal ID ist optional. Sie hält Sie in allen UNI·SIM-Apps angemeldet. Solange Sie angemeldet sind, erfasst die App bei jedem Start ein „Geöffnet“-Ereignis in Ihrem Konto. Dieses Ereignis sagt nichts über Ihre Musik aus.

## Berechtigungen

Die App bittet nur dann um Zugriff, wenn eine Funktion ihn braucht: auf einen Ordner, den Sie wählen, auf die Musik-Mediathek Ihres iPhones, wenn Sie diese abspielen möchten, und auf Benachrichtigungen, wenn Sie sie einschalten. Jede dieser Berechtigungen können Sie in den Einstellungen Ihres Geräts widerrufen.`,
  },
]

export default articles
