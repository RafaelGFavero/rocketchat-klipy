# Submissão ao Rocket.Chat Marketplace

Checklist do que é preciso para publicar. Itens marcados 🔴 dependem do proprietário do
projeto e não podem ser feitos a partir do código.

---

## 0. Pré-requisitos que bloqueiam a submissão

Não abra a submissão antes de fechar todos estes.

| # | Item | Status |
|---|---|---|
| 0.1 | Executar [docs/smoke-test.md](smoke-test.md) | ✅ Feito em 04/08/2026 — 10/10 passos no Rocket.Chat 6.13, um bug corrigido |
| 0.1b | [manual-test-plan.md](manual-test-plan.md) completo | ⚪ Opcional para a 0.1.0; recomendado antes de divulgar |
| 0.2 | Confirmar o contrato da API contra a API real do KLIPY | ✅ Feito em 04/08/2026 — `/v2/search` 100%, um bug em `/v2/posts` corrigido |
| 0.3 | Preencher a matriz de compatibilidade do README com resultados observados | ✅ Feito — 6.13 testado, 7.10 parcial, ambos documentados |
| 0.4 | Produzir as cinco screenshots | ✅ Feito — `docs/screenshots/`, **960×540 (16:9)**, chave mascarada |
| 0.5 | Acesso de produção da chave KLIPY | ➖ Não se aplica — **cada workspace usa a própria chave** e solicita produção por conta. A nossa serve só para desenvolvimento e testes |
| 0.6 | Confirmar com o KLIPY a cláusula de requisições originadas no cliente (§4 abaixo) | 🟡 Declarado no cadastro em 04/08/2026 — aguardando retorno |
| 0.7 | URLs públicas (suporte, termos, privacidade) | ✅ Feito — repositório público, as três respondem HTTP 200 |
| 0.8 | Criar conta no **Publisher Portal** | 🔴 Pendente — é conta separada da Rocket.Chat Cloud; formulário mapeado em §1 |
| 0.9 | Obter API Key do KLIPY | ✅ Feito — plataforma `Rocket.Chat GIF Integration`, chave `RocketChat-Server` |
| 0.10 | `npm run verify` verde | ✅ Feito |
| 0.11 | `npm run package` e `npm run package:source` gerando ZIP | ✅ Feito |
| 0.12 | Nenhuma credencial no repositório | ✅ Verificado |

---

## 1. Contas

São **duas contas diferentes**, e ter a primeira não cria a segunda:

| Conta | Onde | Situação |
|---|---|---|
| Rocket.Chat Cloud | <https://cloud.rocket.chat> | ✅ criada |
| **Marketplace Publisher** | <https://marketplace.rocket.chat/publisher/register> | 🔴 a criar |
| open.rocket.chat | <https://open.rocket.chat> | 🔴 verificar — o cadastro de publisher exige o username |

### Formulário "Publisher Sign Up" — campo a campo

Verificado no formulário real em 04/08/2026.

| Campo | O que preencher |
|---|---|
| **Publisher Name** \* | O **nome da entidade legal**. Se "RF Tecnologia" for empresa registrada, use a razão social; se você publica como pessoa física, use seu nome completo. O campo é usado em documentos fiscais **e aparece publicamente** |
| **City** \* | Cidade da entidade legal |
| **State** \* | Estado da entidade legal |
| **Country** \* | Brasil |
| **TOS Link** \* | `https://github.com/RafaelGFavero/rocketchat-klipy/blob/main/TERMS.md` |
| **Privacy Link** \* | `https://github.com/RafaelGFavero/rocketchat-klipy/blob/main/PRIVACY.md` |
| **Rocket.Chat Username** \* | Seu usuário em open.rocket.chat (o portal usa para contato) |
| Aceite dos termos | Ler antes de marcar — é um contrato de publicação |

> **Os dois links precisam estar publicamente acessíveis** — o formulário diz isso
> textualmente. É o que torna a publicação do repositório um pré-requisito, não uma
> preferência. Ver §2.1.

---

## 2. Dados do App

| Campo | Valor |
|---|---|
| Nome | KLIPY GIFs for Rocket.Chat |
| Slug | `klipy-gifs` |
| UUID | `88c860bf-0794-4052-8625-c7b2f20ff0eb` |
| Versão | 0.1.0 |
| Preço | Gratuito |
| Categoria sugerida | *Productivity* / *Fun* (o portal define a lista final; escolher a mais próxima de "conteúdo e mídia") |
| Idiomas | Português e Inglês |
| Licença | MIT |
| Autor | RF Tecnologia — <https://rftecnologia.org> |
| **Suporte** | `https://github.com/RafaelGFavero/rocketchat-klipy/issues` |
| **Documentação** | `https://github.com/RafaelGFavero/rocketchat-klipy#readme` |

### 2.1 As URLs públicas — decisão

O App precisa de **três** endereços públicos: suporte, termos e privacidade. Publicar o
repositório no GitHub resolve os três de uma vez, sem hospedagem adicional e sem manter
conteúdo duplicado — os arquivos já existem e são versionados junto com o código.

| Finalidade | URL definitiva |
|---|---|
| Suporte | `https://github.com/RafaelGFavero/rocketchat-klipy/issues` |
| Termos de Uso | `https://github.com/RafaelGFavero/rocketchat-klipy/blob/main/TERMS.md` |
| Privacidade | `https://github.com/RafaelGFavero/rocketchat-klipy/blob/main/PRIVACY.md` |
| Documentação | `https://github.com/RafaelGFavero/rocketchat-klipy#readme` |

**Situação: pronto.** O repositório foi publicado em 04/08/2026 —
<https://github.com/RafaelGFavero/rocketchat-klipy> — público, branch padrão `main`,
issues habilitadas. As quatro URLs foram verificadas e respondem **HTTP 200**. O
`app.json` já aponta para o endereço de issues.

Alternativa, se preferir separar do GitHub: hospedar as mesmas páginas em
`rftecnologia.org` (ex.: `/klipy/suporte`, `/klipy/termos`, `/klipy/privacidade`). Custa
manter duas cópias em sincronia — por isso não é a recomendação.

Uma vantagem prática do GitHub: as issues já dão um canal de suporte rastreável, com
histórico público, sem você montar formulário nem caixa de e-mail dedicada.

### Descrição curta

> Pesquise e compartilhe GIFs do KLIPY direto na conversa, com `/klipy`.

### Descrição completa

> KLIPY GIFs adiciona o comando `/klipy` ao seu Rocket.Chat. Digite um termo, veja uma
> galeria de resultados e envie o GIF escolhido para a conversa — sem sair da sala.
>
> **Como funciona**
> Digite `/klipy comemoração`. O Rocket.Chat mostra uma galeria de miniaturas vinda do
> KLIPY. Escolha uma e apenas o GIF escolhido é publicado. A consulta e os outros
> resultados não vão para a sala.
>
> **Configuração**
> Cada workspace usa a própria chave da API do KLIPY, obtida gratuitamente no Partner
> Panel do KLIPY. O administrador também define o idioma da busca, o filtro de conteúdo
> e quantos resultados mostrar.
>
> **Privacidade**
> Não existe backend intermediário. O seu servidor Rocket.Chat fala direto com a API do
> KLIPY. O App não guarda conversas, termos pesquisados nem qualquer dado, não coleta
> telemetria e não envia identificação de usuário ao KLIPY.
>
> **Idiomas**
> Português e inglês, seguindo a preferência de cada usuário.
>
> Integração de terceiros, não oficial, movida pela API do KLIPY. Não é produzida nem
> endossada pelo KLIPY ou pelo Rocket.Chat.

### Instruções de configuração

> 1. Obtenha uma API Key gratuita no Partner Panel do KLIPY
>    (partner.klipy.com/api-keys → API Keys → Add Platform).
> 2. No Rocket.Chat: Administração → Apps → KLIPY GIFs → Settings.
> 3. Cole a chave em "API Key do KLIPY" e salve.
> 4. Em qualquer sala, digite `/klipy comemoração`.
>
> A chave nasce em modo de teste, com 100 requisições por hora. Peça acesso de produção
> pelo próprio Partner Panel do KLIPY quando terminar de testar.
>
> Libere `api.klipy.com` na saída do servidor e `static.klipy.com`, `static1.klipy.com`
> e `static2.klipy.com` para os clientes, todos em HTTPS/443.

---

## 3. Pacote

O Marketplace exige o ZIP com o código-fonte para revisão.

```bash
npm ci
npm run verify
npm run package
npm run package:source
```

Saída em `dist/`:

| Arquivo | Uso |
|---|---|
| `klipy-gifs_0.1.0.zip` | Pacote compilado (bundle) |
| `klipy-gifs_0.1.0_source.zip` | Código-fonte, para a revisão |

Os dois scripts empacotam a partir de uma cópia limpa. Confira antes de enviar:

- [ ] o ZIP não contém `node_modules`;
- [ ] o ZIP não contém testes, docs ou scripts;
- [ ] o ZIP não contém API Key;
- [ ] `app.json` traz o UUID, a versão e as três permissões corretas.

Alternativa pelo CLI, que envia direto ao portal:

```bash
npx rc-apps submit --url https://<seu-workspace> -u admin -p SENHA
```

Prefira o upload manual pelo portal na primeira submissão — dá para revisar cada campo
antes de confirmar.

---

## 4. Ponto a confirmar com o KLIPY 🟡

Os *Integration Requirements* do KLIPY pedem que as requisições partam do app ou
navegador do usuário final, e não sejam roteadas por servidores intermediários operados
pelo parceiro.

No Apps-Engine, `IHttp` executa no **servidor Rocket.Chat do próprio cliente**. Não há
como um App fazer a chamada a partir do navegador, e não existe servidor operado por nós
no caminho — o "intermediário" é a infraestrutura do próprio workspace que instalou o App.

Entendemos que isso não configura o proxy que a cláusula pretende proibir, mas a
divergência é literal e precisa de confirmação **por escrito** antes da publicação.

### Já declarado — 04/08/2026

A arquitetura foi informada ao KLIPY no próprio cadastro da plataforma no Partner Panel,
no campo de descrição da integração (limitado a 500 caracteres):

> Free, open-source Rocket.Chat App (/klipy) to search and share GIFs in chat; heading to
> the Rocket.Chat Marketplace. Uses /v2/search and /v2/posts, keeps result order, uses
> media URLs as returned (no caching or re-hosting), shows attribution.
>
> On Integration Requirements: a Rocket.Chat App runs inside each customer's own server,
> so calls are server-side from their self-hosted instance with their own key - no proxy
> of ours. Media loads direct from static.klipy.com. Please confirm this is OK.

A chave de teste foi emitida após esse cadastro, o que é um indício favorável — mas
**não** é confirmação explícita. O aceite formal deve vir por escrito.

### Ação restante

**O e-mail está escrito e pronto em [docs/email-klipy.md](email-klipy.md)** — basta
enviar para `developers@klipy.com`. Ele retoma o que foi declarado no cadastro e faz três
perguntas objetivas:

1. o padrão de chamada server-side atende aos *Integration Requirements*;
2. a atribuição implementada atende às diretrizes;
3. há restrição ao uso de "KLIPY" no nome do App publicado.

A terceira ganhou peso depois que o Partner Panel **recusou** "KLIPY" no nome da chave de
API (*"Avoid 'KLIPY', 'test', and similar keywords in the API key name"*). A regra é sobre
o nome da chave, não do App — mas revela que existe política de marca, e é melhor
perguntar antes de publicar do que renomear depois.

Registre aqui a data de envio e a resposta.

### Cadastro no Partner Panel

| Campo | Valor usado |
|---|---|
| Platform name | `Rocket.Chat GIF Integration` |
| Platform website | `https://rftecnologia.org` |
| Key name | `RocketChat-Server` |
| Monetização (Ads API) | **OFF** — o App não exibe anúncios |
| Status da chave | `TESTING` (100 req/h) |

---

## 5. Screenshots ✅

Cinco imagens em **960 × 540 (16:9)**, em `docs/screenshots/`, capturadas em 04/08/2026
num Rocket.Chat 6.13 real.

> ⚠️ **O formato é 16:9, não 1200 × 600.** A documentação do Rocket.Chat menciona
> 1200 × 600 (que é 2:1), mas o formulário de submissão exige *"aspect ratio 16:9 or
> 960x540 pixels"*. Foi preciso reconverter as capturas.
>
> Ao reconverter, **encaixe, não recorte**. Cortar as laterais de 2:1 para 16:9 remove
> 134px de largura e estraga o que estiver nas bordas — na primeira tentativa, isso
> decepou o rótulo "Português" da imagem 5 e a barra lateral da imagem 3. As faixas de
> 30px acima e abaixo custam menos que perder conteúdo.

| # | Arquivo | Conteúdo | Verificação |
|---|---|---|---|
| 1 | `01-settings.png` | Configurações do App | ✅ API Key mascarada (bolinhas) |
| 2 | `02-typing.png` | `/klipy` no autocomplete | ✅ descrição traduzida visível |
| 3 | `03-preview.png` | Galeria de resultados | ✅ seis GIFs, comando com acento |
| 4 | `04-posted.png` | GIF publicado | ✅ título + "Powered by KLIPY" |
| 5 | `05-i18n.png` | Comparação pt/en | ✅ duas metades rotuladas |

Conferido antes de enviar:

- ✅ nenhuma chave visível, nem parcial — o campo aparece mascarado;
- ✅ nenhum nome real de pessoa, canal interno ou dado de cliente — instância limpa,
  usuário `admin`, canais `geral` e `teste-klipy`;
- ✅ GIFs inofensivos (comemoração de futebol), com `contentfilter` em `medium`;
- ✅ sem barras do navegador e sem a infobar de automação do Chrome.

> Se recapturar: o utilitário usado ajusta DPI, recorta na proporção 2:1 e descarta a
> faixa superior. Sem tratar DPI, `GetWindowRect` devolve coordenadas lógicas e
> `CopyFromScreen` usa físicas — a captura sai deslocada.

---

## 6. Changelog

O portal pede dois textos.

**Público** (aparece para quem instala):

> Primeira versão. Comando `/klipy` para pesquisar e compartilhar GIFs do KLIPY, com
> galeria de resultados, configuração por workspace e interface em português e inglês.

**Interno** (para a equipe de revisão): use a seção 0.1.0 do
[CHANGELOG.md](../CHANGELOG.md), que traz as decisões técnicas e as limitações
conhecidas. Vale mencionar explicitamente na submissão:

- o App não faz persistência e não pede a permissão correspondente;
- a chave é setting privado, tipo password, e não aparece em log;
- a URL publicada é sempre confirmada com a API antes de ir para a sala, nunca vem do
  cliente;
- o contrato da API está documentado em `docs/api-contract.md`.

---

## 7. O que a revisão costuma olhar

Antecipando o que o revisor vai perguntar:

| Questão provável | Resposta |
|---|---|
| Por que `networking`? | Chamar `api.klipy.com`. Escopo declarado no manifesto. |
| Onde fica a credencial? | Setting privado tipo `PASSWORD`, por workspace. Nunca no código. |
| O App envia dados para o desenvolvedor? | Não. Não há backend do autor. Ver PRIVACY.md. |
| O App guarda algo? | Não. `persistence` não é declarada. |
| Como evita XSS por URL maliciosa? | `isSafeHttpsUrl()` em toda URL; só HTTPS; esquemas perigosos rejeitados. |
| O payload do cliente é confiável? | Não é tratado como confiável. Só o `id` é aproveitado, e o item é reconsultado na API antes de publicar. |
| Usa marca de terceiro? | O nome, de forma descritiva. Nenhum logotipo do KLIPY é distribuído; o ícone é original. |
| Há código de terceiros? | Não. Tenor e Giphy foram referência de comportamento, sem cópia de código. |

---

## 8. Depois da publicação

- [ ] Marcar a tag `v0.1.0` no repositório.
- [ ] Atualizar o README com o link do Marketplace e trocar "ainda não publicado".
- [ ] Acompanhar issues de instalação nas primeiras semanas.
- [ ] Confirmar que a chave de produção do KLIPY foi liberada antes que os workspaces
      comecem a esbarrar no limite de 100 req/h.
