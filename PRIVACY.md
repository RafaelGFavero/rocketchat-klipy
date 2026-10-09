# Privacy Policy

Português: [ver abaixo](#privacidade)

Applies to the **KLIPY GIFs for Rocket.Chat** App, version 0.1.0.

This document describes exactly what the App does with data. It promises nothing that
cannot be verified in the source code of this repository.

## Summary

| Question | Answer |
|---|---|
| Does the App have its own server? | **No.** |
| Does the App store anything? | **No.** |
| Does the App collect telemetry? | **No.** |
| Does the App sell or share data? | **No.** |
| What leaves your workspace? | The search term, sent to KLIPY to produce the results. |
| Who makes that call? | **Your** Rocket.Chat server, directly to `api.klipy.com`. |

## Architecture

There is no intermediary backend. There is no server, proxy, database or service hosted
by the App's author anywhere in the flow.

The App runs entirely inside the Apps-Engine of your Rocket.Chat. When someone runs
`/klipy`, it is **your server** that calls `https://api.klipy.com`, using the API Key that
**your administrator** configured.

The App's author has no access to your traffic, your key, your rooms or your
conversations. There is no path through which that could happen.

## Data sent to KLIPY

On each search, the App sends the following to `https://api.klipy.com/v2/search`:

| Data | Source | Why |
|---|---|---|
| Search term (`q`) | What the person typed after `/klipy` | It is the search; without it there are no results |
| API Key (`key`) | Workspace setting | Authentication required by KLIPY |
| Language (`locale`) | Workspace setting | To localize the results |
| Content filter (`contentfilter`) | Workspace setting | Content safety level |
| Number of results (`limit`) | Workspace setting | Page size |
| Requested formats (`media_filter`) | Hard-coded | Reduces the response by more than 70% |

When the choice is confirmed, the App sends to `https://api.klipy.com/v2/posts` only the
identifier of the chosen GIF and the API Key.

**Nothing else is sent.** In particular, the App does **not** send:

- the user's name, email, id or any other user identifier;
- the name or id of the room, the channel or the workspace;
- message content;
- the user's IP address (the call comes from the server, not from the browser);
- the `customer_id` parameter, which KLIPY offers for user identification and which
  this App deliberately does **not** use.

KLIPY therefore receives the search term associated with the workspace's key, not with
a person.

On the client side, when the message is displayed, each person's browser or app loads
the image from `static.klipy.com`. That request comes from the person's own device, like
any externally hosted image, and KLIPY sees it as it would see any media load.

## Data stored by the App

**None.**

The App does not declare the `persistence` permission in its manifest. This means
Rocket.Chat blocks any attempt at persistent writing, even if the code contained one.
There is no search history, no result cache, no counters and no statistics.

The only information the App keeps is its **settings**, which are stored in the database
of your own Rocket.Chat, together with the settings of the other Apps.

## The API Key

- It is kept in a private setting (`klipy_api_key`, type `PASSWORD`), inside your workspace.
- It is marked as non-public: regular users cannot read it.
- It is read into memory on each request and never copied anywhere else.
- **It never appears in logs.** Logged URLs go through a sanitization function that
  replaces the value of `key` with `***`.
- **It never appears in error messages.** The messages shown to the user are fixed texts,
  one per failure category.
- It is never included in the exception thrown internally. When the network fails, the
  original error message is discarded precisely because it usually repeats the URL that
  was called.
- It does not exist in the code, in the test fixtures or in any versioned file.

This is verified by automated tests in `tests/KlipyClient.test.ts`.

## Logging

For each operation, the App's administrative logs record:

- the operation name (`search` or `lookup`);
- the **sanitized** URL;
- the HTTP status;
- the error category;
- the duration in milliseconds.

They do **not** record: the API Key, authentication headers, the full URL, the response
body, conversation content, user identification or the search term. The term is redacted
from the URL before anything is written. We decided not to log it.

## Third parties

The only third party in the flow is **KLIPY**, which processes the search and serves the
media. KLIPY's processing of this data is governed by KLIPY's own policies:

- <https://klipy.com>
- KLIPY's contact for data questions: developers@klipy.com

By installing this App, your workspace starts sending search terms to KLIPY. If that is
incompatible with your internal policy, do not install the App.

## Retention and deletion

The App retains nothing, so there is nothing to delete on its side. Uninstalling it
removes the settings along with the App. To invalidate the key, revoke it in KLIPY's
Partner Panel.

Messages already posted remain in the rooms like any other message, under the control
of your workspace.

## Contact

Privacy questions about this App: <https://github.com/RafaelGFavero/rocketchat-klipy/issues>

Questions about the processing of data by the KLIPY API: developers@klipy.com

---

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
