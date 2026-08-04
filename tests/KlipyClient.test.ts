import type { IHttp, IHttpRequest, IHttpResponse } from '@rocket.chat/apps-engine/definition/accessors';
import type { ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { RequestMethod } from '@rocket.chat/apps-engine/definition/accessors';

import { KlipyClient } from '../services/KlipyClient';
import { KlipyErrorKind, KlipyError } from '../types/klipy';

import { loadFixture } from './loadFixture';

const searchSuccess = loadFixture('search-success');
const searchEmpty = loadFixture('search-empty');
const searchMalformed = loadFixture('search-malformed');
const postsSuccess = loadFixture('posts-success');

const API_KEY = 'kl_test_SUPER_SECRETA_9f8e7d6c5b4a';

type HttpGetMock = jest.Mock<Promise<IHttpResponse>, [string, IHttpRequest?]>;

function makeHttp(get: HttpGetMock): IHttp {
    return {
        get,
        post: jest.fn(),
        put: jest.fn(),
        del: jest.fn(),
        patch: jest.fn(),
    } as unknown as IHttp;
}

function makeLogger() {
    const calls: Array<unknown> = [];
    const record = (...args: Array<unknown>) => {
        calls.push(...args);
    };

    const logger = {
        debug: jest.fn(record),
        info: jest.fn(record),
        log: jest.fn(record),
        warn: jest.fn(record),
        error: jest.fn(record),
        success: jest.fn(record),
    } as unknown as ILogger;

    return {
        logger,
        /** Tudo que foi entregue ao logger, achatado em uma única string. */
        dump: () => calls.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry))).join(' | '),
    };
}

function respondWith(statusCode: number, data?: unknown, content?: string): IHttpResponse {
    return {
        url: 'https://api.klipy.com/v2/search',
        method: RequestMethod.GET,
        statusCode,
        data,
        content,
    };
}

const baseOptions = {
    apiKey: API_KEY,
    locale: 'pt_BR',
    contentFilter: 'medium',
    limit: 10,
};

describe('KlipyClient.search — construção da requisição', () => {
    it('chama o endpoint /v2/search da camada compatível com Tenor', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        const [url] = get.mock.calls[0];

        expect(url.startsWith('https://api.klipy.com/v2/search?')).toBe(true);
    });

    it('nunca usa o endpoint da API nativa', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        expect(get.mock.calls[0][0]).not.toContain('/api/v1/');
        expect(get.mock.calls[0][0]).not.toContain('per_page');
    });

    it('envia todos os parâmetros do contrato', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        const url = get.mock.calls[0][0];

        expect(url).toContain(`key=${API_KEY}`);
        expect(url).toContain('q=festa');
        expect(url).toContain('limit=10');
        expect(url).toContain('locale=pt_BR');
        expect(url).toContain('contentfilter=medium');
        expect(url).toContain('media_filter=nanogif%2Ctinygif%2Cmediumgif%2Cgif');
    });

    it('faz encoding da consulta com espaço e acento', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'bom dia comemoração' });

        const url = get.mock.calls[0][0];

        expect(url).toContain('q=bom%20dia%20comemora%C3%A7%C3%A3o');
    });

    it('faz encoding de caracteres que quebrariam a query string', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'a&b=c?d#e' });

        const url = get.mock.calls[0][0];

        expect(url).toContain('q=a%26b%3Dc%3Fd%23e');
        // O `&` da consulta não pode virar separador de parâmetro.
        expect(url.split('&').length).toBe(6);
    });

    it('define um timeout na requisição', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        expect(get.mock.calls[0][1]?.timeout).toBeGreaterThan(0);
    });

    it('não faz requisição nenhuma quando a API Key está vazia', async () => {
        const get: HttpGetMock = jest.fn();
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, apiKey: '   ', query: 'festa' })).rejects.toMatchObject({
            kind: KlipyErrorKind.NOT_CONFIGURED,
        });
        expect(get).not.toHaveBeenCalled();
    });
});

describe('KlipyClient.search — a API Key não vaza', () => {
    it('não escreve a chave em nenhum nível de log em caso de sucesso', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        const { logger, dump } = makeLogger();

        await new KlipyClient(makeHttp(get), logger).search({ ...baseOptions, query: 'festa' });

        expect(dump()).not.toContain(API_KEY);
    });

    it.each([
        [401, 'auth'],
        [403, 'auth'],
        [429, 'rate limit'],
        [500, 'erro do servidor'],
    ])('não escreve a chave no log ao tratar %i (%s)', async (statusCode) => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(statusCode, { error: 'nope' }));
        const { logger, dump } = makeLogger();
        const client = new KlipyClient(makeHttp(get), logger);

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toBeInstanceOf(KlipyError);
        expect(dump()).not.toContain(API_KEY);
    });

    it('não escreve a chave no log quando a rede falha', async () => {
        const get: HttpGetMock = jest.fn().mockRejectedValue(new Error(`falhou ao chamar ?key=${API_KEY}`));
        const { logger, dump } = makeLogger();
        const client = new KlipyClient(makeHttp(get), logger);

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toBeInstanceOf(KlipyError);
        expect(dump()).not.toContain(API_KEY);
    });

    it('não escreve a consulta do usuário no log', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(500));
        const { logger, dump } = makeLogger();
        const client = new KlipyClient(makeHttp(get), logger);

        await expect(
            client.search({ ...baseOptions, query: 'assunto-particular-do-usuario' }),
        ).rejects.toBeInstanceOf(KlipyError);
        expect(dump()).not.toContain('assunto-particular-do-usuario');
    });

    it('não expõe a chave na mensagem do erro lançado', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(401));
        const client = new KlipyClient(makeHttp(get));

        const error = await client.search({ ...baseOptions, query: 'festa' }).catch((raised) => raised);

        expect(error).toBeInstanceOf(KlipyError);
        expect(String((error as Error).message)).not.toContain(API_KEY);
        // O erro inteiro serializado também não pode carregar a credencial.
        expect(JSON.stringify(error)).not.toContain(API_KEY);
    });
});

describe('KlipyClient.search — interpretação da resposta', () => {
    it('converte uma resposta válida para o modelo interno', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        const result = await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        expect(result.items).toHaveLength(3);
        expect(result.items[0].id).toBe('2525964843568523');
        expect(result.items[0].gifUrl).toContain('https://static.klipy.com/');
        expect(result.next).toBe('3');
    });

    it('lê o corpo de content quando data não vem parseado', async () => {
        const get: HttpGetMock = jest
            .fn()
            .mockResolvedValue(respondWith(200, undefined, JSON.stringify(searchSuccess)));
        const result = await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        expect(result.items).toHaveLength(3);
    });

    it('trata resposta sem resultados como sucesso vazio, não como erro', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchEmpty));
        const result = await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'xyzzy' });

        expect(result.items).toEqual([]);
    });

    it.each([
        ['results como objeto', searchMalformed],
        ['sem o campo results', { next: '' }],
        ['corpo nulo', null],
        ['corpo string', 'ok'],
        ['array na raiz', []],
    ])('rejeita corpo malformado: %s', async (_label, body) => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, body));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toMatchObject({
            kind: KlipyErrorKind.MALFORMED,
        });
    });

    it('rejeita corpo que não é JSON válido', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, undefined, '<html>502</html>'));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toMatchObject({
            kind: KlipyErrorKind.MALFORMED,
        });
    });
});

describe('KlipyClient.search — mapeamento de status HTTP', () => {
    it.each([
        [401, KlipyErrorKind.AUTH],
        [403, KlipyErrorKind.AUTH],
        [429, KlipyErrorKind.RATE_LIMIT],
        [500, KlipyErrorKind.UNAVAILABLE],
        [502, KlipyErrorKind.UNAVAILABLE],
        [503, KlipyErrorKind.UNAVAILABLE],
        [504, KlipyErrorKind.UNAVAILABLE],
        [400, KlipyErrorKind.UNAVAILABLE],
        [404, KlipyErrorKind.UNAVAILABLE],
    ])('status %i vira %s', async (statusCode, kind) => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(statusCode));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toMatchObject({ kind });
    });

    it('preserva o status no erro para diagnóstico', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(429));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toMatchObject({
            statusCode: 429,
        });
    });

    it('exceção de rede vira indisponibilidade', async () => {
        const get: HttpGetMock = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toMatchObject({
            kind: KlipyErrorKind.UNAVAILABLE,
        });
    });

    it('valor rejeitado que não é Error também é tratado', async () => {
        const get: HttpGetMock = jest.fn().mockRejectedValue('boom');
        const client = new KlipyClient(makeHttp(get));

        await expect(client.search({ ...baseOptions, query: 'festa' })).rejects.toBeInstanceOf(KlipyError);
    });
});

describe('KlipyClient.getById', () => {
    it('consulta /v2/posts com o id informado', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, postsSuccess));
        await new KlipyClient(makeHttp(get)).getById({ id: '2525964843568523', apiKey: API_KEY });

        const url = get.mock.calls[0][0];

        expect(url.startsWith('https://api.klipy.com/v2/posts?')).toBe(true);
        expect(url).toContain('ids=2525964843568523');
    });

    it('não envia media_filter, que este endpoint recusa com 422', async () => {
        // Regressão. Verificado contra a API real em 04/08/2026: /v2/posts responde
        // 422 "The selected media_filter.0 is invalid" para nanogif e mediumgif,
        // embora /v2/search aceite os quatro formatos. Omitido, /v2/posts devolve
        // todos eles — que é exatamente o que o fallback de qualidade precisa.
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, postsSuccess));
        await new KlipyClient(makeHttp(get)).getById({ id: '2525964843568523', apiKey: API_KEY });

        expect(get.mock.calls[0][0]).not.toContain('media_filter');
    });

    it('a busca continua enviando media_filter, onde ele é aceito', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchSuccess));
        await new KlipyClient(makeHttp(get)).search({ ...baseOptions, query: 'festa' });

        expect(get.mock.calls[0][0]).toContain('media_filter=nanogif%2Ctinygif%2Cmediumgif%2Cgif');
    });

    it('devolve o item normalizado', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, postsSuccess));
        const item = await new KlipyClient(makeHttp(get)).getById({
            id: '2525964843568523',
            apiKey: API_KEY,
        });

        expect(item?.id).toBe('2525964843568523');
        expect(item?.gifUrl).toBe(
            'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/80/7c/faEUNiNuq5TjUsuXzv.gif',
        );
    });

    it('faz encoding do id, que vem do cliente e não é confiável', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchEmpty));
        await new KlipyClient(makeHttp(get)).getById({ id: 'a&b=c', apiKey: API_KEY });

        expect(get.mock.calls[0][0]).toContain('ids=a%26b%3Dc');
    });

    it('devolve undefined quando o id não existe mais', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, searchEmpty));
        const item = await new KlipyClient(makeHttp(get)).getById({ id: 'sumiu', apiKey: API_KEY });

        expect(item).toBeUndefined();
    });

    it('devolve undefined quando o item devolvido não bate com o id pedido', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(200, postsSuccess));
        const item = await new KlipyClient(makeHttp(get)).getById({ id: 'outro-id', apiKey: API_KEY });

        expect(item).toBeUndefined();
    });

    it('propaga erro de autenticação', async () => {
        const get: HttpGetMock = jest.fn().mockResolvedValue(respondWith(403));
        const client = new KlipyClient(makeHttp(get));

        await expect(client.getById({ id: 'x', apiKey: API_KEY })).rejects.toMatchObject({
            kind: KlipyErrorKind.AUTH,
        });
    });

    it('rejeita id vazio sem chamar a rede', async () => {
        const get: HttpGetMock = jest.fn();
        const item = await new KlipyClient(makeHttp(get)).getById({ id: '  ', apiKey: API_KEY });

        expect(item).toBeUndefined();
        expect(get).not.toHaveBeenCalled();
    });
});
