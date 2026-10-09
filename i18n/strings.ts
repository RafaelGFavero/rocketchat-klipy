/**
 * Fonte única de todo texto visível do App.
 *
 * Existem dois consumidores com necessidades diferentes:
 *
 * 1. O **Rocket.Chat** traduz `i18nLabel`, `i18nDescription`, `i18nParamsExample` e
 *    `i18nTitle` no cliente, e para isso lê `i18n/en.json` e `i18n/pt.json`.
 * 2. O **próprio App** monta mensagens (ajuda, erros, atribuição) que o cliente não
 *    traduz — texto de mensagem é enviado pronto.
 *
 * Manter as strings aqui e gerar os JSON evita as duas cópias divergirem.
 * Regenere com `npm run i18n:build`; `tests/i18n.test.ts` falha se ficarem fora de sincronia.
 */

export const SUPPORTED_LANGUAGES = ['en', 'pt'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export type StringKey =
    | 'klipy_command_description'
    | 'klipy_command_params_example'
    | 'klipy_preview_title'
    | 'klipy_settings_section'
    | 'klipy_setting_api_key_label'
    | 'klipy_setting_api_key_description'
    | 'klipy_setting_locale_label'
    | 'klipy_setting_locale_description'
    | 'klipy_setting_content_filter_label'
    | 'klipy_setting_content_filter_description'
    | 'klipy_setting_content_filter_off'
    | 'klipy_setting_content_filter_low'
    | 'klipy_setting_content_filter_medium'
    | 'klipy_setting_content_filter_high'
    | 'klipy_setting_result_limit_label'
    | 'klipy_setting_result_limit_description'
    | 'klipy_setting_show_title_label'
    | 'klipy_setting_show_title_description'
    | 'klipy_setting_show_attribution_link_label'
    | 'klipy_setting_show_attribution_link_description'
    | 'klipy_usage'
    | 'klipy_attribution'
    | 'klipy_error_not_configured'
    | 'klipy_error_no_results'
    | 'klipy_error_auth'
    | 'klipy_error_rate_limit'
    | 'klipy_error_unavailable'
    | 'klipy_error_malformed'
    | 'klipy_error_post_failed';

export const STRINGS: Record<SupportedLanguage, Record<StringKey, string>> = {
    en: {
        klipy_command_description: 'Search and share GIFs from KLIPY. Example: /klipy congratulations',
        // Exigência de atribuição do KLIPY: "Search KLIPY" é o placeholder padrão do
        // campo de busca. No Rocket.Chat esse placeholder é o i18nParamsExample.
        // Não traduzir — é marca.
        klipy_command_params_example: 'Search KLIPY',
        klipy_preview_title: 'Powered by KLIPY',
        klipy_settings_section: 'KLIPY',
        klipy_setting_api_key_label: 'KLIPY API Key',
        klipy_setting_api_key_description:
            'Private key issued in the KLIPY Partner Panel (partner.klipy.com). It is stored only in this workspace and never appears in messages or logs.',
        klipy_setting_locale_label: 'Search language',
        klipy_setting_locale_description:
            'Language used to interpret searches, as xx or xx_YY (ISO 639-1 plus optional ISO 3166-1 country). Examples: en_US, pt_BR, es. Also the language of the app\'s help and error messages for users who have not chosen a language in their profile.',
        klipy_setting_content_filter_label: 'Content filter',
        klipy_setting_content_filter_description: 'Content safety level applied to search results.',
        klipy_setting_content_filter_off: 'Off',
        klipy_setting_content_filter_low: 'Low',
        klipy_setting_content_filter_medium: 'Medium',
        klipy_setting_content_filter_high: 'High',
        klipy_setting_result_limit_label: 'Number of results',
        klipy_setting_result_limit_description:
            'How many GIFs to offer in the preview, from 8 to 10. Rocket.Chat never displays more than 10.',
        klipy_setting_show_title_label: 'Show GIF title',
        klipy_setting_show_title_description: 'Include the KLIPY title of the GIF in the posted message.',
        klipy_setting_show_attribution_link_label: 'Link the KLIPY attribution',
        klipy_setting_show_attribution_link_description:
            'Turn the "Powered by KLIPY" attribution into a link to klipy.com. The attribution itself is always shown.',
        klipy_usage: 'Type a term to search.\n\nExample: `/klipy congratulations`',
        klipy_attribution: 'Powered by KLIPY',
        klipy_error_not_configured:
            'The KLIPY App is not configured yet. Ask an administrator to set the API Key in the App settings.',
        klipy_error_no_results: 'No GIF was found for "{query}".',
        klipy_error_auth: 'Could not authenticate with the KLIPY API. Check the App configuration.',
        klipy_error_rate_limit: 'The temporary KLIPY request limit was reached. Try again later.',
        klipy_error_unavailable: 'The GIF service is temporarily unavailable.',
        klipy_error_malformed: 'KLIPY returned an unexpected response.',
        klipy_error_post_failed: 'The GIF could not be posted in this room.',
    },
    pt: {
        klipy_command_description: 'Pesquise e compartilhe GIFs do KLIPY. Exemplo: /klipy comemoração',
        klipy_command_params_example: 'Search KLIPY',
        klipy_preview_title: 'Powered by KLIPY',
        klipy_settings_section: 'KLIPY',
        klipy_setting_api_key_label: 'API Key do KLIPY',
        klipy_setting_api_key_description:
            'Chave privada emitida no Partner Panel do KLIPY (partner.klipy.com). Fica armazenada apenas neste workspace e nunca aparece em mensagens ou logs.',
        klipy_setting_locale_label: 'Idioma da pesquisa',
        klipy_setting_locale_description:
            'Idioma usado para interpretar as pesquisas, no formato xx ou xx_YY (ISO 639-1 mais país ISO 3166-1 opcional). Exemplos: en_US, pt_BR, es. Também é o idioma das mensagens de ajuda e de erro do App para quem não escolheu idioma no perfil.',
        klipy_setting_content_filter_label: 'Filtro de conteúdo',
        klipy_setting_content_filter_description: 'Nível de segurança de conteúdo aplicado aos resultados.',
        klipy_setting_content_filter_off: 'Desligado',
        klipy_setting_content_filter_low: 'Baixo',
        klipy_setting_content_filter_medium: 'Médio',
        klipy_setting_content_filter_high: 'Alto',
        klipy_setting_result_limit_label: 'Quantidade de resultados',
        klipy_setting_result_limit_description:
            'Quantos GIFs oferecer no preview, de 8 a 10. O Rocket.Chat nunca exibe mais que 10.',
        klipy_setting_show_title_label: 'Mostrar título do GIF',
        klipy_setting_show_title_description: 'Inclui o título do GIF no KLIPY na mensagem publicada.',
        klipy_setting_show_attribution_link_label: 'Transformar a atribuição em link',
        klipy_setting_show_attribution_link_description:
            'Transforma a atribuição "Powered by KLIPY" em um link para klipy.com. A atribuição em si é sempre exibida.',
        klipy_usage: 'Digite um termo para pesquisar.\n\nExemplo: `/klipy comemoração`',
        klipy_attribution: 'Powered by KLIPY',
        klipy_error_not_configured:
            'O App KLIPY ainda não foi configurado. Solicite ao administrador que informe a API Key nas configurações do App.',
        klipy_error_no_results: 'Nenhum GIF foi encontrado para "{query}".',
        klipy_error_auth: 'Não foi possível autenticar na API do KLIPY. Verifique a configuração do App.',
        klipy_error_rate_limit: 'O limite temporário de consultas ao KLIPY foi atingido. Tente novamente mais tarde.',
        klipy_error_unavailable: 'O serviço de GIFs está temporariamente indisponível.',
        klipy_error_malformed: 'O KLIPY retornou uma resposta inesperada.',
        klipy_error_post_failed: 'Não foi possível publicar o GIF nesta sala.',
    },
};

/**
 * Escolhe o idioma a partir da preferência do usuário (`pt-BR`, `pt_br`, `pt` → `pt`).
 * Cai em `DEFAULT_LANGUAGE` para qualquer idioma que o App ainda não traduza.
 */
export function resolveLanguage(preference?: string): SupportedLanguage {
    if (!preference) {
        return DEFAULT_LANGUAGE;
    }

    const base = preference.toLowerCase().split(/[-_]/)[0];

    return (SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(base)
        ? (base as SupportedLanguage)
        : DEFAULT_LANGUAGE;
}

/** Busca a string e substitui `{placeholders}` pelos valores informados. */
export function translate(
    key: StringKey,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
    params: Record<string, string> = {},
): string {
    const template = STRINGS[language]?.[key] ?? STRINGS[DEFAULT_LANGUAGE][key];

    return Object.keys(params).reduce(
        (text, param) => text.split(`{${param}}`).join(params[param]),
        template,
    );
}
