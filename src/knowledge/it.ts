import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'I formati audio, e perché alcuni brani non si riproducono',
    summary: 'MP3, FLAC, WAV e gli altri, e cosa impedisce a un file di essere riprodotto.',
    group: 'Le basi',
    body: `Un file musicale è suono registrato, trasformato in numeri e impacchettato in un certo modo. Quel modo si chiama formato, e di solito sono le lettere alla fine del nome del file a dirti quale: .mp3, .m4a, .flac e così via.

## Due famiglie di formati

- I formati **con perdita**, come MP3 e AAC (di solito nei file .m4a), rendono i file molto più piccoli eliminando dettagli che la maggior parte degli ascoltatori difficilmente nota. Quasi tutta la musica acquistata o estratta da CD negli ultimi vent’anni è in uno di questi formati.
- I formati **senza perdita**, come FLAC, WAV e AIFF, conservano ogni dettaglio della registrazione originale. I file sono più grandi, ma non è stato buttato via nulla.

## Cosa riproduce Universal Jukebox

Universal Jukebox riproduce MP3, M4A e AAC, FLAC, WAV e AIFF. Anche i file Ogg e Opus si riproducono dove il tuo dispositivo li supporta, cosa che vale per la maggior parte dei dispositivi, ma non per tutti.

L’app non ha decoder propri: si affida al supporto audio integrato nel tuo dispositivo. Per questo l’elenco qui sopra può variare leggermente da un dispositivo all’altro.

## Perché un brano potrebbe non riprodursi

- **È protetto da copia.** I brani venduti con protezione (per esempio i vecchi acquisti iTunes con estensione .m4p) e le canzoni scaricate con un abbonamento a un servizio di streaming possono essere riprodotti solo dall’app del negozio o del servizio. Nessun altro lettore può aprirli.
- **Niente sul tuo dispositivo sa decodificarlo.** I file Windows Media Audio (.wma), Monkey’s Audio (.ape) e WavPack (.wv) non si possono riprodurre. Universal Converter può convertire i file WMA e APE in formati che questa app riproduce, direttamente sul tuo dispositivo.
- **È un audiolibro.** Il formato per audiolibri .m4b non viene riprodotto.
- **Non è una registrazione.** Un file MIDI (.mid) contiene istruzioni (quali note suonare, e quando) invece di suono registrato, quindi non c’è niente da ascoltare.
- **Il file è danneggiato**, per esempio un download che si è interrotto a metà.

## Vedere il motivo

Per impostazione predefinita, i brani che non si possono riprodurre vengono saltati senza avvisi. Se preferisci sapere perché, spunta **Mostra i messaggi di errore** in Regola questa app, nella sezione Messaggi: l’app indicherà ogni file che non è riuscita a riprodurre e cosa non andava.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Tag e copertine: da dove viene la tua libreria',
    summary: 'Come fa l’app a conoscere artista, album e copertina di ogni brano.',
    group: 'Le basi',
    body: `Universal Jukebox non cerca la tua musica da nessuna parte. Tutto ciò che vedi nella libreria (titoli, artisti, album, numeri di traccia, anni, generi e copertine) viene letto dai tuoi file.

## Cosa sono i tag

La maggior parte dei file musicali contiene una piccola etichetta, chiamata tag. I tag raccolgono informazioni sulla registrazione: il titolo del brano, l’artista, l’album, il numero di traccia e di disco, l’anno, il genere e spesso un’immagine della copertina. Li scrive chi ha creato il file: il negozio da cui l’hai acquistato, il programma che ha estratto il CD o un editor di tag.

L’app legge i tipi di tag più comuni usati dai file MP3, M4A, FLAC e Ogg. La scansione legge solo la parte di ogni file in cui sono conservati i tag, non l’intero brano, così anche una libreria grande viene analizzata in fretta.

## Quando i tag mancano o sono sbagliati

- **Un file senza tag** viene mostrato con il suo nome, senza l’eventuale numero di traccia iniziale. L’app non indovina l’artista dal nome del file, perché un’ipotesi sbagliata è peggio di un campo vuoto.
- **Un disco diviso in due** di solito significa che le sue tracce sono state etichettate in modo incoerente, per esempio con il nome dell’artista scritto in due modi diversi.
- **Una copertina mancante** può voler dire che l’immagine non è mai stata salvata nei file, oppure che è stata salvata in una traccia successiva invece che nella prima.

## Fare ordine

**Riordina la libreria**, in Regola questa app, nella sezione La tua libreria, cerca due cose: copertine già presenti sul tuo dispositivo ma non usate (un’immagine con un nome da copertina, come cover.jpg, accanto alle tracce, o un’immagine salvata in una traccia successiva) e dischi che tag incoerenti hanno diviso in due. Ti mostra ogni suggerimento, con l’immagine che userebbe, e non cambia nulla finché non premi il pulsante.

Rifiuta di proposito tutto ciò di cui non può essere sicura. Due album con lo stesso nome in cartelle diverse, o una cartella con due album diversi, vengono lasciati così come sono.

## I tuoi file non vengono mai modificati

Fare ordine corregge solo la libreria all’interno dell’app. Non riscrive i tag, non rinomina i file e non sposta nulla, e le tue correzioni vengono riapplicate automaticamente dopo una nuova scansione.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Dove si trova la tua musica',
    summary: 'Cartelle, telefoni e nuove scansioni, e perché un browser potrebbe chiedere di nuovo.',
    group: 'Come funziona',
    body: `Universal Jukebox non è un servizio di streaming e non ha musica propria. Riproduce i file che sono già sul tuo dispositivo, o su un’unità che il tuo dispositivo può raggiungere. L’app non li carica online, non li sposta e non li modifica mai.

## Aggiungere musica

Apri il menu e scegli **La tua libreria completa**. Da lì puoi aggiungere una cartella, avviare una nuova scansione o rimuovere una cartella. Aggiungere una cartella amplia la libreria invece di sostituirla, e rimuoverne una toglie solo i brani di quella cartella. Il funzionamento delle cartelle dipende da dove usi l’app:

- **Chrome ed Edge** possono ricordare la cartella che hai scelto. Quando torni, potrebbe esserti chiesto di confermare l’accesso una volta, con un solo tocco.
- **Firefox e Safari** non possono conservare il permesso di leggere una cartella da una visita all’altra, quindi scegli la cartella ogni volta. La libreria, le copertine e le impostazioni restano comunque memorizzate, così non serve rileggere nulla.
- **L’app per iPhone** ha una sua cartella, chiamata Universal Jukebox, nell’app File. Tutto ciò che ci copi, invii con AirDrop o salvi entra a far parte della tua libreria. Puoi anche aggiungere altre cartelle e riprodurre i brani della libreria Musica dell’iPhone salvati sul telefono, come quelli sincronizzati da un computer.
- **L’app per Android** ti chiede di scegliere ogni cartella una volta nel selettore di sistema, e Android ricorda il permesso.

## Nuova scansione

L’app non si accorge da sola quando compaiono o spariscono dei file. Dopo aver aggiunto o eliminato musica fuori dall’app, scegli **Ripeti scansione**. Una nuova scansione aggiunge i brani nuovi, toglie quelli che non ci sono più e mantiene le correzioni che hai fatto con il riordino.

## I brani della libreria Musica dell’iPhone

I brani sincronizzati sull’iPhone da un computer si possono riprodurre. La prima volta che uno viene riprodotto, l’app ne crea una copia di lavoro in uno spazio limitato del telefono. I brani scaricati con un abbonamento ad Apple Music, e quelli che sono in iCloud ma non sul telefono, non possono essere riprodotti da nessun’altra app; l’app ti dice quanti ha dovuto escluderne.

## Cosa conserva l’app

L’app conserva sul tuo dispositivo un catalogo della libreria (titoli, artisti, album e piccole copie delle copertine), così la volta successiva si apre in fretta. Questo catalogo non viene condiviso tra dispositivi: ogni dispositivo crea il proprio. Cancellare i dati di questo sito in un browser cancella il catalogo, ma mai la tua musica. Di scaffali, richieste e impostazioni puoi fare un backup: vedi Tenere al sicuro la tua musica.`,
  },
  {
    id: 'keeping-your-music-safe',
    title: 'Tenere al sicuro la tua musica',
    summary: 'La tua musica nel tuo cloud, e un backup dei tuoi scaffali.',
    group: 'Come funziona',
    body: `Universal Jukebox non carica mai la tua musica, quindi non può nemmeno perderla. La tua musica è al sicuro quanto il posto in cui la tieni. Un telefono perso o rotto non dovrebbe portarsi via la tua collezione, quindi tienine una copia da un’altra parte.

## Tieni la tua musica nel tuo cloud

Va bene qualsiasi spazio di archiviazione cloud che usi già: Proton Drive, iCloud Drive, Google Drive, OneDrive o un computer di cui fai il backup. Sul telefono:

1. Metti la tua cartella musicale nel tuo spazio cloud.
2. Nell’app di quel servizio, rendi la cartella disponibile offline, così i brani vengono salvati sul telefono e si riproducono senza connessione. I brani che sono solo online non si possono riprodurre.
3. In Jukebox, apri il menu, scegli **La tua libreria completa** e aggiungi la cartella. Su iPhone, il servizio cloud deve comparire nell’app File; su Android, nel selettore delle cartelle.

Dopo aver aggiunto o rimosso brani nel cloud, scegli **Ripeti scansione**.

## Fai il backup di ciò che hai creato in Jukebox

I tuoi scaffali, le tue richieste, le tue impostazioni e gli eventuali file di testo che hai aggiunto esistono solo nell’app. Per conservarli, apri **Regola questa app** e poi **Backup**:

- **Salva un file di backup** crea un unico piccolo file che puoi conservare dove vuoi, anche su Proton Drive. Non serve un account. Nelle app per telefono viene salvato nella cartella Documenti dell’app, e puoi spostarlo dall’app File.
- **Fai il backup sul tuo Universal ID** conserva lo stesso backup con il tuo account, se hai effettuato l’accesso. Viene sostituito a ogni nuovo backup e puoi eliminarlo. Non è crittografato end-to-end. Se è troppo grande per il tuo account, l’app ti dice cosa ha lasciato fuori, e un file di backup conserva tutto.

## Su un nuovo telefono

Copia la tua musica o rendila disponibile offline, aggiungi la cartella e attendi che la libreria si carichi. Poi ripristina il backup. Le tue impostazioni vengono sostituite da quelle del backup. I suoi scaffali e le sue richieste si aggiungono a ciò che hai, e non viene rimosso nulla.

I brani vengono ritrovati in base a titolo, artista e album, quindi uno scaffale torna anche se i file sono copie nuove. Un brano che non è ancora nella tua libreria viene lasciato fuori. Ripeti il ripristino dopo aver aggiunto altra musica per recuperarlo.`,
  },
  {
    id: 'between-songs',
    title: 'Dissolvenze incrociate, dissolvenze e pause tra i brani',
    summary: 'Cosa significano dissolvenza incrociata e riproduzione senza pause, e cosa succede tra una traccia e l’altra.',
    group: 'Come funziona',
    body: `Quello che succede nel secondo o due tra un brano e l’altro cambia in modo sorprendente la percezione di un album. Vale la pena conoscere alcuni termini.

## I termini

- **Una pausa** è il silenzio che un lettore può lasciare tra due tracce. Nella maggior parte degli album passa inosservata, ma in un disco dal vivo o in un mix continuo spezza la musica.
- **La riproduzione senza pause** (gapless) significa passare da una traccia alla successiva senza aggiungere silenzio, come l’album è stato pensato per essere ascoltato.
- **Una dissolvenza incrociata** (crossfade) sovrappone la fine di un brano all’inizio del successivo: il primo si abbassa mentre il secondo sale, così non c’è mai silenzio.
- **Una dissolvenza in entrata o in uscita** fa salire un singolo brano dal silenzio all’inizio, o lo fa scendere fino al silenzio alla fine.

## Cosa fa Universal Jukebox

**I brani dello stesso album** si susseguono direttamente con una dissolvenza incrociata breve e delicata. Il brano che arriva sale solo man mano che quello che se ne va si abbassa, così il passaggio è fluido e non si sentono due brani ad alto volume insieme.

**Quando il brano successivo è su un altro disco**, per impostazione predefinita anche i due si sovrappongono in dissolvenza, mentre sullo schermo un lettore esce scorrendo e il successivo entra. Se preferisci uno stacco netto, spunta **Nessuna dissolvenza incrociata tra dischi** in Regola questa app: la puntina si solleva, c’è un attimo di silenzio e si posa sul disco successivo.

**Dissolvenza in entrata** e **Dissolvenza in uscita**, in Regola questa app, nella sezione Audio, aggiungono una dissolvenza fino a otto secondi all’inizio o alla fine di ogni traccia, compreso l’ultimo brano di un album. Sono entrambe disattivate finché non le imposti. Su un dispositivo che non permette all’app di controllare il volume, le dissolvenze non sono disponibili, e Regola questa app lo segnala.

## L’animazione è separata

L’animazione del cambio di disco, e la frequenza con cui compare, riguarda l’immagine e il suo effetto sonoro, non la musica. Disattivare l’animazione non aggiunge pause: i brani dello stesso album continuano a susseguirsi.`,
  },
  {
    id: 'lyrics',
    title: 'Testi: da dove vengono le parole',
    summary: 'Prima i testi nei tuoi file o salvati accanto, poi una ricerca online facoltativa.',
    group: 'Come funziona',
    body: `Premi **Mostra il foglio dei testi** nella schermata In riproduzione per vedere il testo del brano in riproduzione. Può arrivare da due fonti, sempre in quest’ordine.

## 1. Il tuo file

Molti file musicali contengono il testo nei tag, inserito dal negozio, da un programma di estrazione o da un editor di tag. L’app guarda prima lì. Funziona senza connessione a Internet e, dato che si tratta del tuo file, ha sempre la precedenza su qualunque cosa trovata online.

Viene letto anche un file di testo salvato accanto a un brano, purché abbia il nome del brano e finisca in **.lrc**: *Brano.mp3* e *Brano.lrc*. Viene letto durante la scansione della cartella, quindi dopo aver aggiunto file di testo ripeti la scansione della tua musica. Un file di testo che aggiungi a un singolo brano dal pannello dei testi ha la precedenza su entrambi.

## Testi per tutta la libreria

Se i tuoi file non hanno testi, un programma gratuito per computer chiamato **LRCGET** può scaricarli per un’intera cartella in una volta, come file .lrc accanto ai brani oppure scritti direttamente dentro i brani. L’articolo **Testi per tutta la libreria, con LRCGET** spiega come fare, passo dopo passo.

## 2. Una ricerca online, solo se la attivi

Su iPhone e iPad non c’è la ricerca online: aggiungi invece file di testo come spiegato sopra. Altrove, se un brano non ha un testo proprio, l’app può chiederlo a lrclib.net, una raccolta di testi gratuita gestita da una comunità. Questa opzione è **disattivata** finché non spunti **Cerca online i testi mancanti** in Regola questa app, nella sezione Testi.

Quando è attiva, la ricerca di un brano invia solo artista, titolo, album e durata, direttamente dal tuo dispositivo a lrclib.net. Non viene inviato nient’altro su di te, sul tuo dispositivo o sulla tua libreria, e la richiesta non passa da UNI·SIM. La risposta viene conservata sul tuo dispositivo, così ogni brano viene cercato una sola volta. Se non è stato trovato alcun testo, l’app può riprovare dopo qualche giorno. Regola questa app mostra quanti brani sono stati cercati, con un pulsante per dimenticarli tutti.

Poiché la raccolta è scritta da volontari, può capitare che un testo sia impreciso o leggermente fuori tempo.

## Testi che seguono la musica

Alcuni testi hanno un’indicazione di tempo all’inizio di ogni riga. Si chiamano testi sincronizzati, spesso in un formato noto come LRC. Con questi, il pannello dei testi segue il brano durante la riproduzione, e toccando una riga si salta a quel punto del brano. I testi senza indicazioni di tempo vengono mostrati come testo semplice.

I testi sincronizzati rendono possibili anche due opzioni, entrambe in Regola questa app, nella sezione Testi: **Testo intorno al disco**, che scrive le parole intorno al disco che gira mentre vengono cantate, e **Testo sulla schermata di blocco**, che mostra la riga cantata nei controlli musicali del telefono.`,
  },
  {
    id: 'lyrics-with-lrcget',
    title: 'Testi per tutta la libreria, con LRCGET',
    summary: 'Un programma gratuito per il computer che trova in una volta i testi di tutti i brani.',
    group: 'Come funziona',
    body: `**LRCGET** è un programma gratuito per Windows, Mac e Linux che cerca in un colpo solo i testi di tutti i brani di una cartella musicale. È realizzato da chi gestisce lrclib.net, una raccolta di testi gratuita gestita da una comunità, non da UNI·SIM. Scaricalo da **github.com/tranxuanthang/lrcget/releases**.

## Scaricare i testi

1. Apri LRCGET e scegli la cartella in cui si trova la tua musica. Il programma legge la cartella ed elenca i tuoi brani.
2. Fai clic su **Download all lyrics** (scarica tutti i testi), scegli per quali brani cercarli e lascia spuntato **Synced lyrics (.lrc)**.
3. Fai clic su **Download**. LRCGET salva un file .lrc accanto a ogni brano di cui trova il testo: *Brano.mp3* e *Brano.lrc*.

Se Universal Jukebox riproduce direttamente quella cartella, ripeti la scansione della musica in Regola questa app e i testi ci sono.

## Mettere i testi dentro i brani

Un file .lrc accompagna un brano solo se viene copiata tutta la cartella. Quando la tua musica arriva sull’iPhone o sull’iPad tramite l’app Musica o il Finder, vengono copiati solo i file musicali, quindi i testi devono trovarsi al loro interno.

1. In LRCGET, apri **Settings** e, sotto Experimental, spunta **Enable embed lyrics option**. LRCGET avverte che questo potrebbe danneggiare i file musicali, quindi prima fai un backup della libreria.
2. Fai di nuovo clic su **Download all lyrics**, spunta anche **Embed into track** e poi fai clic su **Download**.
3. Sincronizza la musica sul telefono o sul tablet come fai di solito. In Universal Jukebox, premi **Aggiorna la libreria di Musica del telefono** (su un iPad, **Aggiorna la libreria di Musica dell’iPad**) in Regola questa app, oppure ripeti la scansione della cartella.

I brani acquistati su Apple Music o ascoltati in streaming da lì sono protetti e le altre app non possono modificarli né riprodurli, quindi questo funziona solo con i tuoi file.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Ascoltare con lo schermo spento',
    summary: 'Riproduzione in background, controlli nella schermata di blocco, timer di spegnimento e altro.',
    group: 'Come funziona',
    body: `Un lettore musicale deve continuare a suonare quando metti il telefono in tasca. Ecco come si comporta Universal Jukebox quando non è sullo schermo.

## Su un telefono

- **iPhone:** l’app continua a suonare quando blocchi il telefono o passi a un’altra app. Brano, artista e copertina compaiono nella schermata di blocco e nel Centro di Controllo, con riproduci, pausa e salta.
- **Android:** durante la riproduzione, l’app mostra una notifica di riproduzione in corso con gli stessi controlli, ed è questo che permette ad Android di tenerla attiva con lo schermo spento. Rimane finché la coda non finisce o finché non chiudi l’app con uno scorrimento. Funzionano anche i tasti delle cuffie e dei dispositivi Bluetooth.

L’app non si impadronisce dell’audio del telefono. Una chiamata o un’altra app musicale la mettono in pausa, come ci si aspetta.

## In un browser o su un computer

In un browser, il brano di solito compare nei controlli multimediali del computer o del telefono, e i tasti multimediali della tastiera funzionano. Se il browser continui a riprodurre in background, soprattutto su un telefono, dipende dal browser. Per un ascolto affidabile con lo schermo spento, usa l’app per iPhone o Android.

## Il timer di spegnimento

**Timer**, tra i pulsanti rotondi di In riproduzione, ferma la musica al posto tuo:

1. Toccalo per passare a 15, 30, 45 e 60 minuti, e poi a spento.
2. Oppure tienilo premuto per scegliere una durata qualsiasi, fino a 12 ore.
3. Nell’ultimo minuto la musica si abbassa dolcemente, poi va in pausa.

Il timer continua a funzionare anche con il telefono bloccato.

## Tenere acceso lo schermo

Se ti piace guardare il disco che gira, **Resta acceso** impedisce allo schermo di attenuarsi o bloccarsi mentre In riproduzione è aperto.

## Una notifica per ogni brano

**Avvisami a ogni nuovo brano**, in Regola questa app, mostra brano, artista e copertina all’inizio di ogni nuovo brano mentre l’app non è sullo schermo. Ne compare sempre una sola, sostituita dalla successiva, e non emette alcun suono. È disattivata finché non la attivi, ed è in quel momento che il dispositivo ti chiede il permesso.`,
  },
  {
    id: 'privacy',
    title: 'Cosa esce dal tuo dispositivo',
    summary: 'Non viene caricato nulla, e le tre ricerche facoltative, nel dettaglio.',
    group: 'Privacy e sicurezza',
    body: `Universal Jukebox è pensato per funzionare interamente sul tuo dispositivo. La tua musica non viene mai caricata online, non serve alcun account e l’app funziona senza connessione a Internet.

## Cosa resta sul tuo dispositivo

- **I tuoi file musicali.** Vengono letti dove si trovano e non vengono mai copiati su un server.
- **Il catalogo della tua libreria**: titoli, artisti, album, piccole copie delle copertine ed eventuali correzioni fatte con il riordino.
- **Le tue impostazioni, le tue richieste e il punto in cui eri arrivato.** Restano nell’app su questo dispositivo.

Niente di tutto questo lascia il tuo dispositivo, a meno che tu non faccia un backup. Un file di backup va dove lo salvi tu. Un backup sul tuo Universal ID contiene impostazioni, scaffali, richieste ed eventuali testi che hai aggiunto, identificati per titolo, artista e album; non contiene mai la tua musica. Se usi Jukebox su due dispositivi, ognuno ha la propria libreria.

## Le tre ricerche

Solo tre funzioni inviano qualcosa sulla tua musica, e nessuna fa nulla finché non lo chiedi tu. Ognuna va direttamente dal tuo dispositivo al servizio indicato, senza passare da UNI·SIM, e invia solo quanto elencato.

- **Ricerca dei testi** (assente su iPhone e iPad; altrove disattivata finché non la attivi in Regola questa app): invia artista, titolo, album e durata di un brano a lrclib.net, per i brani che non hanno un testo proprio.
- **Informazioni sul brano** (disattivata finché non la attivi, in Regola questa app o nel pannello stesso): invia il titolo del brano e il nome dell’artista a Wikipedia, per mostrare cosa dice Wikipedia al riguardo. Le risposte vengono conservate sul dispositivo per 90 giorni, e un brano senza voce viene cercato di nuovo dopo qualche giorno.
- **Trova un’immagine**, in una richiesta: invia le parole che hai digitato alla ricerca iTunes di Apple, solo quando lo tocchi. L’immagine che scegli viene salvata con la richiesta.

Le risposte delle prime due vengono conservate sul tuo dispositivo, così un brano viene cercato una sola volta. Regola questa app mostra quante sono e ti permette di dimenticarle. Nessun audio lascia mai il tuo dispositivo.

## Universal ID

Accedere con un Universal ID è facoltativo. Ti mantiene connesso in tutte le app UNI·SIM e, se vuoi, ti permette di conservare un backup con il tuo account. Mentre hai effettuato l’accesso, l’app registra un evento di «apertura» sul tuo account ogni volta che si avvia. Quell’evento non dice nulla della tua musica.

## Permessi

L’app chiede l’accesso solo quando una funzione ne ha bisogno: a una cartella che scegli, alla libreria Musica dell’iPhone se chiedi di riprodurla e alle notifiche se le attivi. Puoi revocare ciascuno di questi permessi nelle impostazioni del dispositivo.`,
  },
]

export default articles
