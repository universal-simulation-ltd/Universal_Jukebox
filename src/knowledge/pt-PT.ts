import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Formatos de áudio, e porque é que algumas músicas não tocam',
    summary: 'MP3, FLAC, WAV e os restantes, e o que impede um ficheiro de tocar.',
    group: 'O essencial',
    body: `Um ficheiro de música é som gravado, guardado como números e embalado de uma forma específica. Essa forma chama-se formato, e as letras no fim do nome do ficheiro costumam indicar qual é: .mp3, .m4a, .flac e assim por diante.

## Duas famílias de formatos

- Os formatos **com perdas**, como o MP3 e o AAC (normalmente em ficheiros .m4a), tornam os ficheiros muito mais pequenos ao eliminar pormenores que a maioria dos ouvintes dificilmente nota. Quase toda a música comprada ou extraída de CD nos últimos vinte anos está num destes formatos.
- Os formatos **sem perdas**, como o FLAC, o WAV e o AIFF, preservam todos os pormenores da gravação original. Os ficheiros são maiores, mas nada foi descartado.

## O que o Universal Jukebox reproduz

O Universal Jukebox reproduz MP3, M4A e AAC, FLAC, WAV e AIFF. Os ficheiros Ogg e Opus também tocam sempre que o seu dispositivo os suporta, o que acontece na maioria, mas não em todos.

A aplicação não tem descodificadores próprios: recorre ao suporte de áudio integrado no seu dispositivo. Por isso, a lista acima pode variar ligeiramente de um dispositivo para outro.

## Porque é que uma música pode não tocar

- **Está protegida contra cópia.** As faixas vendidas com proteção (por exemplo, compras antigas do iTunes com a extensão .m4p) e as músicas transferidas através de uma subscrição de streaming só podem ser reproduzidas pela aplicação da loja ou do serviço. Nenhum outro leitor as consegue abrir.
- **Nada no seu dispositivo a consegue descodificar.** Os ficheiros Windows Media Audio (.wma), Monkey’s Audio (.ape) e WavPack (.wv) não podem ser reproduzidos. O Universal Converter pode converter ficheiros WMA e APE para formatos que esta aplicação reproduz, no seu próprio dispositivo.
- **É um audiolivro.** O formato de audiolivro .m4b não é reproduzido.
- **Não é uma gravação.** Um ficheiro MIDI (.mid) contém instruções — que notas tocar e quando — em vez de som gravado, pelo que não há nada para ouvir.
- **O ficheiro está danificado**, por exemplo, uma transferência que parou a meio.

## Saber o motivo

Por predefinição, as músicas que não podem ser reproduzidas são ignoradas sem aviso. Se preferir saber porquê, assinale **Mostrar mensagens de erro** em Ajustar esta aplicação, na secção Mensagens, e a aplicação indicará cada ficheiro que não conseguiu reproduzir e o que se passava com ele.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Etiquetas e capas: de onde vem a sua biblioteca',
    summary: 'Como a aplicação sabe o artista, o álbum e a capa de cada música.',
    group: 'O essencial',
    body: `O Universal Jukebox não procura a sua música em lado nenhum. Tudo o que vê na biblioteca — títulos, artistas, álbuns, números de faixa, anos, géneros e capas — é lido dos seus próprios ficheiros.

## O que são etiquetas

A maioria dos ficheiros de música traz dentro de si uma pequena ficha, chamada etiquetas (tags). As etiquetas guardam informações sobre a gravação: o título da música, o artista, o álbum, o número da faixa e do disco, o ano, o género e, muitas vezes, uma imagem da capa do álbum. São escritas por quem criou o ficheiro: a loja onde o comprou, o programa que extraiu o CD ou um editor de etiquetas.

A aplicação lê os tipos de etiqueta mais comuns usados pelos ficheiros MP3, M4A, FLAC e Ogg. A análise lê apenas a parte de cada ficheiro onde estão as etiquetas, e não a música inteira, pelo que até uma biblioteca grande é analisada depressa.

## Quando as etiquetas faltam ou estão erradas

- **Um ficheiro sem etiquetas** aparece com o nome do ficheiro, sem o número de faixa que possa ter no início. A aplicação não adivinha o artista a partir do nome do ficheiro, porque um palpite errado é pior do que um campo vazio.
- **Um disco dividido em dois** significa normalmente que as faixas foram etiquetadas de forma inconsistente — por exemplo, com o nome do artista escrito de duas maneiras.
- **Uma capa em falta** pode significar que a imagem nunca foi guardada nos ficheiros, ou que foi guardada numa faixa posterior em vez da primeira.

## Arrumar a biblioteca

**Arrumar a biblioteca**, em Ajustar esta aplicação, na secção A sua biblioteca, procura duas coisas: capas que já estão no seu dispositivo mas não foram usadas (uma imagem com nome de capa, como cover.jpg, junto às faixas, ou uma imagem guardada numa faixa posterior) e discos que etiquetas inconsistentes dividiram em dois. Mostra-lhe cada sugestão, com a imagem que usaria, e nada muda até carregar no botão.

Recusa propositadamente tudo aquilo de que não pode ter certeza. Dois álbuns com o mesmo nome em pastas diferentes, ou uma pasta com dois álbuns diferentes, ficam como estão.

## Os seus ficheiros nunca são alterados

Arrumar corrige apenas a biblioteca dentro da aplicação. Não reescreve etiquetas, não muda o nome de ficheiros nem move nada, e as suas correções são novamente aplicadas de forma automática após uma nova análise.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Onde está a sua música',
    summary: 'Pastas, telemóveis e novas análises, e porque é que um navegador pode voltar a pedir acesso.',
    group: 'Como funciona',
    body: `O Universal Jukebox não é um serviço de streaming e não tem música própria. Reproduz ficheiros que já estão no seu dispositivo, ou numa unidade a que o seu dispositivo consegue aceder. A aplicação nunca os carrega para a internet, não os move nem os edita.

## Adicionar música

Abra o menu e escolha **A sua biblioteca completa**. A partir daí pode adicionar uma pasta, fazer uma nova análise ou remover uma pasta. Adicionar uma pasta acrescenta à sua biblioteca em vez de a substituir, e remover uma retira apenas as músicas dessa pasta. O funcionamento das pastas depende de onde utiliza a aplicação:

- **O Chrome e o Edge** conseguem lembrar-se da pasta que escolheu. Quando voltar, poderá ter de confirmar o acesso uma vez, com um toque.
- **O Firefox e o Safari** não conseguem manter a autorização para ler uma pasta entre visitas, por isso escolhe a pasta de cada vez. A sua biblioteca, as capas e as definições continuam guardadas, pelo que nada tem de ser lido novamente.
- **A aplicação para iPhone** tem uma pasta própria, chamada Universal Jukebox, na aplicação Ficheiros. Tudo o que lá copiar, enviar por AirDrop ou guardar passa a fazer parte da sua biblioteca. Também pode adicionar outras pastas e reproduzir as músicas da biblioteca da aplicação Música do iPhone que estão guardadas no telemóvel, como as sincronizadas a partir de um computador.
- **A aplicação para Android** pede-lhe que escolha cada pasta uma vez no seletor do sistema, e o Android memoriza a autorização.

## Nova análise

A aplicação não repara por si própria quando aparecem ou desaparecem ficheiros. Depois de adicionar ou apagar música fora da aplicação, escolha **Analisar novamente**. Uma nova análise acrescenta as músicas novas, retira as que já não existem e mantém as correções que fez ao arrumar a biblioteca.

## Músicas da biblioteca da aplicação Música do iPhone

As músicas sincronizadas com o iPhone a partir de um computador podem ser reproduzidas. Na primeira vez que uma delas toca, a aplicação cria uma cópia de trabalho num espaço limitado do telemóvel. As músicas transferidas com uma subscrição do Apple Music, e as que estão no iCloud mas não no telemóvel, não podem ser reproduzidas por nenhuma outra aplicação; a aplicação indica-lhe quantas teve de deixar de fora.

## O que a aplicação guarda

A aplicação guarda no seu dispositivo um catálogo da sua biblioteca — títulos, artistas, álbuns e cópias pequenas das capas — para abrir rapidamente da próxima vez. Esse catálogo não é partilhado entre dispositivos: cada dispositivo cria o seu. Apagar os dados deste site num navegador apaga o catálogo, mas nunca a sua música. As prateleiras, os pedidos e as definições podem ter cópia de segurança: consulte Manter a sua música em segurança.`,
  },
  {
    id: 'cloud-and-streaming',
    title: 'Música na nuvem ou num serviço de streaming',
    summary: 'Os seus próprios ficheiros na nuvem, sim. Spotify, Apple Music e afins, não.',
    group: 'O essencial',
    body: `O Universal Jukebox reproduz ficheiros de música que tem. Se consegue reproduzir música na nuvem depende de quem são os ficheiros.

## Serviços de streaming: não

O Spotify, o Apple Music, o YouTube Music, o Amazon Music, o Tidal e o Deezer não podem ser reproduzidos no Universal Jukebox, nem em nenhum outro leitor. As músicas destes serviços, mesmo as transferidas para ouvir offline, estão bloqueadas para que só a aplicação do próprio serviço as consiga abrir. Isto faz parte do acordo do serviço com as editoras discográficas, e nenhuma aplicação o consegue contornar.

As músicas que comprou como ficheiros são diferentes. A música comprada na iTunes Store, no Bandcamp ou no Qobuz, ou copiada dos seus próprios CD, é sua para reproduzir em qualquer lado, incluindo no Universal Jukebox.

## Os seus próprios ficheiros na nuvem: sim

Se os seus ficheiros de música estiverem no iCloud Drive, Proton Drive, Google Drive, Dropbox ou OneDrive, o Universal Jukebox consegue reproduzi-los:

1. Num iPhone ou iPad, o serviço de nuvem tem de aparecer na aplicação Ficheiros. No Android, tem de aparecer no seletor de pastas.
2. No primeiro ecrã, escolha **Uma pasta de música**, ou **Adicionar uma pasta** em Ajustar esta aplicação, e selecione a sua pasta de música na nuvem.
3. Depois de adicionar ou remover músicas lá, volte a analisar a sua música em Ajustar esta aplicação.

As músicas que estão apenas na nuvem têm de ser transferidas para o seu dispositivo antes de poderem tocar, por isso mantenha a pasta transferida se quiser ouvir sem ligação. Na aplicação Ficheiros, mantenha o dedo sobre a pasta e escolha **Manter descarregado**, se o seu serviço de nuvem o permitir.

## Música num computador

Sincronize-a com o seu iPhone ou iPad através do Finder ou da aplicação Música no computador e, depois, escolha **A minha biblioteca do Apple Music**. Ou copie os ficheiros para a pasta Jukebox: Ficheiros › No meu iPhone › Jukebox. No Android, copie-os para uma pasta no telemóvel e escolha essa pasta.`,
  },
  {
    id: 'keeping-your-music-safe',
    title: 'Manter a sua música em segurança',
    summary: 'A sua música na sua própria nuvem, e uma cópia de segurança das suas prateleiras.',
    group: 'Como funciona',
    body: `O Universal Jukebox nunca carrega a sua música, por isso também não a pode perder. A sua música está tão segura como o lugar onde a guarda. Um telemóvel perdido ou avariado não deve levar a sua coleção consigo, por isso guarde uma cópia noutro lugar.

## Guarde a sua música na sua própria nuvem

Serve qualquer armazenamento na nuvem que já utilize: Proton Drive, iCloud Drive, Google Drive, OneDrive ou um computador de que faça cópias de segurança. No telemóvel:

1. Coloque a sua pasta de música no armazenamento na nuvem.
2. Na aplicação desse serviço, disponibilize a pasta offline, para que as músicas fiquem guardadas no telemóvel e toquem sem ligação. As músicas que estão apenas online não podem ser reproduzidas.
3. No Jukebox, abra o menu, escolha **A sua biblioteca completa** e adicione a pasta. No iPhone, o serviço de nuvem tem de aparecer na aplicação Ficheiros; no Android, no seletor de pastas.

Depois de adicionar ou remover músicas na nuvem, escolha **Analisar novamente**.

## Faça uma cópia de segurança do que criou no Jukebox

As suas prateleiras, os seus pedidos, as suas definições e os ficheiros de letras que adicionou existem apenas na aplicação. Para os guardar, abra **Ajustar esta aplicação** e depois **Cópia de segurança**:

- **Guardar um ficheiro de cópia de segurança** cria um único ficheiro pequeno que pode guardar onde quiser. Não é necessária nenhuma conta. Nas aplicações para telemóvel, é guardado na pasta Documentos da aplicação, e pode movê-lo a partir da aplicação Ficheiros.
- **Cópia de segurança no seu Universal ID** guarda a mesma cópia de segurança com a sua conta, se tiver a sessão iniciada. É substituída sempre que faz uma cópia, e pode eliminá-la. Não tem encriptação ponto a ponto. Se for demasiado grande para a sua conta, a aplicação indica o que deixou de fora, e um ficheiro de cópia de segurança guarda tudo.

## Num telemóvel novo

Copie a sua música ou disponibilize-a offline, adicione a pasta e espere que a biblioteca carregue. Depois, reponha a cópia de segurança. As suas definições são substituídas pelas da cópia. As prateleiras e os pedidos da cópia são adicionados aos que já tem, e nada é removido.

As músicas são encontradas de novo pelo título, pelo artista e pelo álbum, por isso uma prateleira volta mesmo que os ficheiros sejam cópias novas. Uma música que ainda não esteja na sua biblioteca fica de fora. Reponha novamente depois de adicionar mais música para a recuperar.`,
  },
  {
    id: 'between-songs',
    title: 'Transições cruzadas, desvanecimentos e pausas entre músicas',
    summary: 'O que significam transição cruzada e reprodução sem pausas, e o que acontece entre faixas.',
    group: 'Como funciona',
    body: `O que acontece naquele segundo ou dois entre músicas muda surpreendentemente a forma como se sente um álbum. Vale a pena conhecer alguns termos.

## Os termos

- **Uma pausa** é o silêncio que um leitor pode deixar entre duas faixas. Na maioria dos álbuns passa despercebida, mas num disco ao vivo ou numa mistura contínua interrompe a música.
- **A reprodução sem pausas** (gapless) significa passar de uma faixa para a seguinte sem acrescentar silêncio, tal como o álbum foi pensado para ser ouvido.
- **Uma transição cruzada** (crossfade) sobrepõe o fim de uma música ao início da seguinte: a primeira vai baixando enquanto a segunda vai subindo, pelo que nunca há silêncio.
- **Um desvanecimento de entrada ou de saída** faz uma música subir a partir do silêncio no início, ou descer até ao silêncio no fim.

## O que o Universal Jukebox faz

**As músicas do mesmo álbum** encadeiam-se diretamente com uma transição cruzada curta e suave. A música que chega só sobe à medida que a que sai vai baixando, por isso a passagem é fluida, sem duas músicas a tocar alto ao mesmo tempo.

**Quando a música seguinte está noutro disco**, as duas também se cruzam por predefinição, enquanto na imagem um leitor desliza para fora e o seguinte entra. Se preferir um corte limpo, assinale **Sem transição cruzada entre discos** em Ajustar esta aplicação: a agulha levanta, há um momento de silêncio e pousa no disco seguinte.

**Desvanecimento de entrada** e **Desvanecimento de saída**, em Ajustar esta aplicação, na secção Som, acrescentam um desvanecimento de até oito segundos no início ou no fim de cada faixa, incluindo a última música de um álbum. Ambos estão desligados até os definir. Num dispositivo que não permite à aplicação controlar o volume, os desvanecimentos não estão disponíveis, e Ajustar esta aplicação indica-o.

## A animação é independente

A animação de mudança de disco, e a frequência com que aparece, diz respeito à imagem e ao respetivo efeito sonoro, não à música. Desligar a animação não acrescenta pausas: as músicas do mesmo álbum continuam a encadear-se.`,
  },
  {
    id: 'lyrics',
    title: 'Letras: de onde vêm as palavras',
    summary: 'Primeiro as letras nos seus ficheiros ou guardadas junto a eles, e uma pesquisa online opcional.',
    group: 'Como funciona',
    body: `Toque em **Mostrar a folha da letra** no ecrã A reproduzir para ver as palavras da música que está a tocar. Pode vir de dois sítios, sempre por esta ordem.

## 1. O seu próprio ficheiro

Muitos ficheiros de música trazem a letra dentro das etiquetas, colocada pela loja, por um programa de extração ou por um editor de etiquetas. A aplicação procura aí primeiro. Isto funciona sem ligação à internet e, como se trata do seu próprio ficheiro, tem sempre prioridade sobre o que for encontrado online.

Um ficheiro de letra guardado junto a uma música também é lido, desde que tenha o nome da música e termine em **.lrc**: *Musica.mp3* e *Musica.lrc*. É lido quando a pasta é analisada, por isso, depois de acrescentar ficheiros de letras, volte a analisar a sua música. Um ficheiro de letra que acrescente a uma música a partir do painel das letras tem prioridade sobre ambos.

## Letras para toda a sua biblioteca

Se os seus ficheiros não têm letras, um programa gratuito para computador chamado **LRCGET** pode obtê-las para uma pasta inteira de uma só vez, quer como ficheiros .lrc junto às suas músicas, quer gravadas dentro das próprias músicas. O artigo **Letras para toda a sua biblioteca, com o LRCGET** explica como, passo a passo.

## 2. Uma pesquisa online, só se a ativar

No iPhone e no iPad não há pesquisa online: acrescente antes ficheiros de letras como explicado acima. Nos restantes casos, se uma música não tiver letra própria, a aplicação pode consultar o lrclib.net, uma coleção de letras gratuita mantida por uma comunidade. Esta opção está **desligada** até assinalar **Procurar online as letras em falta** em Ajustar esta aplicação, na secção Letras.

Quando está ligada, a pesquisa de uma música envia apenas o artista, o título, o álbum e a duração, diretamente do seu dispositivo para o lrclib.net. Não é enviado mais nada sobre si, o seu dispositivo ou a sua biblioteca, e o pedido não passa pela UNI·SIM. A resposta fica guardada no seu dispositivo, pelo que cada música só é consultada uma vez. Se não tiver sido encontrada nenhuma letra, a aplicação pode voltar a tentar passados alguns dias. Ajustar esta aplicação mostra quantas músicas já foram consultadas, com um botão para as esquecer todas.

Como a coleção é escrita por voluntários, uma ou outra letra pode estar imprecisa ou ligeiramente dessincronizada.

## Letras que acompanham a música

Algumas letras têm uma marca de tempo no início de cada linha. Chamam-se letras sincronizadas e estão muitas vezes num formato conhecido como LRC. Com elas, o painel de letras acompanha a música enquanto toca, e tocar numa linha salta para esse momento da música. As letras sem marcas de tempo aparecem como texto simples.

As letras sincronizadas permitem ainda dois extras opcionais, ambos em Ajustar esta aplicação, na secção Letras: **Letra à volta do disco**, que escreve as palavras à volta do disco a girar à medida que são cantadas, e **Letra no ecrã de bloqueio**, que mostra a linha que está a ser cantada nos controlos de música do telemóvel.`,
  },
  {
    id: 'lyrics-with-lrcget',
    title: 'Letras para toda a sua biblioteca, com o LRCGET',
    summary: 'Um programa gratuito para o seu computador que encontra de uma só vez a letra de todas as músicas.',
    group: 'Como funciona',
    body: `O **LRCGET** é um programa gratuito para Windows, Mac e Linux que procura de uma só vez a letra de todas as músicas de uma pasta. É feito pelos responsáveis do lrclib.net, uma coleção de letras gratuita mantida por uma comunidade, e não pela UNI·SIM. Transfira-o em **github.com/tranxuanthang/lrcget/releases**.

## Obter as letras

1. Abra o LRCGET e escolha a pasta onde está a sua música. O programa lê a pasta e apresenta a lista das suas músicas.
2. Clique em **Download all lyrics** (transferir todas as letras), escolha as músicas para as quais quer obter letras e mantenha **Synced lyrics (.lrc)** assinalado.
3. Clique em **Download**. O LRCGET guarda um ficheiro .lrc junto a cada música para a qual encontra letra: *Musica.mp3* e *Musica.lrc*.

Se o Universal Jukebox reproduz essa pasta diretamente, volte a analisar a sua música em Ajustar esta aplicação e as letras passam a aparecer.

## Pôr as letras dentro das músicas

Um ficheiro .lrc só acompanha uma música se a pasta inteira for copiada. Quando a sua música chega ao iPhone ou ao iPad através da aplicação Música ou do Finder, só os ficheiros de música são copiados, por isso as letras têm de estar dentro deles.

1. No LRCGET, abra **Settings** e, em Experimental, assinale **Enable embed lyrics option**. O LRCGET avisa que isto pode danificar os ficheiros de música, por isso faça primeiro uma cópia de segurança da sua biblioteca.
2. Clique novamente em **Download all lyrics**, assinale também **Embed into track** e depois clique em **Download**.
3. As músicas que já estão no seu iPhone ou iPad mantêm a cópia antiga, porque uma sincronização normal não volta a enviar uma música alterada. Por isso, retire-as e volte a colocá-las: ligue o dispositivo ao computador e selecione-o no Finder (no Windows, na app Dispositivos Apple).
4. No separador **Música**, desmarque a sincronização de música (ou apenas os artistas e álbuns que agora têm letra) e sincronize. As músicas são removidas do dispositivo.
5. Volte a marcá-las e sincronize mais uma vez. Voltam como novas, com a letra lá dentro.
6. No Universal Jukebox, toque em **Atualizar a biblioteca de Música do telemóvel** (num iPad, **Atualizar a biblioteca de Música do iPad**) em Ajustar esta aplicação.

Se ouve uma pasta em vez da biblioteca de Música, volte a copiar para lá as músicas alteradas e depois volte a analisar a sua pasta em Ajustar esta aplicação.

As músicas compradas no Apple Music ou ouvidas em streaming a partir dele estão protegidas e não podem ser alteradas nem reproduzidas por outras aplicações, por isso isto só funciona com os seus próprios ficheiros.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Ouvir com o ecrã desligado',
    summary: 'Reprodução em segundo plano, controlos no ecrã bloqueado, temporizador e mais.',
    group: 'Como funciona',
    body: `Um leitor de música tem de continuar a tocar quando guarda o telemóvel no bolso. Eis como o Universal Jukebox se comporta quando não está no ecrã.

## No telemóvel

- **iPhone:** a aplicação continua a tocar quando bloqueia o telemóvel ou muda para outra aplicação. A música, o artista e a capa aparecem no ecrã bloqueado e no Centro de controlo, com reproduzir, pausa e avançar ou recuar.
- **Android:** enquanto a música toca, a aplicação mostra uma notificação de reprodução com os mesmos controlos, e é isso que permite ao Android mantê-la a funcionar com o ecrã desligado. Mantém-se até a fila terminar ou até fechar a aplicação deslizando-a. Os botões dos auscultadores e dos dispositivos Bluetooth também funcionam.

A aplicação não se apodera do áudio do telemóvel. Uma chamada ou outra aplicação de música coloca-a em pausa, como seria de esperar.

## No navegador ou no computador

No navegador, a música aparece normalmente nos controlos multimédia do computador ou do telemóvel, e as teclas multimédia do teclado funcionam. Se o navegador continua a tocar em segundo plano, sobretudo no telemóvel, depende do navegador. Para ouvir de forma fiável com o ecrã desligado, utilize a aplicação para iPhone ou Android.

## O temporizador

**Dormir**, entre os botões redondos do ecrã A reproduzir, para a música por si:

1. Toque nele para passar por 15, 30, 45 e 60 minutos e, depois, desligar.
2. Ou mantenha-o premido para escolher qualquer duração, até 12 horas.
3. No último minuto, a música vai baixando suavemente e depois fica em pausa.

O temporizador continua a funcionar com o telemóvel bloqueado.

## Manter o ecrã ligado

Se gosta de ver o disco a girar, **Ecrã ligado** impede que o ecrã escureça ou bloqueie enquanto o ecrã A reproduzir estiver aberto.

## Uma notificação por música

**Notificar-me de cada nova música**, em Ajustar esta aplicação, mostra a música, o artista e a capa quando começa cada nova música, enquanto a aplicação não está no ecrã. Só aparece uma de cada vez, substituída pela seguinte, e não emite qualquer som. Está desligada até a ativar, e é nesse momento que o seu dispositivo pede autorização.`,
  },
  {
    id: 'privacy',
    title: 'O que sai do seu dispositivo',
    summary: 'Nada é carregado, e as três pesquisas opcionais, ao pormenor.',
    group: 'Privacidade e segurança',
    body: `O Universal Jukebox foi concebido para funcionar inteiramente no seu próprio dispositivo. A sua música nunca é carregada para a internet, não é necessária nenhuma conta e a aplicação funciona sem ligação à internet.

## O que fica no seu dispositivo

- **Os seus ficheiros de música.** São lidos onde estão e nunca são copiados para um servidor.
- **O catálogo da sua biblioteca**: títulos, artistas, álbuns, cópias pequenas das capas e as correções que fez ao arrumar.
- **As suas definições, os seus pedidos e o ponto onde ficou.** Ficam na aplicação, neste dispositivo.

Nada disto sai do seu dispositivo, a menos que faça uma cópia de segurança. Um ficheiro de cópia de segurança vai para onde o guardar. Uma cópia de segurança no seu Universal ID contém as definições, as prateleiras, os pedidos e as letras que adicionou, identificadas pelo título, pelo artista e pelo álbum; nunca contém a sua música. Se utilizar o Jukebox em dois dispositivos, cada um mantém a sua própria biblioteca.

## As três pesquisas

Só três funcionalidades enviam alguma coisa sobre a sua música, e nenhuma faz nada até o pedir. Cada uma vai diretamente do seu dispositivo para o serviço indicado, sem passar pela UNI·SIM, e envia apenas o que está indicado.

- **Pesquisa de letras** (não existe no iPhone nem no iPad; nos restantes, desligada até a ativar em Ajustar esta aplicação): envia o artista, o título, o álbum e a duração de uma música para o lrclib.net, para as músicas sem letra própria.
- **Sobre esta música** (desligada até a ativar, em Ajustar esta aplicação ou no próprio painel): envia o título da música e o nome do artista para a Wikipedia, para mostrar o que a Wikipedia diz sobre eles. As respostas ficam guardadas no dispositivo durante 90 dias, e uma música sem artigo volta a ser consultada passados alguns dias.
- **Encontrar uma imagem**, num pedido: envia as palavras que escreveu para a pesquisa do iTunes, da Apple, apenas quando toca nele. A imagem que escolher fica guardada com o pedido.

As respostas das duas primeiras ficam guardadas no seu dispositivo, pelo que cada música só é consultada uma vez. Ajustar esta aplicação mostra quantas existem e permite esquecê-las. Nenhum áudio sai alguma vez do seu dispositivo.

## Contagem de aberturas

No site, na primeira vez que abre a aplicação em cada dia, soma um à contagem anónima de aberturas do dia, enviada depois do seu primeiro clique ou da primeira tecla premida. Essa contagem contém apenas o nome da aplicação e o tipo de plataforma («web» no site): nenhum identificador, nenhuma conta e nada sobre o que faz. Uma marca de «já contado hoje» fica no seu dispositivo e nunca é enviada. As aplicações para iPhone, iPad, Android e computador não enviam isto.

## Universal ID

Iniciar sessão com um Universal ID é opcional. Mantém a sessão iniciada em todas as aplicações da UNI·SIM e permite guardar uma cópia de segurança com a sua conta, se quiser. Enquanto tiver a sessão iniciada, a aplicação regista um evento de «aberta» na sua conta sempre que é iniciada. Esse evento não diz nada sobre a sua música.

## Autorizações

A aplicação só pede acesso quando uma funcionalidade precisa: a uma pasta que escolher, à biblioteca da aplicação Música do iPhone se pedir para a reproduzir, e às notificações se as ativar. Pode retirar qualquer uma destas autorizações nas definições do seu dispositivo.`,
  },
]

export default articles
