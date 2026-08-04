/** Ids dos settings e limites de validação. Fonte única para App, comando e testes. */

export enum KlipySettingId {
    ApiKey = 'klipy_api_key',
    Locale = 'klipy_locale',
    ContentFilter = 'klipy_content_filter',
    ResultLimit = 'klipy_result_limit',
    ShowTitle = 'klipy_show_title',
    ShowAttributionLink = 'klipy_show_attribution_link',
}

/** Valores aceitos por `contentfilter` em `/v2/search`. Verbatim da documentação. */
export const CONTENT_FILTER_VALUES = ['off', 'low', 'medium', 'high'] as const;
export type ContentFilterValue = (typeof CONTENT_FILTER_VALUES)[number];

export const DEFAULT_CONTENT_FILTER: ContentFilterValue = 'medium';
export const DEFAULT_LOCALE = 'pt_BR';

/**
 * Faixa do número de resultados.
 *
 * O teto não é escolha nossa: `ISlashCommand.previewer` documenta que o cliente recebe
 * no máximo 10 itens ("and no more, period"). Pedir mais gastaria banda para nada.
 * O piso de 8 acompanha a recomendação do KLIPY para telas de busca.
 */
export const MIN_RESULT_LIMIT = 8;
export const MAX_RESULT_LIMIT = 10;
export const DEFAULT_RESULT_LIMIT = 10;

/** Teto de caracteres da consulta enviada ao KLIPY. */
export const MAX_QUERY_LENGTH = 100;

/** Comprimento máximo aceito para uma URL vinda da API. */
export const MAX_URL_LENGTH = 2048;

/** Comprimento máximo do título exibido na mensagem. */
export const MAX_TITLE_LENGTH = 140;

export const KLIPY_API_BASE_URL = 'https://api.klipy.com';
export const KLIPY_HOMEPAGE_URL = 'https://klipy.com';

/** Timeout das chamadas HTTP ao KLIPY, em milissegundos. */
export const HTTP_TIMEOUT_MS = 10000;
