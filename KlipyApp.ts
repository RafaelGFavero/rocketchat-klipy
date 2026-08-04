import type { IAppAccessors, IConfigurationExtend, ILogger } from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import type { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';

import { KlipyCommand } from './commands/KlipyCommand';
import { registerSettings } from './settings/registerSettings';

/**
 * KLIPY GIFs for Rocket.Chat.
 *
 * Integração de terceiros, não oficial, com a API do KLIPY. O App não tem backend
 * próprio: o servidor Rocket.Chat do workspace fala direto com api.klipy.com usando
 * a chave que o administrador configurou.
 */
export class KlipyApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        await registerSettings(configuration);
        await configuration.slashCommands.provideSlashCommand(new KlipyCommand(this.getLogger()));
    }
}
