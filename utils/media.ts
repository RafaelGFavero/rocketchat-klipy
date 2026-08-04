import {
    KlipyGif,
    KlipyRawMediaObject,
    KlipyRawResponseObject,
    PREVIEW_FORMAT_ORDER,
    SEND_FORMAT_ORDER,
} from '../types/klipy';
import { isPlainObject, isSafeHttpsUrl, truncateTitle } from './validation';

export interface PickedMedia {
    url: string;
    width?: number;
    height?: number;
}

/**
 * `dims` é uma tupla `[largura, altura]` na camada compatível com Tenor
 * — e não um par de campos, como na API nativa. Ver docs/api-contract.md §7.3.
 */
function extractDims(dims: unknown): { width?: number; height?: number } {
    if (!Array.isArray(dims) || dims.length < 2) {
        return {};
    }

    const [width, height] = dims;

    if (
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        return {};
    }

    return { width, height };
}

/**
 * Percorre a ordem de preferência e devolve o primeiro formato com URL utilizável.
 *
 * Um formato com URL insegura é **pulado**, não aceito: a presença de `tinygif`
 * apontando para `javascript:` não pode impedir o uso do `mediumgif` legítimo.
 */
export function pickFormatUrl(
    mediaFormats: unknown,
    order: ReadonlyArray<string>,
): PickedMedia | undefined {
    if (!isPlainObject(mediaFormats)) {
        return undefined;
    }

    for (const format of order) {
        const candidate = mediaFormats[format];

        if (!isPlainObject(candidate)) {
            continue;
        }

        const { url, dims } = candidate as KlipyRawMediaObject;

        if (!isSafeHttpsUrl(url)) {
            continue;
        }

        return { url, ...extractDims(dims) };
    }

    return undefined;
}

/** O KLIPY devolve `id` ora como número, ora como string. Normalizamos para string. */
function normalizeId(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value.trim() || undefined;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return undefined;
}

/**
 * Converte um Response Object bruto no modelo interno.
 *
 * Devolve `undefined` — em vez de um objeto pela metade — quando o item não serve:
 * sem id estável não dá para re-consultar na seleção, e sem mídia utilizável para
 * preview *e* envio não há o que mostrar nem o que publicar.
 */
export function normalizeItem(raw: unknown): KlipyGif | undefined {
    if (!isPlainObject(raw)) {
        return undefined;
    }

    const item = raw as KlipyRawResponseObject;
    const id = normalizeId(item.id);

    if (!id) {
        return undefined;
    }

    const preview = pickFormatUrl(item.media_formats, PREVIEW_FORMAT_ORDER);
    const send = pickFormatUrl(item.media_formats, SEND_FORMAT_ORDER);

    if (!preview || !send) {
        return undefined;
    }

    const gif: KlipyGif = {
        id,
        title: truncateTitle(item.title) || truncateTitle(item.content_description),
        previewUrl: preview.url,
        gifUrl: send.url,
    };

    if (isSafeHttpsUrl(item.itemurl)) {
        gif.pageUrl = item.itemurl;
    }

    if (send.width !== undefined) {
        gif.width = send.width;
    }

    if (send.height !== undefined) {
        gif.height = send.height;
    }

    return gif;
}

/**
 * Normaliza a lista inteira preservando a ordem devolvida pelo KLIPY.
 *
 * A ordem importa: os *Integration Requirements* do KLIPY proíbem reordenar os
 * resultados. Só saem daqui os itens tecnicamente inutilizáveis e as repetições
 * de um mesmo id — o que não é curadoria editorial.
 */
export function normalizeResults(rawResults: unknown, limit?: number): Array<KlipyGif> {
    if (!Array.isArray(rawResults)) {
        return [];
    }

    const seen = new Set<string>();
    const items: Array<KlipyGif> = [];

    for (const raw of rawResults) {
        const item = normalizeItem(raw);

        if (!item || seen.has(item.id)) {
            continue;
        }

        seen.add(item.id);
        items.push(item);

        if (limit !== undefined && items.length >= limit) {
            break;
        }
    }

    return items;
}
