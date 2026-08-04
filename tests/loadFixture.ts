import * as fs from 'fs';
import * as path from 'path';

/**
 * Carrega uma fixture de `tests/fixtures/`.
 *
 * Por que ler do disco em vez de `import fixture from './fixtures/x.json'`:
 * o compilador do `rc-apps` varre **todos** os arquivos `.ts` do projeto — ele
 * ignora apenas `node_modules` e `.git`, e não lê o `.rcappsconfig` nessa fase —
 * e o resolvedor de módulos dele não sabe resolver `.json`. Um import de JSON em
 * qualquer teste quebraria `rc-apps package`, mesmo o teste não indo para o pacote.
 */
export function loadFixture(name: string): any {
    const file = path.join(__dirname, 'fixtures', `${name}.json`);

    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
