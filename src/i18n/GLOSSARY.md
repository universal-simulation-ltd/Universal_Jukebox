# Universal Jukebox — translation glossary

Every translator of this app uses these terms, in the app (`src/i18n/<lang>/`),
in the knowledge base (`src/knowledge/<lang>.ts`) and later in the store text,
so all three say the same thing.

English (en-GB) is the source. If a term is missing, add it here first, then use
it.

## Translating the app (the workflow)

- One folder per language, `src/i18n/<lang>/`, with the same files as `en/` —
  one per namespace. A translator edits only their own language's folder.
- Each file is typed `Draft['<namespace>']`: any subset of the English keys. A
  key left out shows in English, so the app builds and runs while a language is
  part done; a misspelt or stale key is a `tsc` error.
- Copy each key from `en/<namespace>.ts` and translate the value. Keep every
  `{placeholder}` exactly (the test checks), keep each plural's forms
  (`_one`/`_other`, plus `_many` where `Intl.PluralRules` picks it — French,
  Spanish, Italian and Portuguese do for round millions; `_other` covers it if
  left out), and read the English comment for where it shows and length limits.
- `npm test` checks placeholders, extra keys and empty strings in every
  language. `npm run i18n:check -- <lang>` also fails on any missing key: the
  gate before a release (`npm run i18n:check` for all of them).
- See a screen's keys at a glance: `npm run dev`, then open the app with
  `?pseudo` (`?app&pseudo` for the phone screens) — every translated string
  shows in ⟦brackets⟧, so anything without them is still hard-coded. UI labels are in sentence case in every language (only the first word and
proper nouns get a capital; German nouns keep theirs).

**Universal PDF's glossary** (`Universal_Apps/Universal_PDF/src/i18n/GLOSSARY.md`)
covers the shared suite words — file, save, download, share, sign in, account,
backup, settings, cancel, done, close, upload — and its per-language style notes
(punctuation, quotes, decimal comma, button forms) apply here unchanged. It wins
where both have a term. **The SDK's own wording** wins for the suite's menu
words (table below), because the navbar and profile menu around this app use it.

## Never translated

UNI·SIM, UNISIM.co.uk, Universal ID, Universal Jukebox, Universal Converter,
Universal Apps, Jukebox (as the app's short name — "open Jukebox" — AND as the
name of the library tab and the shelf layout: `app.tab_jukebox`, `*.layout_jukebox`,
`settings.home_jukebox` and the sentences that name that tab), MENU (printed on
the pocket player's click wheel, `decks.pocket_menu`), Wikipedia,
LRCLIB / lrclib.net, iTunes, Apple Music and Apple's Music app ("Musique",
"Música", "Musica", "Musik", "Müzik" are Apple's own names for the app in
those languages — use Apple's localised name when it means the app on the
phone), iPhone, iPad, Android, Windows, Mac, Chrome, Edge, Safari, Firefox,
Bluetooth, AirPlay, Walkman (brand-like, kept as "Walkman-style"), Proton Drive,
iCloud Drive, Google Drive, OneDrive, GitHub, file formats and extensions (MP3,
M4A, AAC, FLAC, WAV, AIFF, Ogg, Opus, .m4p, .wma, JSON), and the numbers
33⅓ and 45 (rpm).

Song, album, artist and genre names and lyrics come from the person's files
and are never translated.

## The machines (decks)

The app draws the music playing on a machine: the **deck**. The six machines
and Automatic are ordinary nouns and ARE translated (they are what the thing
is, not brands).

| English | fr | es | it | de | pt-BR | pt-PT | tr |
|---|---|---|---|---|---|---|---|
| deck (the machine on screen) | platine (f.) | aparato | apparecchio | Abspielgerät | aparelho de som | aparelhagem | çalar |
| Vinyl | Vinyle | Vinilo | Vinile | Vinyl | Vinil | Vinil | Plak |
| CD | CD | CD | CD | CD | CD | CD | CD |
| Cassette | Cassette | Casete | Cassetta | Kassette | Fita cassete | Cassete | Kaset |
| Reel-to-reel | Magnétophone à bandes | Magnetófono de bobinas | Registratore a bobine | Tonbandgerät | Gravador de rolo | Gravador de bobinas | Makaralı teyp |
| Jukebox (the machine) | Juke-box | Jukebox | Jukebox | Jukebox | Jukebox | Jukebox | Jukebox |
| Pocket player | Baladeur | Reproductor de bolsillo | Lettore tascabile | Taschenplayer | Player de bolso | Leitor de bolso | Cep müzik çalar |
| Automatic | Automatique | Automático | Automatico | Automatisch | Automático | Automático | Otomatik |
| record (vinyl) | disque | disco | disco | Platte | disco | disco | plak |
| a 45 (single) | 45 tours | single (de 45 rpm) | 45 giri | Single | compacto | single | 45’lik |
| disc (CD) | disque | disco | disco | CD | disco | disco | disk |
| turntable | platine vinyle | tocadiscos | giradischi | Plattenspieler | toca-discos | gira-discos | pikap |
| tonearm / the arm | bras de lecture | brazo | braccio | Tonarm | braço | braço | ton kolu |
| needle | aiguille | aguja | puntina | Nadel | agulha | agulha | iğne |
| needle drop (sound) | pose de l’aiguille | caída de la aguja | appoggio della puntina | Aufsetzen der Nadel | pouso da agulha | pousar da agulha | iğnenin inişi |
| laser | laser | láser | laser | Laser | laser | laser | lazer |
| tape | bande | cinta | nastro | Band | fita | fita | bant |
| tape head | tête de lecture | cabezal | testina | Tonkopf | cabeçote | cabeça de leitura | teyp kafası |
| reel (spool) | bobine | bobina | bobina | Spule | rolo | bobina | makara |
| play key | touche lecture | tecla de reproducción | tasto play | Play-Taste | tecla play | tecla play | çalma tuşu |
| click wheel | molette cliquable | rueda de clic | rotella cliccabile | Click-Wheel | roda clicável | roda clicável | tıklama tekerleği |
| gripper (jukebox arm) | pince | pinza | pinza | Greifer | garra | garra | tutucu |
| platter | plateau | plato | piatto | Plattenteller | prato | prato | plak tablası |

## Music terms

| English | fr | es | it | de | pt-BR | pt-PT | tr |
|---|---|---|---|---|---|---|---|
| song | morceau | canción | brano | Song (pl. Songs) | música | música | şarkı |
| track (in an album's running order) | piste | pista | traccia | Titel | faixa | faixa | parça |
| album | album | álbum | album | Album (pl. Alben) | álbum | álbum | albüm |
| artist | artiste | artista | artista | Interpret (pl. Interpreten) | artista | artista | sanatçı |
| genre | genre | género | genere | Genre | gênero | género | tür |
| library (your music) | bibliothèque | biblioteca | libreria | Mediathek | biblioteca | biblioteca | kitaplık |
| catalogue (the app's index of it) | catalogue | catálogo | catalogo | Katalog | catálogo | catálogo | katalog |
| cover / album art | pochette | carátula | copertina | Cover | capa | capa | kapak |
| tags (in a file) | tags | etiquetas | tag | Tags | tags | etiquetas | etiketler |
| folder | dossier | carpeta | cartella | Ordner | pasta | pasta | klasör |
| scan / rescan | analyser / réanalyser | escanear / volver a escanear | scansiona / ripeti scansione | einlesen / neu einlesen | escanear / escanear de novo | analisar / analisar novamente | tara / yeniden tara |
| example library | bibliothèque d’exemple | biblioteca de ejemplo | libreria di esempio | Beispiel-Mediathek | biblioteca de exemplo | biblioteca de exemplo | örnek kitaplık |
| shelf (a person’s own collection of songs) | étagère | estante | scaffale | Regal | estante | prateleira | raf |
| request (a song asked for) | demande | petición | richiesta | Wunsch | pedido | pedido | istek |
| queue | file d’attente | cola | coda | Warteschlange | fila | fila | kuyruk |
| Up next | À suivre | A continuación | Prossimi | Als Nächstes | A seguir | A seguir | Sıradaki |
| Play next | Lire ensuite | Reproducir a continuación | Riproduci dopo | Als Nächstes spielen | Tocar a seguir | Reproduzir a seguir | Sonra çal |
| Add to queue | Ajouter à la file d’attente | Añadir a la cola | Aggiungi alla coda | Zur Warteschlange hinzufügen | Adicionar à fila | Adicionar à fila | Kuyruğa ekle |
| play / pause | lire / pause | reproducir / pausa | riproduci / pausa | abspielen / Pause | tocar / pausar | reproduzir / pausa | çal / duraklat |
| Now playing | En cours de lecture | Reproduciendo | In riproduzione | Läuft gerade | Tocando agora | A reproduzir | Şimdi çalıyor |
| next / previous track | piste suivante / précédente | pista siguiente / anterior | traccia successiva / precedente | nächster / vorheriger Titel | próxima faixa / faixa anterior | faixa seguinte / anterior | sonraki / önceki parça |
| shuffle | aléatoire | aleatorio | casuale | Zufallswiedergabe (button: Zufällig) | aleatório | aleatório | karıştır |
| repeat | répéter | repetir | ripeti | wiederholen | repetir | repetir | tekrarla |
| preview (a short listen) | pré-écoute | escucha previa | anteprima | Vorhören | prévia | pré-audição | ön dinleme |
| crossfade | fondu enchaîné | fundido encadenado | dissolvenza incrociata | Überblendung (verb: überblenden) | crossfade | transição cruzada | çapraz geçiş |
| fade in / fade out | fondu d’entrée / de sortie | fundido de entrada / de salida | dissolvenza in entrata / in uscita | Einblenden / Ausblenden | fade de entrada / de saída | desvanecimento de entrada / de saída | yavaş açılma / yavaş kapanma |
| gap / gapless | blanc / sans blanc | pausa / sin pausas | pausa / senza pause | Pause / lückenlos | pausa / sem pausas | pausa / sem pausas | boşluk / boşluksuz |
| volume | volume | volumen | volume | Lautstärke | volume | volume | ses düzeyi |
| Stable volume (feature) | Volume stable | Volumen estable | Volume stabile | Gleichmäßige Lautstärke | Volume estável | Volume estável | Sabit ses düzeyi |
| volume boost | amplification du volume | refuerzo de volumen | amplificazione del volume | Lautstärkeanhebung | reforço de volume | reforço de volume | ses yükseltme |
| audio output | sortie audio | salida de audio | uscita audio | Audioausgabe | saída de áudio | saída de áudio | ses çıkışı |
| headphones | écouteurs | auriculares | cuffie | Kopfhörer | fones de ouvido | auscultadores | kulaklık |
| lyrics | paroles | letra | testo | Songtext | letra | letra | şarkı sözleri |
| sing along | chanter avec | cantar | canta insieme | mitsingen | cantar junto | cantar com a música | birlikte söyle |
| lock screen | écran verrouillé | pantalla de bloqueo | schermata di blocco | Sperrbildschirm | tela de bloqueio | ecrã de bloqueio | kilit ekranı |
| notification | notification | notificación | notifica | Mitteilung | notificação | notificação | bildirim |
| sleep timer | minuteur de veille | temporizador de apagado | timer di spegnimento | Sleep-Timer | timer de desligamento | temporizador de suspensão | uyku zamanlayıcısı |
| Bedside (the bedside clock view) | Chevet | Mesilla | Comodino | Nachttisch | Cabeceira | Mesa de cabeceira | Başucu |
| Keep awake (screen) | Garder l’écran allumé | Mantener la pantalla encendida | Mantieni lo schermo acceso | Bildschirm anlassen | Manter a tela ligada | Manter o ecrã ligado | Ekranı açık tut |
| visualiser | visualiseur | visualizador | visualizzatore | Visualisierung | visualizador | visualizador | görselleştirici |
| Resume listening | Reprendre l’écoute | Seguir escuchando | Riprendi l’ascolto | Weiterhören | Continuar ouvindo | Continuar a ouvir | Dinlemeye devam et |
| Tidy up library | Ranger la bibliothèque | Ordenar la biblioteca | Riordina la libreria | Mediathek aufräumen | Arrumar a biblioteca | Arrumar a biblioteca | Kitaplığı düzenle |
| About this track | À propos de ce morceau | Acerca de esta canción | Informazioni sul brano | Über diesen Song | Sobre esta música | Sobre esta música | Bu şarkı hakkında |
| Find a picture | Trouver une image | Buscar una imagen | Trova un’immagine | Bild suchen | Encontrar uma imagem | Encontrar uma imagem | Görsel bul |

## The suite's menu words (use the SDK's wording exactly)

| English | fr | es | it | de | pt-BR | pt-PT | tr |
|---|---|---|---|---|---|---|---|
| Tune this app (Jukebox's settings page) | Régler cette application | Ajustar esta app | Regola questa app | Diese App anpassen | Ajustar este app | Ajustar esta aplicação | Bu uygulamayı ayarla |
| Global Tuning | Réglages globaux | Ajustes globales | Regolazioni globali | Globale Anpassungen | Ajustes globais | Ajustes globais | Genel ayarlar |
| Actions | Actions | Acciones | Azioni | Aktionen | Ações | Ações | İşlemler |
| Advanced | Avancé | Avanzado | Avanzate | Erweitert | Avançado | Avançado | Gelişmiş |
| Knowledge base | Base de connaissances | Base de conocimientos | Knowledge base | Wissensdatenbank | Base de conhecimento | Base de conhecimento | Bilgi bankası |
| About this app | À propos de cette application | Acerca de esta aplicación | Informazioni su questa app | Über diese App | Sobre este aplicativo | Sobre esta aplicação | Bu uygulama hakkında |
| Language | Langue | Idioma | Lingua | Sprache | Idioma | Idioma | Dil |
| Colour scheme | Thème de couleurs | Esquema de colores | Combinazione di colori | Farbschema | Esquema de cores | Esquema de cores | Renk düzeni |
| Light / Dark / System | Clair / Sombre / Système | Claro / Oscuro / Sistema | Chiaro / Scuro / Sistema | Hell / Dunkel / System | Claro / Escuro / Sistema | Claro / Escuro / Sistema | Açık / Koyu / Sistem |
| Follow global: {value} | Suivre le réglage global : {value} | Seguir la configuración global: {value} | Segui l’impostazione globale: {value} | Globaler Einstellung folgen: {value} | Seguir a configuração global: {value} | Seguir a opção global: {value} | Genel ayarı izle: {value} |
| Reset to defaults | Rétablir les réglages par défaut | Restablecer valores predeterminados | Ripristina impostazioni predefinite | Auf Standard zurücksetzen | Restaurar padrões | Repor predefinições | Varsayılanlara sıfırla |

## Register

**The app's UI** (this folder) uses the same register as Universal QR's and
Universal PDF's UI: **vous** in French, **tú** in Spanish, **tu** in Italian,
**du** (lower case) in German, **você** (usually implied) in pt-BR, the
infinitive/impersonal in pt-PT (avoid *tu* and *você*), and Turkish neutral
polite (*-in/-ın* imperatives; buttons the bare verb stem) without spelling out
*siz* where the sentence works without it.

**The knowledge base** (`src/knowledge/`) was written formally in German (*Sie*)
and Spanish (*usted*) — the same split as Universal QR, whose knowledge base is
also formal. Keep each knowledge-base file in its own register; the UI labels it
quotes in bold must match the app's labels word for word.

## Style

- Sentence case for labels and headings. No exclamation marks.
- Follow PDF's per-language punctuation: French « … » and a non-breaking space
  before : ; ? !, German „…“, Spanish/Italian/pt-PT «…», pt-BR and Turkish “…”.
- Times and dates come from Intl (`t.locale`): never write a format by hand.
- Counts are plurals (`t.plural`), with `{count}` in every form, including
  `_one` — French and Portuguese pick "one" for 0 too.
- Tight spots (tab names, transport buttons, chips) have a length note in the
  English comment: keep to it, abbreviate if your language must.
- Turkish suffixes on names and abbreviations take an apostrophe (Jukebox’ta,
  CD’yi, Wikipedia’dan); on a `{placeholder}` that holds a name, prefer a
  construction that needs no suffix.
