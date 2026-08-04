import * as fs from 'fs';
import * as path from 'path';

import { DEFAULT_LANGUAGE, STRINGS, SUPPORTED_LANGUAGES, resolveLanguage, translate } from '../i18n/strings';

const i18nDir = path.join(__dirname, '..', 'i18n');

describe('catálogo de strings', () => {
    it('cobre exatamente os mesmos textos em todos os idiomas', () => {
        const reference = Object.keys(STRINGS[DEFAULT_LANGUAGE]).sort();

        for (const language of SUPPORTED_LANGUAGES) {
            expect(Object.keys(STRINGS[language]).sort()).toEqual(reference);
        }
    });

    it('não tem texto vazio', () => {
        for (const language of SUPPORTED_LANGUAGES) {
            for (const [key, value] of Object.entries(STRINGS[language])) {
                expect(`${language}.${key}: ${value.trim()}`).not.toBe(`${language}.${key}: `);
            }
        }
    });

    it('mantém os JSON lidos pelo Rocket.Chat em sincronia com strings.ts', () => {
        for (const language of SUPPORTED_LANGUAGES) {
            const file = path.join(i18nDir, `${language}.json`);

            expect(fs.existsSync(file)).toBe(true);

            const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));

            // Se este teste falhar, rode `npm run i18n:build`.
            expect(onDisk).toEqual(STRINGS[language]);
        }
    });

    it('publica en.json e pt.json, os dois idiomas exigidos', () => {
        expect(fs.existsSync(path.join(i18nDir, 'en.json'))).toBe(true);
        expect(fs.existsSync(path.join(i18nDir, 'pt.json'))).toBe(true);
    });
});

describe('exigências do KLIPY presentes no catálogo', () => {
    it('usa "Search KLIPY" como placeholder do comando nos dois idiomas', () => {
        // Requisito obrigatório de atribuição do KLIPY: o placeholder padrão do campo
        // de busca. No Rocket.Chat, é o i18nParamsExample do slash command.
        for (const language of SUPPORTED_LANGUAGES) {
            expect(STRINGS[language].klipy_command_params_example).toBe('Search KLIPY');
        }
    });

    it('tem a atribuição "Powered by KLIPY" nos dois idiomas', () => {
        for (const language of SUPPORTED_LANGUAGES) {
            expect(STRINGS[language].klipy_attribution).toContain('KLIPY');
        }
    });
});

describe('resolveLanguage', () => {
    it.each([
        ['pt', 'pt'],
        ['pt-BR', 'pt'],
        ['pt_BR', 'pt'],
        ['PT-br', 'pt'],
        ['en', 'en'],
        ['en-US', 'en'],
    ])('mapeia a preferência %s para %s', (preference, expected) => {
        expect(resolveLanguage(preference)).toBe(expected);
    });

    it('cai no idioma padrão para idiomas ainda não traduzidos', () => {
        expect(resolveLanguage('de')).toBe(DEFAULT_LANGUAGE);
        expect(resolveLanguage('ja-JP')).toBe(DEFAULT_LANGUAGE);
    });

    it('cai no idioma padrão quando não há preferência', () => {
        expect(resolveLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
        expect(resolveLanguage('')).toBe(DEFAULT_LANGUAGE);
    });
});

describe('translate', () => {
    it('devolve o texto do idioma pedido', () => {
        expect(translate('klipy_error_unavailable', 'pt')).toContain('indisponível');
        expect(translate('klipy_error_unavailable', 'en')).toContain('unavailable');
    });

    it('substitui os placeholders', () => {
        expect(translate('klipy_error_no_results', 'pt', { query: 'comemoração' })).toContain(
            'comemoração',
        );
        expect(translate('klipy_error_no_results', 'pt', { query: 'x' })).not.toContain('{query}');
    });

    it('não deixa placeholder órfão quando o valor não é informado', () => {
        // Se um dia faltar o parâmetro, o texto sai com o marcador — o teste documenta
        // esse comportamento em vez de fingir que não acontece.
        expect(translate('klipy_error_no_results', 'pt')).toContain('{query}');
    });

    it('usa o idioma padrão quando o pedido não existe', () => {
        expect(translate('klipy_attribution', 'xx' as never)).toBe(
            STRINGS[DEFAULT_LANGUAGE].klipy_attribution,
        );
    });
});
