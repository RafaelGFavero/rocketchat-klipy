# Contrato da API KLIPY

Documento normativo do App **KLIPY GIFs for Rocket.Chat**.
Qualquer alteração no cliente HTTP (`services/KlipyClient.ts`) deve ser refletida aqui.

- **Data da inspeção:** 04/08/2026
- **Fonte primária:** <https://docs.klipy.com/> (seções *Getting Started*, *Integration Requirements*,
  *Network Requirements*, *GIF API*, *API Usage & Attribution Guidelines*, *Migrate from Tenor*)
- **Método:** leitura direta da documentação oficial renderizada. Não foi possível executar chamadas
  reais contra a API porque nenhuma API Key foi fornecida (ver *Limitações* no fim do documento).

---

## 1. Decisão: qual das duas APIs

O KLIPY publica **duas** superfícies HTTP mutuamente exclusivas:

| | Alternativa A — compatível com Tenor v2 | Alternativa B — API nativa KLIPY |
|---|---|---|
| Base URL | `https://api.klipy.com` | `https://api.klipy.com` |
| Busca | `GET /v2/search` | `GET /api/v1/{app_key}/gifs/search` |
| Chave | query param `key` | **segmento de path** `{app_key}` |
| Idioma | `locale=xx_YY` (ISO 639-1 + ISO 3166-1), default `en_US` | `locale=xx` (só ISO 3166-1 alpha-2) |
| Filtro de conteúdo | `contentfilter` = `off\|low\|medium\|high` | `content_filter` = `off\|low\|medium\|high` |
| Limite | `limit` (default 20, máx. 50) | `per_page` (mín. 8, máx. 50, default 24) |
| Filtro de formato | `media_filter` (reduz payload >70%) | `format_filter` |
| Busca por ID | `GET /v2/posts?key=&ids=` | `GET /api/v1/{app_key}/gifs/items?slugs=` |
| Resposta | `results[]` + `media_formats{}` | `data.data[]` + `file{}` aninhado em 2 níveis |
| Status | Documentada integralmente, com *Response objects*, *Media Object*, *Content Formats*, *Localization* | Documentada integralmente |

**Escolhida: Alternativa A (camada compatível com Tenor v2).**

Motivos, na ordem em que pesaram:

1. **Está oficialmente suportada e completa.** A seção *Migrate from Tenor* não é um aviso de
   descontinuação: ela documenta 8 endpoints (`search`, `featured`, `categories`,
   `search-suggestions`, `autocomplete`, `trending-search-terms`, `register-share`, `posts`) mais
   três páginas de objetos de resposta. O handoff manda preferir essa camada exatamente nessa condição.
2. **Idioma.** `locale` aceita `xx_YY`, então `pt_BR` é um valor válido — o formato pedido no handoff.
   A API nativa aceita apenas o código de país (`br`), perdendo a dimensão de idioma.
3. **A chave não vai no path.** Em `/v2/search?key=…` a chave é um query param, o que permite
   removê-la de qualquer string logada com uma única regra de sanitização
   (`utils/validation.ts` → `sanitizeUrlForLog`). Na API nativa a chave é parte do path e vaza em
   qualquer log de URL, inclusive nos logs internos de HTTP do Rocket.Chat.
4. **`media_filter` casa com a ordem de fallback de mídia.** Os formatos nomeados
   (`nanogif`, `tinygif`, `mediumgif`, `gif`) são exatamente os degraus de qualidade que o preview e
   o envio precisam, e pedir só esses reduz a resposta em mais de 70%.
5. **Equivalência com o antigo App Tenor**, critério explícito do handoff.
6. **`GET /v2/posts?ids=` viabiliza a Estratégia 1 de seleção segura** (re-consulta por ID em vez de
   confiar na URL devolvida pelo cliente). Ver §7.

> Nenhum parâmetro da Alternativa B é usado, e nenhum campo de `data.data[]` / `file{}` é lido.
> As duas superfícies nunca são misturadas.

---

## 2. Base URL e endpoints usados

```
https://api.klipy.com/v2/search
https://api.klipy.com/v2/posts
```

Somente esses dois. O App **não** chama `featured`, `categories`, `autocomplete`,
`trending-search-terms` nem `register-share`.

## 3. Autenticação

Query param `key`, obrigatório.

```
GET /v2/search?key=<API_KEY>&q=<termo>
```

A chave é lida do setting privado `klipy_api_key` (tipo `PASSWORD`) a cada requisição. Nunca é
persistida pelo App, nunca é escrita em log e nunca aparece em mensagem de erro (ver §9).

## 4. Parâmetros de `/v2/search`

| Parâmetro | Obrig. | Valor enviado pelo App | Observação |
|---|---|---|---|
| `key` | sim | setting `klipy_api_key` | |
| `q` | sim | termo do usuário, `encodeURIComponent` | máx. 100 caracteres (`MAX_QUERY_LENGTH`) |
| `limit` | não | setting `klipy_result_limit` (8–10, default 10) | API aceita até 50; o teto real é 10 (ver §6) |
| `locale` | não | setting `klipy_locale` (default `en_US`) | `xx` ou `xx_YY`; validado por regex |
| `contentfilter` | não | setting `klipy_content_filter` (default `medium`) | `off\|low\|medium\|high` |
| `media_filter` | não | `nanogif,tinygif,mediumgif,gif` | fixo no código |
| `country` | não | **não enviado** | derivável de `locale`; omitido para não enviar dado extra |
| `searchfilter` | não | **não enviado** | em branco = somente GIFs, que é o escopo do App |
| `random` | não | **não enviado** | default `false` = ordenação por relevância do KLIPY |
| `pos` | não | **não enviado** | o App não pagina; MVP mostra apenas a primeira página |
| `customer_id` | — | **não enviado** | não existe nesta camada; ver PRIVACY.md |

Valores aceitos por `contentfilter`, verbatim da documentação: `off`, `low`, `medium`, `high`.

## 5. Parâmetros de `/v2/posts`

| Parâmetro | Obrig. | Valor enviado |
|---|---|---|
| `key` | sim | setting `klipy_api_key` |
| `ids` | sim | o `id` do item que o usuário selecionou no preview |
| `media_filter` | não | **não enviado** — ver abaixo |

### ⚠️ `media_filter` tem valores diferentes em cada endpoint

Isto **não está na documentação do KLIPY** e só apareceu ao chamar a API real
(04/08/2026, via `npm run verify:api`). `/v2/posts` recusa dois dos quatro formatos que
`/v2/search` aceita sem reclamar:

```
GET /v2/posts?key=…&ids=…&media_filter=nanogif,tinygif,mediumgif,gif
→ HTTP 422
{
  "result": false,
  "data": [],
  "errors": {
    "media_filter.0": ["The selected media_filter.0 is invalid."],
    "media_filter.2": ["The selected media_filter.2 is invalid."]
  }
}
```

Os índices 0 e 2 da lista são `nanogif` e `mediumgif`. Comprovado por eliminação:

| Chamada | Resultado |
|---|---|
| `/v2/search` com `nanogif,tinygif,mediumgif,gif` | ✅ 200, devolve os quatro formatos |
| `/v2/posts` com `nanogif,tinygif,mediumgif,gif` | ❌ 422 nos índices 0 e 2 |
| `/v2/posts` com `gif` | ✅ 200, devolve só `gif` |
| `/v2/posts` **sem** `media_filter` | ✅ 200, devolve `gif`, `mediumgif`, `tinygif`, `nanogif` |

Ou seja, `/v2/posts` aparenta aceitar apenas `gif` e `tinygif` no filtro, mas entrega os
quatro formatos quando o parâmetro é omitido.

**Decisão: o App não envia `media_filter` em `/v2/posts`.** Restringir a lista a
`gif,tinygif` funcionaria, mas amputaria o fallback de qualidade — se `gif` faltar,
queremos `mediumgif` antes de cair para `tinygif`. E a economia de payload que justifica
o parâmetro em `/v2/search` (10 itens) é irrelevante para um único item.

Guardado por dois testes de regressão em `tests/KlipyClient.test.ts` e um em
`tests/KlipyCommand.test.ts`. A constante chama-se `SEARCH_MEDIA_FILTER` justamente para
sinalizar onde ela vale.

## 6. Limite de resultados

Três tetos se sobrepõem; vence o menor:

- `/v2/search` aceita `limit` até **50**;
- o handoff pede **8 a 12** resultados no preview;
- o Apps-Engine trunca o preview em **10**, sem negociação — `ISlashCommand.previewer` documenta
  literalmente *"Max amount returned to the client is 10 and no more, period."*

Logo o setting `klipy_result_limit` é validado para a faixa **8–10**, default **10**.
Isso substitui a faixa 4–20 sugerida no handoff, que não é realizável: abaixo de 8 fica fora da
recomendação do KLIPY e acima de 10 o Rocket.Chat descarta o excedente silenciosamente.

## 7. Estrutura da resposta

### 7.1 Envelope (`/v2/search` e `/v2/posts`)

```jsonc
{
  "results": [ /* Response Object[] */ ],
  "next": "string"   // cursor de paginação; ignorado pelo App
}
```

### 7.2 Response Object

Campos observados na documentação oficial:

```jsonc
{
  "id": "2525964843568523",
  "title": "Shaq's Excited Dance",
  "media_formats": { /* ver 7.3 */ },
  "created": 1765483200,
  "content_description": "",
  "itemurl": "https://klipy.com/gifs/excited-im-so-excited-22",
  "url": "https://static.klipy.com/ii/…/faEUNiNuq5TjUsuXzv.gif",
  "tags": ["excited", "happy dance"],
  "flags": [],
  "hasaudio": false,
  "content_description_source": ""
}
```

Campos usados pelo App: `id`, `title`, `content_description`, `media_formats`, `itemurl`.
Campos ignorados: `created`, `tags`, `flags`, `hasaudio`, `content_description_source`, `url`
(preferimos `media_formats.gif.url`, que é explícito quanto ao formato).

### 7.3 Media Object (`media_formats[nome]`)

```jsonc
{
  "url": "https://static.klipy.com/ii/…/p30ORxL1.gif",
  "duration": 0,
  "preview": "",
  "dims": [498, 498],
  "size": 2614179
}
```

`dims` é **uma tupla `[largura, altura]`**, não um objeto — diferença relevante em relação à API
nativa, que usa `width`/`height` separados.

Formatos de GIF animado disponíveis, do maior para o menor: `gif`, `mediumgif`, `tinygif`, `nanogif`.
Também existem `mp4`, `loopedmp4`, `tinymp4`, `nanomp4` e variantes `webm` — **não usados no MVP**,
conforme o handoff (GIF animado está disponível, então não há motivo para cair em MP4).

## 8. Campos usados pelo App

| Uso | Campo | Fallback (nesta ordem) |
|---|---|---|
| Identificador estável | `id` | — (item sem `id` é descartado) |
| Título | `title` → `content_description` | string vazia |
| Thumbnail do preview | `media_formats.tinygif.url` | `nanogif` → `mediumgif` → `gif` |
| GIF publicado | `media_formats.gif.url` | `mediumgif` → `tinygif` → `nanogif` |
| Página do item | `itemurl` | omitido se ausente ou se não passar em `isSafeHttpsUrl()` (§9) |

A ordem de fallback do preview começa em `tinygif` (220 px) e não em `nanogif` (90 px): 90 px fica
ilegível na galeria de preview do Rocket.Chat. `nanogif` continua como primeiro fallback.

Todo campo de mídia passa por `isSafeHttpsUrl()` (§9) antes de ser aceito. Itens sem nenhuma URL
utilizável para *ambos* os papéis (preview e envio) são descartados.

## 9. Segurança de URL

`utils/validation.ts` aplica, a toda URL vinda da API:

- protocolo obrigatoriamente `https:` — `http:`, `javascript:`, `data:`, `file:` e qualquer outro
  esquema são rejeitados;
- host `klipy.com` ou um subdomínio dele (`static.klipy.com`, por exemplo); qualquer outro host
  é rejeitado;
- nenhuma barra invertida na URL. O `URL` (WHATWG) do servidor e clientes com parser RFC 3986
  podem ler essa URL de formas diferentes: em `https://klipy.com\@evil.com`, o servidor vê o
  host `klipy.com`, e esses clientes podem ver `evil.com`;
- nenhum espaço, caractere de controle ASCII ou DEL em posição alguma da string, nem nas pontas.
  É precaução: a string publicada é a crua, então tem de ser exatamente a validada;
- comprimento máximo de 2048 caracteres.

`sanitizeUrlForLog()` substitui o valor de `key` por `***` antes de qualquer log.

O App **não reescreve nem reconstrói** as URLs devolvidas pelo KLIPY: elas são usadas exatamente como
recebidas, conforme *Integration Requirements* → *Preserve KLIPY URLs and delivery data*.

## 10. Rate limit e códigos de erro

| Situação | Status HTTP | Tratamento |
|---|---|---|
| Chave de teste estourou 100 req/h | `429` | mensagem efêmera `error.rateLimit`; log `warn` sem a chave |
| Chave inválida / ausente / sem permissão | `401`, `403` | mensagem efêmera `error.auth`; log `warn` |
| Erro do servidor KLIPY | `5xx` | mensagem efêmera `error.unavailable` |
| Requisição malformada | `400`, `404`, outros 4xx | mensagem efêmera `error.unavailable` |
| Timeout / falha de rede | exceção | mensagem efêmera `error.unavailable` |
| Corpo não-JSON ou sem `results[]` | `200` | mensagem efêmera `error.malformed` |
| `results: []` | `200` | mensagem efêmera `error.noResults` |

Limites publicados pelo KLIPY:

- **Chave de teste:** até **100 requisições por hora**.
- **Chave de produção:** sem limite, liberada mediante solicitação no Partner Panel.

Cada GIF enviado consome **pelo menos 2 requisições**: uma ou mais buscas do preview enquanto o
usuário digita, e mais uma no envio (a confirmação da seleção, §11, ou a busca do `executor` quando o
usuário confirma sem escolher). Com chave de teste isso dá menos de 50 envios por hora por workspace.

## 11. Estratégia de seleção segura

`ISlashCommandPreviewItem` carrega apenas `{ id, type, value }` — não há espaço para payload extra e
o cliente poderia, em tese, devolver um `value` adulterado. Por isso o App usa a **Estratégia 1** do
handoff:

1. o preview guarda em `value` a URL do thumbnail (o Rocket.Chat precisa dela para renderizar) e em
   `id` o identificador KLIPY;
2. ao selecionar, o App **ignora o `value` recebido** e faz `GET /v2/posts?ids=<id>`;
3. a URL publicada é a que a API acabou de devolver, validada por `isSafeHttpsUrl()` (HTTPS e
   domínio `klipy.com`).

Se `/v2/posts` não devolver o item (um erro de rede, de status ou uma resposta malformada é
reportado ao usuário, sem nova tentativa), o App refaz a busca original (`context.getArguments()`
continua disponível em `executePreviewItem`) e localiza o item pelo `id`. Se essa busca lançar
erro, o usuário recebe a mensagem do próprio erro (`error.auth`, `error.rateLimit`,
`error.unavailable` ou `error.malformed`). Se ela responder sem o item, a seleção é abortada com
`error.unavailable`. Em nenhum caminho uma URL de origem não verificada chega à sala.

## 12. Atribuição exigida

Verbatim de *API Usage & Attribution Guidelines*:

- **Obrigatório:** `"Search KLIPY"` como placeholder padrão do campo de busca.
- **Opcional:** marca d'água KLIPY no card da mensagem compartilhada.
- **Opcional:** marca `"Powered by KLIPY"` visível onde o conteúdo KLIPY é exibido.

Implementação:

- o requisito obrigatório é atendido por `i18nParamsExample: 'Search KLIPY'` no slash command — é
  literalmente o texto que o Rocket.Chat mostra como placeholder ao lado de `/klipy`;
- `"Powered by KLIPY"` é anexado a toda mensagem publicada e **não pode ser desligado**. O setting
  `klipy_show_attribution_link` controla apenas se o texto vira link para `https://klipy.com`.

## 13. Requisitos de integração com impacto neste App

De *Integration Requirements*:

| Requisito | Situação neste App |
|---|---|
| Preservar URLs e dados de entrega do KLIPY | ✅ URLs usadas como recebidas, sem reescrita |
| Carregar mídia direto das URLs do KLIPY | ✅ a mensagem aponta para `static.klipy.com`; o App não baixa nem re-hospeda |
| Não fazer cache/mirror da mídia | ✅ nenhuma persistência; o App não declara a permissão `persistence` |
| Preservar ordem e composição dos resultados | ✅ ordem da API mantida; só são removidos itens sem mídia utilizável |
| Manter fontes separadas | ✅ só há conteúdo KLIPY no preview |
| Filtragem via Partner Panel | ✅ o App expõe `contentfilter`, mas não filtra por conta própria |
| **Requisições originadas no cliente final** | ⚠️ **ver abaixo** |

> **Ponto que exige confirmação do KLIPY.** A documentação pede que as chamadas partam do
> app/navegador do usuário final e não sejam roteadas por servidores intermediários "operados pelo
> parceiro". No Apps-Engine, `IHttp` executa no **servidor Rocket.Chat do próprio cliente** — não há
> como um App fazer a chamada a partir do navegador, e não existe servidor operado por nós no
> caminho. Entendemos que isso não configura o proxy que a cláusula pretende proibir, mas é uma
> divergência literal. **Pendência externa:** confirmar por escrito com developers@klipy.com antes de
> submeter ao Marketplace. Registrado também em README.md e docs/marketplace-submission.md.

## 14. Domínios a liberar em firewall

De *Network Requirements* (todos em HTTPS/443):

| Domínio | Uso |
|---|---|
| `api.klipy.com` | chamadas do servidor Rocket.Chat |
| `static.klipy.com` | mídia (a partir do navegador/app do usuário) |
| `static1.klipy.com` | mídia |
| `static2.klipy.com` | mídia |
| `klipy.com` | link de atribuição |

Note que `api.klipy.com` precisa ser alcançável pelo **servidor**, e os `static*` pelos **clientes**.

## 15. Exemplo sanitizado de resposta

Fixtures em `tests/fixtures/`, derivadas do exemplo oficial. **Nenhuma contém API Key** — o campo
`key` foi removido das URLs de requisição e as URLs de mídia são as do exemplo público da doc.

- `search-success.json` — 3 itens, todos os formatos de GIF, um deles sem `title`
- `search-empty.json` — `results: []`
- `search-malformed.json` — `results` como objeto em vez de array
- `posts-success.json` — resposta de `/v2/posts` com 1 item
- `search-unsafe-urls.json` — item com `javascript:`, item com `http:`, item sem `id`

## 16. Estado da verificação

**✅ Confirmado contra a API real em 04/08/2026**, com chave de teste, via
`npm run verify:api` ([scripts/verify-api-contract.js](../scripts/verify-api-contract.js)).

Conferido item a item em `/v2/search`:

| Item | Resultado |
|---|---|
| `HTTP 200` | ✅ 314 ms |
| `results` é array, `next` presente | ✅ |
| `limit=10` respeitado | ✅ 10 itens |
| `id` string, `title` presente, `media_formats` presente | ✅ |
| `media_filter` respeitado | ✅ `gif`, `mediumgif`, `tinygif`, `nanogif` |
| Todas as URLs em HTTPS | ✅ |
| `dims` é tupla `[w,h]` nos quatro formatos | ✅ `[498,498]`, `[640,640]`, `[220,220]`, `[90,90]` |
| Campos do Response Object | ✅ exatamente os 11 documentados em §7.2, nenhum a mais |

Em `/v2/posts`: **uma divergência encontrada e corrigida** — ver §5. A re-consulta por
`id` funciona e devolve o mesmo item, então a estratégia de seleção segura (§11) está
validada contra a API real.

### Limitações que permanecem

1. **Corpos de erro de `401`, `429` e `5xx` não verificados.** A documentação não os publica e não
   provocamos esses status. O cliente decide apenas pelo `statusCode` e nunca interpreta o corpo do
   erro, o que é o comportamento seguro de qualquer forma.
2. **`next` não usado.** Paginação está fora do MVP.
3. **Um único termo de busca testado** (`hello`). Termos com acento e emoji seguem cobertos apenas
   por teste unitário de encoding.
4. **Nada foi testado dentro de um Rocket.Chat.** A verificação acima é do contrato HTTP, não do
   comportamento do App. Ver `docs/manual-test-plan.md`.
