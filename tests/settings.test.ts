import type { IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';

import { SETTINGS, readKlipySettings } from '../settings/registerSettings';
import {
    CONTENT_FILTER_VALUES,
    DEFAULT_CONTENT_FILTER,
    DEFAULT_LOCALE,
    DEFAULT_RESULT_LIMIT,
    KlipySettingId,
    MAX_RESULT_LIMIT,
    MIN_RESULT_LIMIT,
} from '../settings/ids';
import { STRINGS, SUPPORTED_LANGUAGES } from '../i18n/strings';

function makeRead(values: Record<string, unknown>): IRead {
    return {
        getEnvironmentReader: () => ({
            getSettings: () => ({
                getValueById: async (id: string) => values[id],
            }),
        }),
    } as unknown as IRead;
}

const allValid = {
    [KlipySettingId.ApiKey]: 'kl_valida',
    [KlipySettingId.Locale]: 'pt_BR',
    [KlipySettingId.ContentFilter]: 'high',
    [KlipySettingId.ResultLimit]: 9,
    [KlipySettingId.ShowTitle]: true,
    [KlipySettingId.ShowAttributionLink]: true,
};

describe('declaração dos settings', () => {
    it('declara exatamente os seis settings previstos', () => {
        expect(SETTINGS.map((setting) => setting.id).sort()).toEqual(
            [
                KlipySettingId.ApiKey,
                KlipySettingId.ContentFilter,
                KlipySettingId.Locale,
                KlipySettingId.ResultLimit,
                KlipySettingId.ShowAttributionLink,
                KlipySettingId.ShowTitle,
            ].sort(),
        );
    });

    it('nenhum setting é público — usuário comum não pode lê-los', () => {
        for (const setting of SETTINGS) {
            expect(setting.public).toBe(false);
        }
    });

    it('a API Key é obrigatória e do tipo password', () => {
        const apiKey = SETTINGS.find((setting) => setting.id === KlipySettingId.ApiKey);

        expect(apiKey?.type).toBe(SettingType.PASSWORD);
        expect(apiKey?.required).toBe(true);
        expect(apiKey?.public).toBe(false);
    });

    it('a API Key não tem valor embutido no pacote', () => {
        const apiKey = SETTINGS.find((setting) => setting.id === KlipySettingId.ApiKey);

        expect(apiKey?.packageValue).toBe('');
    });

    it('o select de filtro oferece exatamente os valores que a API aceita', () => {
        const filter = SETTINGS.find((setting) => setting.id === KlipySettingId.ContentFilter);

        expect(filter?.type).toBe(SettingType.SELECT);
        expect(filter?.values?.map((value) => value.key)).toEqual([...CONTENT_FILTER_VALUES]);
    });

    it('todo rótulo e descrição aponta para uma chave que existe nos dois idiomas', () => {
        // Pega chave de i18n faltando antes de ela virar texto cru na tela do admin.
        const referenced = SETTINGS.flatMap((setting) => [
            setting.i18nLabel,
            setting.i18nDescription,
            setting.section,
            ...(setting.values ?? []).map((value) => value.i18nLabel),
        ]).filter((key): key is string => typeof key === 'string');

        for (const language of SUPPORTED_LANGUAGES) {
            for (const key of referenced) {
                expect(Object.keys(STRINGS[language])).toContain(key);
            }
        }
    });
});

describe('readKlipySettings', () => {
    it('lê uma configuração válida sem alterá-la', async () => {
        await expect(readKlipySettings(makeRead(allValid))).resolves.toEqual({
            apiKey: 'kl_valida',
            locale: 'pt_BR',
            contentFilter: 'high',
            resultLimit: 9,
            showTitle: true,
            showAttributionLink: true,
        });
    });

    it('remove espaços em volta da API Key, que são o erro de digitação mais comum', async () => {
        const settings = await readKlipySettings(
            makeRead({ ...allValid, [KlipySettingId.ApiKey]: '  kl_valida  ' }),
        );

        expect(settings.apiKey).toBe('kl_valida');
    });

    it('devolve chave vazia quando o setting nunca foi preenchido', async () => {
        const settings = await readKlipySettings(makeRead({}));

        expect(settings.apiKey).toBe('');
    });

    it('normaliza um locale inválido em vez de mandá-lo para a API', async () => {
        const settings = await readKlipySettings(
            makeRead({ ...allValid, [KlipySettingId.Locale]: 'portugues do brasil' }),
        );

        expect(settings.locale).toBe(DEFAULT_LOCALE);
    });

    it('normaliza um filtro de conteúdo fora da lista', async () => {
        const settings = await readKlipySettings(
            makeRead({ ...allValid, [KlipySettingId.ContentFilter]: 'seguro' }),
        );

        expect(settings.contentFilter).toBe(DEFAULT_CONTENT_FILTER);
    });

    it.each([
        [1, MIN_RESULT_LIMIT],
        [50, MAX_RESULT_LIMIT],
        ['abc', DEFAULT_RESULT_LIMIT],
    ])('ajusta o limite %s para %i', async (input, expected) => {
        const settings = await readKlipySettings(
            makeRead({ ...allValid, [KlipySettingId.ResultLimit]: input }),
        );

        expect(settings.resultLimit).toBe(expected);
    });

    it('trata os booleanos como ligados por padrão', async () => {
        const settings = await readKlipySettings(makeRead({}));

        expect(settings.showTitle).toBe(true);
        expect(settings.showAttributionLink).toBe(true);
    });

    it('respeita os booleanos desligados', async () => {
        const settings = await readKlipySettings(
            makeRead({
                ...allValid,
                [KlipySettingId.ShowTitle]: false,
                [KlipySettingId.ShowAttributionLink]: false,
            }),
        );

        expect(settings.showTitle).toBe(false);
        expect(settings.showAttributionLink).toBe(false);
    });
});
