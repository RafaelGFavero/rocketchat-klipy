import type { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';

import { SupportedLanguage, translate } from '../i18n/strings';
import { KLIPY_HOMEPAGE_URL } from '../settings/ids';
import type { KlipyGif } from '../types/klipy';

export interface GifAttachmentOptions {
    gif: KlipyGif;
    language: SupportedLanguage;
    showTitle: boolean;
    showAttributionLink: boolean;
}

/**
 * Atribuição ao KLIPY.
 *
 * `showAttributionLink` decide apenas se o texto vira link. O texto em si é sempre
 * incluído — desligá-lo violaria as diretrizes do KLIPY, então essa opção não existe.
 */
export function buildAttributionText(language: SupportedLanguage, withLink: boolean): string {
    const label = translate('klipy_attribution', language);

    return withLink ? `[${label}](${KLIPY_HOMEPAGE_URL})` : label;
}

/**
 * Monta o anexo publicado na sala.
 *
 * Só entram aqui campos que o App controla: a URL vem do modelo interno, já validada
 * como HTTPS, e nada de payload vindo do cliente é copiado para o anexo.
 */
export function buildGifAttachment(options: GifAttachmentOptions): IMessageAttachment {
    const { gif, language, showTitle, showAttributionLink } = options;

    const attachment: IMessageAttachment = {
        imageUrl: gif.gifUrl,
        text: buildAttributionText(language, showAttributionLink),
        // Serve de texto alternativo para leitores de tela e para clientes que não
        // conseguem renderizar a imagem.
        description: gif.title || translate('klipy_attribution', language),
    };

    if (showTitle && gif.title) {
        attachment.title = gif.pageUrl
            ? { value: gif.title, link: gif.pageUrl }
            : { value: gif.title };
    }

    return attachment;
}
