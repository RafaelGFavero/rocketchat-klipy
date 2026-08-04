# Plano de implementação

Registro do que foi planejado, do que mudou durante a execução e por quê. Escrito na
Etapa 1 e atualizado ao final com o resultado real.

**Status geral:** implementação concluída e verificada localmente. Pendente de validação
contra um Rocket.Chat real e contra a API real do KLIPY.

---

## Etapa 1 — Descoberta ✅

### O que foi inspecionado

| Fonte | Como | Resultado |
|---|---|---|
| `@rocket.chat/apps-engine` instalado | Leitura direta dos `.d.ts` | Fonte de verdade das assinaturas |
| docs.klipy.com | Documentação oficial renderizada | Contrato das duas APIs |
| developer.rocket.chat | Guias de criação e de permissões | Formato do manifesto |
| Código-fonte de releases do Rocket.Chat | `packages/apps-engine/package.json` por tag | Matriz de versões |

### Descobertas que mudaram o plano

**1. `ISlashCommandPreviewItem` só tem `{ id, type, value }`.**
Não existe campo para payload adicional. Isso eliminou de saída a "Estratégia 2 — payload
mínimo validado" do handoff: não há onde colocar payload. A Estratégia 1 (re-consulta por
id) deixou de ser preferência e virou a única opção coerente — e felizmente a API oferece
`/v2/posts?ids=`.

**2. O preview é truncado em 10 itens pelo Apps-Engine.**
`ISlashCommand.previewer` documenta: *"Max amount returned to the client is 10 and no
more, period."* A faixa 4–20 sugerida no handoff não é realizável. Adotada 8–10.

**3. O KLIPY mantém as duas APIs oficialmente documentadas.**
A camada compatível com Tenor v2 não está descontinuada — tem seção própria com 8
endpoints e três páginas de objetos de resposta. Isso ativou a preferência arquitetural
do handoff. Comparação completa em [api-contract.md](api-contract.md#1-decisão-qual-das-duas-apis).

**4. O `locale` das duas APIs é diferente.**
A camada v2 aceita `xx_YY`, então `pt_BR` funciona. A API nativa aceita só o código de
país (`br`), sem idioma. Peso decisivo a favor da v2, já que o handoff pede `pt_BR`.

**5. A atribuição obrigatória do KLIPY é o placeholder, não o "Powered by".**
As diretrizes marcam `"Search KLIPY"` no campo de busca como **REQUIRED**, e o
"Powered by KLIPY" como opcional. No Rocket.Chat, o placeholder do slash command é o
`i18nParamsExample`. Implementados os dois.

**6. Os *Integration Requirements* pedem requisições originadas no cliente final.**
Um App do Rocket.Chat chama a API a partir do servidor, por construção. Registrado como
divergência a confirmar com o KLIPY, não como algo a esconder.

---

## Etapa 2 — Scaffold ✅

Estrutura conforme o handoff. Toolchain: TypeScript 5.9, Jest 30 + ts-jest, ESLint 10
(flat config), `@rocket.chat/apps-cli` 1.14.

**Desvio:** o `@rocket.chat/apps-engine` ficou em `devDependencies`, não em
`dependencies` — exigência do CLI, e correta: o engine é fornecido pelo servidor em
runtime, não empacotado.

---

## Etapa 3 — Contrato e cliente ✅

Ordem seguida: tipos → fixtures → testes (falhando) → implementação → testes passando.

A fase vermelha foi confirmada: 4 suítes falhando por módulo inexistente, 1 passando
(i18n, que não dependia de implementação nova). Depois da implementação, testes verdes.

Encapsulamento: `results`, `media_formats`, `dims` e afins existem apenas em
`services/KlipyClient.ts` e `utils/media.ts`. O resto do App só conhece `KlipyGif`.

---

## Etapa 4 — Settings ✅

Seis settings, todos privados. Dois desvios do handoff, ambos deliberados:

| Item | Handoff | Implementado | Motivo |
|---|---|---|---|
| Tipo da API Key | `STRING` | `PASSWORD` | Mesmo contrato, mas mascarado na administração |
| Faixa de resultados | 4–20 | 8–10 | Teto de 10 do Apps-Engine; piso de 8 recomendado pelo KLIPY |

Nenhum valor de setting é usado cru: locale por regex, filtro por lista fechada, limite
por faixa numérica.

---

## Etapa 5 — Slash command ✅

- `executor`: sem termo → ajuda efêmera; com termo → publica o primeiro resultado.
- `previewer`: galeria; **em erro devolve lista vazia em vez de notificar**, porque o
  previewer roda a cada tecla e notificar viraria spam. O erro real aparece quando o
  usuário confirma.
- `executePreviewItem`: usa só o `id`, reconsulta em `/v2/posts`, e se isso falhar refaz
  a busca original e localiza pelo id. A URL publicada sempre vem de uma resposta da API.

Threads são respeitadas em todos os caminhos.

---

## Etapa 6 — Segurança ✅

| Verificação | Resultado |
|---|---|
| Chave em log | Sanitizada (`key=***`), com teste dedicado |
| Termo pesquisado em log | Sanitizado (`q=***`) |
| Mensagem de exceção de rede | Descartada antes do log — costuma repetir a URL |
| Mensagem de erro ao usuário | Texto fixo por categoria, sem detalhe técnico |
| URLs da API | `isSafeHttpsUrl()` em todas; `javascript:`, `data:`, `file:`, `http:` rejeitados |
| Payload do cliente | Só o `id` é aproveitado; nenhum campo de anexo é copiado |
| Permissões | Três declaradas; nove deliberadamente não pedidas |
| Segredos no repositório | Varredura executada; só valores fictícios de teste |
| Bundle empacotado | Verificado: nenhuma credencial |

---

## Etapa 7 — Qualidade ✅

```
npm run i18n:build   ok
npm run build        ok (tsc --noEmit, 0 erros)
npm run lint         ok (0 problemas)
npm test             185 passed, 7 suites
npm run test:coverage  98,2% linhas / 94,5% ramos
```

Testes manuais: **não executados** — não há Rocket.Chat neste ambiente. Roteiro completo
em [manual-test-plan.md](manual-test-plan.md).

---

## Etapa 8 — Documentação ✅

README, PRIVACY, SECURITY, CHANGELOG, LICENSE, e em `docs/`: contrato da API,
instalação, submissão ao Marketplace, plano de testes manuais e este plano.

---

## Etapa 9 — Empacotamento ✅

Os dois pacotes são gerados.

**Obstáculo encontrado.** `rc-apps package` falhava com arquivos de teste na árvore. A
investigação no código do CLI mostrou que:

- `@rocket.chat/apps-compiler/compiler/getAppSource.js` varre o diretório inteiro e pega
  **todo** `.ts`, ignorando apenas `node_modules` e `.git`;
- `.rcappsconfig` não é consultado nessa fase — ele só afeta o ZIP do modo `--no-compile`;
- o compilador usa `compilerOptions` fixas com `types: ["node"]`, então globals do Jest
  não existem;
- o resolvedor de módulos do CLI não trata `.json` nem especificadores `node:`.

Três consequências:

1. `resolveJsonModule` foi desligado e as fixtures passaram a ser lidas com `fs`
   (`tests/loadFixture.ts`);
2. importar `@jest/globals` não resolve — puxa `node:vm`;
3. o empacotamento passou a ser feito a partir de uma cópia limpa do App, em
   `scripts/package.js`.

A saída é idêntica à de rodar o CLI na raiz de um projeto sem testes: mesmos arquivos,
mesmo compilador, mesmo ZIP.

---

## Decisões registradas

| # | Decisão | Alternativa descartada | Motivo |
|---|---|---|---|
| 1 | API compatível com Tenor v2 | API nativa `/api/v1/{app_key}/gifs/*` | Oficialmente suportada, `locale=pt_BR`, chave em query param (sanitizável), `media_filter` alinhado ao fallback, `/v2/posts` para seleção segura |
| 2 | Estratégia 1 (re-consulta por id) | Estratégia 2 (payload validado) | `ISlashCommandPreviewItem` não tem campo para payload |
| 3 | `requiredApiVersion ^1.46.0` | `^1.64.1` (versão mais recente) | 1.46 é o menor que contém tudo o que o App usa; cobre Rocket.Chat 6.13 → 8.x |
| 4 | Faixa 8–10 | 4–20 | Teto de 10 imposto pelo Apps-Engine |
| 5 | `SettingType.PASSWORD` | `STRING` | Mascaramento na administração |
| 6 | Preview silencioso em erro | Notificar a cada falha | O previewer roda a cada tecla |
| 7 | `executor` publica o primeiro resultado | Pedir que o usuário escolha | Confirmar com Enter é uma escolha ativa; a ordem é a relevância do KLIPY |
| 8 | Strings em `i18n/strings.ts`, JSON gerados | Escrever os JSON à mão | Fonte única; um teste falha se divergirem |
| 9 | Empacotar de cópia limpa | Mover `tests/` para fora do projeto | Preserva a estrutura pedida no handoff |
| 10 | Remetente das efêmeras é o próprio usuário | App user via `getAppUser()` | Evita pedir a permissão `user.read` |

## Suposições assumidas

Onde faltou informação, foi escolhida a alternativa segura e registrada aqui.

| # | Suposição | Base | Como confirmar |
|---|---|---|---|
| 1 | O contrato da API corresponde à documentação | Exemplos de resposta `200` publicados na doc oficial | `manual-test-plan.md` §3 |
| 2 | URL de suporte = issues do GitHub do projeto | Padrão dos demais repositórios do autor | Proprietário define a URL definitiva |
| 3 | Corpos de erro do KLIPY não seguem formato documentado | A doc não os publica | O cliente decide só pelo `statusCode`, que é o comportamento seguro |
| 4 | O campo `domains` de `networking` é declarativo | Nenhuma validação encontrada no runtime do Apps-Engine | Declarado assim mesmo, com a ressalva no README |
| 5 | `tinygif` (220 px) é melhor que `nanogif` (90 px) para o preview | 90 px fica ilegível na galeria | Verificar visualmente nos clientes (§8 do plano manual) |

## O que ficou fora do MVP

Paginação (`pos`/`next`), stickers/clips/memes/AI emoji, `POST /v2/register-share`
(recomendado pelo KLIPY para reporting e monetização — bom candidato para 0.2.0),
trending sem termo, autocomplete de sugestões e MP4 como alternativa ao GIF.
