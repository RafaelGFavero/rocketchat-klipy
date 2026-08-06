# E-mail ao KLIPY — confirmação da arquitetura

> ## ✅ Enviado e **aprovado** — ticket CSM-117, 05/08/2026
>
> Resposta da KLIPY Customer Support:
>
> > *"While you're building a free app that will also promote KLIPY, we can make an
> > exception for you, so all three points are fine as described. Feel free to proceed
> > with publishing."*
>
> Os três pontos — arquitetura server-side, atribuição e uso do nome "KLIPY" — foram
> aceitos como descritos.
>
> **Atenção ao termo "exception":** é uma dispensa condicionada a ser um App **gratuito**
> que **promove** o KLIPY. Ver
> [marketplace-submission.md](marketplace-submission.md#-a-aprovação-é-uma-exceção-condicionada)
> e a cláusula 2.1 dos [TERMS.md](../TERMS.md).
>
> O texto abaixo fica como registro do que foi perguntado.

Escrito em inglês porque é o idioma de atendimento do KLIPY (`developers@klipy.com`).

**Contexto:** a arquitetura já foi declarada no campo de descrição do cadastro da
plataforma no Partner Panel, em 04/08/2026, mas o campo tem limite de 500 caracteres e a
emissão da chave de teste não constitui aceite explícito. Este e-mail retoma o assunto e
pede confirmação por escrito, que é o que falta para submeter ao Marketplace com
segurança.

---

## Destinatário

`developers@klipy.com`
Cópia sugerida: `support@klipy.com`

## Assunto

```
Integration approval request — Rocket.Chat App (server-side calls from customer instances)
```

## Corpo

```
Hello KLIPY team,

I'm building a free, open-source integration that brings KLIPY GIFs into Rocket.Chat,
and I'd like written confirmation on one architectural point before publishing it.

WHAT IT IS

"KLIPY GIFs for Rocket.Chat" is a third-party Rocket.Chat App (MIT licensed) that adds
a /klipy slash command. The user types a term, sees a gallery of results, picks one, and
only the selected GIF is posted to the conversation. It will be published as a free app
on the official Rocket.Chat Marketplace.

Platform registered in the Partner Panel: "Rocket.Chat GIF Integration"
API key name: "RocketChat-Server" (currently in Testing)
Contact e-mail on the account: rafaelgfavero.rg@gmail.com

HOW IT USES YOUR API

- Tenor-compatible v2 layer: GET /v2/search for the gallery, GET /v2/posts to re-confirm
  the selected item before posting it.
- media_filter=nanogif,tinygif,mediumgif,gif on search.
- We keep your result order and composition — no reordering, filtering or re-ranking.
- Media URLs are used exactly as returned: no rewriting, caching, mirroring or re-hosting.
- Attribution: "Search KLIPY" as the search placeholder (your required item) and a
  "Powered by KLIPY" mark on every posted message, which cannot be turned off.
- Every workspace supplies its own API key. We do not ship one, and we never see them.

THE POINT I WANT TO CONFIRM

Your Integration Requirements state that API requests should originate from the end
user's app or browser, and should not be routed through partner-operated servers or
proxies.

A Rocket.Chat App runs inside each customer's own Rocket.Chat server, so the API call is
made server-side by that customer's own self-hosted instance, using that customer's own
API key. There is no proxy, CDN or server operated by me anywhere in the path — the only
"intermediary" is the customer's own infrastructure, calling on their own behalf. The
media itself is loaded directly from static.klipy.com by each end user's browser, desktop
or mobile client, exactly as your requirements describe.

Rocket.Chat's app platform gives no way for an app to issue the request from the user's
browser, so this is not a design choice I can change — it's how the platform works.

MY QUESTIONS

1. Does this server-side call pattern satisfy your Integration Requirements? If not, is
   there an approved arrangement for platforms of this kind?

2. Does the attribution described above meet your guidelines, or would you like anything
   added or changed?

3. Is there any restriction on using "KLIPY" in the published app name
   ("KLIPY GIFs for Rocket.Chat")? I ask because the Partner Panel rejects "KLIPY" in API
   key names, which suggests a brand policy I want to respect. The app ships no KLIPY
   logo or brand asset — the icon is original artwork — and the listing states clearly
   that this is an unofficial, third-party integration.

I'd rather adjust anything now than after publication. The full source, including the
privacy policy and the documented API contract, is open and I'm happy to share it.

Thank you,

Rafael Fávero
RF Tecnologia — https://rftecnologia.org
```

## Depois de enviar

- Anotar a data de envio aqui e em `docs/marketplace-submission.md` §4.
- Se houver resposta favorável, marcar o item 0.6 do checklist como ✅ e guardar o e-mail.
- Se a resposta exigir mudanças, avaliar o impacto antes de submeter — as três perguntas
  foram escolhidas justamente porque cada uma pode alterar código, texto da listagem ou o
  nome do App.
- Sem resposta em ~10 dias úteis, reenviar com cópia para `support@klipy.com`.
