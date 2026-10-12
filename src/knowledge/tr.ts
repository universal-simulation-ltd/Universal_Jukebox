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

Varsayılan olarak, çalınamayan şarkılar sessizce atlanır. Nedenini bilmek isterseniz **Bu uygulamayı ayarla** sayfasında Mesajlar bölümündeki **Hata mesajlarını göster** seçeneğini işaretleyin; uygulama çalamadığı her dosyayı ve sorunun ne olduğunu belirtir.`,
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

**Bu uygulamayı ayarla** sayfasında Kitaplığınız bölümündeki **Kitaplığı düzenle** iki şey arar: cihazınızda zaten bulunan ama kullanılmamış kapaklar (parçaların yanında cover.jpg gibi kapak adı taşıyan bir görsel ya da sonraki bir parçada saklanan görsel) ve tutarsız etiketler yüzünden ikiye bölünmüş plaklar. Her öneriyi, kullanacağı görselle birlikte size gösterir ve siz düğmeye basana kadar hiçbir şey değişmez.

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

Menüyü açın ve **Tüm kitaplığınız** seçeneğini seçin. Buradan bir klasör ekleyebilir, yeniden tarama yapabilir ya da bir klasörü kaldırabilirsiniz. Klasör eklemek kitaplığınızın yerine geçmez, ona ekleme yapar; bir klasörü kaldırmak yalnızca o klasördeki şarkıları kaldırır. Klasörlerin nasıl çalıştığı uygulamayı nerede kullandığınıza bağlıdır:

- **Chrome ve Edge** seçtiğiniz klasörü hatırlayabilir. Geri döndüğünüzde erişimi bir kez, tek dokunuşla onaylamanız istenebilir.
- **Firefox ve Safari** bir klasörü okuma iznini ziyaretler arasında saklayamaz; bu nedenle klasörü her seferinde yeniden seçersiniz. Kitaplığınız, kapaklarınız ve ayarlarınız yine hatırlanır, böylece hiçbir şeyin yeniden okunması gerekmez.
- **iPhone uygulamasının**, Dosyalar uygulamasında Universal Jukebox adlı kendi klasörü vardır. Bu klasöre kopyaladığınız, AirDrop ile gönderdiğiniz ya da kaydettiğiniz her şey kitaplığınıza katılır. Başka klasörler de ekleyebilir ve iPhone’unuzun Müzik arşivinde, telefonda saklanan şarkıları (örneğin bir bilgisayardan eşzamanlananları) çalabilirsiniz.
- **Android uygulaması** her klasörü sistem seçicisinde bir kez seçmenizi ister ve Android izni hatırlar.

## Yeniden tarama

Uygulama, dosyaların eklendiğini ya da kaybolduğunu kendiliğinden fark etmez. Uygulamanın dışında müzik ekledikten ya da sildikten sonra **Yeniden tara** seçeneğini seçin. Yeniden tarama yeni şarkıları ekler, artık olmayanları çıkarır ve yaptığınız düzenleme düzeltmelerini korur.

## iPhone’un Müzik arşivindeki şarkılar

Bir bilgisayardan iPhone’a eşzamanladığınız şarkılar çalınabilir. Bunlardan biri ilk kez çalındığında uygulama, telefonda sınırlı bir alanda onun çalışma kopyasını oluşturur. Apple Music aboneliğiyle indirilen şarkılar ve iCloud’da olup telefonda bulunmayan şarkılar başka hiçbir uygulama tarafından çalınamaz; uygulama kaç tanesini dışarıda bırakmak zorunda kaldığını size bildirir.

## Uygulamanın sakladıkları

Uygulama, bir sonraki açılışta hızlı başlamak için kitaplığınızın bir kataloğunu (şarkı adları, sanatçılar, albümler ve kapakların küçük kopyaları) cihazınızda saklar. Bu katalog cihazlar arasında paylaşılmaz: her cihaz kendi kataloğunu oluşturur. Bir tarayıcıda bu sitenin verilerini temizlemek kataloğu siler, ama müziğinizi asla silmez. Raflarınız, istekleriniz ve ayarlarınız yedeklenebilir: “Müziğinizi güvende tutmak” makalesine bakın.`,
  },
  {
    id: 'cloud-and-streaming',
    title: 'Buluttaki ya da bir akış hizmetindeki müzik',
    summary: 'Bulut depolamadaki kendi dosyalarınız: evet. Spotify, Apple Music ve benzerleri: hayır.',
    group: 'Temel bilgiler',
    body: `Universal Jukebox sahip olduğunuz müzik dosyalarını çalar. Buluttaki müziği çalıp çalamayacağı, dosyaların kime ait olduğuna bağlıdır.

## Akış hizmetleri: hayır

Spotify, Apple Music, YouTube Music, Amazon Music, Tidal ve Deezer Universal Jukebox’ta çalınamaz; başka hiçbir müzik çalar da bunları çalamaz. Bu hizmetlerin şarkıları, çevrimdışı dinlemek için indirilenler bile, yalnızca hizmetin kendi uygulaması açabilsin diye kilitlidir. Bu, hizmetin plak şirketleriyle yaptığı anlaşmanın bir parçasıdır ve hiçbir uygulama bunu aşamaz.

Dosya olarak satın aldığınız şarkılar farklıdır. iTunes Store’dan, Bandcamp’ten ya da Qobuz’dan satın alınan veya kendi CD’lerinizden kopyalanan müzik sizindir; Universal Jukebox dahil her yerde çalabilirsiniz.

## Bulut depolamadaki kendi dosyalarınız: evet

Müzik dosyalarınız iCloud Drive, Proton Drive, Google Drive, Dropbox ya da OneDrive’daysa Universal Jukebox bunları çalabilir:

1. iPhone ya da iPad’de bulut hizmetinin Dosyalar uygulamasında görünmesi gerekir. Android’de klasör seçicide görünmesi gerekir.
2. İlk ekranda **Bir müzik klasörü** seçeneğini ya da **Bu uygulamayı ayarla** sayfasındaki **Klasör ekle** düğmesini seçin, ardından buluttaki müzik klasörünüzü belirleyin.
3. Orada şarkı ekledikten ya da kaldırdıktan sonra **Bu uygulamayı ayarla** sayfasında müziğinizi yeniden taratın.

Yalnızca bulutta bulunan şarkıların çalınabilmesi için önce cihazınıza indirilmesi gerekir; bu yüzden bağlantı olmadan dinlemek istiyorsanız klasörü indirilmiş olarak tutun. Bulut hizmetiniz bu seçeneği sunuyorsa Dosyalar uygulamasında klasöre dokunup basılı tutun ve **İndirilmiş Olarak Tut** seçeneğini seçin.

## Bilgisayardaki müzik

Müziğinizi bilgisayardaki Finder ya da Müzik uygulamasıyla iPhone’unuza veya iPad’inize eşzamanlayın, ardından **Apple Music arşivim** seçeneğini seçin. Ya da dosyaları Jukebox klasörüne kopyalayın: Dosyalar › iPhone’umda › Jukebox. Android’de dosyaları telefondaki bir klasöre kopyalayın ve o klasörü seçin.`,
  },
  {
    id: 'keeping-your-music-safe',
    title: 'Müziğinizi güvende tutmak',
    summary: 'Müziğiniz kendi bulutunuzda, raflarınızın da bir yedeği.',
    group: 'Nasıl çalışır',
    body: `Universal Jukebox müziğinizi asla yüklemez, bu yüzden onu kaybedemez de. Müziğiniz ancak onu sakladığınız yer kadar güvendedir. Kaybolan ya da bozulan bir telefon koleksiyonunuzu da beraberinde götürmemeli; bu yüzden bir kopyasını başka bir yerde saklayın.

## Müziğinizi kendi bulutunuzda saklayın

Zaten kullandığınız herhangi bir bulut depolama işinizi görür: Proton Drive, iCloud Drive, Google Drive, OneDrive ya da yedeklediğiniz bir bilgisayar. Telefonunuzda:

1. Müzik klasörünüzü bulut depolamanıza koyun.
2. O hizmetin uygulamasında klasörü çevrimdışı kullanılabilir yapın; böylece şarkılar telefonda saklanır ve bağlantı olmadan çalar. Yalnızca çevrimiçi olan şarkılar çalınamaz.
3. Jukebox’ta menüyü açın, **Tüm kitaplığınız** seçeneğini seçin ve klasörü ekleyin. iPhone’da bulut hizmetinin Dosyalar uygulamasında, Android’de ise klasör seçicide görünmesi gerekir.

Bulutta şarkı ekledikten ya da sildikten sonra **Yeniden tara** seçeneğini seçin.

## Jukebox’ta oluşturduklarınızı yedekleyin

Raflarınız, istekleriniz, ayarlarınız ve eklediğiniz söz dosyaları yalnızca uygulamanın içinde bulunur. Bunları korumak için **Bu uygulamayı ayarla** sayfasını, ardından **Yedekleme** bölümünü açın:

- **Yedek dosyası kaydet**, istediğiniz yerde saklayabileceğiniz tek bir küçük dosya oluşturur. Hesap gerekmez. Telefon uygulamalarında dosya, uygulamanın Belgeler klasörüne kaydedilir ve onu Dosyalar uygulamasından taşıyabilirsiniz.
- **Universal ID’nize yedekleyin**, oturumunuz açıksa aynı yedeği hesabınızla birlikte saklar. Her yedeklemede yenisiyle değiştirilir ve onu silebilirsiniz. Uçtan uca şifreli değildir. Hesabınız için fazla büyükse uygulama neyi dışarıda bıraktığını söyler; bir yedek dosyası ise her şeyi saklar.

## Yeni bir telefonda

Müziğinizi kopyalayın ya da çevrimdışı kullanılabilir yapın, klasörü ekleyin ve kitaplığın yüklenmesini bekleyin. Ardından yedeğinizi geri yükleyin. Ayarlarınızın yerini yedekteki ayarlar alır. Yedekteki raflar ve istekler sizdekilere eklenir ve hiçbir şey kaldırılmaz.

Şarkılar başlıkları, sanatçıları ve albümleriyle yeniden bulunur; böylece dosyalar yeni kopyalar olsa bile bir raf geri gelir. Henüz kitaplığınızda olmayan bir şarkı dışarıda kalır. Onu geri getirmek için daha fazla müzik ekledikten sonra yeniden geri yükleyin.`,
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

**Sonraki şarkı başka bir plaktaysa**, ikisi varsayılan olarak yine çapraz geçişle birleşir; bu sırada ekranda bir oynatıcı kayarak çıkar, sonraki kayarak girer. Net bir geçiş tercih ederseniz **Bu uygulamayı ayarla** sayfasında **Plaklar arasında çapraz geçiş yok** seçeneğini işaretleyin: iğne kalkar, kısa bir sessizlik olur ve sonraki plağa iner.

**Bu uygulamayı ayarla** sayfasında Ses bölümündeki **Yavaş açılma** ve **Yavaş kapanma**, bir albümün son şarkısı dahil her parçanın başına ya da sonuna sekiz saniyeye kadar yavaş açılma veya kapanma ekler. İkisi de siz ayarlayana kadar kapalıdır. Uygulamanın sesi denetlemesine izin vermeyen bir cihazda bu geçişler kullanılamaz ve **Bu uygulamayı ayarla** sayfası bunu belirtir.

## Animasyon ayrıdır

Plak değiştirme animasyonu ve ne sıklıkta göründüğü müzikle değil, görüntü ve ses efektiyle ilgilidir. Animasyonu kapatmak boşluk eklemez: aynı albümdeki şarkılar birbirine akmaya devam eder.`,
  },
  {
    id: 'lyrics',
    title: 'Şarkı sözleri: sözler nereden gelir',
    summary: 'Önce dosyalarınızdaki ya da yanlarına kaydedilmiş sözler, isteğe bağlı olarak da çevrimiçi arama.',
    group: 'Nasıl çalışır',
    body: `Çalan şarkının sözlerini görmek için **Şimdi çalıyor** ekranında **Söz kâğıdını göster** düğmesine dokunun. Sözler iki yerden gelebilir ve sıra hep aynıdır.

## 1. Kendi dosyanız

Birçok müzik dosyası, mağaza, bir aktarma programı ya da bir etiket düzenleyici tarafından etiketlerine eklenmiş sözleri taşır. Uygulama önce oraya bakar. Bu, internet bağlantısı olmadan çalışır ve sizin kendi dosyanız olduğu için çevrimiçi bulunabilecek her şeye her zaman tercih edilir.

Bir şarkının yanına kaydedilmiş söz dosyası da okunur; yeter ki şarkıyla aynı adı taşısın ve **.lrc** ile bitsin: *Sarki.mp3* ve *Sarki.lrc*. Dosya, klasör taranırken okunur; bu yüzden söz dosyası ekledikten sonra müziğinizi yeniden taratın. Söz panelinden tek bir şarkıya eklediğiniz söz dosyası ikisinden de önce gelir.

## Tüm kitaplığınız için sözler

Dosyalarınızda söz yoksa, bilgisayarlar için ücretsiz bir program olan **LRCGET** bütün bir klasörün sözlerini tek seferde indirebilir; sözleri şarkılarınızın yanına .lrc dosyaları olarak kaydeder ya da doğrudan şarkıların içine yazar. **LRCGET ile tüm kitaplığınız için şarkı sözleri** makalesi bunu adım adım anlatır.

## 2. Çevrimiçi arama, yalnızca siz açarsanız

iPhone ve iPad’de çevrimiçi arama yoktur; bunun yerine yukarıda anlatıldığı gibi söz dosyaları ekleyin. Diğer cihazlarda, bir şarkının kendi sözleri yoksa uygulama, topluluk tarafından yürütülen ücretsiz bir söz koleksiyonu olan lrclib.net’e sorabilir. Bu özellik, **Bu uygulamayı ayarla** sayfasında Şarkı sözleri bölümündeki **Eksik şarkı sözlerini çevrimiçi ara** seçeneğini işaretleyene kadar **kapalıdır**.

Açık olduğunda, bir şarkıyı aramak yalnızca şarkının sanatçısını, adını, albümünü ve süresini doğrudan cihazınızdan lrclib.net’e gönderir. Sizinle, cihazınızla ya da kitaplığınızla ilgili başka hiçbir şey gönderilmez ve istek UNI·SIM üzerinden geçmez. Yanıt cihazınızda saklanır, böylece her şarkı yalnızca bir kez sorulur. Söz bulunamadıysa uygulama birkaç gün sonra yeniden deneyebilir. **Bu uygulamayı ayarla** sayfası, kaç şarkının arandığını gösterir ve hepsini unutmak için bir düğme sunar.

Koleksiyon gönüllüler tarafından yazıldığı için ara sıra bir söz metni hatalı ya da biraz zamanlaması kaymış olabilir.

## Müziği takip eden sözler

Bazı sözlerde her satırın başında bir zaman damgası bulunur. Bunlara eşzamanlı sözler denir ve genellikle LRC adlı bir biçimdedir. Bu sözlerle, sözler paneli şarkıyı çalarken takip eder ve bir satıra dokunmak şarkının o noktasına atlar. Zaman damgası olmayan sözler düz metin olarak gösterilir.

Eşzamanlı sözler, ikisi de **Bu uygulamayı ayarla** sayfasında Şarkı sözleri bölümünde bulunan iki isteğe bağlı özelliği de mümkün kılar: sözleri söylendikçe dönen plağın çevresine yazan **Plağın çevresinde şarkı sözleri** ve söylenen satırı telefonunuzun müzik denetimlerinde gösteren **Kilit ekranında şarkı sözleri**.`,
  },
  {
    id: 'lyrics-with-lrcget',
    title: 'LRCGET ile tüm kitaplığınız için şarkı sözleri',
    summary: 'Tüm şarkılarınızın sözlerini tek seferde bulan, bilgisayarınız için ücretsiz bir program.',
    group: 'Nasıl çalışır',
    body: `**LRCGET**, Windows, Mac ve Linux için ücretsiz bir programdır ve bir müzik klasöründeki tüm şarkıların sözlerini tek seferde arar. Programı UNI·SIM değil, topluluk tarafından yürütülen ücretsiz bir söz koleksiyonu olan lrclib.net’in ekibi yapar. Programı **github.com/tranxuanthang/lrcget/releases** adresinden indirebilirsiniz.

## Sözleri indirmek

1. LRCGET’i açın ve müziğinizin bulunduğu klasörü seçin. Program klasörü okur ve şarkılarınızı listeler.
2. **Download all lyrics** (tüm sözleri indir) düğmesine tıklayın, hangi şarkıların sözlerinin indirileceğini seçin ve **Synced lyrics (.lrc)** seçeneğini işaretli bırakın.
3. **Download** düğmesine tıklayın. LRCGET, sözünü bulduğu her şarkının yanına bir .lrc dosyası kaydeder: *Sarki.mp3* ve *Sarki.lrc*.

Universal Jukebox bu klasörü doğrudan çalıyorsa, **Bu uygulamayı ayarla** sayfasında müziğinizi yeniden taratın; sözler hazırdır.

## Sözleri şarkıların içine yazmak

Bir .lrc dosyası, şarkıyla birlikte ancak bütün klasör taşındığında gider. Müziğiniz iPhone’unuza ya da iPad’inize Müzik uygulaması veya Finder üzerinden geldiğinde yalnızca müzik dosyaları kopyalanır; bu yüzden sözlerin dosyaların içinde olması gerekir.

1. LRCGET’te **Settings** bölümünü açın ve Experimental altında **Enable embed lyrics option** seçeneğini işaretleyin. LRCGET bunun müzik dosyalarınıza zarar verebileceği konusunda uyarır; bu yüzden önce kitaplığınızı yedekleyin.
2. **Download all lyrics** düğmesine yeniden tıklayın, **Embed into track** seçeneğini de işaretleyin ve ardından **Download** düğmesine tıklayın.
3. iPhone’unuzda ya da iPad’inizde zaten olan şarkılar eski kopyalarını korur, çünkü normal bir eşzamanlama değişen bir şarkıyı yeniden göndermez. Bu yüzden onları kaldırıp yeniden yükleyin: Aygıtı bilgisayarınıza bağlayın ve Finder’da seçin (Windows’ta Apple Aygıtları uygulamasında).
4. **Müzik** sekmesinde müzik eşzamanlamanın işaretini kaldırın (ya da yalnızca artık şarkı sözü olan sanatçıların ve albümlerin) ve eşzamanlayın. Şarkılar aygıttan kaldırılır.
5. Onları yeniden işaretleyin ve bir kez daha eşzamanlayın. Şarkı sözleri içlerinde, yepyeni olarak geri gelirler.
6. Universal Jukebox’ta **Bu uygulamayı ayarla** sayfasındaki **Telefonumdaki Müzik arşivini yenile** düğmesine (iPad’de **iPad’imdeki Müzik arşivini yenile** düğmesine) dokunun.

Müzik arşivi yerine bir klasör çalıyorsanız değişen şarkıları klasöre yeniden kopyalayın, ardından **Bu uygulamayı ayarla** sayfasında klasörünüzü yeniden taratın.

Apple Music’ten satın alınan ya da oradan akışla dinlenen şarkılar korumalıdır; başka uygulamalar bunları değiştiremez ya da çalamaz. Bu yüzden bu yöntem yalnızca kendi dosyalarınızda işe yarar.`,
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

**Şimdi çalıyor** ekranındaki yuvarlak düğmeler arasında bulunan **Uyku**, müziği sizin yerinize durdurur:

1. Sırasıyla 15, 30, 45 ve 60 dakika arasında geçmek ve ardından kapatmak için dokunun.
2. Ya da 12 saate kadar istediğiniz bir süreyi seçmek için basılı tutun.
3. Son dakikada müzik yavaşça kısılır, ardından duraklar.

Zamanlayıcı, telefon kilitliyken de çalışmaya devam eder.

## Ekranı açık tutmak

Plağın dönüşünü izlemeyi seviyorsanız **Ekran açık**, **Şimdi çalıyor** ekranı açık olduğu sürece ekranın kararmasını ya da kilitlenmesini önler.

## Her şarkı için bir bildirim

**Bu uygulamayı ayarla** sayfasındaki **Her yeni şarkıda bildirim gönder**, uygulama ekranda değilken her yeni şarkı başladığında şarkıyı, sanatçıyı ve kapağı gösterir. Her zaman yalnızca bir bildirim görünür, bir sonrakiyle değiştirilir ve hiç ses çıkarmaz. Siz açana kadar kapalıdır ve cihazınız izni tam da açtığınızda sorar.`,
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

Siz bir yedek oluşturmadıkça bunların hiçbiri cihazınızdan çıkmaz. Yedek dosyası, onu nereye kaydederseniz oraya gider. Universal ID’nize yapılan bir yedek ayarlarınızı, raflarınızı, isteklerinizi ve eklediğiniz şarkı sözlerini başlık, sanatçı ve albüm adlarıyla birlikte tutar; müziğinizi asla tutmaz. Jukebox’ı iki cihazda kullanıyorsanız her biri kendi kitaplığını tutar.

## Üç sorgu

Müziğinizle ilgili bir şey gönderen yalnızca üç özellik vardır ve hiçbiri siz istemeden bir şey yapmaz. Her biri, UNI·SIM üzerinden geçmeden doğrudan cihazınızdan belirtilen hizmete gider ve yalnızca listelenenleri gönderir.

- **Şarkı sözü arama** (iPhone ve iPad’de yok; diğerlerinde **Bu uygulamayı ayarla** sayfasında açana kadar kapalı): kendi sözleri olmayan şarkılar için şarkının sanatçısını, adını, albümünü ve süresini lrclib.net’e gönderir.
- **Bu şarkı hakkında** (**Bu uygulamayı ayarla** sayfasında ya da panelin kendisinde açana kadar kapalı): Wikipedia’nın onlar hakkında söylediklerini göstermek için şarkının adını ve sanatçının adını Wikipedia’ya gönderir. Yanıtlar cihazda 90 gün saklanır; makalesi olmayan bir şarkı birkaç gün sonra yeniden sorulur.
- **Görsel bul**, bir istekte: yazdığınız sözcükleri yalnızca siz dokunduğunuzda Apple’ın iTunes aramasına gönderir. Seçtiğiniz görsel istekle birlikte kaydedilir.

İlk ikisinin yanıtları cihazınızda saklanır, böylece bir şarkı yalnızca bir kez sorgulanır. **Bu uygulamayı ayarla** sayfası kaç tane olduğunu gösterir ve bunları unutmanızı sağlar. Hiçbir ses cihazınızdan asla çıkmaz.

## Kullanıcıların sayılması

Web sitesinde, Jukebox açıkken tarayıcınız her 45 saniyede bir UNI·SIM’e uygulamanın kullanıldığını, kendi oluşturduğu rastgele bir sayıyla birlikte bildirir; böylece uygulamayı kaç kişinin kullandığını sayabiliriz. Sizinle veya müziğinizle ilgili hiçbir şey gönderilmez. iPhone, iPad, Android ve masaüstü uygulamaları bunu göndermez.

## Universal ID

Universal ID ile oturum açmak isteğe bağlıdır. Tüm UNI·SIM uygulamalarında oturumunuzun açık kalmasını sağlar ve isterseniz hesabınızla birlikte bir yedek tutmanıza olanak tanır. Oturumunuz açıkken uygulama, her başladığında hesabınıza bir “açıldı” olayı kaydeder. Bu olay müziğiniz hakkında hiçbir şey söylemez.

## İzinler

Uygulama yalnızca bir özellik gerektirdiğinde erişim ister: seçtiğiniz bir klasöre, çalmak istediğinizde iPhone’unuzun Müzik arşivine ve açtığınızda bildirimlere. Bu izinlerin her birini cihazınızın ayarlarından geri alabilirsiniz.`,
  },
]

export default articles
