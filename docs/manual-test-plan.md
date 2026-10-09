# Plano de testes manuais

Os 199 testes automatizados cobrem cliente HTTP, normalização, validação, montagem de
mensagem, settings, slash command e i18n — mas rodam contra fixtures. Nada aqui foi exercitado contra um servidor
Rocket.Chat real nem contra a API real do KLIPY.

Este roteiro é o que falta para isso. Execute-o **antes** de submeter ao Marketplace.

## Antes de começar

| Precisa de | Por quê |
|---|---|
| Instância Rocket.Chat de desenvolvimento | Nunca teste em produção. **Não precisa ser o servidor da sua empresa** — ver [installation.md](installation.md#não-tem-acesso-a-um-servidor-rocketchat) |
| API Key de teste do KLIPY | 100 req/h; cada `/klipy` com envio gasta 2 |
| Uma segunda conta de usuário | Para conferir que as mensagens efêmeras não vazam |
| Um usuário com idioma em inglês | Para testar i18n |

Registre o resultado na coluna **Status** de cada tabela: ✅ passou, ❌ falhou,
➖ não aplicável. Anote a versão exata do Rocket.Chat testada.

---

## 1. Instalação e matriz de compatibilidade

Este é o item mais importante do roteiro. A matriz do README está inteiramente marcada
como "não testado" — preencha-a com o que observar.

| # | Passo | Esperado | Status |
|---|---|---|---|
| 1.1 | Instalar o App (`npm run package` + upload, ou deploy pelo CLI) | Instala sem erro | |
| 1.2 | Conferir as permissões pedidas na tela de instalação | Exatamente três: networking, slashcommand, message.write | |
| 1.3 | Ver a versão do Apps-Engine em Administração → Apps | Anotar; comparar com a matriz do README | |
| 1.4 | Repetir em Rocket.Chat 7.x | Instala e funciona | |
| 1.5 | Repetir em Rocket.Chat 8.x | Instala e funciona | |
| 1.6 | Confirmar em qual runtime o App executa (Deno ou Node) | Anotar no README | |

> Se `requiredApiVersion` recusar a instalação em alguma versão suportada, ajuste o
> manifesto e regenere o pacote.

## 2. Configuração

| # | Passo | Esperado | Status |
|---|---|---|---|
| 2.1 | Abrir Settings do App antes de configurar | Seis settings, API Key vazia e obrigatória | |
| 2.2 | Verificar o campo da API Key | Mascarado (tipo password) | |
| 2.3 | Colar a chave e salvar | Salva sem erro | |
| 2.4 | Entrar como usuário comum e procurar os settings | Não consegue vê-los | |
| 2.5 | Conferir os rótulos em português | Traduzidos, sem chave crua tipo `klipy_setting_…` | |
| 2.6 | Trocar o idioma da conta para inglês e reabrir | Rótulos em inglês | |
| 2.7 | Abrir o select de filtro de conteúdo | Quatro opções: Desligado, Baixo, Médio, Alto | |

## 3. Contrato da API — confirmar contra a API real

**Este bloco valida a premissa central do projeto.** Todo o cliente HTTP foi escrito a
partir da documentação, sem nunca chamar a API.

> **Atalho: dá para fazer isto sem servidor nenhum.** O script `npm run verify:api`
> chama `/v2/search` e `/v2/posts` de verdade e confere campo a campo o que
> `docs/api-contract.md` promete. Ele lê a chave de `KLIPY_API_KEY` e nunca a imprime.
>
> ```bash
> KLIPY_API_KEY=sua-chave npm run verify:api
> ```
>
> No PowerShell: `$env:KLIPY_API_KEY = "sua-chave"; npm run verify:api`
>
> Rode isso **antes** de qualquer teste manual: se o contrato divergir, o App precisa
> mudar e não adianta testar o resto.

| # | Passo | Esperado | Status |
|---|---|---|---|
| 3.1 | Executar `/klipy hello` e olhar os logs do App | Status 200, operação `search`, duração registrada | |
| 3.2 | Conferir que o preview trouxe itens | Miniaturas aparecem | |
| 3.3 | Confirmar que a resposta tem `results[]` e `media_formats` | Se a estrutura diferir, `docs/api-contract.md` precisa ser corrigido | |
| 3.4 | Selecionar um item e olhar os logs | Segunda chamada, operação `lookup`, status 200 | |
| 3.5 | Conferir que a URL publicada aponta para `static*.klipy.com` | Sim | |
| 3.6 | Testar `locale=pt_BR` com termo em português | Resultados fazem sentido em português | |
| 3.7 | Alternar `contentfilter` entre `off` e `high` com termo limítrofe | Conjuntos de resultados diferentes | |

## 4. Fluxo principal

| # | Passo | Esperado | Status |
|---|---|---|---|
| 4.1 | `/klipy comemoração` | Galeria com 8 a 10 miniaturas | |
| 4.2 | Contar os itens | Igual ao setting, no máximo 10 | |
| 4.3 | Selecionar o **primeiro** | Publica exatamente aquele GIF | |
| 4.4 | Selecionar **outro** (não o primeiro) | Publica o escolhido, não o primeiro | |
| 4.5 | Conferir a mensagem publicada | Só o GIF, sem a consulta e sem os outros resultados | |
| 4.6 | Procurar a atribuição | "Powered by KLIPY" visível | |
| 4.7 | Clicar na atribuição | Abre klipy.com | |
| 4.8 | Confirmar sem escolher (só Enter) | Publica o primeiro resultado | |
| 4.9 | Verificar o remetente da mensagem | O usuário que executou o comando | |
| 4.10 | Rodar o comando dentro de uma thread | Publica na thread, não no canal | |

## 5. Ajuda e casos vazios

| # | Passo | Esperado | Status |
|---|---|---|---|
| 5.1 | `/klipy` sem argumento | Mensagem de uso com exemplo | |
| 5.2 | Confirmar com a segunda conta | **A outra pessoa não vê a mensagem de ajuda** | |
| 5.3 | `/klipy` só com espaços | Mesma mensagem de uso | |
| 5.4 | `/klipy zxqwvnrt` (termo improvável) | "Nenhum GIF foi encontrado para …", efêmera | |
| 5.5 | Termo com mais de 100 caracteres | Não estoura; consulta é cortada | |
| 5.6 | Termo com emoji e acentos | Funciona; sem caractere corrompido | |

## 6. Erros

| # | Cenário | Como provocar | Esperado | Status |
|---|---|---|---|---|
| 6.1 | Chave ausente | Limpar `klipy_api_key` | "O App KLIPY ainda não foi configurado…" | |
| 6.2 | Chave inválida | Colar `chave-invalida-123` | "Não foi possível autenticar…" — **sem revelar a chave** | |
| 6.3 | Rate limit | Estourar 100 req/h na chave de teste | "O limite temporário… foi atingido." | |
| 6.4 | Indisponibilidade | Bloquear `api.klipy.com` no firewall do servidor | "O serviço de GIFs está temporariamente indisponível." | |
| 6.5 | Timeout | Bloquear com DROP (não REJECT) e esperar 10 s | Mesma mensagem de indisponibilidade | |
| 6.6 | Resposta malformada | Apontar `api.klipy.com` para um servidor que devolve HTML | "O KLIPY retornou uma resposta inesperada." | |
| 6.7 | Preview sem chave | Limpar a chave e digitar `/klipy teste` | Galeria vazia, **sem notificação a cada tecla** | |
| 6.8 | Publicação recusada | Escolher um GIF numa sala só leitura, ou com o usuário silenciado | "Não foi possível publicar o GIF nesta sala." | |

## 7. Segurança

| # | Passo | Esperado | Status |
|---|---|---|---|
| 7.1 | Provocar erros 401, 429 e 5xx e ler os logs do App | Nenhum log contém a API Key | |
| 7.2 | Procurar `key=` nos logs | Aparece como `key=***` | |
| 7.3 | Procurar o termo pesquisado nos logs | Aparece como `q=***` | |
| 7.4 | Ler a mensagem de erro exibida | Sem detalhe técnico, sem status HTTP, sem URL | |
| 7.5 | Inspecionar o HTML da mensagem publicada | `imageUrl` aponta para `static*.klipy.com`, em HTTPS | |
| 7.6 | Conferir que não há mensagem duplicada | Uma mensagem por seleção | |

## 8. Clientes

Repetir o fluxo principal (§4) em cada cliente. A galeria de preview de slash command é
o ponto que mais varia entre eles — anote o que não funcionar.

| # | Cliente | Preview aparece | Seleção funciona | GIF anima | Status |
|---|---|---|---|---|---|
| 8.1 | Navegador desktop (Chrome) | | | | |
| 8.2 | Navegador desktop (Firefox) | | | | |
| 8.3 | Navegador mobile | | | | |
| 8.4 | App desktop (Windows/macOS/Linux) | | | | |
| 8.5 | App mobile (Android) | | | | |
| 8.6 | App mobile (iOS) | | | | |

Limitações encontradas por cliente devem ir para o README, na seção de troubleshooting.

## 9. Tipos de sala

| # | Sala | Esperado | Status |
|---|---|---|---|
| 9.1 | Canal público | Funciona | |
| 9.2 | Canal privado | Funciona | |
| 9.3 | Mensagem direta | Funciona | |
| 9.4 | Thread | Publica na thread | |
| 9.5 | Discussion | Funciona | |

## 10. Internacionalização

| # | Passo | Esperado | Status |
|---|---|---|---|
| 10.1 | Usuário com idioma português: `/klipy` sem termo | Ajuda em português | |
| 10.2 | Usuário com idioma inglês: `/klipy` sem termo | Ajuda em inglês | |
| 10.3 | Provocar erro de autenticação nos dois idiomas | Mensagem no idioma de cada um | |
| 10.4 | Verificar o placeholder ao digitar `/klipy` | **"Search KLIPY"** — exigência do KLIPY | |
| 10.5 | Verificar o título da galeria de preview | "Powered by KLIPY" | |
| 10.6 | Usuário com idioma não traduzido (ex.: alemão) | Cai para inglês, sem chave crua na tela | |
| 10.7 | Usuário sem idioma no perfil, com *Idioma da pesquisa* = `pt_BR`: `/klipy` sem termo | Ajuda em português; nenhum `PermissionDeniedError` no log do servidor | |

## 11. Settings em uso

| # | Passo | Esperado | Status |
|---|---|---|---|
| 11.1 | Definir quantidade de resultados = 8 | Galeria com 8 itens | |
| 11.2 | Definir 20 | Ajustado para 10; sem erro | |
| 11.3 | Definir 2 | Ajustado para 8; sem erro | |
| 11.4 | Desligar "Mostrar título do GIF" | Mensagem sem título; atribuição continua | |
| 11.5 | Desligar "Transformar a atribuição em link" | Texto "Powered by KLIPY" continua, sem link | |
| 11.6 | Colocar locale inválido (`portugues`) | Cai para `en_US`; busca continua funcionando | |
| 11.7 | Trocar o idioma para `pt_BR` | Resultados mudam de acordo | |

## 12. Atualização

| # | Passo | Esperado | Status |
|---|---|---|---|
| 12.1 | Incrementar a versão em `app.json`, empacotar e subir por cima | Atualiza sem erro | |
| 12.2 | Conferir a API Key após a atualização | **Preservada** — não precisa digitar de novo | |
| 12.3 | Conferir os demais settings | Preservados | |
| 12.4 | `/klipy comemoração` | Continua funcionando | |

## 13. Empacotamento

| # | Passo | Esperado | Status |
|---|---|---|---|
| 13.1 | `npm run verify` | Tudo verde | |
| 13.2 | `npm run package` | Gera `dist/klipy-gifs_<versão>.zip` | |
| 13.3 | `npm run package:source` | Gera `…_source.zip` | |
| 13.4 | Abrir o ZIP compilado | Sem `node_modules`, sem testes, sem docs, sem chave | |
| 13.5 | Abrir o ZIP de código-fonte | Contém os `.ts` do App e os JSON de i18n | |
| 13.6 | `git status` após empacotar | Limpo, sem `.package-build/` sobrando | |

---

## Registro de execução

| Campo | Valor |
|---|---|
| Data | |
| Versão do App | |
| Versão do Rocket.Chat | |
| Versão do Apps-Engine | |
| Runtime (Deno/Node) | |
| Executado por | |
| Itens ❌ | |
| Bloqueia submissão? | |
