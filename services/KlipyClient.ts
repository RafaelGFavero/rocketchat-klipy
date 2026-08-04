import type { IHttp, IHttpResponse, ILogger } from '@rocket.chat/apps-engine/definition/accessors';

import {
    HTTP_TIMEOUT_MS,
    KLIPY_API_BASE_URL,
} from '../settings/ids';
import {
    IKlipyClient,
    KlipyError,
    KlipyErrorKind,
    KlipyGif,
    KlipyLookupOptions,
    KlipyRawEnvelope,
    KlipySearchOptions,
    KlipySearchResult,
    SEARCH_MEDIA_FILTER,
} from '../types/klipy';
import { normalizeResults } from '../utils/media';
import {
    clampResultLimit,
    isPlainObject,
    normalizeContentFilter,
    normalizeLocale,
    sanitizeUrlForLog,
} from '../utils/validation';

type Operation = 'search' | 'lookup';

/** Monta a URL com encoding explícito, para o teste poder verificar o resultado exato. */
function buildUrl(path: string, params: Record<string, string>): string {
    const query = Object.keys(params)
        .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(params[name])}`)
        .join('&');

    return `${KLIPY_API_BASE_URL}${path}?${query}`;
}

function mapStatusToKind(statusCode: number): KlipyErrorKind {
    if (statusCode === 401 || statusCode === 403) {
        return KlipyErrorKind.AUTH;
    }

    if (statusCode === 429) {
        return KlipyErrorKind.RATE_LIMIT;
    }

    return KlipyErrorKind.UNAVAILABLE;
}

/**
 * O Apps-Engine entrega o corpo já parseado em `data` quando o content-type é JSON,
 * mas nem todo servidor manda o header certo — daí o fallback para `content`.
 */
function parseBody(response: IHttpResponse): unknown {
    if (response.data !== undefined && response.data !== null) {
        return response.data;
    }

    if (typeof response.content !== 'string' || !response.content) {
        return undefined;
    }

    try {
        return JSON.parse(response.content);
    } catch {
        return undefined;
    }
}

/**
 * Cliente da camada compatível com Tenor v2 do KLIPY (`/v2/search`, `/v2/posts`).
 *
 * É o único ponto do App que conhece o formato da API. Todo o resto recebe `KlipyGif`.
 */
export class KlipyClient implements IKlipyClient {
    constructor(
        private readonly http: IHttp,
        private readonly logger?: ILogger,
    ) {}

    public async search(options: KlipySearchOptions): Promise<KlipySearchResult> {
        const apiKey = this.requireApiKey(options.apiKey);
        const limit = clampResultLimit(options.limit);

        const url = buildUrl('/v2/search', {
            key: apiKey,
            q: options.query,
            limit: String(limit),
            locale: normalizeLocale(options.locale),
            contentfilter: normalizeContentFilter(options.contentFilter),
            media_filter: SEARCH_MEDIA_FILTER,
        });

        const envelope = await this.request(url, 'search');

        return {
            items: normalizeResults(envelope.results, limit),
            next: typeof envelope.next === 'string' && envelope.next ? envelope.next : undefined,
        };
    }

    /**
     * Re-consulta um item pelo id devolvido no preview.
     *
     * É o que sustenta a estratégia de seleção segura: a URL publicada na sala vem
     * desta resposta, não do que o cliente mandou de volta.
     */
    public async getById(options: KlipyLookupOptions): Promise<KlipyGif | undefined> {
        const apiKey = this.requireApiKey(options.apiKey);
        const id = (options.id || '').trim();

        if (!id) {
            return undefined;
        }

        // Sem `media_filter`: este endpoint recusa `nanogif` e `mediumgif` com 422,
        // ao contrário de `/v2/search`. Omitido, ele devolve todos os formatos — que é
        // o que queremos para o fallback de qualidade. Ver SEARCH_MEDIA_FILTER.
        const url = buildUrl('/v2/posts', {
            key: apiKey,
            ids: id,
        });

        const envelope = await this.request(url, 'lookup');

        return normalizeResults(envelope.results).find((item) => item.id === id);
    }

    private requireApiKey(apiKey: string): string {
        const trimmed = (apiKey || '').trim();

        if (!trimmed) {
            throw new KlipyError(KlipyErrorKind.NOT_CONFIGURED);
        }

        return trimmed;
    }

    private async request(url: string, operation: Operation): Promise<KlipyRawEnvelope> {
        const startedAt = Date.now();
        let response: IHttpResponse;

        try {
            response = await this.http.get(url, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: HTTP_TIMEOUT_MS,
            });
        } catch {
            // A exceção é descartada de propósito: mensagens de erro de rede costumam
            // repetir a URL chamada, e a URL contém a API Key.
            this.record('error', operation, url, undefined, KlipyErrorKind.UNAVAILABLE, startedAt);
            throw new KlipyError(KlipyErrorKind.UNAVAILABLE);
        }

        const { statusCode } = response;

        if (statusCode < 200 || statusCode >= 300) {
            const kind = mapStatusToKind(statusCode);

            this.record('warn', operation, url, statusCode, kind, startedAt);
            throw new KlipyError(kind, statusCode);
        }

        const body = parseBody(response);

        if (!isPlainObject(body) || !Array.isArray((body as KlipyRawEnvelope).results)) {
            this.record('warn', operation, url, statusCode, KlipyErrorKind.MALFORMED, startedAt);
            throw new KlipyError(KlipyErrorKind.MALFORMED, statusCode);
        }

        this.record('debug', operation, url, statusCode, undefined, startedAt);

        return body as KlipyRawEnvelope;
    }

    /**
     * Log administrativo: operação, status, categoria e duração — e nada além disso.
     *
     * Não registra API Key, cabeçalho de autenticação, termo pesquisado, corpo da
     * resposta nem mensagem da exceção original. A URL passa por `sanitizeUrlForLog`.
     */
    private record(
        level: 'debug' | 'warn' | 'error',
        operation: Operation,
        url: string,
        statusCode: number | undefined,
        kind: KlipyErrorKind | undefined,
        startedAt: number,
    ): void {
        if (!this.logger) {
            return;
        }

        this.logger[level]({
            app: 'klipy',
            operation,
            url: sanitizeUrlForLog(url),
            statusCode,
            error: kind,
            durationMs: Date.now() - startedAt,
        });
    }
}
