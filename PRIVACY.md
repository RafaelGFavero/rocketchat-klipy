# Privacidade

Referente ao App **KLIPY GIFs for Rocket.Chat**, versão 0.1.0.

Este documento descreve exatamente o que o App faz com dados. Ele não promete nada que
não possa ser verificado no código-fonte deste repositório.

## Resumo

| Pergunta | Resposta |
|---|---|
| O App tem servidor próprio? | **Não.** |
| O App guarda alguma coisa? | **Não.** |
| O App coleta telemetria? | **Não.** |
| O App vende ou compartilha dados? | **Não.** |
| O que sai do seu workspace? | O termo pesquisado, enviado ao KLIPY para gerar os resultados. |
| Quem faz essa chamada? | O **seu** servidor Rocket.Chat, direto para `api.klipy.com`. |

## Arquitetura

Não existe backend intermediário. Não há servidor, proxy, banco de dados ou serviço
hospedado pelo autor do App em lugar nenhum do fluxo.

O App roda inteiramente dentro do Apps-Engine do seu Rocket.Chat. Quando alguém executa
`/klipy`, é o **seu servidor** que chama `https://api.klipy.com`, usando a API Key que o
**seu administrador** configurou.

O autor do App não tem acesso ao seu tráfego, à sua chave, às suas salas ou às suas
conversas — não há por onde.

## Dados enviados ao KLIPY

Em cada busca, o App envia a `https://api.klipy.com/v2/search`:

| Dado | Origem | Por quê |
|---|---|---|
| Termo pesquisado (`q`) | O que a pessoa digitou após `/klipy` | É a busca; sem ele não há resultado |
| API Key (`key`) | Setting do workspace | Autenticação exigida pelo KLIPY |
| Idioma (`locale`) | Setting do workspace | Localizar os resultados |
| Filtro de conteúdo (`contentfilter`) | Setting do workspace | Nível de segurança do conteúdo |
| Número de resultados (`limit`) | Setting do workspace | Tamanho da página |
| Formatos desejados (`media_filter`) | Fixo no código | Reduz a resposta em mais de 70% |

Ao confirmar a escolha, o App envia a `https://api.klipy.com/v2/posts` apenas o
identificador do GIF escolhido e a API Key.

**Nada além disso é enviado.** Em particular, o App **não** envia:

- nome, e-mail, id ou qualquer identificador do usuário;
- nome ou id da sala, do canal ou do workspace;
- conteúdo de mensagens;
- endereço IP do usuário (a chamada parte do servidor, não do navegador);
- o parâmetro `customer_id`, que o KLIPY oferece para identificação de usuário e que
  este App deliberadamente **não** usa.

O KLIPY recebe, portanto, o termo pesquisado associado à chave do workspace — não a uma
pessoa.

Do lado do cliente, quando a mensagem é exibida, o navegador ou app de cada pessoa
carrega a imagem de `static.klipy.com`. Essa requisição parte do dispositivo dela, como
qualquer imagem hospedada externamente, e o KLIPY a enxerga como enxergaria qualquer
carregamento de mídia.

## Dados armazenados pelo App

**Nenhum.**

O App não declara a permissão `persistence` no manifesto — ou seja, o Rocket.Chat
bloqueia qualquer tentativa de escrita persistente, mesmo que ela existisse no código.
Não há histórico de buscas, cache de resultados, contadores nem estatística.

A única informação que o App mantém são os seus **settings**, que ficam no banco do seu
próprio Rocket.Chat, junto com as configurações dos demais Apps.

## A API Key

- Fica em um setting privado (`klipy_api_key`, tipo `PASSWORD`), dentro do seu workspace.
- É marcada como não pública: usuários comuns não conseguem lê-la.
- É lida em memória a cada requisição e nunca copiada para outro lugar.
- **Nunca aparece em log.** As URLs registradas passam por uma função de sanitização que
  troca o valor de `key` por `***`.
- **Nunca aparece em mensagem de erro.** As mensagens mostradas ao usuário são textos
  fixos por categoria de falha.
- Nunca é incluída na exceção lançada internamente. Quando a rede falha, a mensagem do
  erro original é descartada justamente porque costuma repetir a URL chamada.
- Não existe no código, nas fixtures de teste nem em qualquer arquivo versionado.

Isso é verificado por testes automatizados em `tests/KlipyClient.test.ts`.

## Logs

Os logs administrativos do App registram, por operação:

- o nome da operação (`search` ou `lookup`);
- a URL **sanitizada**;
- o status HTTP;
- a categoria do erro;
- a duração em milissegundos.

Eles **não** registram: API Key, cabeçalhos de autenticação, URL completa, corpo da
resposta, conteúdo de conversas, identificação do usuário ou o termo pesquisado. O termo
é redigido da URL antes de qualquer escrita — a decisão foi não registrá-lo.

## Terceiros

O único terceiro no fluxo é o **KLIPY**, que processa a busca e serve a mídia. O
tratamento que o KLIPY dá a esses dados é regido pelas políticas dele:

- <https://klipy.com>
- Contato do KLIPY para questões de dados: developers@klipy.com

Ao instalar este App, o seu workspace passa a enviar termos de busca ao KLIPY. Se isso
for incompatível com a sua política interna, não instale o App.

## Retenção e exclusão

O App não retém nada, então não há o que excluir do lado dele. Desinstalá-lo remove os
settings junto com o App. Para invalidar a chave, revogue-a no Partner Panel do KLIPY.

Mensagens já publicadas continuam nas salas como qualquer outra mensagem, sob o controle
do seu workspace.

## Contato

Questões sobre privacidade neste App: <https://github.com/RafaelGFavero/rocketchat-klipy/issues>

Questões sobre o tratamento de dados pela API do KLIPY: developers@klipy.com
