# Segurança

## Versões suportadas

| Versão do App | Suporte |
|---|---|
| 0.1.x | ✅ Recebe correções de segurança |
| < 0.1 | ❌ Não existiu publicamente |

Enquanto o App estiver em `0.x`, apenas a série mais recente recebe correções. Atualize
antes de reportar um problema, se possível.

## Como reportar uma vulnerabilidade

Abra um **security advisory privado** em
<https://github.com/RafaelGFavero/rocketchat-klipy/security/advisories/new>.

Se não conseguir usar esse canal, abra uma issue **sem detalhes técnicos** pedindo um
contato privado — descreva apenas que encontrou um problema de segurança.

Inclua no relato:

- versão do App e versão do Rocket.Chat;
- passos para reproduzir;
- impacto observado.

Prazo esperado: confirmação de recebimento em até 5 dias úteis e um posicionamento sobre
correção em até 30 dias. Este é um projeto mantido em tempo parcial — se o prazo passar,
pode cobrar na issue.

## ⚠️ Nunca publique uma API Key

Não cole a API Key do KLIPY em issue, pull request, log, screenshot ou mensagem de chat.
Isso vale inclusive para chaves de teste.

Ao anexar logs, confira se a URL não contém `key=`. O App já sanitiza os próprios logs,
mas logs de proxy, firewall ou navegador podem não sanitizar.

### Se uma chave vazar

1. Entre no [Partner Panel do KLIPY](https://partner.klipy.com/api-keys).
2. Revogue ou regenere a chave da plataforma afetada.
3. Atualize o setting `klipy_api_key` no Rocket.Chat com a chave nova.
4. Se a chave apareceu em um commit, **revogar é obrigatório** — reescrever o histórico
   não basta, porque o valor já pode ter sido copiado.

## Modelo de segurança do App

O que o App faz para reduzir superfície de ataque:

**Segredos**

- A chave vive apenas no setting privado do workspace, tipo `PASSWORD`.
- Toda URL logada passa por `sanitizeUrlForLog()`, que redige `key`, `q` e `ids`.
- Mensagens de exceção de rede são descartadas antes do log, porque repetem a URL.
- Mensagens de erro exibidas ao usuário são textos fixos, sem detalhe técnico.

**URLs vindas da API**

- Toda URL de mídia, e o link do título, passa por `isSafeHttpsUrl()`: só HTTPS, host
  `klipy.com` ou subdomínio dele, e até 2048 caracteres. `http:`, `javascript:`, `data:`,
  `file:` e qualquer outro host são rejeitados, assim como URL com barra invertida,
  espaço ou caractere de controle, porque o parser de alguns clientes lê nelas outro host.
- Um formato com URL insegura é pulado, e o App usa o próximo formato disponível.
- Itens sem nenhuma mídia utilizável são descartados em vez de publicados pela metade.

**Dados vindos do cliente**

- O item devolvido pelo cliente ao selecionar um preview **não é confiável**. Dele o App
  usa apenas o `id`, e a URL publicada vem de uma consulta nova ao KLIPY
  (`GET /v2/posts?ids=…`). Um `value` adulterado no caminho de volta não vira `imageUrl`.
- Nenhum campo de anexo é copiado do payload do cliente. O anexo é montado do zero, com
  campos que o App controla.
- O `id` é submetido a `encodeURIComponent` antes de entrar na query string.

**Entrada do usuário**

- A consulta é limitada a 100 caracteres e passa por `encodeURIComponent`.
- Valores de setting são normalizados antes do uso: locale por regex, filtro de conteúdo
  por lista fechada, limite por faixa numérica. Um administrador não consegue injetar
  parâmetro arbitrário na URL da API.

**Permissões**

- O manifesto declara três permissões: `networking`, `slashcommand` e `message.write`.
- `persistence`, `api`, `scheduler`, `user.read`, `user.write`, `message.read`,
  `room.write`, `upload.*` e `ui.*` são deliberadamente **não** pedidas. A justificativa
  de cada uma está no [README](README.md#permissões).

**Rede**

- Um único host de destino: `api.klipy.com`, declarado no escopo da permissão
  `networking`.
- Timeout de 10 segundos em toda requisição.
- O App não abre porta, não expõe endpoint HTTP e não aceita webhook.

## Dependências

Todas as dependências são de **desenvolvimento**. O pacote instalado no Rocket.Chat não
carrega dependência de terceiros: o `@rocket.chat/apps-engine` é fornecido pelo próprio
servidor em tempo de execução.

Na prática, uma vulnerabilidade em dependência afeta quem desenvolve o App, não quem o
instala.

Para verificar:

```bash
npm audit
```

Vulnerabilidades em dependências de desenvolvimento são corrigidas em versão de patch.
Se uma correção exigir mudança incompatível, isso é anunciado no
[CHANGELOG](CHANGELOG.md).

## Credenciais de deploy

O arquivo `.rcappsconfig` é versionado e contém **apenas** a lista de arquivos ignorados
no empacotamento. Credenciais de deploy nunca entram nele.

Para fazer deploy, passe as credenciais por flag:

```bash
npx rc-apps deploy --url http://localhost:3000 -u admin -p SUA_SENHA
```

Se precisar de um arquivo local com credenciais, use `.rcappsconfig.local`, que está no
`.gitignore`.
