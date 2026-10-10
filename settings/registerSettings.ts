import type { IConfigurationExtend, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import type { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';

import {
    CONTENT_FILTER_VALUES,
    ContentFilterValue,
    DEFAULT_CONTENT_FILTER,
    DEFAULT_LOCALE,
    DEFAULT_RESULT_LIMIT,
    KlipySettingId,
} from './ids';
import { clampResultLimit, normalizeContentFilter, normalizeLocale } from '../utils/validation';

const SECTION = 'klipy_settings_section';

export const SETTINGS: Array<ISetting> = [
    {
        id: KlipySettingId.ApiKey,
        // PASSWORD em vez de STRING: o Rocket.Chat mascara o campo na interface de
        // administração. O contrato do setting é idêntico ao de STRING.
        type: SettingType.PASSWORD,
        packageValue: '',
        required: true,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_api_key_label',
        i18nDescription: 'klipy_setting_api_key_description',
    },
    {
        id: KlipySettingId.Locale,
        type: SettingType.STRING,
        packageValue: DEFAULT_LOCALE,
        required: false,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_locale_label',
        i18nDescription: 'klipy_setting_locale_description',
    },
    {
        id: KlipySettingId.ContentFilter,
        type: SettingType.SELECT,
        packageValue: DEFAULT_CONTENT_FILTER,
        required: false,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_content_filter_label',
        i18nDescription: 'klipy_setting_content_filter_description',
        // As chaves são exatamente os valores que `/v2/search` aceita em `contentfilter`.
        values: CONTENT_FILTER_VALUES.map((key) => ({ key, i18nLabel: `klipy_setting_content_filter_${key}` })),
    },
    {
        id: KlipySettingId.ResultLimit,
        type: SettingType.NUMBER,
        packageValue: DEFAULT_RESULT_LIMIT,
        required: false,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_result_limit_label',
        i18nDescription: 'klipy_setting_result_limit_description',
    },
    {
        id: KlipySettingId.ShowTitle,
        type: SettingType.BOOLEAN,
        packageValue: true,
        required: false,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_show_title_label',
        i18nDescription: 'klipy_setting_show_title_description',
    },
    {
        id: KlipySettingId.ShowAttributionLink,
        type: SettingType.BOOLEAN,
        packageValue: true,
        required: false,
        public: false,
        section: SECTION,
        i18nLabel: 'klipy_setting_show_attribution_link_label',
        i18nDescription: 'klipy_setting_show_attribution_link_description',
    },
];

export async function registerSettings(configuration: IConfigurationExtend): Promise<void> {
    for (const setting of SETTINGS) {
        await configuration.settings.provideSetting(setting);
    }
}

export interface KlipyRuntimeSettings {
    apiKey: string;
    locale: string;
    contentFilter: ContentFilterValue;
    resultLimit: number;
    showTitle: boolean;
    showAttributionLink: boolean;
}

/**
 * Lê e valida os settings.
 *
 * Um administrador pode digitar qualquer coisa nesses campos, então nada é usado
 * cru: cada valor passa pelo normalizador correspondente antes de virar parâmetro
 * de requisição.
 */
export async function readKlipySettings(read: IRead): Promise<KlipyRuntimeSettings> {
    const settings = read.getEnvironmentReader().getSettings();

    const [apiKey, locale, contentFilter, resultLimit, showTitle, showAttributionLink] =
        await Promise.all([
            settings.getValueById(KlipySettingId.ApiKey),
            settings.getValueById(KlipySettingId.Locale),
            settings.getValueById(KlipySettingId.ContentFilter),
            settings.getValueById(KlipySettingId.ResultLimit),
            settings.getValueById(KlipySettingId.ShowTitle),
            settings.getValueById(KlipySettingId.ShowAttributionLink),
        ]);

    return {
        apiKey: typeof apiKey === 'string' ? apiKey.trim() : '',
        locale: normalizeLocale(locale),
        contentFilter: normalizeContentFilter(contentFilter),
        resultLimit: clampResultLimit(resultLimit),
        showTitle: showTitle !== false,
        showAttributionLink: showAttributionLink !== false,
    };
}
