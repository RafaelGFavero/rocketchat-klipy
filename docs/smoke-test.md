# Smoke test — 15 minutos

> ## ✅ Executado em 04/08/2026 — Rocket.Chat 6.13.0
>
> Ambiente: Docker + WSL2 (Ubuntu 26.04), MongoDB 6.0 em replica set, App instalado
> via API REST, chave de teste do KLIPY.
>
> | # | Passo | Resultado |
> |---|---|---|
> | 1 | Instalação | ✅ `success: true`, `status: auto_enabled` |
> | 2 | Permissões | ✅ exatamente três: networking (`api.klipy.com`), slashcommand, message.write |
> | 3 | Rótulos traduzidos | ✅ *"Pesquise e compartilhe GIFs do KLIPY. Exemplo: /klipy comemoração"* |
> | 4 | API Key mascarada | ✅ `type=password`, `required=true`, `public=false` |
> | 5 | Salvar a chave | ✅ gravada e lida pelo App |
> | 6 | **Galeria de preview** | ✅ **renderizou** — o risco de arquitetura foi eliminado |
> | 7 | Atribuição | ✅ "Powered by KLIPY" na mensagem, com link |
> | 8 | Selecionar item ≠ primeiro | ✅ publicou o **terceiro**, que foi o clicado |
> | 9 | Mensagem publicada | ✅ GIF + título + atribuição; **sem** a consulta e sem payload técnico |
> | 10 | Ajuda efêmera | ✅ "Apenas você pode ver esta mensagem" |
> | 12.2 | Chave preservada na atualização | ✅ 64 chars após o update |
>
> **Um bug encontrado e corrigido:** as mensagens do App saíam em inglês numa interface
> em português. Detalhes em [CHANGELOG.md](../CHANGELOG.md) e na seção *Idioma das
> mensagens* do [README](../README.md#idioma-das-mensagens).
> Em 09/10/2026 a revisão de código mostrou que essa correção não funcionava fora do mock
> (faltava `server-setting.read`). Refeita na 0.1.1 sem permissão nova — ver CHANGELOG.
>
> **Screenshots:** as cinco da submissão foram capturadas na mesma sessão e estão em
> `docs/screenshots/`.
>
> **Ainda não coberto:** os demais clientes (§8 abaixo), tipos de sala além de canal
> público (§9), e os cenários de erro 401/429/5xx (§6) — estes últimos exigem provocar
> falhas na API. Nada disso bloqueia a submissão.

O mínimo indispensável antes de submeter ao Marketplace.

Não confunda com [manual-test-plan.md](manual-test-plan.md), que tem 13 seções e serve
para um release maduro. Aqui estão só os 10 passos que cobrem os riscos que nenhum teste
automatizado alcança — e que, se falharem, reprovam a submissão.

**Pré-requisitos:** um workspace Rocket.Chat onde você seja admin (plano Starter do
Rocket.Chat Cloud é gratuito e serve — ver [installation.md](installation.md#não-tem-acesso-a-um-servidor-rocketchat))
e a API Key do KLIPY.

---

## Os 10 passos

| # | Passo | O que precisa acontecer | Se falhar |
|---|---|---|---|
| 1 | `npm run package` e subir `dist/klipy-gifs_0.1.1.zip` em Administração → Apps → Upload App | Instala sem erro | `requiredApiVersion` está errado — anote a versão do Apps-Engine do workspace e ajuste |
| 2 | Ler a tela de permissões da instalação | Aparecem **três**: networking, slashcommand, message.write | Manifesto divergente |
| 3 | Abrir Settings do App | Seis campos, com **rótulos traduzidos** | Se aparecer `klipy_setting_api_key_label` cru, o formato do i18n está errado |
| 4 | Olhar o campo da API Key | **Mascarado** (bolinhas) | `SettingType.PASSWORD` não se comporta como esperado |
| 5 | Colar a chave e salvar | Salva sem erro | — |
| 6 | Digitar `/klipy comemoração` em um canal | **A galeria de miniaturas aparece** | ⚠️ **Este é o passo crítico.** Ver abaixo |
| 7 | Olhar o topo da galeria | Diz "Powered by KLIPY" | Chave i18n do preview não resolveu |
| 8 | Clicar em uma miniatura que **não** seja a primeira | O GIF publicado é **o que você clicou** | A seleção está pegando o item errado |
| 9 | Olhar a mensagem publicada | GIF animado + atribuição visível; a consulta **não** aparece | — |
| 10 | `/klipy` sozinho, sem termo | Mensagem de ajuda que **só você vê** | Se todos virem, a mensagem não é efêmera |

---

## O passo 6 é o que importa

Se a galeria não aparecer, é o único cenário que exige mudança de arquitetura, não ajuste
fino. Antes de concluir que quebrou, confirme:

1. **Pressione Enter** para confirmar o comando. Se vier uma mensagem de erro específica
   ("não foi configurado", "não foi possível autenticar", "indisponível"), o problema é
   configuração ou rede — não o preview. O previewer fica em silêncio de propósito, para
   não notificar a cada tecla digitada.
2. Se o Enter **publicar um GIF** e mesmo assim a galeria não tiver aparecido enquanto
   você digitava, aí sim o preview não está sendo renderizado por este cliente.
3. Teste em outro cliente (navegador vs app desktop) antes de concluir.

Se o preview realmente não funcionar, o plano B é trocar a galeria por
[UIKit blocks](https://developer.rocket.chat/docs/ui-kit) com botões — o que exigiria a
permissão `ui.interact` e uma reescrita do `KlipyCommand`. Descobrir isso **antes** de
submeter economiza um ciclo inteiro de revisão.

---

## Enquanto estiver com o App aberto

Aproveite a mesma sessão para produzir as cinco screenshots da submissão
(1200 × 600, em `docs/screenshots/`) — sem elas não dá para preencher o Publisher Portal:

| # | Arquivo | Captura |
|---|---|---|
| 1 | `01-settings.png` | Tela de Settings, **com a chave mascarada** — confira antes de exportar |
| 2 | `02-typing.png` | `/klipy comemoração` sendo digitado, mostrando o placeholder "Search KLIPY" |
| 3 | `03-preview.png` | A galeria (passo 6) |
| 4 | `04-posted.png` | O GIF publicado com a atribuição (passo 9) |
| 5 | `05-i18n.png` | A mesma tela em português e inglês, lado a lado |

E anote, para preencher a matriz do README:

- versão do Rocket.Chat: ______
- versão do Apps-Engine (Administração → Apps): ______

---

## Depois

Tudo verde nos 10 passos → siga para
[marketplace-submission.md](marketplace-submission.md).

Algo vermelho → registre aqui o que aconteceu e corrija antes de submeter. O ciclo de
revisão do Marketplace é lento demais para servir de ambiente de teste.
