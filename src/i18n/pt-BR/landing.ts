// Brazilian Portuguese (pt-BR) — landing strings. Every key in ../en/landing.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
//
// Apple's own words as iOS and macOS show them in pt-BR: Arquivos (Files),
// No Meu iPhone / No Meu iPad, Ajustes → Apps → …, Mídia e Apple Music,
// Tempo de Uso, Música (the app and the Mac's Music folder).
import type { Draft } from '../en/index.ts'

const landing: Draft['landing'] = {
  // Heading and intro
  'title_native_phone': 'Toca as músicas do seu celular',
  'title_native_ipad': 'Toca as músicas do seu iPad',
  'title_desktop': 'Toca as músicas do seu computador',
  'title_web': 'Toca toda a sua biblioteca de músicas, no navegador',
  'intro': 'Ele lê as tags e as capas originais dos seus próprios arquivos de música e os toca — MP3, M4A, FLAC e WAV. Nada é enviado, e você não precisa de conta.',
  'find_my_music': 'Encontrar minhas músicas',
  'where_is_your_music': 'Onde estão suas músicas?',
  'not_streaming': 'Não é um serviço de streaming. Ele toca arquivos que você já tem.',
  'turntable_alt': 'Um disco num toca-discos',
  'copying_progress': 'Copiando {done} de {total}…',
  'copying_progress_named': 'Copiando {done} de {total} — {name}…',

  // Answer: on this device
  'device_title_phone': 'Neste celular',
  'device_title_ipad': 'Neste iPad',
  'device_title_device': 'Neste aparelho',
  'device_title_computer': 'Neste computador',
  'device_sub_native': 'Arquivos de música que você copiou ou baixou',
  'device_sub_web': 'Uma pasta de arquivos de música',
  'device_say_own_iphone': 'Coloque as músicas no app Arquivos, em No Meu iPhone → Universal Jukebox — por AirDrop ou arrastando de um computador. Pode usar pastas.',
  'device_say_own_ipad': 'Coloque as músicas no app Arquivos, em No Meu iPad → Universal Jukebox — por AirDrop ou arrastando de um computador. Pode usar pastas.',
  'device_say_jukebox_folder': 'Coloque as músicas na pasta Universal Jukebox do app Arquivos — pode usar pastas.',
  'device_say_native': 'Escolha a pasta onde estão suas músicas — geralmente Música. Pode haver pastas dentro dela, e o app mantém a permissão para lê-la.',
  'device_say_web': 'Escolha a pasta onde estão suas músicas — geralmente Música. Pode haver pastas dentro dela.',
  'remembers_desktop': 'O app se lembra dela, então sua biblioteca vai continuar aqui na próxima vez.',
  'remembers_browser': 'Este navegador pode se lembrar da pasta, então sua biblioteca vai continuar aqui na próxima vez — só vão pedir que você confirme o acesso uma vez.',
  'remembers_browser_install': 'Este navegador pode se lembrar da pasta, então sua biblioteca vai continuar aqui na próxima vez — só vão pedir que você confirme o acesso uma vez. Instale-o como app pela barra de endereço do Chrome e nem isso será pedido.',
  'remembers_never': 'Este navegador não consegue se lembrar de uma pasta, então você vai escolhê-la de novo a cada visita. Sua biblioteca e as capas ficam guardadas, então ela volta na hora.',
  'scan_jukebox_folder': 'Escanear a pasta do Jukebox',
  'choose_the_folder': 'Escolher a pasta',
  'choose_different_folder': 'Escolher outra pasta',
  'add_songs_one_at_a_time': 'Adicionar músicas uma por uma',
  'pick_individual_files': 'Ou escolher arquivos avulsos',

  // Answer: in my Apple Music library
  'apple_ios_title': 'Na minha biblioteca do Apple Music',
  'apple_ios_sub_phone': 'Músicas sincronizadas com este celular a partir de um computador',
  'apple_ios_sub_ipad': 'Músicas sincronizadas com este iPad a partir de um computador',
  'apple_ios_say_phone': 'As músicas sincronizadas com este celular, como estão no app Música. Os downloads da assinatura do Apple Music são protegidos, e o iOS não deixa outros apps tocá-los.',
  'apple_ios_say_ipad': 'As músicas sincronizadas com este iPad, como estão no app Música. Os downloads da assinatura do Apple Music são protegidos, e o iOS não deixa outros apps tocá-los.',
  'use_music_library': 'Usar minha biblioteca do Música',
  'apple_computer_title': 'Na minha biblioteca do Apple Music ou do iTunes',
  'apple_computer_sub': 'O app Música ou o iTunes neste computador',
  'apple_computer_say': 'Essas músicas são arquivos numa pasta. Escolha a pasta {music} e depois {media} (ou {itunes}). As músicas que você comprou ou adicionou vão tocar; os downloads da assinatura do Apple Music são protegidos e não tocam.',
  'apple_folder_music': 'Música',
  'apple_folder_media': 'Música → Mídia',
  'apple_folder_itunes': 'iTunes → iTunes Media',

  // Answer: in the cloud
  'cloud_title': 'Na nuvem',
  'cloud_sub': 'iCloud Drive, Google Drive, Dropbox, OneDrive…',
  'cloud_say_ios_phone': 'Se a sua nuvem aparece no app Arquivos — o iCloud Drive sempre aparece —, escolha lá a sua pasta de músicas. Se não aparece, baixe primeiro as músicas para este celular.',
  'cloud_say_ios_ipad': 'Se a sua nuvem aparece no app Arquivos — o iCloud Drive sempre aparece —, escolha lá a sua pasta de músicas. Se não aparece, baixe primeiro as músicas para este iPad.',
  'cloud_say_android': 'Os apps de nuvem no Android geralmente não conseguem compartilhar uma pasta inteira, então baixe primeiro as músicas para este celular — em Music ou Download — e depois escolha essa pasta.',
  'cloud_say_own_folder': 'Baixe primeiro as músicas para este celular e depois coloque-as na pasta Universal Jukebox do app Arquivos.',
  'cloud_say_touch': 'Baixe primeiro as músicas para este aparelho e depois escolha a pasta onde elas estão.',
  'cloud_say_computer': 'Se o app da sua nuvem estiver instalado neste computador, ele mantém uma pasta aqui — escolha suas músicas dentro dela. Se não estiver, baixe as músicas primeiro.',

  // Answer: on a streaming service, and the example library
  'streaming_title': 'Num serviço de streaming',
  'streaming_sub': 'Spotify, Apple Music, YouTube Music, Amazon Music…',
  'streaming_sorry': 'Desculpe, com isso não temos como ajudar.',
  'streaming_say': 'Os serviços de streaming trancam as músicas dentro dos próprios apps — até as baixadas —, então nenhum outro player consegue abri-las. O Jukebox toca arquivos de música que são seus: CDs que você copiou ou álbuns comprados para baixar.',
  'try_example': 'Experimentar a biblioteca de exemplo',
  'cutting_records': 'Prensando os discos…',
  'example_title': 'Só quero experimentar',
  'example_sub': 'Nove discos inventados, feitos neste aparelho — nada é baixado',

  // Scanning
  'scan_progress_one': '{added} / {count} faixas',
  'scan_progress_other': '{added} / {count} faixas',
  'scan_starting': 'Começando…',
  'scan_stop': 'Parar',
  'scan_stop_label': 'Parar de ler a sua pasta',
  'scan_stop_and': 'Parar e…',
  'scan_keep_one': 'Manter {count} faixa',
  'scan_keep_other': 'Manter {count} faixas',
  'scan_keep_read': 'Manter o que foi lido',
  'scan_carry_on': 'Continuar',
  'stopped_early_music_library': 'Parou antes do fim — todas as músicas estão na sua biblioteca e tocam normalmente, mas alguns discos ainda estão sem capa. Atualizar busca o resto.',
  'stopped_early_folder': 'Parou antes do fim — tudo o que foi encontrado até ali está na sua biblioteca e toca normalmente. Escanear de novo lê a pasta inteira desde o começo.',
  'fetch_sleeves': 'Buscar as capas',
  'scan_rest': 'Escanear o resto',

  // Folder permission
  'stranded_heading_one': '{count} pasta continua aqui, mas cada uma precisa ser reconectada antes de tocar.',
  'stranded_heading_other': '{count} pastas continuam aqui, mas cada uma precisa ser reconectada antes de tocar.',
  'stranded_chosen': 'Não dá para ler {folder} agora — ela pode ter sido movida ou renomeada, ou o acesso a ela foi retirado. Escanear de novo volta a lê-la e pede que você a escolha se ela não for encontrada.',
  'stranded_native': '{folder} lista faixas que não estão mais na pasta de música. Escanear de novo deixa a biblioteca de acordo com o que realmente está lá.',
  'stranded_reopen_browser': '{folder} está aqui, mas o navegador precisa da sua permissão de novo para poder lê-la.',
  'stranded_reopen_app': '{folder} está aqui, mas o app precisa da sua permissão de novo para poder lê-la.',
  'stranded_choose_grouped_browser': '{folder} — este navegador não consegue reabrir uma pasta sozinho, então escolha-a de novo. Nada precisa ser lido duas vezes.',
  'stranded_choose_grouped_app': '{folder} — o app não consegue reabrir uma pasta sozinho, então escolha-a de novo. Nada precisa ser lido duas vezes.',
  'stranded_choose_browser': '{folder} e as capas continuam aqui, mas este navegador não consegue reabrir uma pasta sozinho — escolha-a de novo para tocar qualquer coisa dela. Vai ser rápido: nada precisa ser lido duas vezes.',
  'stranded_choose_app': '{folder} e as capas continuam aqui, mas o app não consegue reabrir uma pasta sozinho — escolha-a de novo para tocar qualquer coisa dela. Vai ser rápido: nada precisa ser lido duas vezes.',
  'start_new_library': 'Começar uma nova biblioteca',
  'start_new_library_title': 'Esquecer esta biblioteca e voltar ao início',
  'forget_library_ask': 'Esquecer esta biblioteca e começar de novo? Seus arquivos de música não são alterados.',
  'forget_it': 'Esquecer',
  'keep_it': 'Manter',

  // One folder's button
  'allow_access': 'Permitir acesso',
  'choose_folder': 'Escolher pasta',
  'rescan': 'Escanear de novo',
  'access_allowed': 'Acesso permitido',

  // Files a scan skipped
  'skipped_heading': 'Alguns arquivos foram pulados',
  'skipped_line': '{label} ({count}) — {why}',
  'refused_wma': 'Áudio do Windows Media — nenhum navegador o decodifica. O Universal Converter pode convertê-lo em MP3.',
  'refused_m4p': 'Esta faixa é protegida por DRM, e nenhum navegador consegue tocá-la.',
  'refused_m4b': 'Um contêiner de audiolivro — nenhum navegador o decodifica.',
  'refused_ape': 'Monkey’s Audio — nenhum navegador o decodifica. O Universal Converter pode convertê-lo em FLAC.',
  'refused_wv': 'WavPack — nenhum navegador o decodifica.',
  'refused_midi': 'MIDI é uma partitura, não uma gravação — não há áudio no arquivo para tocar.',
  'skip_protected_label': 'Downloads do Apple Music',
  'skip_protected_why': 'são protegidos, e o iOS não deixa outros apps tocá-los. As músicas sincronizadas a partir do seu Mac não são afetadas.',
  'skip_icloud_label': 'Músicas só no iCloud',
  'skip_icloud_why': 'não foram baixadas para este iPhone. Baixe-as no app Música e depois atualize a biblioteca do Música.',

  // Folder names the app gives itself
  'root_example_library': 'Biblioteca de exemplo',
  'root_music_library': 'Biblioteca do Música',
  'root_chosen_files': 'Arquivos escolhidos',
  'root_your_music': 'Suas músicas',

  // Reading the Music library
  'reading_art': 'Lendo as capas dos álbuns…',
  'reading_art_count': 'Lendo as capas dos álbuns — {done} de {total}',

  // Errors while reading the library
  'error_no_access': 'Sem acesso a {folder}, as faixas dessa pasta não podem tocar. Nada foi perdido — a biblioteca continua aqui.',
  'error_cannot_open': 'Não foi possível abrir {folder}. A pasta pode ter sido movida ou renomeada, ou estar num disco que não está mais conectado.',
  'error_choose_again_browser': 'Este navegador não consegue reabrir uma pasta sozinho — escolha {folder} de novo para escaneá-la. Sua biblioteca e as capas ficam guardadas, então vai ser rápido.',
  'error_choose_again_app': 'O app não consegue reabrir uma pasta sozinho — escolha {folder} de novo para escaneá-la. Sua biblioteca e as capas ficam guardadas, então vai ser rápido.',
  'error_picker_failed': 'Não foi possível usar essa pasta — o celular não deixou o app manter o acesso a ela. Tente de novo ou escolha outra pasta.',
  'error_none_copied': 'Nenhum desses arquivos pôde ser copiado para a pasta de música.',
  'error_copy_failed': 'Não foi possível copiar esses arquivos para a pasta de música.',
  'error_native_folder_lost': 'Não foi possível abrir {folder} — a pasta pode ter sido movida ou renomeada, ou o acesso a ela foi retirado. Escolha-a de novo.',
  'error_native_folder_unreadable': 'Não foi possível ler a pasta de música. Se o app acabou de ser instalado, tente abri-lo de novo.',
  'error_scan_incomplete': 'Não foi possível ler essa pasta até o fim. Tudo o que foi encontrado antes do problema está na biblioteca.',
  'error_nothing_playable_refused': 'Nada que dê para tocar em {folder} — todos os arquivos foram verificados.',
  'error_nothing_playable': 'Nada que dê para tocar em {folder} — a pasta inteira foi verificada.',
  'empty_chosen_folder': 'Não há músicas nessa pasta. Copie álbuns para ela a partir de um computador ou pelo app Arquivos — Artista/Álbum/faixa.mp3 é perfeito — e escaneie de novo, ou escolha outra pasta.',
  'empty_own_folder_ios': 'Ainda não há músicas na sua pasta. Abra o app Arquivos, vá em No Meu iPhone → Universal Jukebox e copie um álbum para lá. As pastas são mantidas, então Artista/Álbum/faixa.mp3 é perfeito — depois escaneie de novo. Ou toque em “{button}” para escolher arquivos aqui.',
  'empty_own_folder': 'Ainda não há músicas na sua pasta. Copie um álbum para a pasta Universal Jukebox do app Arquivos. As pastas são mantidas, então Artista/Álbum/faixa.mp3 é perfeito — depois escaneie de novo. Ou toque em “{button}” para escolher arquivos aqui.',

  // The iPhone's Music library
  'error_music_library_open': 'Não foi possível abrir a biblioteca do Música.',
  'error_music_library_read': 'Não foi possível ler a biblioteca do Música.',
  'error_music_library_restricted': 'O acesso à biblioteca do Música está restrito neste iPhone (Tempo de Uso ou um perfil de dispositivo), então o Universal Jukebox não consegue lê-la.',
  'error_music_library_denied': 'O Universal Jukebox não tem permissão para ler a sua biblioteca do Música. Ative em Ajustes → Apps → Universal Jukebox → Mídia e Apple Music e tente de novo.',
  'music_library_empty': 'Não há músicas na biblioteca do Música deste iPhone. Sincronize-as a partir do seu Mac (Finder → seu iPhone → Música) e tente de novo.',
  'music_library_unplayable_protected': 'Nenhuma das músicas da sua biblioteca do Música (total: {total}) pode tocar aqui. Downloads do Apple Music, que são protegidos e não podem ser tocados por outros apps: {protected}. As músicas sincronizadas a partir do seu Mac tocam normalmente.',
  'music_library_unplayable_cloud': 'Nenhuma das músicas da sua biblioteca do Música (total: {total}) pode tocar aqui. No iCloud, mas não baixadas para este iPhone: {cloud}. As músicas sincronizadas a partir do seu Mac tocam normalmente.',
  'music_library_unplayable_both': 'Nenhuma das músicas da sua biblioteca do Música (total: {total}) pode tocar aqui. Downloads do Apple Music, que são protegidos e não podem ser tocados por outros apps: {protected}. No iCloud, mas não baixadas para este iPhone: {cloud}. As músicas sincronizadas a partir do seu Mac tocam normalmente.',

  // The note the iPhone app leaves in its empty music folder
  'readme_title': 'Universal Jukebox — suas músicas vão nesta pasta.',
  'readme_how': 'Copie álbuns para cá, mande-os por AirDrop, descompacte-os aqui ou arraste-os\nde um computador. Pode usar pastas, que são mantidas — Artista/Álbum/faixa.mp3\né perfeito.',
  'readme_formats': 'Ele toca MP3, M4A, FLAC e WAV.',
  'readme_then': 'Depois abra o Universal Jukebox e toque em "Encontrar minhas músicas", depois em\n"Neste celular" e "Escanear a pasta do Jukebox". Tudo o que você adicionar depois\nprecisa de outro escaneamento: o app não tem como saber que um arquivo apareceu\nenquanto ele estava fechado.',
  'readme_delete': 'Esta nota não é necessária para nada e pode ser excluída.',
}

export default landing
