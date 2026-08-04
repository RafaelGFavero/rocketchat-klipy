import { normalizeItem, normalizeResults, pickFormatUrl } from '../utils/media';
import { PREVIEW_FORMAT_ORDER, SEND_FORMAT_ORDER } from '../types/klipy';

import { loadFixture } from './loadFixture';

const searchSuccess = loadFixture('search-success');
const searchEmpty = loadFixture('search-empty');
const unsafeUrls = loadFixture('search-unsafe-urls');

describe('pickFormatUrl', () => {
    const formats = {
        gif: { url: 'https://static.klipy.com/full.gif', dims: [498, 281] },
        mediumgif: { url: 'https://static.klipy.com/medium.gif', dims: [400, 226] },
        tinygif: { url: 'https://static.klipy.com/tiny.gif', dims: [220, 124] },
        nanogif: { url: 'https://static.klipy.com/nano.gif', dims: [90, 51] },
    };

    it('escolhe tinygif para o preview', () => {
        expect(pickFormatUrl(formats, PREVIEW_FORMAT_ORDER)?.url).toBe(
            'https://static.klipy.com/tiny.gif',
        );
    });

    it('escolhe gif em tamanho cheio para o envio', () => {
        expect(pickFormatUrl(formats, SEND_FORMAT_ORDER)?.url).toBe(
            'https://static.klipy.com/full.gif',
        );
    });

    it('cai para o próximo formato quando o preferido não existe', () => {
        const { tinygif: _omitted, ...withoutTiny } = formats;

        expect(pickFormatUrl(withoutTiny, PREVIEW_FORMAT_ORDER)?.url).toBe(
            'https://static.klipy.com/nano.gif',
        );
    });

    it('pula formatos com URL insegura em vez de aceitá-los', () => {
        const hostile = {
            tinygif: { url: 'javascript:alert(1)', dims: [90, 51] },
            nanogif: { url: 'http://static.klipy.com/nano.gif', dims: [90, 51] },
            mediumgif: { url: 'https://static.klipy.com/medium.gif', dims: [400, 226] },
        };

        expect(pickFormatUrl(hostile, PREVIEW_FORMAT_ORDER)?.url).toBe(
            'https://static.klipy.com/medium.gif',
        );
    });

    it('nunca escolhe MP4 ou WebM, que não estão na ordem de formatos', () => {
        const videoOnly = {
            mp4: { url: 'https://static.klipy.com/a.mp4', dims: [498, 281] },
            webm: { url: 'https://static.klipy.com/a.webm', dims: [498, 281] },
        };

        expect(pickFormatUrl(videoOnly, SEND_FORMAT_ORDER)).toBeUndefined();
    });

    it('devolve undefined quando não há nenhum formato utilizável', () => {
        expect(pickFormatUrl({}, SEND_FORMAT_ORDER)).toBeUndefined();
        expect(pickFormatUrl(undefined, SEND_FORMAT_ORDER)).toBeUndefined();
        expect(pickFormatUrl('nem objeto é', SEND_FORMAT_ORDER)).toBeUndefined();
        expect(pickFormatUrl(null, SEND_FORMAT_ORDER)).toBeUndefined();
    });

    it('extrai largura e altura da tupla dims', () => {
        const picked = pickFormatUrl(formats, SEND_FORMAT_ORDER);

        expect(picked?.width).toBe(498);
        expect(picked?.height).toBe(281);
    });

    it('tolera dims ausente ou com formato inesperado', () => {
        const odd = { gif: { url: 'https://static.klipy.com/a.gif', dims: 'grande' } };
        const picked = pickFormatUrl(odd, SEND_FORMAT_ORDER);

        expect(picked?.url).toBe('https://static.klipy.com/a.gif');
        expect(picked?.width).toBeUndefined();
        expect(picked?.height).toBeUndefined();
    });
});

describe('normalizeItem', () => {
    const [first, , third] = searchSuccess.results as Array<unknown>;

    it('converte um item completo para o modelo interno', () => {
        expect(normalizeItem(first)).toEqual({
            id: '2525964843568523',
            title: "Shaq's Excited Dance",
            previewUrl:
                'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/80/7c/NIKSFkmQ.gif',
            gifUrl:
                'https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/80/7c/faEUNiNuq5TjUsuXzv.gif',
            pageUrl: 'https://klipy.com/gifs/excited-im-so-excited-22',
            width: 498,
            height: 281,
        });
    });

    it('cai para content_description quando não há title', () => {
        expect(normalizeItem(third)?.title).toBe('Party popper confetti');
    });

    it('aceita id numérico convertendo para string', () => {
        const item = normalizeItem({
            id: 8041071659142944,
            title: 'Numérico',
            media_formats: { gif: { url: 'https://static.klipy.com/a.gif', dims: [10, 10] } },
        });

        expect(item?.id).toBe('8041071659142944');
    });

    it('descarta item sem id', () => {
        expect(
            normalizeItem({
                title: 'sem id',
                media_formats: { gif: { url: 'https://static.klipy.com/a.gif', dims: [10, 10] } },
            }),
        ).toBeUndefined();
    });

    it('descarta item sem nenhuma mídia utilizável', () => {
        expect(
            normalizeItem({
                id: 'x',
                title: 'só vídeo',
                media_formats: { mp4: { url: 'https://static.klipy.com/a.mp4', dims: [10, 10] } },
            }),
        ).toBeUndefined();
    });

    it('descarta item cuja única mídia é insegura', () => {
        expect(
            normalizeItem({
                id: 'x',
                media_formats: { gif: { url: 'javascript:alert(1)' } },
            }),
        ).toBeUndefined();
    });

    it('omite pageUrl quando itemurl não é HTTPS', () => {
        const item = normalizeItem({
            id: 'x',
            title: 'y',
            itemurl: 'http://klipy.com/gifs/x',
            media_formats: { gif: { url: 'https://static.klipy.com/a.gif', dims: [10, 10] } },
        });

        expect(item).toBeDefined();
        expect(item?.pageUrl).toBeUndefined();
    });

    it('não estoura com entradas absurdas', () => {
        expect(normalizeItem(undefined)).toBeUndefined();
        expect(normalizeItem(null)).toBeUndefined();
        expect(normalizeItem('texto')).toBeUndefined();
        expect(normalizeItem(42)).toBeUndefined();
        expect(normalizeItem([])).toBeUndefined();
    });
});

describe('normalizeResults', () => {
    it('normaliza a lista da fixture de sucesso', () => {
        const items = normalizeResults(searchSuccess.results);

        expect(items).toHaveLength(3);
        expect(items.map((item) => item.id)).toEqual([
            '2525964843568523',
            '4551195970372378',
            '8041071659142944',
        ]);
    });

    it('preserva a ordem devolvida pelo KLIPY', () => {
        const items = normalizeResults(searchSuccess.results);

        expect(items[0].id).toBe('2525964843568523');
        expect(items[2].id).toBe('8041071659142944');
    });

    it('devolve lista vazia para resposta sem resultados', () => {
        expect(normalizeResults(searchEmpty.results)).toEqual([]);
    });

    it('remove itens inseguros, sem id e sem mídia', () => {
        const items = normalizeResults(unsafeUrls.results);

        expect(items.map((item) => item.id)).toEqual(['duplicate-id']);
    });

    it('deduplica por id mantendo a primeira ocorrência', () => {
        const items = normalizeResults(unsafeUrls.results);

        expect(items).toHaveLength(1);
        expect(items[0].title).toBe('primeiro com este id');
    });

    it('respeita o limite pedido', () => {
        expect(normalizeResults(searchSuccess.results, 2)).toHaveLength(2);
    });

    it('devolve lista vazia quando results não é array', () => {
        expect(normalizeResults({ '0': {} })).toEqual([]);
        expect(normalizeResults(undefined)).toEqual([]);
        expect(normalizeResults('results')).toEqual([]);
    });
});
