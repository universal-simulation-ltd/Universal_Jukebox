import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'audio-formats',
    title: 'Formatos de áudio, e por que algumas músicas não tocam',
    summary: 'MP3, FLAC, WAV e os outros, e o que impede um arquivo de tocar.',
    group: 'O básico',
    body: `Um arquivo de música é som gravado, guardado como números e empacotado de um jeito específico. Esse jeito se chama formato, e as letras no fim do nome do arquivo costumam indicar qual é: .mp3, .m4a, .flac e assim por diante.

## Duas famílias de formatos

- Os formatos **com perda**, como MP3 e AAC (geralmente em arquivos .m4a), deixam os arquivos bem menores ao descartar detalhes que a maioria das pessoas dificilmente percebe. Quase toda a música comprada ou extraída de CDs nos últimos vinte anos está em um deles.
- Os formatos **sem perda**, como FLAC, WAV e AIFF, preservam todos os detalhes da gravação original. Os arquivos são maiores, mas nada foi descartado.

## O que o Universal Jukebox toca

O Universal Jukebox toca MP3, M4A e AAC, FLAC, WAV e AIFF. Arquivos Ogg e Opus também tocam quando o seu dispositivo tem suporte a eles, o que vale para a maioria, mas não para todos.

O app não tem decodificadores próprios: ele usa o suporte de áudio embutido no seu dispositivo. Por isso a lista acima pode variar um pouco de um dispositivo para outro.

## Por que uma música pode não tocar

- **Ela é protegida contra cópia.** Faixas vendidas com proteção (por exemplo, compras antigas do iTunes com a extensão .m4p) e músicas baixadas por uma assinatura de streaming só podem ser tocadas pelo app da loja ou do serviço. Nenhum outro player consegue abri-las.
- **Nada no seu dispositivo consegue decodificá-la.** Arquivos Windows Media Audio (.wma), Monkey’s Audio (.ape) e WavPack (.wv) não podem ser tocados. O Universal Converter pode converter arquivos WMA e APE em formatos que este app toca, no seu próprio dispositivo.
- **É um audiolivro.** O formato de audiolivro .m4b não é tocado.
- **Não é uma gravação.** Um arquivo MIDI (.mid) contém instruções — quais notas tocar e quando — em vez de som gravado, então não há nada para ouvir.
- **O arquivo está danificado**, por exemplo, um download que parou no meio.

## Ver o motivo

Por padrão, as músicas que não podem ser tocadas são puladas sem aviso. Se você preferir saber o motivo, marque **Show error messages** em Settings, na seção Messages, e o app vai indicar cada arquivo que não conseguiu tocar e o que havia de errado.`,
  },
  {
    id: 'tags-and-artwork',
    title: 'Tags e capas: de onde vem a sua biblioteca',
    summary: 'Como o app sabe o artista, o álbum e a capa de cada música.',
    group: 'O básico',
    body: `O Universal Jukebox não busca a sua música em lugar nenhum. Tudo o que você vê na biblioteca — títulos, artistas, álbuns, números de faixa, anos, gêneros e capas — é lido dos seus próprios arquivos.

## O que são tags

A maioria dos arquivos de música carrega uma pequena etiqueta dentro deles, chamada tags. As tags guardam informações sobre a gravação: o título da música, o artista, o álbum, o número da faixa e do disco, o ano, o gênero e, muitas vezes, uma imagem da capa do álbum. Elas são gravadas por quem criou o arquivo: a loja onde você comprou, o programa que extraiu o CD ou um editor de tags.

O app lê os tipos de tag mais comuns usados por arquivos MP3, M4A, FLAC e Ogg. A análise lê só a parte de cada arquivo onde as tags ficam, e não a música inteira, então até uma biblioteca grande é analisada rapidamente.

## Quando as tags faltam ou estão erradas

- **Um arquivo sem tags** aparece com o nome do arquivo, sem o número de faixa que possa haver no início. O app não tenta adivinhar o artista pelo nome do arquivo, porque um palpite errado é pior do que um campo vazio.
- **Um álbum dividido em dois** geralmente significa que as faixas foram marcadas de forma inconsistente — por exemplo, com o nome do artista escrito de dois jeitos.
- **Uma capa faltando** pode significar que a imagem nunca foi gravada nos arquivos, ou que foi gravada em uma faixa posterior em vez da primeira.

## Arrumando a biblioteca

**Tidy up library**, em Settings, na seção Your library, procura duas coisas: capas que já estão no seu dispositivo mas não foram usadas (uma imagem com nome de capa, como cover.jpg, ao lado das faixas, ou uma imagem gravada em uma faixa posterior) e álbuns que tags inconsistentes dividiram em dois. Ele mostra cada sugestão, com a imagem que usaria, e nada muda até você tocar no botão.

Ele recusa de propósito tudo aquilo de que não pode ter certeza. Dois álbuns com o mesmo nome em pastas diferentes, ou uma pasta com dois álbuns diferentes, ficam como estão.

## Seus arquivos nunca são alterados

Arrumar corrige só a biblioteca dentro do app. Não reescreve tags, não renomeia arquivos nem move nada, e as suas correções são reaplicadas automaticamente depois de uma nova análise.`,
  },
  {
    id: 'where-your-music-lives',
    title: 'Onde a sua música fica',
    summary: 'Pastas, celulares e novas análises, e por que um navegador pode pedir acesso de novo.',
    group: 'Como funciona',
    body: `O Universal Jukebox não é um serviço de streaming e não tem música própria. Ele toca arquivos que já estão no seu dispositivo, ou em uma unidade que o seu dispositivo consegue acessar. O app nunca envia, move nem edita esses arquivos.

## Adicionando música

Abra o menu e escolha **Your complete library**. Ali você pode adicionar uma pasta, fazer uma nova análise ou remover uma pasta. Adicionar uma pasta amplia a sua biblioteca em vez de substituí-la, e remover uma tira só as músicas daquela pasta. O funcionamento das pastas depende de onde você usa o app:

- **Chrome e Edge** conseguem lembrar a pasta que você escolheu. Quando você voltar, talvez precise confirmar o acesso uma vez, com um toque.
- **Firefox e Safari** não conseguem manter a permissão de ler uma pasta entre as visitas, então você escolhe a pasta a cada vez. A sua biblioteca, as capas e as configurações continuam guardadas, então nada precisa ser lido de novo.
- **O app para iPhone** tem uma pasta própria, chamada Universal Jukebox, no app Arquivos. Tudo o que você copiar, enviar por AirDrop ou salvar nela passa a fazer parte da sua biblioteca. Você também pode adicionar outras pastas e tocar as músicas da biblioteca do app Música do iPhone que estão guardadas no aparelho, como as sincronizadas de um computador.
- **O app para Android** pede que você escolha cada pasta uma vez no seletor do sistema, e o Android lembra a permissão.

## Nova análise

O app não percebe sozinho quando arquivos aparecem ou somem. Depois de adicionar ou apagar música fora do app, escolha **Rescan**. Uma nova análise inclui as músicas novas, tira as que não existem mais e mantém as correções que você fez ao arrumar a biblioteca.

## Músicas da biblioteca do app Música do iPhone

As músicas sincronizadas com o iPhone a partir de um computador podem ser tocadas. Na primeira vez que uma delas toca, o app cria uma cópia de trabalho em um espaço limitado do aparelho. Músicas baixadas por uma assinatura do Apple Music, e músicas que estão no iCloud mas não no aparelho, não podem ser tocadas por nenhum outro app; o app informa quantas precisou deixar de fora.

## O que o app guarda

O app guarda no seu dispositivo um catálogo da sua biblioteca — títulos, artistas, álbuns e cópias pequenas das capas — para abrir rápido da próxima vez. Esse catálogo não tem backup nem é compartilhado entre dispositivos: cada dispositivo monta o seu. Apagar os dados deste site em um navegador apaga o catálogo, mas nunca a sua música.`,
  },
  {
    id: 'between-songs',
    title: 'Crossfade, fades e pausas entre músicas',
    summary: 'O que significam crossfade e reprodução sem pausas, e o que acontece entre as faixas.',
    group: 'Como funciona',
    body: `O que acontece naquele segundo ou dois entre uma música e outra muda bastante a sensação de ouvir um álbum. Vale a pena conhecer alguns termos.

## Os termos

- **Uma pausa** é o silêncio que um player pode deixar entre duas faixas. Na maioria dos álbuns ela passa despercebida, mas em um disco ao vivo ou em um mix contínuo ela quebra a música.
- **A reprodução sem pausas** (gapless) significa passar de uma faixa para a seguinte sem acrescentar silêncio, do jeito que o álbum foi feito para ser ouvido.
- **Um crossfade** sobrepõe o fim de uma música ao começo da próxima: a primeira vai abaixando enquanto a segunda vai subindo, então nunca há silêncio.
- **Um fade de entrada ou de saída** faz uma música subir do silêncio no começo, ou descer até o silêncio no final.

## O que o Universal Jukebox faz

**As músicas de um mesmo álbum** emendam uma na outra com um crossfade curto e suave. A música que chega só sobe à medida que a que sai abaixa, então a transição é fluida, sem duas músicas tocando alto ao mesmo tempo.

**Quando a próxima música é de outro disco**, as duas também fazem crossfade por padrão, enquanto na tela um player desliza para fora e o próximo entra. Se você preferir um corte limpo, marque **No crossfade between records** em Settings: a agulha levanta, há um momento de silêncio e ela desce no próximo disco.

**Fade in** e **Fade out**, em Settings, na seção Sound, acrescentam um fade de até oito segundos no começo ou no fim de cada faixa, inclusive na última música de um álbum. Os dois ficam desligados até você ajustá-los. Em um dispositivo que não deixa o app controlar o volume, os fades não estão disponíveis, e Settings avisa isso.

## A animação é separada

A animação de troca de disco, e a frequência com que ela aparece, tem a ver com a imagem e o efeito sonoro dela, não com a música. Desligar a animação não cria pausas: as músicas de um mesmo álbum continuam emendando uma na outra.`,
  },
  {
    id: 'lyrics',
    title: 'Letras: de onde vêm as palavras',
    summary: 'Primeiro as letras gravadas nos seus arquivos, e uma busca on-line opcional.',
    group: 'Como funciona',
    body: `Toque em **Lyrics** em Now Playing para ver a letra da música que está tocando. Ela pode vir de dois lugares, sempre nesta ordem.

## 1. O seu próprio arquivo

Muitos arquivos de música trazem a letra dentro das tags, colocada ali pela loja, por um programa de extração ou por um editor de tags. O app procura ali primeiro. Isso funciona sem conexão com a internet e, como é o seu próprio arquivo, sempre tem prioridade sobre o que for encontrado on-line.

O app lê as letras gravadas dentro do arquivo de música. Arquivos de letra separados, salvos ao lado de uma música, não são lidos.

## 2. Uma busca on-line, só se você ativar

Se uma música não tiver letra própria, o app pode consultar o lrclib.net, uma coleção de letras gratuita mantida por uma comunidade. Isso fica **desligado** até você marcar **Look up missing lyrics online** em Settings, na seção Lyrics.

Quando está ligado, a busca de uma música envia só o artista, o título, o álbum e a duração, direto do seu dispositivo para o lrclib.net. Nada mais sobre você, o seu dispositivo ou a sua biblioteca é enviado, e a solicitação não passa pela UNI·SIM. A resposta fica guardada no seu dispositivo, então cada música é consultada uma única vez. Se nenhuma letra foi encontrada, o app pode tentar de novo depois de alguns dias. Settings mostra quantas músicas já foram consultadas, com um botão para esquecer todas.

Como a coleção é escrita por voluntários, de vez em quando uma letra pode estar imprecisa ou um pouco fora de tempo.

## Letras que acompanham a música

Algumas letras têm uma marcação de tempo no começo de cada linha. Elas se chamam letras sincronizadas e costumam estar em um formato chamado LRC. Com elas, o painel de letras acompanha a música enquanto ela toca, e tocar em uma linha pula para aquele trecho da música. Letras sem marcações de tempo aparecem como texto simples.

As letras sincronizadas também permitem dois extras opcionais, ambos em Settings, na seção Lyrics: **Lyrics around the record**, que escreve as palavras ao redor do disco girando à medida que são cantadas, e **Lyrics on the lock screen**, que mostra a linha sendo cantada nos controles de música do celular.`,
  },
  {
    id: 'playing-in-the-background',
    title: 'Ouvindo com a tela desligada',
    summary: 'Reprodução em segundo plano, controles na tela de bloqueio, timer e mais.',
    group: 'Como funciona',
    body: `Um player de música precisa continuar tocando quando você guarda o celular no bolso. Veja como o Universal Jukebox se comporta quando não está na tela.

## No celular

- **iPhone:** o app continua tocando quando você bloqueia o celular ou muda para outro app. A música, o artista e a capa aparecem na tela de bloqueio e na Central de Controle, com tocar, pausar e pular.
- **Android:** enquanto a música toca, o app mostra uma notificação de reprodução com os mesmos controles, que é o que permite ao Android mantê-lo funcionando com a tela desligada. Ela fica até a fila acabar ou até você fechar o app deslizando. Os botões de fones de ouvido e de dispositivos Bluetooth também funcionam.

O app não toma conta do áudio do celular. Uma ligação ou outro app de música o coloca em pausa, como era de se esperar.

## No navegador ou no computador

No navegador, a música geralmente aparece nos controles de mídia do computador ou do celular, e as teclas de mídia do teclado funcionam. Se o navegador continua tocando em segundo plano, principalmente no celular, depende do navegador. Para ouvir com segurança com a tela desligada, use o app para iPhone ou Android.

## O timer

**Sleep**, entre os botões redondos de Now Playing, para a música para você:

1. Toque nele para passar por 15, 30, 45 e 60 minutos e depois desligar.
2. Ou toque e segure para escolher qualquer tempo, até 12 horas.
3. No último minuto, a música vai abaixando suavemente e depois pausa.

O timer continua funcionando com o celular bloqueado.

## Mantendo a tela ligada

Se você gosta de ver o disco girando, **Keep awake** impede que a tela escureça ou bloqueie enquanto Now Playing está aberto.

## Uma notificação para cada música

**Notify me of each new song**, em Settings, mostra a música, o artista e a capa quando cada música nova começa, enquanto o app não está na tela. Só aparece uma de cada vez, substituída pela seguinte, e ela não faz nenhum som. Fica desligada até você ativar, e é nesse momento que o dispositivo pede a sua permissão.`,
  },
  {
    id: 'privacy',
    title: 'O que sai do seu dispositivo',
    summary: 'Nada é enviado, e as três buscas opcionais, em detalhes.',
    group: 'Privacidade e segurança',
    body: `O Universal Jukebox foi feito para funcionar inteiramente no seu próprio dispositivo. A sua música nunca é enviada, não é preciso ter conta e o app funciona sem conexão com a internet.

## O que fica no seu dispositivo

- **Os seus arquivos de música.** Eles são lidos onde estão e nunca são copiados para um servidor.
- **O catálogo da sua biblioteca**: títulos, artistas, álbuns, cópias pequenas das capas e as correções que você fez ao arrumar.
- **As suas configurações, os seus pedidos e o ponto em que você parou.** Eles ficam no app, neste dispositivo.

O app não faz backup nem sincroniza nada disso. Se você usar o Jukebox em dois dispositivos, cada um mantém a própria biblioteca.

## As três buscas

Só três recursos enviam alguma coisa sobre a sua música, e nenhum deles faz nada até você pedir. Cada um vai direto do seu dispositivo para o serviço indicado, sem passar pela UNI·SIM, e envia só o que está listado.

- **Busca de letras** (desligada até você ativar em Settings): envia o artista, o título, o álbum e a duração de uma música para o lrclib.net, no caso de músicas sem letra própria.
- **About this track** (desligado até você ativar, em Settings ou no próprio painel): envia o título da música e o nome do artista para a Wikipedia, para mostrar o que a Wikipedia diz sobre eles. As respostas ficam guardadas no dispositivo por 90 dias, e uma música sem artigo é consultada de novo depois de alguns dias.
- **Find a picture**, em um pedido: envia as palavras que você digitou para a busca do iTunes, da Apple, só quando você toca nele. A imagem que você escolher fica salva com o pedido.

As respostas das duas primeiras ficam guardadas no seu dispositivo, então cada música é consultada uma única vez. Settings mostra quantas são e permite esquecê-las. Nenhum áudio sai do seu dispositivo.

## Universal ID

Entrar com um Universal ID é opcional. Isso mantém você conectado em todos os apps da UNI·SIM. Enquanto você estiver conectado, o app registra um evento de "aberto" na sua conta sempre que é iniciado. Esse evento não diz nada sobre a sua música.

## Permissões

O app só pede acesso quando um recurso precisa: a uma pasta que você escolher, à biblioteca do app Música do iPhone se você pedir para tocá-la, e às notificações se você ativá-las. Você pode revogar qualquer uma dessas permissões nas configurações do seu dispositivo.`,
  },
]

export default articles
