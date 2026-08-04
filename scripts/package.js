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

/** Tudo que compõe o App. Nada de testes, docs, scripts ou config de ferramenta. */
// package-lock.json fica de fora de propósito: o empacotador compilado não o ignora
// e ele entraria no ZIP com centenas de KB inúteis. O CLI emite um aviso por não
// encontrá-lo, que é apenas informativo.
const APP_FILES = ['app.json', 'icon.png', 'KlipyApp.ts', 'package.json', 'LICENSE'];
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
