import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Ses biçimleri ve bazı şarkıların neden çalmadığı',
    summary: 'MP3, FLAC, WAV ve diğerleri; bir dosyanın çalmasını neyin engellediği.',
    group: 'Temel bilgiler',
    body: `Bir müzik dosyası, sayılar olarak saklanıp belirli bir şekilde paketlenmiş kaydedilmiş sestir. Bu paketleme şekline biçim (format) denir ve dosya adının sonundaki harfler genellikle hangisi olduğunu söyler: .mp3, .m4a, .flac gibi.

## İki biçim ailesi

- MP3 ve AAC (genellikle .m4a dosyalarında) gibi **kayıplı** biçimler, çoğu dinleyicinin fark etmesi pek olası olmayan ayrıntıları atarak dosyaları çok daha küçük hale getirir. Son yirmi yılda satın alınan ya da CD’den aktarılan müziğin büyük bölümü bu biçimlerden birindedir.
- FLAC, WAV ve AIFF gibi **kayıpsız** biçimler, özgün kaydın her ayrıntısını korur. Dosyalar daha büyüktür ama hiçbir şey atılmamıştır.

## Universal Jukebox neleri çalar

Universal Jukebox; MP3, M4A ve AAC, FLAC, WAV ve AIFF dosyalarını çalar. Ogg ve Opus dosyaları da cihazınız destekliyorsa çalar; çoğu cihaz destekler, ancak hepsi değil.

Uygulamanın kendi kod çözücüleri yoktur: cihazınıza yerleşik ses desteğini kullanır. Bu nedenle yukarıdaki liste cihazdan cihaza biraz değişebilir.

## Bir şarkı neden çalmayabilir

- **Kopya koruması vardır.** Kopya korumasıyla satılan parçalar (örneğin .m4p uzantılı eski iTunes satın alımları) ve bir akış aboneliğiyle indirilen şarkılar yalnızca mağazanın ya da hizmetin kendi uygulamasında çalınabilir. Başka hiçbir oynatıcı bunları açamaz.
- **Cihazınızda onu çözebilecek bir şey yoktur.** Windows Media Audio (.wma), Monkey’s Audio (.ape) ve WavPack (.wv) dosyaları çalınamaz. Universal Converter, WMA ve APE dosyalarını kendi cihazınızda bu uygulamanın çalabildiği biçimlere dönüştürebilir.
- **Bir sesli kitap dosyasıdır.** .m4b sesli kitap biçimi çalınmaz.
- **Hiç kayıt değildir.** Bir MIDI dosyası (.mid) kaydedilmiş ses yerine talimatlar içerir (hangi notaların ne zaman çalınacağı), dolayısıyla dinlenecek bir şey yoktur.
- **Dosya bozuktur**, örneğin yarıda kesilmiş bir indirme.

## Nedenini görmek

Varsayılan olarak, çalınamayan şarkılar sessizce atlanır. Nedenini bilmek isterseniz Tune this app’te Messages bölümündeki **Show error messages** seçeneğini işaretleyin; uygulama çalamadığı her dosyayı ve sorunun ne olduğunu belirtir.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Etiketler ve kapak görselleri: kitaplığınız nereden gelir',
    summary: 'Uygulamanın her şarkının sanatçısını, albümünü ve kapağını nasıl bildiği.',
    group: 'Temel bilgiler',
    body: `Universal Jukebox müziğinizi hiçbir yerde aramaz. Kitaplıkta gördüğünüz her şey (şarkı adları, sanatçılar, albümler, parça numaraları, yıllar, türler ve kapaklar) kendi dosyalarınızdan okunur.

## Etiket nedir

Çoğu müzik dosyası, içinde etiket (tag) adı verilen küçük bir künye taşır. Etiketler kayıtla ilgili bilgileri içerir: şarkının adı, sanatçı, albüm, parça ve disk numarası, yıl, tür ve çoğu zaman albüm kapağının bir görseli. Bunları dosyayı oluşturan yazar: dosyayı satın aldığınız mağaza, CD’yi aktaran program ya da bir etiket düzenleyici.

Uygulama; MP3, M4A, FLAC ve Ogg dosyalarında kullanılan yaygın etiket türlerini okur. Tarama, şarkının tamamını değil yalnızca her dosyanın etiketlerin bulunduğu bölümünü okur; bu sayede büyük bir kitaplık bile hızla taranır.

## Etiketler eksik ya da yanlış olduğunda

- **Etiketi olmayan bir dosya**, başındaki olası parça numarası çıkarılarak dosya adıyla gösterilir. Uygulama, dosya adından sanatçı tahmin etmez; çünkü yanlış bir tahmin boş bir alandan daha kötüdür.
- **İkiye bölünmüş bir albüm**, genellikle parçalarının tutarsız etiketlendiği anlamına gelir; örneğin sanatçı adı iki farklı şekilde yazılmıştır.
- **Eksik bir kapak**, görselin dosyalara hiç kaydedilmediği ya da ilk parça yerine sonraki bir parçaya kaydedildiği anlamına gelebilir.

## Düzenleme

Tune this app’te Your library bölümündeki **Tidy up library** iki şey arar: cihazınızda zaten bulunan ama kullanılmamış kapaklar (parçaların yanında cover.jpg gibi kapak adı taşıyan bir görsel ya da sonraki bir parçada saklanan görsel) ve tutarsız etiketler yüzünden ikiye bölünmüş albümler. Her öneriyi, kullanacağı görselle birlikte size gösterir ve siz düğmeye basana kadar hiçbir şey değişmez.

Emin olamadığı her şeyi bilerek reddeder. Farklı klasörlerde aynı adı taşıyan iki albüm ya da iki farklı albüm içeren bir klasör olduğu gibi bırakılır.

## Dosyalarınız asla değiştirilmez

Düzenleme yalnızca uygulamanın içindeki kitaplığı düzeltir. Etiketleri yeniden yazmaz, dosyaları yeniden adlandırmaz ya da hiçbir şeyi taşımaz; düzeltmeleriniz yeniden taramadan sonra otomatik olarak tekrar uygulanır.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Müziğiniz nerede durur',
    summary: 'Klasörler, telefonlar ve yeniden taramalar; bir tarayıcının neden yeniden sorabileceği.',
    group: 'Nasıl çalışır',
    body: `Universal Jukebox bir akış hizmeti değildir ve kendine ait müziği yoktur. Cihazınızda ya da cihazınızın erişebildiği bir sürücüde zaten bulunan dosyaları çalar. Uygulama bu dosyaları asla yüklemez, taşımaz ya da düzenlemez.

## Müzik eklemek

Menüyü açın ve **Your complete library** seçeneğini seçin. Buradan bir klasör ekleyebilir, yeniden tarama yapabilir ya da bir klasörü kaldırabilirsiniz. Klasör eklemek kitaplığınızın yerine geçmez, ona ekleme yapar; bir klasörü kaldırmak yalnızca o klasördeki şarkıları kaldırır. Klasörlerin nasıl çalıştığı uygulamayı nerede kullandığınıza bağlıdır:

- **Chrome ve Edge** seçtiğiniz klasörü hatırlayabilir. Geri döndüğünüzde erişimi bir kez, tek dokunuşla onaylamanız istenebilir.
- **Firefox ve Safari** bir klasörü okuma iznini ziyaretler arasında saklayamaz; bu nedenle klasörü her seferinde yeniden seçersiniz. Kitaplığınız, kapaklarınız ve ayarlarınız yine hatırlanır, böylece hiçbir şeyin yeniden okunması gerekmez.
- **iPhone uygulamasının**, Dosyalar uygulamasında Universal Jukebox adlı kendi klasörü vardır. Bu klasöre kopyaladığınız, AirDrop ile gönderdiğiniz ya da kaydettiğiniz her şey kitaplığınıza katılır. Başka klasörler de ekleyebilir ve iPhone’unuzun Müzik arşivinde, telefonda saklanan şarkıları (örneğin bir bilgisayardan eşzamanlananları) çalabilirsiniz.
- **Android uygulaması** her klasörü sistem seçicisinde bir kez seçmenizi ister ve Android izni hatırlar.

## Yeniden tarama

Uygulama, dosyaların eklendiğini ya da kaybolduğunu kendiliğinden fark etmez. Uygulamanın dışında müzik ekledikten ya da sildikten sonra **Rescan** seçeneğini seçin. Yeniden tarama yeni şarkıları ekler, artık olmayanları çıkarır ve yaptığınız düzenleme düzeltmelerini korur.

## iPhone’un Müzik arşivindeki şarkılar

Bir bilgisayardan iPhone’a eşzamanladığınız şarkılar çalınabilir. Bunlardan biri ilk kez çalındığında uygulama, telefonda sınırlı bir alanda onun çalışma kopyasını oluşturur. Apple Music aboneliğiyle indirilen şarkılar ve iCloud’da olup telefonda bulunmayan şarkılar başka hiçbir uygulama tarafından çalınamaz; uygulama kaç tanesini dışarıda bırakmak zorunda kaldığını size bildirir.

## Uygulamanın sakladıkları

Uygulama, bir sonraki açılışta hızlı başlamak için kitaplığınızın bir kataloğunu (şarkı adları, sanatçılar, albümler ve kapakların küçük kopyaları) cihazınızda saklar. Bu katalog yedeklenmez ve cihazlar arasında paylaşılmaz: her cihaz kendi kataloğunu oluşturur. Bir tarayıcıda bu sitenin verilerini temizlemek kataloğu siler, ama müziğinizi asla silmez.`,
  },
  {
    id: 'between-songs',
    title: 'Şarkılar arasında geçişler, yavaş açılıp kapanmalar ve boşluklar',
    summary: 'Çapraz geçiş ve boşluksuz çalmanın ne anlama geldiği, parçalar arasında ne olduğu.',
    group: 'Nasıl çalışır',
    body: `Şarkılar arasındaki o bir iki saniyede olanlar, bir albümün nasıl hissettirdiğini şaşırtıcı ölçüde değiştirir. Birkaç terimi bilmekte fayda var.

## Terimler

- **Boşluk**, bir oynatıcının iki parça arasında bırakabileceği sessizliktir. Çoğu albümde fark edilmez, ama bir canlı albümde ya da kesintisiz bir miksde müziği böler.
- **Boşluksuz çalma** (gapless), bir parçadan sonrakine araya sessizlik eklemeden geçmek, yani albümü dinlenmesi amaçlandığı gibi çalmaktır.
- **Çapraz geçiş** (crossfade), bir şarkının sonunu sonrakinin başıyla üst üste bindirir: ilki kısılırken ikincisi açılır, böylece hiç sessizlik olmaz.
- **Yavaş açılma ya da yavaş kapanma**, tek bir şarkının başında sessizlikten yükselmesini ya da sonunda sessizliğe inmesini sağlar.

## Universal Jukebox ne yapar

**Aynı albümdeki şarkılar** kısa ve yumuşak bir çapraz geçişle doğrudan birbirine bağlanır. Gelen şarkı ancak giden şarkı kısıldıkça yükselir; böylece geçiş akıcı olur ve iki şarkı aynı anda yüksek sesle çalmaz.

**Sonraki şarkı başka bir plaktaysa**, ikisi varsayılan olarak yine çapraz geçişle birleşir; bu sırada ekranda bir oynatıcı kayarak çıkar, sonraki kayarak girer. Net bir geçiş tercih ederseniz Tune this app’te **No crossfade between records** seçeneğini işaretleyin: iğne kalkar, kısa bir sessizlik olur ve sonraki plağa iner.

Tune this app’te Sound bölümündeki **Fade in** ve **Fade out**, bir albümün son şarkısı dahil her parçanın başına ya da sonuna sekiz saniyeye kadar yavaş açılma veya kapanma ekler. İkisi de siz ayarlayana kadar kapalıdır. Uygulamanın sesi denetlemesine izin vermeyen bir cihazda bu geçişler kullanılamaz ve Tune this app bunu belirtir.

## Animasyon ayrıdır

Plak değiştirme animasyonu ve ne sıklıkta göründüğü müzikle değil, görüntü ve ses efektiyle ilgilidir. Animasyonu kapatmak boşluk eklemez: aynı albümdeki şarkılar birbirine akmaya devam eder.`,
  },
  {
    id: 'lyrics',
    title: 'Şarkı sözleri: sözler nereden gelir',
    summary: 'Önce dosyalarınızda saklanan sözler, isteğe bağlı olarak da çevrimiçi arama.',
    group: 'Nasıl çalışır',
    body: `Çalan şarkının sözlerini görmek için Now Playing ekranında **Lyrics** düğmesine dokunun. Sözler iki yerden gelebilir ve sıra hep aynıdır.

## 1. Kendi dosyanız

Birçok müzik dosyası, mağaza, bir aktarma programı ya da bir etiket düzenleyici tarafından etiketlerine eklenmiş sözleri taşır. Uygulama önce oraya bakar. Bu, internet bağlantısı olmadan çalışır ve sizin kendi dosyanız olduğu için çevrimiçi bulunabilecek her şeye her zaman tercih edilir.

Uygulama, müzik dosyasının içinde saklanan sözleri okur. Bir şarkının yanına kaydedilmiş ayrı söz dosyaları okunmaz.

## 2. Çevrimiçi arama, yalnızca siz açarsanız

Bir şarkının kendi sözleri yoksa uygulama, topluluk tarafından yürütülen ücretsiz bir söz koleksiyonu olan lrclib.net’e sorabilir. Bu özellik, Tune this app’te Lyrics bölümündeki **Look up missing lyrics online** seçeneğini işaretleyene kadar **kapalıdır**.

Açık olduğunda, bir şarkıyı aramak yalnızca şarkının sanatçısını, adını, albümünü ve süresini doğrudan cihazınızdan lrclib.net’e gönderir. Sizinle, cihazınızla ya da kitaplığınızla ilgili başka hiçbir şey gönderilmez ve istek UNI·SIM üzerinden geçmez. Yanıt cihazınızda saklanır, böylece her şarkı yalnızca bir kez sorulur. Söz bulunamadıysa uygulama birkaç gün sonra yeniden deneyebilir. Tune this app, kaç şarkının arandığını gösterir ve hepsini unutmak için bir düğme sunar.

Koleksiyon gönüllüler tarafından yazıldığı için ara sıra bir söz metni hatalı ya da biraz zamanlaması kaymış olabilir.

## Müziği takip eden sözler

Bazı sözlerde her satırın başında bir zaman damgası bulunur. Bunlara eşzamanlı sözler denir ve genellikle LRC adlı bir biçimdedir. Bu sözlerle, sözler paneli şarkıyı çalarken takip eder ve bir satıra dokunmak şarkının o noktasına atlar. Zaman damgası olmayan sözler düz metin olarak gösterilir.

Eşzamanlı sözler, ikisi de Tune this app’te Lyrics bölümünde bulunan iki isteğe bağlı özelliği de mümkün kılar: sözleri söylendikçe dönen plağın çevresine yazan **Lyrics around the record** ve söylenen satırı telefonunuzun müzik denetimlerinde gösteren **Lyrics on the lock screen**.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Ekran kapalıyken dinlemek',
    summary: 'Arka planda çalma, kilit ekranı denetimleri, uyku zamanlayıcısı ve fazlası.',
    group: 'Nasıl çalışır',
    body: `Bir müzik çalar, telefonunuzu cebinize koyduğunuzda da çalmaya devam etmelidir. Universal Jukebox ekranda değilken şöyle davranır.

## Telefonda

- **iPhone:** Telefonu kilitlediğinizde ya da başka bir uygulamaya geçtiğinizde uygulama çalmaya devam eder. Şarkı, sanatçı ve kapak; oynat, duraklat ve atla denetimleriyle birlikte kilit ekranında ve Denetim Merkezi’nde görünür.
- **Android:** Müzik çalarken uygulama aynı denetimleri içeren bir çalma bildirimi gösterir; Android’in onu ekran kapalıyken çalıştırmaya devam etmesini sağlayan budur. Bildirim, sıra bitene ya da uygulamayı kaydırarak kapatana kadar kalır. Kulaklık ve Bluetooth cihazlarının düğmeleri de çalışır.

Uygulama telefonunuzun sesini ele geçirmez. Bir telefon araması ya da başka bir müzik uygulaması, beklendiği gibi onu duraklatır.

## Tarayıcıda ya da bilgisayarda

Tarayıcıda şarkı genellikle bilgisayarınızın ya da telefonunuzun medya denetimlerinde görünür ve klavyedeki medya tuşları çalışır. Tarayıcının arka planda, özellikle telefonda çalmaya devam edip etmemesi tarayıcıya bağlıdır. Ekran kapalıyken güvenilir biçimde dinlemek için iPhone ya da Android uygulamasını kullanın.

## Uyku zamanlayıcısı

Now Playing ekranındaki yuvarlak düğmeler arasında bulunan **Sleep**, müziği sizin yerinize durdurur:

1. Sırasıyla 15, 30, 45 ve 60 dakika arasında geçmek ve ardından kapatmak için dokunun.
2. Ya da 12 saate kadar istediğiniz bir süreyi seçmek için basılı tutun.
3. Son dakikada müzik yavaşça kısılır, ardından duraklar.

Zamanlayıcı, telefon kilitliyken de çalışmaya devam eder.

## Ekranı açık tutmak

Plağın dönüşünü izlemeyi seviyorsanız **Keep awake**, Now Playing açık olduğu sürece ekranın kararmasını ya da kilitlenmesini önler.

## Her şarkı için bir bildirim

Tune this app’teki **Notify me of each new song**, uygulama ekranda değilken her yeni şarkı başladığında şarkıyı, sanatçıyı ve kapağı gösterir. Her zaman yalnızca bir bildirim görünür, bir sonrakiyle değiştirilir ve hiç ses çıkarmaz. Siz açana kadar kapalıdır ve cihazınız izni tam da açtığınızda sorar.`,
  },
  {
    id: 'privacy',
    title: 'Cihazınızdan neler çıkar',
    summary: 'Hiçbir şey yüklenmez; üç isteğe bağlı sorgu ise ayrıntısıyla burada.',
    group: 'Gizlilik ve güvenlik',
    body: `Universal Jukebox tamamen kendi cihazınızda çalışacak şekilde tasarlanmıştır. Müziğiniz asla yüklenmez, hesap gerekmez ve uygulama internet bağlantısı olmadan çalışır.

## Cihazınızda kalanlar

- **Müzik dosyalarınız.** Bulundukları yerde okunur ve asla bir sunucuya kopyalanmaz.
- **Kitaplık kataloğunuz**: şarkı adları, sanatçılar, albümler, kapakların küçük kopyaları ve varsa düzenleme düzeltmeleriniz.
- **Ayarlarınız, istekleriniz ve kaldığınız yer.** Bu cihazda, uygulamanın içinde kalır.

Uygulama bunların hiçbirini yedeklemez ya da eşzamanlamaz. Jukebox’ı iki cihazda kullanıyorsanız her biri kendi kitaplığını tutar.

## Üç sorgu

Müziğinizle ilgili bir şey gönderen yalnızca üç özellik vardır ve hiçbiri siz istemeden bir şey yapmaz. Her biri, UNI·SIM üzerinden geçmeden doğrudan cihazınızdan belirtilen hizmete gider ve yalnızca listelenenleri gönderir.

- **Şarkı sözü arama** (Tune this app’te açana kadar kapalı): kendi sözleri olmayan şarkılar için şarkının sanatçısını, adını, albümünü ve süresini lrclib.net’e gönderir.
- **About this track** (Tune this app’te ya da panelin kendisinde açana kadar kapalı): Wikipedia’nın onlar hakkında söylediklerini göstermek için şarkının adını ve sanatçının adını Wikipedia’ya gönderir. Yanıtlar cihazda 90 gün saklanır; makalesi olmayan bir şarkı birkaç gün sonra yeniden sorulur.
- **Find a picture**, bir istekte: yazdığınız sözcükleri yalnızca siz dokunduğunuzda Apple’ın iTunes aramasına gönderir. Seçtiğiniz görsel istekle birlikte kaydedilir.

İlk ikisinin yanıtları cihazınızda saklanır, böylece bir şarkı yalnızca bir kez sorgulanır. Tune this app kaç tane olduğunu gösterir ve bunları unutmanızı sağlar. Hiçbir ses cihazınızdan asla çıkmaz.

## Universal ID

Universal ID ile oturum açmak isteğe bağlıdır. Tüm UNI·SIM uygulamalarında oturumunuzun açık kalmasını sağlar. Oturumunuz açıkken uygulama, her başladığında hesabınıza bir “açıldı” olayı kaydeder. Bu olay müziğiniz hakkında hiçbir şey söylemez.

## İzinler

Uygulama yalnızca bir özellik gerektirdiğinde erişim ister: seçtiğiniz bir klasöre, çalmak istediğinizde iPhone’unuzun Müzik arşivine ve açtığınızda bildirimlere. Bu izinlerin her birini cihazınızın ayarlarından geri alabilirsiniz.`,
  },
]

export default articles
