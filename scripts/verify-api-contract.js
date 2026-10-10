/**
 * Confere o contrato documentado em docs/api-contract.md contra a API real do KLIPY.
 *
 * Todo o cliente HTTP foi escrito a partir da documentação, sem nunca chamar a API.
 * Este script fecha essa lacuna: faz uma busca real, confere campo a campo o que a
 * resposta traz, e avisa se algo divergiu do contrato.
 *
 * A chave NUNCA é impressa. Ela é lida do ambiente, jamais de arquivo versionado, e
 * toda URL exibida passa pela mesma sanitização que o App usa em produção.
 *
 * Uso (PowerShell):
 *   $env:KLIPY_API_KEY = "sua-chave"; node scripts/verify-api-contract.js
 *
 * Uso (bash):
 *   KLIPY_API_KEY=sua-chave node scripts/verify-api-contract.js
 *
 * Gasta 2 das 100 requisições/hora da chave de teste.
 */

const BASE = 'https://api.klipy.com';
const MEDIA_FILTER = 'nanogif,tinygif,mediumgif,gif';
const QUERY = process.env.KLIPY_VERIFY_QUERY || 'hello';

const apiKey = (process.env.KLIPY_API_KEY || '').trim();

if (!apiKey) {
    process.stderr.write(
        'KLIPY_API_KEY não definida.\n\n' +
            'PowerShell:  $env:KLIPY_API_KEY = "sua-chave"; node scripts/verify-api-contract.js\n' +
            'bash:        KLIPY_API_KEY=sua-chave node scripts/verify-api-contract.js\n\n' +
            'A chave não é gravada em lugar nenhum e não aparece na saída.\n',
    );
    process.exit(1);
}

/** Mesma regra do App: nunca deixar credencial nem consulta chegarem à saída. */
function sanitize(text) {
    return String(text)
        .split(apiKey)
        .join('***')
        .replace(/([?&](?:key|q|ids)=)[^&\s]*/g, '$1***');
}

const findings = [];
let failed = false;

function check(ok, label, detail) {
    findings.push(`${ok ? '  ok  ' : ' FALHA'}  ${label}${detail ? ` — ${detail}` : ''}`);

    if (!ok) {
        failed = true;
    }
}

function buildUrl(path, params) {
    const query = Object.keys(params)
        .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(params[name])}`)
        .join('&');

    return `${BASE}${path}?${query}`;
}

async function call(url, label) {
    const startedAt = Date.now();
    let response;

    try {
        response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            signal: AbortSignal.timeout(10000),
        });
    } catch (error) {
        // A mensagem original costuma repetir a URL chamada, que contém a chave.
        check(false, `${label}: requisição falhou`, sanitize(error.message));
        return undefined;
    }

    const durationMs = Date.now() - startedAt;
    const text = await response.text();

    check(response.status === 200, `${label}: HTTP 200`, `recebido ${response.status} em ${durationMs} ms`);

    if (response.status !== 200) {
        // O corpo do erro costuma dizer qual parâmetro o KLIPY recusou. Sanitizado,
        // porque uma mensagem de validação pode ecoar o valor enviado.
        findings.push(`  corpo  ${label}: ${sanitize(text).slice(0, 300)}`);
        return undefined;
    }

    try {
        return JSON.parse(text);
    } catch {
        check(false, `${label}: corpo é JSON`, `${text.slice(0, 80)}…`);
        return undefined;
    }
}

/** Regra de host de isSafeHttpsUrl (utils/validation.ts): klipy.com ou subdomínio. */
function isKlipyHttpsUrl(url) {
    try {
        const { protocol, hostname } = new URL(url);

        return protocol === 'https:' && (hostname === 'klipy.com' || hostname.endsWith('.klipy.com'));
    } catch {
        return false;
    }
}

function inspectItem(item, label) {
    check(item.id !== undefined, `${label}: tem id`, `tipo ${typeof item.id}`);
    check('title' in item, `${label}: tem title`);
    check(
        item.media_formats && typeof item.media_formats === 'object',
        `${label}: tem media_formats`,
    );

    if (!item.media_formats) {
        return;
    }

    const formats = Object.keys(item.media_formats);
    const expected = ['gif', 'mediumgif', 'tinygif', 'nanogif'];
    const missing = expected.filter((name) => !formats.includes(name));

    check(
        missing.length === 0,
        `${label}: media_filter respeitado`,
        missing.length ? `faltando ${missing.join(', ')}` : `formatos: ${formats.join(', ')}`,
    );

    const extra = formats.filter((name) => !expected.includes(name));

    if (extra.length) {
        findings.push(`  nota  ${label}: formatos além do pedido — ${extra.join(', ')}`);
    }

    for (const name of expected.filter((format) => formats.includes(format))) {
        const media = item.media_formats[name];

        check(
            typeof media?.url === 'string' && isKlipyHttpsUrl(media.url),
            `${label}.${name}: url HTTPS em klipy.com`,
        );
        check(
            Array.isArray(media?.dims) && media.dims.length === 2,
            `${label}.${name}: dims é tupla [w,h]`,
            Array.isArray(media?.dims) ? `[${media.dims}]` : `veio ${typeof media?.dims}`,
        );
    }
}

async function main() {
    process.stdout.write(`Conferindo o contrato contra a API real do KLIPY (q="${QUERY}")\n\n`);

    /* ---------------------------- /v2/search ---------------------------- */

    const searchUrl = buildUrl('/v2/search', {
        key: apiKey,
        q: QUERY,
        limit: '10',
        locale: 'pt_BR',
        contentfilter: 'medium',
        media_filter: MEDIA_FILTER,
    });

    process.stdout.write(`GET ${sanitize(searchUrl)}\n`);

    const search = await call(searchUrl, '/v2/search');

    if (!search) {
        report();
        return;
    }

    check(Array.isArray(search.results), '/v2/search: results é array');
    check('next' in search, '/v2/search: tem next');

    if (!Array.isArray(search.results) || !search.results.length) {
        check(false, '/v2/search: trouxe resultados', 'lista vazia — tente outro termo');
        report();
        return;
    }

    check(search.results.length <= 10, '/v2/search: respeitou limit=10', `${search.results.length} itens`);
    inspectItem(search.results[0], '/v2/search[0]');

    const known = new Set([
        'id', 'title', 'media_formats', 'created', 'content_description', 'itemurl',
        'url', 'tags', 'flags', 'hasaudio', 'content_description_source',
    ]);
    const unknown = Object.keys(search.results[0]).filter((field) => !known.has(field));

    if (unknown.length) {
        findings.push(`  nota  campos não documentados em docs/api-contract.md: ${unknown.join(', ')}`);
    }

    /* ----------------------------- /v2/posts ---------------------------- */

    // Sem media_filter de propósito: /v2/posts recusa nanogif e mediumgif com 422.
    const id = String(search.results[0].id);
    const postsUrl = buildUrl('/v2/posts', { key: apiKey, ids: id });

    process.stdout.write(`GET ${sanitize(postsUrl)}\n`);

    const posts = await call(postsUrl, '/v2/posts');

    if (posts) {
        check(Array.isArray(posts.results), '/v2/posts: results é array');

        const found = Array.isArray(posts.results)
            ? posts.results.find((item) => String(item.id) === id)
            : undefined;

        // É disto que depende a estratégia de seleção segura do App: sem uma
        // re-consulta confiável por id, a URL publicada teria de vir do cliente.
        check(Boolean(found), '/v2/posts: devolve o mesmo id pedido');

        if (found) {
            inspectItem(found, '/v2/posts[0]');
        }
    }

    report();
}

function report() {
    process.stdout.write(`\n${findings.join('\n')}\n\n`);

    if (failed) {
        process.stdout.write(
            'Houve divergência. Corrija services/KlipyClient.ts, utils/media.ts e\n' +
                'docs/api-contract.md antes de submeter ao Marketplace.\n',
        );
        process.exit(1);
    }

    process.stdout.write('Contrato confirmado. docs/api-contract.md corresponde à API real.\n');
}

main().catch((error) => {
    process.stderr.write(`${sanitize(error && error.stack ? error.stack : error)}\n`);
    process.exit(1);
});
