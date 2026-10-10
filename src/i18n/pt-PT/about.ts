// European Portuguese (pt-PT) — about strings. Every key in ../en/about.ts, translated; a key
// not here yet shows in English. GLOSSARY.md has the terms and the register.
import type { Draft } from '../en/index.ts'

const about: Draft['about'] = {
  'track_heading': 'Sobre esta música',
  'toggle_label': 'Sobre',
  'toggle_hide': 'Ocultar informações da música',
  'from_wikipedia': 'Da Wikipedia',
  'looking': 'A procurar esta música…',
  'untagged': 'Esta faixa não tem artista nas etiquetas, por isso não há nada por onde a procurar.',
  'none_artist': 'Parece que a Wikipedia não tem um artigo sobre esta música, nem sobre {artist}.',
  'none_unnamed': 'Parece que a Wikipedia não tem um artigo sobre esta música, nem sobre este artista.',
  'song_label': 'A música',
  'artist_label': 'O artista',
  'article_more': 'Mais',
  'article_less': 'Menos',
  'read_on_wikipedia': 'Ler na Wikipedia',
  'licence': 'Texto da Wikipedia, sob a licença {licence}. Encontrado pelo título e pelo artista da música, por isso, de vez em quando, pode ser sobre outra música com o mesmo nome.',
  'offer_what': 'O Jukebox pode procurar esta música na Wikipedia: quem a escreveu, quem a gravou primeiro, como se saiu nas tabelas de vendas e quem a canta.',
  'offer_sends': 'Isso envia o título da música e o nome do artista para a Wikipedia — mais nada, e nada de todo se não a ativar. Cada música só é procurada uma vez.',
  'look_up': 'Procurar na Wikipedia',
  'more_in_settings': 'Mais sobre isto em Ajustar esta aplicação',

  'error_offline': 'Sem ligação, por isso não foi possível procurar nada.',
  'error_unreachable': 'Não foi possível contactar a Wikipedia.',
  'error_status': 'A Wikipedia devolveu {status}.',

  'app_back': 'Voltar à sua biblioteca',
  'app_title': 'Um leitor para a música que já tem',
  'app_intro': 'O Universal Jukebox é um leitor de música, e nada mais do que isso. Basta indicar-lhe uma pasta no seu próprio dispositivo; a aplicação lê as etiquetas e as capas dos próprios ficheiros, cria uma biblioteca que pode explorar e reproduz a música.',
  'app_nothing_uploaded': 'Nada é carregado.',
  'app_privacy': '{nothing_uploaded} Nem uma faixa, nem uma capa, nem um nome de ficheiro. A leitura acontece no seu próprio dispositivo. Há apenas três exceções, e cada uma espera até que a ative ou lhe toque: a letra, Sobre esta música e Encontrar uma imagem enviam o artista e o título de uma música, nunca a música em si. Não há nada em que se registar. Iniciar sessão com um Universal ID é opcional: mantém a sessão iniciada em todas as aplicações UNI·SIM e diz-nos que a aplicação foi aberta, e nunca vê a sua música.',
  'app_not_word': 'não',
  'app_not': 'Esta aplicação {not} é um serviço de streaming e não tem catálogo próprio. Não consegue encontrar música que ainda não tenha, e não está ligado a nenhuma editora discográfica, loja ou subscrição. Se os seus ficheiros estiverem noutro lugar, esta aplicação não lhes consegue chegar.',
  'app_plays_heading': 'O que reproduz',
  'app_plays': 'MP3, M4A/AAC, FLAC, WAV e AIFF — tudo o que um navegador atual descodifica sozinho. Ogg e Opus reproduzem-se onde o navegador os suporta, o que acontece na maioria e, no Safari, quase nunca.',
  'app_cant_heading': 'O que não consegue reproduzir, e porquê',
  'app_drm_name': 'Faixas protegidas por DRM',
  'app_drm': '{name} — compras antigas no iTunes e tudo o que tenha uma licença associada. Nenhum navegador as consegue descodificar, e nenhum leitor local também.',
  'app_codecs': '{formats} — nenhum navegador inclui um descodificador. O {converter} converte-os em algo que esta aplicação consegue reproduzir, também sem carregar nada.',
  'app_midi': '{midi} — um ficheiro MIDI é uma partitura, não uma gravação. Não tem áudio para reproduzir.',
  'app_folder_heading': 'Sobre a pasta',
  'app_folder': 'O Chrome e o Edge conseguem lembrar-se da pasta escolhida, por isso a biblioteca continua lá da próxima vez, depois de uma confirmação. O Firefox e o Safari não têm forma de o fazer — a própria permissão é o que não pode ser guardado —, por isso a pasta tem de ser escolhida de novo em cada visita. De qualquer forma, a biblioteca e as capas ficam guardadas, por isso voltam de imediato em vez de serem recriadas.',
  'app_turntable_heading': 'O gira-discos',
  'app_turntable': 'Carregue em reproduzir em qualquer coisa — uma faixa, um álbum, um resultado de pesquisa — e chega à aparelhagem: o prato começa a girar, o braço desce e a música começa. A agulha vai avançando para o centro enquanto a faixa toca, levanta-se e volta à borda exterior para a seguinte. Qualquer clique ou tecla salta a introdução, e pode tê-la só num álbum novo, só uma vez por visita ou nunca, em {settings}, juntamente com desvanecimentos e um reforço de volume para álbuns masterizados com pouco volume.',
  'app_tune_this_app': 'Ajustar esta aplicação',
  'app_preview': 'A exceção é o pequeno botão dos auscultadores ao lado de cada faixa da biblioteca. Esse reproduz dez segundos, a partir dos dez segundos — o suficiente para saber se é a que queria — sem sair da página nem interromper o que já estava a tocar.',
  'app_footer': 'Gratuita e de código aberto, como todas as Universal Apps. Feita por {unisim} · {source}.',
  'app_footer_source': 'o código-fonte no GitHub',
}

export default about
