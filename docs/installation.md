# Instalação

Três caminhos, do mais simples ao mais trabalhoso.

---

## Não tem acesso a um servidor Rocket.Chat?

Situação comum: o Rocket.Chat da empresa é administrado pela infraestrutura, e você não
tem credencial de administrador para subir um App de teste.

**Isso não bloqueia a publicação no Marketplace.** A dependência é o contrário do que
parece:

- para **submeter** o App, basta tê-lo testado em *algum* Rocket.Chat — qualquer um,
  inclusive um workspace descartável criado por você;
- depois de aprovado, o App aparece no Marketplace e a infraestrutura só precisa clicar
  em **Install**. Não há ZIP, não há App privado, não há plano pago envolvido —
  instalar do Marketplace funciona em Community.

Ou seja: publicar no Marketplace é o que **elimina** a dependência da infraestrutura.

### Onde testar sem depender de ninguém

| Opção | Custo | Precisa instalar algo? | Permite App privado |
|---|---|---|---|
| **Rocket.Chat Cloud, plano Starter** | Gratuito, sem prazo | Não | ✅ Sim |
| Rocket.Chat Cloud, trial de 30 dias | Gratuito por 30 dias | Não | ✅ Sim |
| Docker local | Gratuito | Docker Desktop (exige admin) | ✅ Sim (self-hosted) |

**Recomendado: plano Starter no Rocket.Chat Cloud.** A partir da versão 7.0, subir App
privado passou a ser recurso premium — e o Starter é um plano premium gratuito e
permanente, para uso em escala limitada. É exatamente o caso de um workspace de teste.

1. Crie a conta em <https://cloud.rocket.chat/register> (a mesma que o Publisher Portal
   vai exigir depois, então não é trabalho jogado fora).
2. Crie um workspace no plano Starter.
3. Siga o caminho 2 abaixo, subindo `dist/klipy-gifs_0.1.1.zip`.
4. Rode [manual-test-plan.md](manual-test-plan.md).

> Anote a versão do Rocket.Chat e do Apps-Engine do workspace criado — é o que preenche
> a matriz de compatibilidade do README, hoje toda marcada como não testada.

---

## 1. Pelo Marketplace (recomendado)

> O App ainda não foi publicado. Esta seção descreve o fluxo previsto.

1. Entre como administrador.
2. **Administração → Marketplace**.
3. Procure **KLIPY GIFs**.
4. **Install** e confirme as permissões (`networking`, `slashcommand`, `message.write`).
5. Abra **Settings** do App e cole a API Key do KLIPY.
6. Teste com `/klipy comemoração`.

Funciona em Rocket.Chat Community — instalar App do Marketplace não exige plano pago.

---

## 2. Subindo o ZIP manualmente

> ⚠️ **A partir do Rocket.Chat 7.0, subir App privado é recurso de plano pago.** Em um
> servidor Community 7.x ou 8.x, o botão de upload aparece mas a instalação é recusada.
> Este caminho serve para Rocket.Chat 6.x, para instâncias com licença de desenvolvimento
> ou para workspaces com plano que permita Apps privados.

Gere o pacote:

```bash
npm ci
npm run package
```

Sai em `dist/klipy-gifs_0.1.1.zip`.

Depois:

1. **Administração → Apps → Upload App**.
2. Selecione o ZIP.
3. Confirme as permissões.
4. Configure a API Key.

---

## 3. Deploy pelo CLI, em desenvolvimento

Use uma instância dedicada de desenvolvimento — **nunca** produção.

### Preparar o ambiente

```bash
npm ci
npm run verify
```

`verify` roda geração de i18n, type-check, lint e testes. Se algo falhar aqui, não
adianta seguir.

### Subir um Rocket.Chat local

Qualquer instância serve. Com Docker:

```bash
docker run --name rocketchat -p 3000:3000 --link mongo --env ROOT_URL=http://localhost:3000 --env MONGO_URL=mongodb://mongo:27017/rocketchat -d rocket.chat
```

Consulte a [documentação oficial de deploy](https://docs.rocket.chat/docs/deploy-rocketchat)
para uma configuração completa com MongoDB.

### Fazer o deploy

```bash
npx rc-apps deploy --url http://localhost:3000 -u admin -p SUA_SENHA
```

Ou com token de acesso pessoal, que evita ter a senha na linha de comando:

```bash
npx rc-apps deploy --url http://localhost:3000 -i SEU_USER_ID -t SEU_TOKEN
```

**Não coloque credenciais em arquivo versionado.** O `.rcappsconfig` deste repositório
contém apenas a lista de arquivos ignorados no empacotamento. Se quiser um arquivo local
com credenciais, use `.rcappsconfig.local`, que está no `.gitignore`.

### Desenvolvimento com recarga automática

```bash
npx rc-apps watch --url http://localhost:3000 -u admin -p SUA_SENHA
```

---

## Configurar a API Key

1. [Partner Panel do KLIPY](https://partner.klipy.com/api-keys) → **API Keys** →
   **Add Platform**.
2. Copie a chave.
3. No Rocket.Chat: **Administração → Apps → KLIPY GIFs → Settings**.
4. Cole em **API Key do KLIPY** e salve.

A chave começa em modo de teste: **100 requisições por hora**. Cada `/klipy` com envio
consome 2. Peça acesso de produção pelo Partner Panel quando terminar de testar.

---

## Verificar se funcionou

Em qualquer sala:

```
/klipy comemoração
```

Esperado: uma galeria de miniaturas aparece. Ao escolher uma, o GIF é publicado com a
atribuição "Powered by KLIPY".

Se a galeria não aparecer, confirme o comando com Enter — o App responde com a mensagem
de erro específica, que fica visível só para você. O preview fica em silêncio de
propósito, para não notificar a cada tecla digitada.

---

## Rede

| Domínio | Precisa ser alcançável por | Porta |
|---|---|---|
| `api.klipy.com` | **servidor** Rocket.Chat | 443 |
| `static.klipy.com` | **clientes** (navegador, desktop, mobile) | 443 |
| `static1.klipy.com` | clientes | 443 |
| `static2.klipy.com` | clientes | 443 |
| `klipy.com` | clientes (link de atribuição) | 443 |

Um erro comum: liberar só no servidor. A galeria e a mensagem carregam a mídia a partir
do dispositivo de cada pessoa, então os domínios `static*` precisam estar liberados
para elas também.

---

## Atualizar o App

Instalado pelo Marketplace, a atualização é oferecida na própria tela do App.

Instalado por ZIP, gere um pacote novo com a versão incrementada em `app.json` e suba
por cima. **Os settings são preservados na atualização** — a API Key não precisa ser
digitada de novo. Isso está no roteiro de testes manuais (§20).

---

## Desinstalar

**Administração → Apps → KLIPY GIFs → Uninstall.** Remove o App e os settings, incluindo
a API Key. Mensagens já publicadas permanecem nas salas.

Para invalidar a chave de vez, revogue-a no Partner Panel do KLIPY.
