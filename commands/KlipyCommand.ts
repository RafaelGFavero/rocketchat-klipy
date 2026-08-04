import type { IHttp, ILogger, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import type {
    ISlashCommand,
    ISlashCommandPreview,
    ISlashCommandPreviewItem,
} from '@rocket.chat/apps-engine/definition/slashcommands';
import { SlashCommandContext, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';

import { SupportedLanguage, StringKey, resolveLanguage, translate } from '../i18n/strings';
import { readKlipySettings } from '../settings/registerSettings';
import { KlipyClient } from '../services/KlipyClient';
import { KlipyError, KlipyErrorKind, KlipyGif } from '../types/klipy';
import { buildGifAttachment } from '../utils/messages';
import { normalizeQuery } from '../utils/validation';

/** Mensagem localizada correspondente a cada categoria de falha. */
const ERROR_STRING_BY_KIND: Record<KlipyErrorKind, StringKey> = {
    [KlipyErrorKind.NOT_CONFIGURED]: 'klipy_error_not_configured',
    [KlipyErrorKind.AUTH]: 'klipy_error_auth',
    [KlipyErrorKind.RATE_LIMIT]: 'klipy_error_rate_limit',
    [KlipyErrorKind.UNAVAILABLE]: 'klipy_error_unavailable',
    [KlipyErrorKind.MALFORMED]: 'klipy_error_malformed',
};

export class KlipyCommand implements ISlashCommand {
    public command = 'klipy';

    /**
     * Placeholder do campo de busca. O KLIPY exige literalmente "Search KLIPY" — no
     * Rocket.Chat, este campo é o placeholder mostrado ao lado do comando.
     */
    public i18nParamsExample = 'klipy_command_params_example';

    public i18nDescription = 'klipy_command_description';

    public providesPreview = true;

    constructor(private readonly logger?: ILogger) {}

    /**
     * Roda quando o usuário confirma o comando sem escolher um item do preview.
     *
     * Sem termo, explica o uso. Com termo, publica o primeiro resultado — que é o
     * mais relevante segundo o ranking do KLIPY, cuja ordem preservamos.
     */
    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        _persis: IPersistence,
    ): Promise<void> {
        const language = await this.languageOf(context, read);
        const query = normalizeQuery(context.getArguments());

        if (!query) {
            await this.notify(modify, context, translate('klipy_usage', language));
            return;
        }

        const settings = await readKlipySettings(read);

        if (!settings.apiKey) {
            await this.notify(modify, context, translate('klipy_error_not_configured', language));
            return;
        }

        try {
            const { items } = await new KlipyClient(http, this.logger).search({
                query,
                apiKey: settings.apiKey,
                locale: settings.locale,
                contentFilter: settings.contentFilter,
                limit: settings.resultLimit,
            });

            if (!items.length) {
                await this.notify(
                    modify,
                    context,
                    translate('klipy_error_no_results', language, { query }),
                );
                return;
            }

            await this.sendGif(context, modify, items[0], settings.showTitle, settings.showAttributionLink, language);
        } catch (error) {
            await this.notifyFailure(modify, context, language, error);
        }
    }

    /**
     * Alimenta a galeria de resultados enquanto o usuário digita.
     *
     * Em qualquer falha devolve lista vazia em vez de notificar: o previewer é
     * chamado a cada tecla, e transformar isso em notificação viraria spam. O erro
     * de verdade é reportado no `executor`, quando o usuário confirma.
     */
    public async previewer(
        context: SlashCommandContext,
        read: IRead,
        _modify: IModify,
        http: IHttp,
        _persis: IPersistence,
    ): Promise<ISlashCommandPreview> {
        const empty: ISlashCommandPreview = { i18nTitle: 'klipy_preview_title', items: [] };
        const query = normalizeQuery(context.getArguments());

        if (!query) {
            return empty;
        }

        const settings = await readKlipySettings(read);

        if (!settings.apiKey) {
            return empty;
        }

        try {
            const { items } = await new KlipyClient(http, this.logger).search({
                query,
                apiKey: settings.apiKey,
                locale: settings.locale,
                contentFilter: settings.contentFilter,
                limit: settings.resultLimit,
            });

            return {
                i18nTitle: 'klipy_preview_title',
                items: items.map((gif) => ({
                    id: gif.id,
                    type: SlashCommandPreviewItemType.IMAGE,
                    // `value` existe só para o cliente renderizar a miniatura. Ele não é
                    // usado na publicação — ver executePreviewItem.
                    value: gif.previewUrl,
                })),
            };
        } catch {
            return empty;
        }
    }

    /**
     * Publica o GIF escolhido.
     *
     * O `item` chega do cliente e não é confiável: dele aproveitamos apenas o `id`,
     * e a URL publicada vem de uma consulta nova ao KLIPY. Um `value` adulterado no
     * caminho de volta não tem como virar `imageUrl`.
     */
    public async executePreviewItem(
        item: ISlashCommandPreviewItem,
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        _persis: IPersistence,
    ): Promise<void> {
        const language = await this.languageOf(context, read);
        const settings = await readKlipySettings(read);

        if (!settings.apiKey) {
            await this.notify(modify, context, translate('klipy_error_not_configured', language));
            return;
        }

        const id = typeof item?.id === 'string' ? item.id.trim() : '';

        if (!id) {
            await this.notify(modify, context, translate('klipy_error_unavailable', language));
            return;
        }

        const client = new KlipyClient(http, this.logger);

        try {
            const gif = await this.resolveSelectedGif(client, context, settings.apiKey, id, settings);

            if (!gif) {
                await this.notify(modify, context, translate('klipy_error_unavailable', language));
                return;
            }

            await this.sendGif(context, modify, gif, settings.showTitle, settings.showAttributionLink, language);
        } catch (error) {
            await this.notifyFailure(modify, context, language, error);
        }
    }

    /**
     * Estratégia 1 do handoff: re-consulta por id em `/v2/posts`.
     *
     * Se esse endpoint não devolver o item, refaz a busca original — os argumentos do
     * comando continuam disponíveis aqui — e localiza pelo mesmo id. Em ambos os
     * caminhos a URL vem de uma resposta do KLIPY, nunca do cliente.
     */
    private async resolveSelectedGif(
        client: KlipyClient,
        context: SlashCommandContext,
        apiKey: string,
        id: string,
        settings: { locale: string; contentFilter: string; resultLimit: number },
    ): Promise<KlipyGif | undefined> {
        const direct = await client.getById({ id, apiKey });

        if (direct) {
            return direct;
        }

        const query = normalizeQuery(context.getArguments());

        if (!query) {
            return undefined;
        }

        const { items } = await client.search({
            query,
            apiKey,
            locale: settings.locale,
            contentFilter: settings.contentFilter,
            limit: settings.resultLimit,
        });

        return items.find((candidate) => candidate.id === id);
    }

    private async sendGif(
        context: SlashCommandContext,
        modify: IModify,
        gif: KlipyGif,
        showTitle: boolean,
        showAttributionLink: boolean,
        language: SupportedLanguage,
    ): Promise<void> {
        const builder = modify
            .getCreator()
            .startMessage()
            .setRoom(context.getRoom())
            .setSender(context.getSender())
            .addAttachment(buildGifAttachment({ gif, language, showTitle, showAttributionLink }));

        const threadId = context.getThreadId();

        if (threadId) {
            builder.setThreadId(threadId);
        }

        await modify.getCreator().finish(builder);
    }

    /** Mensagem efêmera: só quem executou o comando vê, e nada vai para a sala. */
    private async notify(
        modify: IModify,
        context: SlashCommandContext,
        text: string,
    ): Promise<void> {
        const builder = modify
            .getNotifier()
            .getMessageBuilder()
            .setRoom(context.getRoom())
            .setSender(context.getSender())
            .setText(text);

        const threadId = context.getThreadId();

        if (threadId) {
            builder.setThreadId(threadId);
        }

        await modify.getNotifier().notifyUser(context.getSender(), builder.getMessage());
    }

    /** Traduz a categoria do erro. Detalhe técnico fica no log, não na tela. */
    private async notifyFailure(
        modify: IModify,
        context: SlashCommandContext,
        language: SupportedLanguage,
        error: unknown,
    ): Promise<void> {
        const kind = error instanceof KlipyError ? error.kind : KlipyErrorKind.UNAVAILABLE;

        await this.notify(modify, context, translate(ERROR_STRING_BY_KIND[kind], language));
    }

    /**
     * Descobre em que idioma falar com quem executou o comando.
     *
     * `settings.preferences.language` só existe para quem escolheu um idioma
     * explicitamente no perfil. Quem nunca mexeu nisso — a maioria — tem o campo
     * vazio, embora veja a interface traduzida: o cliente usa o idioma do navegador,
     * que o servidor não enxerga. Sem o fallback abaixo, esses usuários recebiam
     * ajuda e erros em inglês dentro de um Rocket.Chat em português.
     *
     * O idioma padrão do workspace é a melhor aproximação disponível no servidor.
     */
    private async languageOf(
        context: SlashCommandContext,
        read: IRead,
    ): Promise<SupportedLanguage> {
        const preference = context.getSender()?.settings?.preferences?.language;

        if (preference) {
            return resolveLanguage(preference);
        }

        try {
            const workspaceLanguage = await read
                .getEnvironmentReader()
                .getServerSettings()
                .getValueById('Language');

            return resolveLanguage(typeof workspaceLanguage === 'string' ? workspaceLanguage : undefined);
        } catch {
            // O acessor pode não expor essa configuração em toda versão. Cair no
            // idioma padrão é melhor do que derrubar o comando.
            return resolveLanguage(undefined);
        }
    }
}
