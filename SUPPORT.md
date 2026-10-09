# Suporte

**KLIPY GIFs for Rocket.Chat**

Antes de abrir um chamado, vale conferir: boa parte dos problemas relatados tem causa
conhecida e solução em um minuto.

---

## Resolva sozinho primeiro

| O que você vê | Causa | O que fazer |
|---|---|---|
| "O App KLIPY ainda não foi configurado." | API Key vazia | Preencha a chave em Administração → Apps → KLIPY GIFs → Configurações |
| "Não foi possível autenticar na API do KLIPY." | Chave inválida ou com espaços | Gere outra no [Partner Panel](https://partner.klipy.com/api-keys) e cole de novo |
| "O limite temporário de consultas foi atingido." | Chave de teste: 100 req/h | Aguarde a virada da hora ou peça produção no Partner Panel |
| "O serviço de GIFs está temporariamente indisponível." | O servidor não alcança `api.klipy.com` | Libere o domínio na saída do servidor (HTTPS/443) |
| "O KLIPY retornou uma resposta inesperada." | Proxy devolvendo HTML no lugar da API | Verifique se algo intercepta o tráfego HTTPS do servidor |
| "Não foi possível publicar o GIF nesta sala." | O Rocket.Chat recusou a mensagem: sala só leitura, usuário silenciado ou sala com criptografia ponta a ponta | Publique onde o usuário pode escrever |
| A galeria não aparece ao digitar | Chave ausente/errada, ou falha na API | Pressione Enter: o App responde com o erro específico, visível só para você |
| A galeria aparece, mas o GIF não carrega | Clientes sem acesso à mídia | Libere `static.klipy.com`, `static1.klipy.com` e `static2.klipy.com` **para os usuários**, não só para o servidor |
| Mensagens do App em inglês | O usuário não escolheu idioma no perfil, e o *Idioma da pesquisa* do App está no padrão `en_US` | Defina *Idioma da pesquisa* como `pt_BR` nas configurações do App |

O guia completo está no [README](README.md#troubleshooting).

## Onde estão os logs

**Administração → Apps → KLIPY GIFs → Registros.**

Eles trazem operação, status HTTP, categoria do erro e duração. Por decisão de projeto,
**não** registram a API Key nem o termo pesquisado — então pode anexá-los ao chamado.

## Abrir um chamado

Use as **issues do repositório**:

<https://github.com/RafaelGFavero/rocketchat-klipy/issues>

Inclua:

1. versão do App e versão do Rocket.Chat;
2. o que você fez, o que esperava e o que aconteceu;
3. a mensagem de erro exata que apareceu;
4. as linhas relevantes dos Registros do App.

### ⚠️ Nunca inclua sua API Key

Não cole a chave em issues, prints ou logs de proxy — nem parcialmente, nem "de teste".
O App sanitiza os próprios logs, mas logs de firewall e de navegador podem não sanitizar.

Se uma chave vazar: revogue imediatamente no Partner Panel e gere outra. Detalhes em
[SECURITY.md](SECURITY.md).

## Vulnerabilidades de segurança

**Não** abra issue pública. Use o canal privado descrito em [SECURITY.md](SECURITY.md).

## Prazo

Este é um projeto gratuito e de código aberto, mantido em tempo parcial. O atendimento é
por melhor esforço, **sem prazo garantido**. Na prática, procuramos responder em alguns
dias úteis.

Se um chamado ficar parado, comentar nele é bem-vindo.

## O que está fora do nosso escopo

| Assunto | Onde tratar |
|---|---|
| Conteúdo dos GIFs, moderação, catálogo | support@klipy.com e o Partner Panel do KLIPY |
| Limites, preços e aprovação da sua chave | [Partner Panel do KLIPY](https://partner.klipy.com) |
| Disponibilidade da API do KLIPY | KLIPY |
| Rocket.Chat em si, instalação do servidor, planos | [docs.rocket.chat](https://docs.rocket.chat) |
| Rede, proxy e firewall do seu ambiente | Sua equipe de infraestrutura |

Ajudamos com o que é do App: instalação, configuração, comportamento do comando e erros
que ele produz.

## Contato

RF Tecnologia — <https://rftecnologia.org>
