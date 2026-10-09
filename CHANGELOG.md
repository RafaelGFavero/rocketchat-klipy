# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [0.1.1] — 2026-10-09

### Corrigido

- **A correção de idioma da 0.1.0 nunca funcionou num servidor real.** Ela lia o setting
  `Language` do servidor, e essa leitura exige a permissão `server-setting.read`, que o
  App não declara. O Rocket.Chat recusava a chamada e as mensagens voltavam ao inglês.
  Os testes não pegaram porque o mock devolvia o valor sem checar permissão. Agora, para
  quem não escolheu idioma no perfil, as mensagens seguem o setting *Idioma da pesquisa*
  do próprio App, sem permissão nova. O padrão desse setting passou de `pt_BR` para
  `en_US`, que também é o valor usado quando o configurado é inválido. Em workspace de
  língua portuguesa, defina-o como `pt_BR`.
- **Falha ao publicar não culpa mais o serviço de GIFs.** Quando o Rocket.Chat recusa a
  mensagem (sala só leitura, usuário silenciado, sala com criptografia ponta a ponta), o
  usuário via "O serviço de GIFs está temporariamente indisponível.". Agora vê "Não foi
  possível publicar o GIF nesta sala.", e o log registra a operação `post` sem detalhe
  da sala.
- **Só URL do domínio `klipy.com` chega à mensagem.** `isSafeHttpsUrl()` aceitava
  qualquer host HTTPS. Agora exige `klipy.com` ou um subdomínio, tanto nas URLs de mídia
  quanto no link do título. Também recusa URL com barra invertida, espaço ou caractere de
  controle, porque clientes com parser RFC 3986 (o iOS, por exemplo) leem
  `https://klipy.com\@evil.com` com host `evil.com`.

### Removido

- Código morto ou duplicado: as dimensões do GIF (`dims`, largura e altura), a constante
  `GIF_FORMATS_LARGEST_FIRST`, o tipo `KlipyRawMediaObject`, o cursor de paginação
  `next`, os valores do filtro de conteúdo repetidos no registro dos settings, a união
  `StringKey` escrita à mão (agora derivada das próprias strings) e a interface
  `IKlipyClient`, que tinha uma única implementação, junto com `KlipySearchOptions` e
  `KlipySearchResult`. `KlipyClient.search(termo, settings)` devolve a lista de GIFs.
  No total da versão, o código de produção (`.ts` fora de `tests/`) ficou 137 linhas
  menor: 103 adicionadas, 240 removidas.

### Documentação

- Guia de uso em inglês: [docs/USER-GUIDE.md](docs/USER-GUIDE.md).
- [PRIVACY.md](PRIVACY.md) e [TERMS.md](TERMS.md) com a versão em inglês no topo.

## [0.1.0] — correções antes da submissão (2026-08-04)

### Autorizações

- **KLIPY aprovou a integração em 05/08/2026** (ticket CSM-117): arquitetura server-side,
  atribuição e uso do nome "KLIPY" no título, os três "fine as described". A aprovação é
  uma **exceção condicionada** a ser um App gratuito que promove o KLIPY — registrado na
  cláusula 2.1 dos [TERMS.md](TERMS.md), porque afeta qualquer decisão futura de
  monetização.
- Submetido ao Rocket.Chat Marketplace em 04/08/2026. Versão `Compiled`, aguardando
  revisão.

### Corrigido

- **O pacote não compilava no servidor de build do Marketplace.** A primeira submissão
  voltou com cinco erros `Cannot find module 'undici-types'`. Causa: o `package.json` que
  ia dentro do ZIP era o do projeto inteiro, com as 11 devDependencies — jest, eslint,
  ts-jest, o próprio CLI —, nada disso necessário para compilar o App. O ambiente de
  build instalava tudo e falhava ao resolver `undici-types`, dependência transitiva de
  `@types/node`.

  Foram **três submissões reprovadas** até a causa aparecer, e cada tentativa revelou uma
  camada do problema:

  | Tentativa | Configuração | Erro |
  |---|---|---|
  | 1ª | manifesto completo do projeto (11 devDeps) | `Cannot find module 'undici-types'` |
  | 2ª | manifesto enxuto + `undici-types` declarado | idêntico — o ambiente deles não instala o que se declara |
  | 3ª | `@types/node` fixado em `18.11.19` (sem undici-types) | `Buffer incorrectly extends Uint8Array<ArrayBufferLike>` — tipos velhos demais para o TS 5.7+ deles |
  | — | sem `@types/node` | `Cannot find name 'Buffer'` nos `.d.ts` do apps-engine |

  As exigências eram inconciliáveis por esse caminho. **A causa real estava noutro lugar:**
  o compilador do Marketplace (`TscBasedCompiler`) lê o `tsconfig.json` **do App** e deixa
  as opções dele vencerem as padrão — só `module`, `moduleResolution` e `outDir` são
  fixos. E o pacote nunca levava um `tsconfig.json`, então ele caía no default: sem
  `skipLibCheck` e carregando `@types/node` automaticamente.

  A correção é o pacote levar um `tsconfig.json` com `types: []` (nenhum pacote de tipos
  é carregado) e `skipLibCheck: true` (erros dentro de `.d.ts` de dependência não
  reprovam o build). O App não usa nenhuma API de Node — só `URL`, `Date`, `Set` e
  `JSON` —, então não perde nada.

  Detalhe que quase escondeu a solução: o empacotador do CLI tem `'**/tsconfig.json'` na
  lista de arquivos ignorados, e descartava o arquivo em silêncio. `scripts/package.js`
  agora o injeta no ZIP depois da geração, e **verifica** que ele entrou.

  Validado com uma simulação que replica o `TscBasedCompiler` linha a linha — o mesmo
  merge de opções, o mesmo `tsc` do pacote, e `undici-types` removido à força para
  reproduzir a condição de falha.

- **Mensagens do App saíam em inglês num Rocket.Chat em português.** O idioma era
  resolvido só por `user.settings.preferences.language`, que fica vazio para quem nunca
  escolheu idioma no perfil — ou seja, a maioria. O cliente exibe a interface traduzida
  pelo idioma do navegador, informação que não chega ao servidor. Agora há fallback para
  o idioma padrão do workspace (`Language`). Encontrado ao rodar o App em um servidor
  real; nenhum teste automatizado pegaria isso. Ver *Limitações conhecidas*.

- **`/v2/posts` respondia 422 e a re-consulta por id nunca funcionava.** O endpoint recusa
  `nanogif` e `mediumgif` no `media_filter`, embora `/v2/search` aceite os quatro formatos —
  divergência ausente da documentação do KLIPY, encontrada ao chamar a API real. O App
  deixou de enviar `media_filter` em `/v2/posts`, que assim devolve todos os formatos.
  Detalhes em [docs/api-contract.md](docs/api-contract.md#5-parâmetros-de-v2posts).

  O fallback já previsto (refazer a busca e localizar pelo id) mascarava a falha: a seleção
  funcionava, mas gastava duas requisições e uma ida à rede a mais em todo envio.

### Adicionado

- `npm run verify:api` — confere o contrato documentado contra a API real do KLIPY, campo a
  campo. Lê a chave de `KLIPY_API_KEY` e nunca a imprime.
- `docker-compose.yml` para subir um Rocket.Chat descartável.
- `docs/smoke-test.md` — 10 passos, ~15 min, com o resultado da execução real.
- Três testes de regressão fixando quais endpoints aceitam `media_filter`.
- Três testes cobrindo a resolução de idioma (preferência do usuário, idioma do
  workspace, e o padrão quando nenhum dos dois existe).

## [0.1.0] — 2026-08-04

Primeira versão. Ainda não publicada no Marketplace e ainda não validada contra um
servidor Rocket.Chat real — ver *Limitações conhecidas*.

### Adicionado

- Slash command `/klipy <termo>` com galeria de preview selecionável.
- Publicação do GIF escolhido na sala, respeitando threads.
- Mensagem de ajuda efêmera quando o comando é usado sem termo.
- Seis settings de workspace: API Key, idioma da busca, filtro de conteúdo, quantidade
  de resultados, exibição do título e link da atribuição.
- Interface em português e inglês, escolhida pelo idioma de cada usuário.
- Atribuição ao KLIPY em toda mensagem publicada e no título da galeria de preview.
- 185 testes automatizados em 7 suítes, sem qualquer acesso à rede.
- Documentação: README, PRIVACY, SECURITY, contrato da API, guia de instalação, plano de
  testes manuais e guia de submissão ao Marketplace.

### Decisões técnicas

- **API escolhida: camada compatível com Tenor v2** (`https://api.klipy.com/v2/*`), e
  não a API nativa (`/api/v1/{app_key}/gifs/*`). A camada v2 aceita `locale` no formato
  `pt_BR`, mantém a chave em query param — o que permite sanitizá-la no log com uma
  única regra — e expõe `/v2/posts?ids=`, que viabiliza a seleção segura. Comparação
  completa em [docs/api-contract.md](docs/api-contract.md#1-decisão-qual-das-duas-apis).
- **Seleção segura por re-consulta.** A URL publicada nunca vem do payload devolvido
  pelo cliente: o App usa só o `id` e confirma o item em `/v2/posts` antes de publicar.
- **`requiredApiVersion: ^1.46.0`**, a menor versão do Apps-Engine que contém tudo o que
  o App usa. Corresponde ao Rocket.Chat 6.13.
- **Faixa de resultados 8–10** em vez dos 4–20 sugeridos inicialmente: o Apps-Engine
  trunca o preview em 10 itens, e o KLIPY recomenda 8 como piso.
- **API Key como `SettingType.PASSWORD`** em vez de `STRING`: mesmo contrato, mas o
  Rocket.Chat mascara o campo na administração.
- **Empacotamento a partir de cópia limpa** (`scripts/package.js`). O compilador do
  `rc-apps` varre o projeto inteiro e compila todo `.ts` que encontra, sem honrar
  `.rcappsconfig` nessa fase — arquivos de teste na árvore quebram o empacotamento.
- **`resolveJsonModule` desligado.** O resolvedor do CLI não trata `.json`; as fixtures
  são lidas com `fs` em `tests/loadFixture.ts`.

### Limitações conhecidas

- **Nenhuma chamada real à API do KLIPY foi executada.** O contrato foi derivado da
  documentação oficial, incluindo os exemplos de resposta publicados por ela. Confirmar
  contra a API real assim que houver uma chave — `docs/manual-test-plan.md` §3.
- **A matriz de compatibilidade não foi validada em runtime.** As versões do Apps-Engine
  por release do Rocket.Chat foram lidas do código-fonte, não observadas em execução.
- **Screenshots não produzidas** — dependem de servidor e chave.
- **Paginação não implementada.** O App mostra apenas a primeira página de resultados.
- **A cláusula do KLIPY sobre requisições originadas no cliente final precisa de
  confirmação por escrito.** No Apps-Engine, a chamada parte do servidor Rocket.Chat do
  próprio cliente. Detalhes em
  [docs/api-contract.md](docs/api-contract.md#13-requisitos-de-integração-com-impacto-neste-app).

[0.1.1]: https://github.com/RafaelGFavero/rocketchat-klipy/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/RafaelGFavero/rocketchat-klipy/releases/tag/v0.1.0
