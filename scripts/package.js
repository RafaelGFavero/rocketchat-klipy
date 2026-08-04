/**
 * Empacota o App a partir de uma cópia limpa.
 *
 * Por que não chamar `rc-apps package` direto na raiz:
 * o compilador do CLI (`@rocket.chat/apps-compiler/compiler/getAppSource.js`) varre
 * o diretório inteiro e compila **todo** arquivo `.ts` que encontrar — ignorando
 * apenas `node_modules` e `.git`, sem consultar `.rcappsconfig` nem `tsconfig.json`
 * nessa fase. Ele também usa `compilerOptions` fixas com `types: ["node"]`.
 *
 * Consequência: qualquer arquivo de teste na árvore quebra o empacotamento —
 * sem os tipos do Jest, `describe` não existe; importando `@jest/globals`, a
 * cadeia de tipos puxa `node:vm`, que o resolvedor do CLI não sabe resolver.
 *
 * A saída é a mesma de rodar o CLI na raiz de um projeto sem testes: os mesmos
 * arquivos do App, o mesmo compilador, o mesmo ZIP em `dist/`.
 *
 *   node scripts/package.js              -> pacote compilado
 *   node scripts/package.js --no-compile -> pacote com o código-fonte
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const staging = path.join(root, '.package-build');
const distDir = path.join(root, 'dist');

/**
 * Versões **exatas** de `typescript` e `@types/node` no pacote.
 *
 * Quatro submissões foram reprovadas por erro de compilação até estas duas linhas
 * ficarem certas. O compilador do Marketplace é o `TypescriptCompiler` do
 * `@rocket.chat/apps-compiler`, e ele tem três características que explicam tudo:
 *
 * 1. **Usa o TypeScript do próprio pacote** (`appRequire('typescript')`). A versão que
 *    declaramos aqui é a que compila o App lá.
 * 2. **Força `types: ["node"]`** e ignora qualquer `tsconfig.json` do App — por isso
 *    `@types/node` é obrigatório. Removê-lo derrubou a 4ª submissão: sem ele, o
 *    ambiente caiu num `@types/node` antiquíssimo (`ts3.2/globals.d.ts`) e o conflito
 *    de `Buffer` voltou.
 * 3. **Nunca resolve imports dentro de `@types/node`** — está escrito no resolver:
 *
 *        if (/node_modules\/@types\/node\/\S+\.d\.ts$/.test(containingFile)) {
 *            return resolvedModules.push(undefined);
 *        }
 *
 *    Ou seja, `Cannot find module 'undici-types'` era inevitável com qualquer
 *    `@types/node` ≥ 18.18, que é quando essa dependência foi introduzida. Não havia
 *    como declarar `undici-types` e resolver — o compilador recusa por construção.
 *
 * `18.11.19` é a última versão sem `undici-types`, e `4.9.5` é a mesma versão de
 * TypeScript que o CLI oficial embute — a combinação mais conservadora possível.
 * Ambas validadas rodando o compilador real deles contra o pacote.
 *
 * Faixas (`^`, `~`) seriam um risco: o npm resolveria versões diferentes das testadas.
 */
const COMPILER_PINS = {
    typescript: '4.9.5',
    typesNode: '18.11.19',
};

/**
 * `tsconfig.json` que vai **dentro do pacote**.
 *
 * O `TypescriptCompiler` — que é o que o Marketplace usa hoje — **ignora** este arquivo
 * e compila com opções fixas. Ele vai junto mesmo assim porque o `TscBasedCompiler`
 * (o modo `--experimental-native-compiler`) *lê* o tsconfig do App e deixa as opções
 * dele vencerem as padrão. Se o Marketplace migrar para esse compilador, o pacote já
 * está preparado; enquanto isso, o arquivo é inofensivo.
 *
 * Três submissões foram reprovadas antes de eu achar isto. O compilador que eles usam
 * (`@rocket.chat/apps-compiler`, classe `TscBasedCompiler`) faz:
 *
 *     const appTsconfigPath = path.join(sourcePath, "tsconfig.json");
 *     tsconfigJson = { ...defaults, ...parsed,
 *                      compilerOptions: { ...defaults, ...parsed.compilerOptions,
 *                                         ...NON_CONFIGURABLE } };
 *
 * Ou seja: **ele lê o tsconfig.json do App e as opções dele vencem as padrão.** Só
 * `module`, `moduleResolution` e `outDir` são inegociáveis. Como o pacote nunca levava
 * um `tsconfig.json`, o compilador caía no default — sem `skipLibCheck` e carregando
 * `@types/node` — e qualquer incompatibilidade dentro dos `.d.ts` reprovava a submissão:
 *
 *   1ª e 2ª tentativa: `Cannot find module 'undici-types'` (dependência de @types/node
 *      que o ambiente deles não instala);
 *   3ª tentativa, com @types/node fixado numa versão sem undici-types:
 *      `Interface 'Buffer' incorrectly extends 'Uint8Array<ArrayBufferLike>'` — tipos
 *      velhos demais para o TypeScript 5.7+ que eles usam.
 *
 * As duas exigências eram inconciliáveis. A saída é não carregar `@types/node`:
 * `types: []` faz o TypeScript ignorar os pacotes de tipos automáticos, e
 * `skipLibCheck` silencia qualquer `.d.ts` de dependência. O App não usa nenhuma API de
 * Node — apenas `URL`, `Date`, `Set` e `JSON` —, então não perde nada.
 *
 * `include`/`exclude` são omitidos de propósito: o compilador monta a lista de arquivos
 * a partir do que existe no pacote, e declará-los aqui sobrescreveria essa lista.
 */
const PACKAGE_TSCONFIG = {
    compilerOptions: {
        target: 'es2017',
        // URL vem da lib DOM. Sem ela, utils/validation.ts não compila.
        lib: ['es2017', 'dom'],
        // A correção central: nenhum pacote de @types é carregado automaticamente.
        types: [],
        // A segunda metade: erros dentro de .d.ts de dependências não reprovam o build.
        skipLibCheck: true,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        noImplicitReturns: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        declaration: false,
        sourceMap: false,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
    },
};

/** Tudo que compõe o App. Nada de testes, docs, scripts ou config de ferramenta. */
// package-lock.json fica de fora de propósito: o empacotador compilado não o ignora
// e ele entraria no ZIP com centenas de KB inúteis. O CLI emite um aviso por não
// encontrá-lo, que é apenas informativo.
//
// package.json também não é copiado: é **gerado** enxuto mais abaixo. Ver buildManifest.
const APP_FILES = ['app.json', 'icon.png', 'KlipyApp.ts', 'LICENSE'];

/**
 * Monta o package.json que vai dentro do pacote.
 *
 * Não é o do projeto. O servidor de build do Marketplace instala o que estiver
 * declarado aqui e compila — então declarar jest, eslint, ts-jest e o próprio CLI
 * fazia ele baixar centenas de pacotes sem relação com o App, cada um uma chance de
 * quebrar o build. Foi exatamente o que aconteceu na primeira submissão: `@types/node`
 * depende de `undici-types`, a resolução transitiva falhou no ambiente deles e a
 * revisão voltou com cinco erros de compilação.
 *
 * Aqui fica só o que é necessário para compilar o App, com `undici-types` declarado
 * explicitamente em vez de confiar na resolução transitiva.
 */
function buildManifest(source) {
    return {
        name: source.name,
        version: source.version,
        description: source.description,
        license: source.license,
        author: source.author,
        type: 'commonjs',
        devDependencies: {
            // Exigido pelo CLI e pelo servidor de build.
            '@rocket.chat/apps-engine': source.devDependencies['@rocket.chat/apps-engine'],
            // Os .d.ts do apps-engine importam ui-kit; sem ele o compilador não resolve.
            '@rocket.chat/ui-kit': source.devDependencies['@rocket.chat/ui-kit'],
            // Versões EXATAS, não faixas — ver COMPILER_PINS.
            typescript: COMPILER_PINS.typescript,
            '@types/node': COMPILER_PINS.typesNode,
        },
    };
}
const APP_DIRS = ['commands', 'services', 'settings', 'types', 'utils', 'i18n'];

function copyDir(from, to) {
    fs.mkdirSync(to, { recursive: true });

    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const target = path.join(to, entry.name);

        if (entry.isDirectory()) {
            copyDir(source, target);
        } else {
            fs.copyFileSync(source, target);
        }
    }
}

function fail(message) {
    process.stderr.write(`package: ${message}\n`);
    process.exit(1);
}

/**
 * Injeta o `tsconfig.json` no ZIP já gerado.
 *
 * Por que não basta colocá-lo na pasta de staging: o empacotador do CLI
 * (`AppPackager.GlobOptions.ignore`) tem `'**\/tsconfig.json'` na lista de arquivos
 * descartados, então ele nunca chega ao pacote — o arquivo é criado no staging e
 * silenciosamente removido na hora de zipar.
 *
 * Só que o servidor de build **lê** esse arquivo (ver PACKAGE_TSCONFIG) e é ele que
 * evita os erros de compilação. Daí a injeção depois do fato: é a única forma de o
 * tsconfig chegar lá usando o CLI oficial.
 */
function injectTsconfig(zipPath) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipPath);

    zip.addFile('tsconfig.json', Buffer.from(`${JSON.stringify(PACKAGE_TSCONFIG, null, 4)}\n`, 'utf8'));
    zip.writeZip(zipPath);

    // Sem verificação isto falharia em silêncio, que é exatamente o modo de falha que
    // custou três submissões reprovadas.
    const entries = new AdmZip(zipPath).getEntries().map((entry) => entry.entryName);

    if (!entries.includes('tsconfig.json')) {
        fail('tsconfig.json não entrou no pacote — o build do Marketplace vai falhar');
    }
}

fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

for (const file of APP_FILES) {
    const source = path.join(root, file);

    if (!fs.existsSync(source)) {
        fail(`arquivo obrigatório ausente: ${file}`);
    }

    fs.copyFileSync(source, path.join(staging, file));
}

for (const dir of APP_DIRS) {
    copyDir(path.join(root, dir), path.join(staging, dir));
}

const manifest = buildManifest(require(path.join(root, 'package.json')));

fs.writeFileSync(
    path.join(staging, 'package.json'),
    `${JSON.stringify(manifest, null, 4)}\n`,
    'utf8',
);

process.stdout.write(
    `package: manifesto enxuto — ${Object.keys(manifest.devDependencies).length} dependências ` +
        `(o projeto tem ${Object.keys(require(path.join(root, 'package.json')).devDependencies).length})\n`,
);

// O tsconfig do projeto NÃO serve aqui: ele usa types: ["node"] e exclui tests/,
// que é o que o desenvolvimento precisa. O do pacote é outro — ver PACKAGE_TSCONFIG.
fs.writeFileSync(
    path.join(staging, 'tsconfig.json'),
    `${JSON.stringify(PACKAGE_TSCONFIG, null, 4)}\n`,
    'utf8',
);

process.stdout.write('package: tsconfig.json do pacote gerado (types: [], skipLibCheck)\n');

// O compilador resolve `typescript` e `@rocket.chat/apps-engine` a partir do
// app.json. Uma junction evita duplicar centenas de megabytes.
const stagedModules = path.join(staging, 'node_modules');

try {
    fs.symlinkSync(path.join(root, 'node_modules'), stagedModules, 'junction');
} catch (error) {
    fail(`não foi possível ligar node_modules na cópia de empacotamento: ${error.message}`);
}

const passthrough = process.argv.slice(2);
const cli = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'rc-apps.cmd' : 'rc-apps');
const result = spawnSync(cli, ['package', ...passthrough], {
    cwd: staging,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

if (result.status !== 0) {
    fail(`rc-apps package terminou com código ${result.status}`);
}

const stagedDist = path.join(staging, 'dist');

if (!fs.existsSync(stagedDist)) {
    fail('rc-apps não gerou a pasta dist');
}

fs.mkdirSync(distDir, { recursive: true });

const produced = fs.readdirSync(stagedDist).filter((name) => name.endsWith('.zip'));

if (!produced.length) {
    fail('nenhum .zip foi gerado');
}

// Os dois modos produzem o mesmo nome de arquivo. Damos um sufixo ao pacote de
// código-fonte para que ele e o compilado convivam em dist/.
const sourceMode = passthrough.includes('--no-compile');

for (const name of produced) {
    const target = path.join(distDir, sourceMode ? name.replace(/\.zip$/, '_source.zip') : name);

    fs.copyFileSync(path.join(stagedDist, name), target);
    injectTsconfig(target);
    process.stdout.write(`package: ${path.relative(root, target)} (${fs.statSync(target).size} bytes)\n`);
}

// O CLI reescreve app.json com a versão do apps-engine do package.json. Se ele
// mudou algo, o app.json versionado precisa refletir isso.
const stagedAppJson = fs.readFileSync(path.join(staging, 'app.json'), 'utf8');
const rootAppJsonPath = path.join(root, 'app.json');

if (stagedAppJson !== fs.readFileSync(rootAppJsonPath, 'utf8')) {
    fs.writeFileSync(rootAppJsonPath, stagedAppJson, 'utf8');
    process.stdout.write('package: app.json atualizado pelo CLI\n');
}

fs.rmSync(staging, { recursive: true, force: true });
