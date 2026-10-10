import type { IHttp, IHttpResponse, ILogger, IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { IMessage, IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import type { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import type { IUser } from '@rocket.chat/apps-engine/definition/users';
import { RequestMethod } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';

import { KlipyCommand } from '../commands/KlipyCommand';
import { KlipySettingId } from '../settings/ids';
import { STRINGS } from '../i18n/strings';
import { loadFixture } from './loadFixture';

const searchSuccess = loadFixture('search-success');
const searchEmpty = loadFixture('search-empty');
const postsSuccess = loadFixture('posts-success');

const API_KEY = 'kl_test_SEGREDO_do_workspace';

const room = { id: 'room-1', slugifiedName: 'geral' } as unknown as IRoom;

function makeUser(language?: string): IUser {
    return {
        id: 'user-1',
        username: 'rafael',
        settings: language ? { preferences: { language } } : undefined,
    } as unknown as IUser;
}

function makeContext(args: Array<string>, language = 'pt-BR', threadId?: string): SlashCommandContext {
    return new SlashCommandContext(makeUser(language), room, args, threadId);
}

function makeRead(overrides: Record<string, unknown> = {}): IRead {
    const values: Record<string, unknown> = {
        [KlipySettingId.ApiKey]: API_KEY,
        [KlipySettingId.Locale]: 'pt_BR',
        [KlipySettingId.ContentFilter]: 'medium',
        [KlipySettingId.ResultLimit]: 10,
        [KlipySettingId.ShowTitle]: true,
        [KlipySettingId.ShowAttributionLink]: true,
        ...overrides,
    };

    return {
        getEnvironmentReader: () => ({
            getSettings: () => ({ getValueById: async (id: string) => values[id] }),
        }),
    } as unknown as IRead;
}

/** Builder mínimo que registra o que foi montado, para o teste inspecionar. */
function makeBuilder() {
    const state: {
        room?: IRoom;
        sender?: IUser;
        text?: string;
        threadId?: string;
        attachments: Array<IMessageAttachment>;
    } = { attachments: [] };

    const builder: any = {
        setRoom: (value: IRoom) => ((state.room = value), builder),
        setSender: (value: IUser) => ((state.sender = value), builder),
        setText: (value: string) => ((state.text = value), builder),
        setThreadId: (value: string) => ((state.threadId = value), builder),
        addAttachment: (value: IMessageAttachment) => (state.attachments.push(value), builder),
        getMessage: () => state as unknown as IMessage,
        state,
    };

    return builder;
}

function makeModify(options: { failFinish?: boolean } = {}) {
    const posted: Array<any> = [];
    const notified: Array<{ user: IUser; message: any }> = [];
    const builders: Array<any> = [];

    const nextBuilder = () => {
        const builder = makeBuilder();

        builders.push(builder);

        return builder;
    };

    const modify = {
        getCreator: () => ({
            startMessage: nextBuilder,
            finish: async (builder: any) => {
                if (options.failFinish) {
                    throw new Error('error-not-allowed');
                }

                posted.push(builder.state);

                return 'message-id';
            },
        }),
        getNotifier: () => ({
            getMessageBuilder: nextBuilder,
            notifyUser: async (user: IUser, message: any) => {
                notified.push({ user, message });
            },
        }),
    } as unknown as IModify;

    return { modify, posted, notified, builders };
}

function respondWith(statusCode: number, data?: unknown): IHttpResponse {
    return { url: 'https://api.klipy.com/v2/search', method: RequestMethod.GET, statusCode, data };
}

function makeHttp(handler: (url: string) => IHttpResponse) {
    const calls: Array<string> = [];

    const http = {
        get: async (url: string) => {
            calls.push(url);

            return handler(url);
        },
        post: async () => respondWith(200),
        put: async () => respondWith(200),
        del: async () => respondWith(200),
        patch: async () => respondWith(200),
    } as unknown as IHttp;

    return { http, calls };
}

const persis = {} as any;
const command = new KlipyCommand();

describe('registro do comando', () => {
    it('registra /klipy com preview', () => {
        expect(command.command).toBe('klipy');
        expect(command.providesPreview).toBe(true);
    });

    it('aponta para chaves de i18n que existem', () => {
        expect(Object.keys(STRINGS.pt)).toContain(command.i18nDescription);
        expect(Object.keys(STRINGS.pt)).toContain(command.i18nParamsExample);
    });

    it('usa o placeholder exigido pelo KLIPY', () => {
        expect(STRINGS.pt[command.i18nParamsExample as 'klipy_command_params_example']).toBe(
            'Search KLIPY',
        );
    });
});

describe('previewer', () => {
    it('devolve a galeria com os resultados', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const preview = await command.previewer(
            makeContext(['comemoração']),
            makeRead(),
            makeModify().modify,
            http,
            persis,
        );

        expect(preview.i18nTitle).toBe('klipy_preview_title');
        expect(preview.items).toHaveLength(3);
        expect(preview.items[0].type).toBe(SlashCommandPreviewItemType.IMAGE);
        expect(preview.items[0].id).toBe('2525964843568523');
    });

    it('usa a miniatura no value, não o GIF em tamanho cheio', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const preview = await command.previewer(
            makeContext(['comemoração']),
            makeRead(),
            makeModify().modify,
            http,
            persis,
        );

        expect(preview.items[0].value).toContain('NIKSFkmQ.gif');
    });

    it('não chama a API quando não há termo', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, searchSuccess));
        const preview = await command.previewer(makeContext([]), makeRead(), makeModify().modify, http, persis);

        expect(preview.items).toEqual([]);
        expect(calls).toHaveLength(0);
    });

    it('não chama a API quando a chave não está configurada', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, searchSuccess));
        const preview = await command.previewer(
            makeContext(['festa']),
            makeRead({ [KlipySettingId.ApiKey]: '' }),
            makeModify().modify,
            http,
            persis,
        );

        expect(preview.items).toEqual([]);
        expect(calls).toHaveLength(0);
    });

    it('fica em silêncio quando a API falha, em vez de notificar a cada tecla', async () => {
        const { http } = makeHttp(() => respondWith(500));
        const { modify, notified } = makeModify();
        const preview = await command.previewer(makeContext(['festa']), makeRead(), modify, http, persis);

        expect(preview.items).toEqual([]);
        expect(notified).toHaveLength(0);
    });
});

describe('executor', () => {
    it('mostra a ajuda quando não há termo, sem publicar nada', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted, notified } = makeModify();

        await command.executor(makeContext([]), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(calls).toHaveLength(0);
        expect(notified).toHaveLength(1);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_usage);
    });

    it('avisa em inglês quando o usuário prefere inglês', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, notified } = makeModify();

        await command.executor(makeContext([], 'en-US'), makeRead(), modify, http, persis);

        expect(notified[0].message.text).toBe(STRINGS.en.klipy_usage);
    });

    it('usa o idioma de busca do App quando o usuário não escolheu nenhum', async () => {
        // Regressão: a 0.1.0 lia o setting `Language` do servidor, leitura que o
        // Apps-Engine nega sem a permissão `server-setting.read`. A mensagem caía
        // em inglês num Rocket.Chat em português, e o mock antigo não mostrava isso.
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, notified } = makeModify();

        await command.executor(
            new SlashCommandContext(makeUser(undefined), room, []),
            makeRead({ [KlipySettingId.Locale]: 'pt_BR' }),
            modify,
            http,
            persis,
        );

        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_usage);
    });

    it('a preferência do usuário vence o idioma de busca', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, notified } = makeModify();

        await command.executor(
            makeContext([], 'en-US'),
            makeRead({ [KlipySettingId.Locale]: 'pt_BR' }),
            modify,
            http,
            persis,
        );

        expect(notified[0].message.text).toBe(STRINGS.en.klipy_usage);
    });

    it('fala inglês com o idioma de busca padrão', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, notified } = makeModify();

        await command.executor(
            new SlashCommandContext(makeUser(undefined), room, []),
            makeRead({ [KlipySettingId.Locale]: undefined }),
            modify,
            http,
            persis,
        );

        expect(notified[0].message.text).toBe(STRINGS.en.klipy_usage);
    });

    it('avisa que o App não foi configurado quando falta a chave', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, notified } = makeModify();

        await command.executor(
            makeContext(['festa']),
            makeRead({ [KlipySettingId.ApiKey]: '' }),
            modify,
            http,
            persis,
        );

        expect(calls).toHaveLength(0);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_error_not_configured);
    });

    it('publica o primeiro resultado quando o usuário confirma sem escolher', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted } = makeModify();

        await command.executor(makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(1);
        expect(posted[0].attachments[0].imageUrl).toContain('faEUNiNuq5TjUsuXzv.gif');
    });

    it('publica na sala e como o usuário que executou', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted } = makeModify();

        await command.executor(makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted[0].room).toBe(room);
        expect(posted[0].sender.id).toBe('user-1');
    });

    it('publica dentro da thread quando o comando veio de uma', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted } = makeModify();

        await command.executor(makeContext(['festa'], 'pt-BR', 'thread-9'), makeRead(), modify, http, persis);

        expect(posted[0].threadId).toBe('thread-9');
    });

    it('não coloca a consulta no texto da mensagem publicada', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted } = makeModify();

        await command.executor(makeContext(['segredo-da-busca']), makeRead(), modify, http, persis);

        expect(JSON.stringify(posted[0])).not.toContain('segredo-da-busca');
    });

    it('avisa quando não há resultados, sem publicar', async () => {
        const { http } = makeHttp(() => respondWith(200, searchEmpty));
        const { modify, posted, notified } = makeModify();

        await command.executor(makeContext(['zxqwv']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(notified[0].message.text).toContain('zxqwv');
    });

    it.each([
        [401, 'klipy_error_auth'],
        [403, 'klipy_error_auth'],
        [429, 'klipy_error_rate_limit'],
        [500, 'klipy_error_unavailable'],
    ] as const)('traduz o status %i para a mensagem correta', async (statusCode, key) => {
        const { http } = makeHttp(() => respondWith(statusCode));
        const { modify, posted, notified } = makeModify();

        await command.executor(makeContext(['festa']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(notified[0].message.text).toBe(STRINGS.pt[key]);
    });

    it('nunca deixa a API Key chegar ao usuário', async () => {
        const { http } = makeHttp(() => respondWith(401));
        const { modify, notified } = makeModify();

        await command.executor(makeContext(['festa']), makeRead(), modify, http, persis);

        expect(JSON.stringify(notified)).not.toContain(API_KEY);
    });

    it('avisa que não conseguiu publicar, sem culpar o KLIPY, quando a sala recusa a mensagem', async () => {
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify, posted, notified } = makeModify({ failFinish: true });

        await command.executor(makeContext(['festa']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(notified).toHaveLength(1);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_error_post_failed);
    });

    it('registra a recusa só com a operação e a categoria do erro', async () => {
        // PRIVACY.md promete isso: a exceção do Rocket.Chat pode trazer detalhe da sala.
        const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as unknown as ILogger;
        const { http } = makeHttp(() => respondWith(200, searchSuccess));
        const { modify } = makeModify({ failFinish: true });

        await new KlipyCommand(logger).executor(makeContext(['festa']), makeRead(), modify, http, persis);

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith({ app: 'klipy', operation: 'post', error: 'postFailed' });
    });
});

describe('executePreviewItem', () => {
    const item = {
        id: '2525964843568523',
        type: SlashCommandPreviewItemType.IMAGE,
        value: 'https://static.klipy.com/tiny.gif',
    };

    it('reconsulta o item pelo id antes de publicar', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted } = makeModify();

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(calls[0]).toContain('/v2/posts');
        expect(calls[0]).toContain('ids=2525964843568523');
        expect(calls[0]).not.toContain('media_filter');
        expect(posted).toHaveLength(1);
    });

    it('avisa que não conseguiu publicar, sem culpar o KLIPY, quando a sala recusa a mensagem', async () => {
        const { http } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted, notified } = makeModify({ failFinish: true });

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(notified).toHaveLength(1);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_error_post_failed);
    });

    it('ignora a URL que veio do cliente e publica a que a API devolveu', async () => {
        const hostile = { ...item, value: 'javascript:alert(document.cookie)' };
        const { http } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted } = makeModify();

        await command.executePreviewItem(hostile, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted[0].attachments[0].imageUrl).toBe(
            'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/80/7c/faEUNiNuq5TjUsuXzv.gif',
        );
        expect(JSON.stringify(posted[0])).not.toContain('javascript:');
    });

    it('publica exatamente o item escolhido, não o primeiro da busca', async () => {
        const chosen = { ...item, id: '8041071659142944' };
        // /v2/posts não devolve o item; o fallback é refazer a busca e achar pelo id.
        const { http } = makeHttp((url) =>
            url.includes('/v2/posts') ? respondWith(200, searchEmpty) : respondWith(200, searchSuccess),
        );
        const { modify, posted } = makeModify();

        await command.executePreviewItem(chosen, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted[0].attachments[0].imageUrl).toContain('8GCrVAB7.gif');
    });

    it('cai para a busca original quando /v2/posts não encontra o item', async () => {
        const { http, calls } = makeHttp((url) =>
            url.includes('/v2/posts') ? respondWith(200, searchEmpty) : respondWith(200, searchSuccess),
        );
        const { modify, posted } = makeModify();

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(calls).toHaveLength(2);
        expect(calls[1]).toContain('/v2/search');
        expect(posted).toHaveLength(1);
    });

    it('avisa e não publica quando o item sumiu dos dois caminhos', async () => {
        const { http } = makeHttp(() => respondWith(200, searchEmpty));
        const { modify, posted, notified } = makeModify();

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(0);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_error_unavailable);
    });

    it('rejeita item sem id sem chamar a rede', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted } = makeModify();

        await command.executePreviewItem(
            { ...item, id: '' },
            makeContext(['festa']),
            makeRead(),
            modify,
            http,
            persis,
        );

        expect(calls).toHaveLength(0);
        expect(posted).toHaveLength(0);
    });

    it('usa o idioma de busca do App quando o usuário não escolheu nenhum', async () => {
        const { http, calls } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted, notified } = makeModify();

        await command.executePreviewItem(
            { ...item, id: '' },
            new SlashCommandContext(makeUser(undefined), room, ['festa']),
            makeRead({ [KlipySettingId.Locale]: 'pt_BR' }),
            modify,
            http,
            persis,
        );

        expect(calls).toHaveLength(0);
        expect(posted).toHaveLength(0);
        expect(notified[0].message.text).toBe(STRINGS.pt.klipy_error_unavailable);
    });

    it('inclui a atribuição na mensagem publicada', async () => {
        const { http } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted } = makeModify();

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted[0].attachments[0].text).toContain('Powered by KLIPY');
    });

    it('respeita o setting que desliga o título', async () => {
        const { http } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted } = makeModify();

        await command.executePreviewItem(
            item,
            makeContext(['comemoração']),
            makeRead({ [KlipySettingId.ShowTitle]: false }),
            modify,
            http,
            persis,
        );

        expect(posted[0].attachments[0].title).toBeUndefined();
        expect(posted[0].attachments[0].text).toContain('KLIPY');
    });

    it('publica uma única mensagem por seleção', async () => {
        const { http } = makeHttp(() => respondWith(200, postsSuccess));
        const { modify, posted, notified } = makeModify();

        await command.executePreviewItem(item, makeContext(['comemoração']), makeRead(), modify, http, persis);

        expect(posted).toHaveLength(1);
        expect(notified).toHaveLength(0);
    });
});
