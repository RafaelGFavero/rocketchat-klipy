/**
 * Modelo interno do App e tipos da resposta bruta do KLIPY.
 *
 * Regra de ouro: nada fora de `services/KlipyClient.ts` e `utils/media.ts` pode tocar
 * em `results`, `media_formats` ou qualquer outro campo da resposta externa. O resto do
 * App enxerga apenas `KlipyGif`.
 */

/** Modelo interno, independente do formato da API. */
export interface KlipyGif {
    /** Identificador estável devolvido pelo KLIPY. Usado para re-consulta na seleção. */
    id: string;
    /** Título legível. Pode ser string vazia quando o KLIPY não fornece um. */
    title: string;
    /** URL HTTPS da miniatura mostrada no preview. */
    previewUrl: string;
    /** URL HTTPS do GIF publicado na sala. */
    gifUrl: string;
    /** Página do item no site do KLIPY, quando disponível. */
    pageUrl?: string;
    width?: number;
    height?: number;
}

export interface KlipySearchOptions {
    query: string;
    apiKey: string;
    locale: string;
    contentFilter: string;
    limit: number;
}

export interface KlipyLookupOptions {
    id: string;
    apiKey: string;
}

export interface KlipySearchResult {
    items: Array<KlipyGif>;
    /** Cursor de paginação devolvido pelo KLIPY. Não usado no MVP. */
    next?: string;
}

export interface IKlipyClient {
    search(options: KlipySearchOptions): Promise<KlipySearchResult>;
    /** Re-consulta um item pelo id. Base da estratégia de seleção segura. */
    getById(options: KlipyLookupOptions): Promise<KlipyGif | undefined>;
}

/**
 * Categorias de falha. O comando traduz cada uma para uma mensagem localizada;
 * nenhuma delas carrega detalhe técnico ou credencial.
 */
export enum KlipyErrorKind {
    /** Setting `klipy_api_key` vazio. Nem chega a fazer requisição. */
    NOT_CONFIGURED = 'notConfigured',
    /** 401 / 403 — chave inválida, revogada ou sem permissão. */
    AUTH = 'auth',
    /** 429 — limite de requisições atingido. */
    RATE_LIMIT = 'rateLimit',
    /** 5xx, timeout, DNS, TLS, qualquer indisponibilidade. */
    UNAVAILABLE = 'unavailable',
    /** 200 com corpo que não corresponde ao contrato. */
    MALFORMED = 'malformed',
}

export class KlipyError extends Error {
    public readonly kind: KlipyErrorKind;
    public readonly statusCode?: number;

    constructor(kind: KlipyErrorKind, statusCode?: number) {
        super(`klipy:${kind}`);
        this.name = 'KlipyError';
        this.kind = kind;
        this.statusCode = statusCode;
        // Necessário para `instanceof` continuar funcionando após a transpilação.
        Object.setPrototypeOf(this, KlipyError.prototype);
    }
}

/* -------------------------------------------------------------------------- */
/* Resposta bruta — camada compatível com Tenor v2 (`/v2/search`, `/v2/posts`) */
/* -------------------------------------------------------------------------- */

/**
 * Tudo é `unknown` de propósito: a resposta vem da rede e não há garantia
 * nenhuma de tipo. A normalização em `utils/media.ts` faz a verificação.
 */
export interface KlipyRawMediaObject {
    url?: unknown;
    dims?: unknown;
    size?: unknown;
    duration?: unknown;
    preview?: unknown;
}

export interface KlipyRawResponseObject {
    id?: unknown;
    title?: unknown;
    content_description?: unknown;
    itemurl?: unknown;
    media_formats?: unknown;
}

export interface KlipyRawEnvelope {
    results?: unknown;
    next?: unknown;
}

/** Formatos de GIF animado, do maior para o menor. Ver docs/api-contract.md §7.3. */
export const GIF_FORMATS_LARGEST_FIRST = ['gif', 'mediumgif', 'tinygif', 'nanogif'] as const;

/**
 * Ordem de escolha da miniatura do preview.
 *
 * Começa em `tinygif` (220 px) e não em `nanogif` (90 px): 90 px fica ilegível na
 * galeria de preview do Rocket.Chat. `nanogif` segue como primeiro fallback.
 */
export const PREVIEW_FORMAT_ORDER = ['tinygif', 'nanogif', 'mediumgif', 'gif'] as const;

/** Ordem de escolha do GIF publicado na sala: maior qualidade primeiro. */
export const SEND_FORMAT_ORDER = ['gif', 'mediumgif', 'tinygif', 'nanogif'] as const;

/**
 * Valor de `media_filter` enviado em `/v2/search`. Reduz o payload em mais de 70%.
 *
 * O nome carrega `SEARCH_` de propósito: **`/v2/posts` não aceita esta lista.**
 * Verificado contra a API real em 04/08/2026 — `/v2/posts` responde 422 com
 * `"The selected media_filter.0 is invalid"` para `nanogif` e `mediumgif`, embora
 * `/v2/search` aceite os quatro. Como `/v2/posts` já devolve todos os formatos
 * quando o parâmetro é omitido, e lá se trata de um único item, o App simplesmente
 * não envia `media_filter` nessa chamada. Ver docs/api-contract.md §5.
 */
export const SEARCH_MEDIA_FILTER = 'nanogif,tinygif,mediumgif,gif';
