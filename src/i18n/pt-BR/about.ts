// Brazilian Portuguese (pt-BR) — about strings. Every key in ../en/about.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const about: Draft['about'] = {
  // About this track — the panel
  'track_heading': 'Sobre esta música',
  'toggle_label': 'Sobre',
  'toggle_hide': 'Ocultar as informações da música',
  'from_wikipedia': 'Da Wikipedia',
  'looking': 'Procurando esta música…',
  'untagged': 'Esta faixa não tem artista nas tags, então não há por onde procurá-la.',
  'none_artist': 'Parece que a Wikipedia não tem um artigo sobre esta música, nem sobre {artist}.',
  'none_unnamed': 'Parece que a Wikipedia não tem um artigo sobre esta música, nem sobre este artista.',
  'song_label': 'A música',
  'artist_label': 'O artista',
  'article_more': 'Mais',
  'article_less': 'Menos',
  'read_on_wikipedia': 'Ler na Wikipedia',
  'licence': 'Texto da Wikipedia, sob a licença {licence}. Encontrado pelo título da música e pelo artista, então de vez em quando pode ser sobre outra música com o mesmo nome.',
  'offer_what': 'O Jukebox pode procurar esta música na Wikipedia: quem a compôs, de quem ela era originalmente, como foi nas paradas e quem a canta.',
  'offer_sends': 'Isso envia o título da música e o nome do artista à Wikipedia — nada mais, e nada se você não ativar. Cada música só é consultada uma vez.',
  'look_up': 'Procurar na Wikipedia',
  'more_in_settings': 'Mais sobre isso em Ajustar este app',

  // Wikipedia lookup errors
  'error_offline': 'Sem conexão, então não deu para procurar nada.',
  'error_unreachable': 'Não foi possível acessar a Wikipedia.',
  'error_status': 'A Wikipedia retornou {status}.',

  // About this app — the page
  'app_back': 'Voltar para a sua biblioteca',
  'app_title': 'Um player para as músicas que você já tem',
  'app_intro': 'O Universal Jukebox é um player de música, e nada mais do que isso. Você indica uma pasta no seu próprio aparelho; ele lê as tags e as capas dos próprios arquivos, monta uma biblioteca que você pode navegar e a toca.',
  'app_nothing_uploaded': 'Nada é enviado.',
  'app_privacy': '{nothing_uploaded} Nem uma faixa, nem uma capa, nem um nome de arquivo. A leitura acontece no seu próprio aparelho. As únicas exceções são três consultas, e cada uma espera até você ativá-la ou tocar nela: a letra, Sobre esta música e Encontrar uma imagem enviam o artista e o título de uma música, nunca a música em si. Não há cadastro. Entrar com um Universal ID é opcional: mantém você conectado nos apps da UNI·SIM e nos avisa que o app foi aberto, e nunca vê as suas músicas.',
  'app_not_word': 'não',
  'app_not': 'Ele {not} é um serviço de streaming e não tem catálogo próprio. Não consegue encontrar músicas que você ainda não tem e não está ligado a nenhuma gravadora, loja ou assinatura. Se os seus arquivos estão em outro lugar, este app não consegue alcançá-los.',
  'app_plays_heading': 'O que ele toca',
  'app_plays': 'MP3, M4A/AAC, FLAC, WAV e AIFF — tudo o que um navegador atual decodifica sozinho. Ogg e Opus tocam onde o navegador oferece suporte, o que a maioria faz e o Safari, em geral, não.',
  'app_cant_heading': 'O que ele não toca, e por quê',
  'app_drm_name': 'Faixas protegidas por DRM',
  'app_drm': '{name} — compras antigas do iTunes e qualquer outra coisa com uma licença atrelada. Nenhum navegador consegue decodificá-las, e nenhum player local também.',
  'app_codecs': '{formats} — nenhum navegador vem com um decodificador. O {converter} os converte em algo que este app toca, também sem enviar nada.',
  'app_midi': '{midi} — um arquivo MIDI é uma partitura, não uma gravação. Não há áudio nele para tocar.',
  'app_folder_heading': 'Sobre a pasta',
  'app_folder': 'O Chrome e o Edge conseguem lembrar qual pasta você escolheu, então a biblioteca continua lá na próxima vez, depois de uma confirmação. O Firefox e o Safari não têm como fazer isso — a própria permissão é o que não pode ser salvo —, então você escolhe a pasta de novo a cada visita. De todo jeito, a biblioteca e as capas ficam guardadas, então ela volta na hora em vez de ser reconstruída.',
  'app_turntable_heading': 'O toca-discos',
  'app_turntable': 'Aperte play em qualquer coisa — uma faixa, um álbum, um resultado de busca — e você vai parar no aparelho de som: o disco começa a girar, o braço desce e a música começa. A agulha vai avançando para o centro enquanto a faixa toca, e levanta e volta para a borda para a próxima. Qualquer clique ou tecla pula a introdução, e você pode deixá-la só para um álbum novo, só uma vez por visita ou nunca, em {settings}, além de fades e um reforço de volume para álbuns masterizados baixos.',
  'app_tune_this_app': 'Ajustar este app',
  'app_preview': 'A exceção é o pequeno botão de fones de ouvido ao lado de cada faixa da sua biblioteca. Ele toca dez segundos, a partir do décimo segundo — o bastante para saber se é a música que você queria — sem tirar você da página nem atrapalhar o que já estava tocando.',
  'app_privacy_phone': '{nothing_uploaded} Nem uma faixa, nem uma capa, nem um nome de arquivo. A leitura acontece neste aparelho. As únicas exceções são consultas, e cada uma espera você pedir: Sobre esta música envia o título e o artista de uma música para a Wikipédia, e Encontrar uma imagem envia as palavras que você digita para a busca do iTunes da Apple. Não há conta nem nada em que entrar. Ele também não envia nenhuma contagem de uso: nada nos avisa quando você o abre.',
  'app_privacy_lyrics_android': 'As letras online, desligadas até você ativá-las, enviam o artista, o título, o álbum e a duração de uma música para lrclib.net.',
  'app_folder_phone': 'O app mantém o acesso às pastas que você escolhe, então sua biblioteca e as capas estão lá toda vez que você o abre. Adicione ou remova pastas em Ajustar ▸ Suas músicas.',
  'app_plays_phone': 'MP3, M4A/AAC, FLAC, WAV e AIFF. Ogg e Opus tocam no Android e, na maioria das vezes, não no iPhone nem no iPad.',
  'app_codecs_phone': '{formats}: o celular não tem decodificador para esses formatos. Converta-os antes para FLAC ou MP3 em um computador e eles vão tocar.',
  'app_built_with_heading': 'Feito com',
  'app_built_with': 'Este aplicativo se apoia no trabalho destes projetos de código aberto.',
  'app_all_packages': 'Todos os {count} pacotes e suas licenças',
  'app_footer': 'Gratuito e de código aberto, como todo Universal App. Feito pela {unisim} · {source}.',
  'app_footer_source': 'o código-fonte no GitHub',
}

export default about
