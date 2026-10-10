import {
    KlipyGif,
    KlipyRawResponseObject,
    PREVIEW_FORMAT_ORDER,
    SEND_FORMAT_ORDER,
} from '../types/klipy';
import { isPlainObject, isSafeHttpsUrl, truncateTitle } from './validation';

/**
 * Percorre a ordem de preferência e devolve o primeiro formato com URL utilizável.
 *
 * Um formato com URL insegura é **pulado**, não aceito: a presença de `tinygif`
 * apontando para `javascript:` não pode impedir o uso do `mediumgif` legítimo.
 */
export function pickFormatUrl(
    mediaFormats: unknown,
    order: ReadonlyArray<string>,
): string | undefined {
    if (!isPlainObject(mediaFormats)) {
        return undefined;
    }

    for (const format of order) {
        const candidate = mediaFormats[format];
        const url = isPlainObject(candidate) ? candidate.url : undefined;

        if (isSafeHttpsUrl(url)) {
            return url;
        }
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
        previewUrl: preview,
        gifUrl: send,
    };

    if (isSafeHttpsUrl(item.itemurl)) {
        gif.pageUrl = item.itemurl;
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
