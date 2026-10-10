import { buildAttributionText, buildGifAttachment } from '../utils/messages';
import type { KlipyGif } from '../types/klipy';
import { KLIPY_HOMEPAGE_URL } from '../settings/ids';

const gif: KlipyGif = {
    id: '2525964843568523',
    title: "Shaq's Excited Dance",
    previewUrl: 'https://static.klipy.com/tiny.gif',
    gifUrl: 'https://static.klipy.com/full.gif',
    pageUrl: 'https://klipy.com/gifs/excited-im-so-excited-22',
};

const defaults = { language: 'pt' as const, showTitle: true, showAttributionLink: true };

describe('buildAttributionText', () => {
    it('vira link quando o setting está ligado', () => {
        expect(buildAttributionText('pt', true)).toBe(`[Powered by KLIPY](${KLIPY_HOMEPAGE_URL})`);
    });

    it('continua visível como texto quando o link está desligado', () => {
        expect(buildAttributionText('pt', false)).toBe('Powered by KLIPY');
    });

    it('nunca some — o setting controla só o link, não a atribuição', () => {
        for (const withLink of [true, false]) {
            expect(buildAttributionText('en', withLink)).toContain('KLIPY');
            expect(buildAttributionText('pt', withLink)).toContain('KLIPY');
        }
    });
});

describe('buildGifAttachment', () => {
    it('publica o GIF em tamanho cheio, não a miniatura', () => {
        const attachment = buildGifAttachment({ ...defaults, gif });

        expect(attachment.imageUrl).toBe('https://static.klipy.com/full.gif');
        expect(attachment.imageUrl).not.toBe(gif.previewUrl);
    });

    it('sempre carrega a atribuição', () => {
        const withLink = buildGifAttachment({ ...defaults, gif });
        const withoutLink = buildGifAttachment({ ...defaults, gif, showAttributionLink: false });

        expect(withLink.text).toContain('KLIPY');
        expect(withoutLink.text).toContain('KLIPY');
    });

    it('mostra o título quando o setting está ligado', () => {
        const attachment = buildGifAttachment({ ...defaults, gif });

        expect(attachment.title?.value).toBe("Shaq's Excited Dance");
        expect(attachment.title?.link).toBe(gif.pageUrl);
    });

    it('omite o título quando o setting está desligado', () => {
        const attachment = buildGifAttachment({ ...defaults, gif, showTitle: false });

        expect(attachment.title).toBeUndefined();
    });

    it('omite o título quando o GIF não tem um, mesmo com o setting ligado', () => {
        const attachment = buildGifAttachment({ ...defaults, gif: { ...gif, title: '' } });

        expect(attachment.title).toBeUndefined();
    });

    it('não gera link de título quando não há pageUrl', () => {
        const attachment = buildGifAttachment({
            ...defaults,
            gif: { ...gif, pageUrl: undefined },
        });

        expect(attachment.title?.value).toBe("Shaq's Excited Dance");
        expect(attachment.title?.link).toBeUndefined();
    });

    it('não vaza a consulta nem qualquer payload técnico', () => {
        const serialized = JSON.stringify(buildGifAttachment({ ...defaults, gif }));

        expect(serialized).not.toContain('media_formats');
        expect(serialized).not.toContain('key=');
        expect(serialized).not.toContain(gif.id);
    });

    it('preenche a descrição para leitores de tela', () => {
        const attachment = buildGifAttachment({ ...defaults, gif });

        expect(attachment.description || attachment.title?.value).toBeTruthy();
    });
});
