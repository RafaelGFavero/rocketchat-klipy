import {
    CONTENT_FILTER_VALUES,
    ContentFilterValue,
    DEFAULT_CONTENT_FILTER,
    DEFAULT_LOCALE,
    DEFAULT_RESULT_LIMIT,
    MAX_QUERY_LENGTH,
    MAX_RESULT_LIMIT,
    MAX_TITLE_LENGTH,
    MAX_URL_LENGTH,
    MIN_RESULT_LIMIT,
} from '../settings/ids';

/**
 * Parâmetros da URL cujo valor nunca pode aparecer em log:
 * `key` é a credencial e `q`/`ids` carregam o que a pessoa pesquisou.
 */
const REDACTED_QUERY_PARAMS = ['key', 'q', 'ids'];

/** `xx` ou `xx_YY` / `xx-YY`. Três letras cobrem casos como `fil`. */
const LOCALE_PATTERN = /^([a-z]{2,3})(?:[_-]([a-z]{2}))?$/i;

/** Junta os argumentos do slash command em um termo de busca utilizável. */
export function normalizeQuery(args?: Array<string> | string): string {
    const raw = Array.isArray(args) ? args.join(' ') : typeof args === 'string' ? args : '';
    const collapsed = raw.replace(/\s+/g, ' ').trim();

    if (collapsed.length <= MAX_QUERY_LENGTH) {
        return collapsed;
    }

    return collapsed.slice(0, MAX_QUERY_LENGTH).trim();
}

/**
 * Só aceita URL HTTPS bem formada, de tamanho razoável e do domínio do KLIPY.
 *
 * Toda URL que passa aqui veio da API e vai parar em `imageUrl` ou em link de
 * mensagem, carregada pelo cliente de cada membro da sala. Barra `javascript:`,
 * `data:`, `file:` e qualquer host fora de `klipy.com`.
 */
export function isSafeHttpsUrl(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    const trimmed = value.trim();

    if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
        return false;
    }

    try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname;

        return parsed.protocol === 'https:' && (host === 'klipy.com' || host.endsWith('.klipy.com'));
    } catch {
        return false;
    }
}

/** Encaixa o limite de resultados na faixa suportada. Ver docs/api-contract.md §6. */
export function clampResultLimit(value: unknown): number {
    const parsed =
        typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

    if (!Number.isFinite(parsed)) {
        return DEFAULT_RESULT_LIMIT;
    }

    return Math.min(MAX_RESULT_LIMIT, Math.max(MIN_RESULT_LIMIT, Math.trunc(parsed)));
}

/** Normaliza o locale para o formato que `/v2/search` aceita (`pt_BR`, `es`). */
export function normalizeLocale(value: unknown): string {
    if (typeof value !== 'string') {
        return DEFAULT_LOCALE;
    }

    const match = LOCALE_PATTERN.exec(value.trim());

    if (!match) {
        return DEFAULT_LOCALE;
    }

    const language = match[1].toLowerCase();

    return match[2] ? `${language}_${match[2].toUpperCase()}` : language;
}

/** Garante que só um dos valores documentados chegue ao parâmetro `contentfilter`. */
export function normalizeContentFilter(value: unknown): ContentFilterValue {
    if (typeof value !== 'string') {
        return DEFAULT_CONTENT_FILTER;
    }

    const normalized = value.trim().toLowerCase();

    return (CONTENT_FILTER_VALUES as ReadonlyArray<string>).includes(normalized)
        ? (normalized as ContentFilterValue)
        : DEFAULT_CONTENT_FILTER;
}

/**
 * Remove credencial e conteúdo pesquisado de uma URL antes de qualquer log.
 *
 * Trabalha sobre a string crua de propósito: se a URL estiver malformada, ainda
 * assim precisamos redigir o que der, e nunca lançar exceção dentro de um logger.
 */
export function sanitizeUrlForLog(url: string): string {
    if (typeof url !== 'string' || !url) {
        return '';
    }

    const separator = url.indexOf('?');

    if (separator === -1) {
        return url;
    }

    const base = url.slice(0, separator);
    const query = url
        .slice(separator + 1)
        .split('&')
        .map((pair) => {
            const name = pair.split('=')[0];

            return REDACTED_QUERY_PARAMS.includes(name) ? `${name}=***` : pair;
        })
        .join('&');

    return `${base}?${query}`;
}

/** Achata e limita o título para caber em uma linha da mensagem. */
export function truncateTitle(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    const flat = value.replace(/\s+/g, ' ').trim();

    if (flat.length <= MAX_TITLE_LENGTH) {
        return flat;
    }

    return `${flat.slice(0, MAX_TITLE_LENGTH - 1).trim()}…`;
}

/** Objeto simples — array e null não contam. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
