/**
 * Gera i18n/en.json e i18n/pt.json a partir de i18n/strings.ts.
 *
 * `strings.ts` é a fonte única: o App usa as strings em tempo de execução e o
 * Rocket.Chat lê os JSON para traduzir labels no cliente. Rode após editar strings.ts.
 *
 *   npm run i18n:build
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'i18n', 'strings.ts'), 'utf8');

// strings.ts não pode ser exigido diretamente por Node (é TypeScript), e adicionar um
// passo de compilação só para isto não se paga. Em vez de interpretar o arquivo com
// regex, delegamos ao TypeScript do próprio projeto, que já é dependência.
const ts = require('typescript');

const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
}).outputText;

const sandbox = { exports: {}, module: { exports: {} } };
new Function('exports', 'module', transpiled)(sandbox.exports, sandbox.module);

const { STRINGS, SUPPORTED_LANGUAGES } = sandbox.exports;

for (const language of SUPPORTED_LANGUAGES) {
    const target = path.join(__dirname, '..', 'i18n', `${language}.json`);
    const sorted = {};

    for (const key of Object.keys(STRINGS[language]).sort()) {
        sorted[key] = STRINGS[language][key];
    }

    fs.writeFileSync(target, `${JSON.stringify(sorted, null, 4)}\n`, 'utf8');
    process.stdout.write(`i18n: wrote ${path.relative(process.cwd(), target)}\n`);
}
