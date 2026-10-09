import {
    clampResultLimit,
    isSafeHttpsUrl,
    normalizeContentFilter,
    normalizeLocale,
    normalizeQuery,
    sanitizeUrlForLog,
    truncateTitle,
} from '../utils/validation';
import {
    DEFAULT_CONTENT_FILTER,
    DEFAULT_LOCALE,
    DEFAULT_RESULT_LIMIT,
    MAX_QUERY_LENGTH,
    MAX_RESULT_LIMIT,
    MAX_TITLE_LENGTH,
    MIN_RESULT_LIMIT,
} from '../settings/ids';

describe('normalizeQuery', () => {
    it('junta os argumentos do comando em um único termo', () => {
        expect(normalizeQuery(['bom', 'dia'])).toBe('bom dia');
    });

    it('preserva acentos e caracteres não-ASCII', () => {
        expect(normalizeQuery(['comemoração'])).toBe('comemoração');
    });

    it('devolve string vazia para consulta ausente', () => {
        expect(normalizeQuery([])).toBe('');
        expect(normalizeQuery(undefined)).toBe('');
    });

    it('devolve string vazia para consulta só com espaços', () => {
        expect(normalizeQuery(['   ', '\t', '\n'])).toBe('');
    });

    it('colapsa espaços internos repetidos', () => {
        expect(normalizeQuery(['bom', '', '   ', 'dia'])).toBe('bom dia');
    });

    it('corta consultas longas no limite máximo', () => {
        const long = 'a'.repeat(MAX_QUERY_LENGTH + 50);

        expect(normalizeQuery([long])).toHaveLength(MAX_QUERY_LENGTH);
    });

    it('não deixa espaço sobrando após o corte', () => {
        const long = `${'a'.repeat(MAX_QUERY_LENGTH - 1)} bbbbb`;

        expect(normalizeQuery([long]).endsWith(' ')).toBe(false);
    });
});

describe('isSafeHttpsUrl', () => {
    it('aceita HTTPS', () => {
        expect(isSafeHttpsUrl('https://static.klipy.com/a.gif')).toBe(true);
    });

    it.each([
        ['http', 'http://static.klipy.com/a.gif'],
        ['javascript', 'javascript:alert(1)'],
        ['data', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
        ['file', 'file:///etc/passwd'],
        ['ftp', 'ftp://klipy.com/a.gif'],
        ['protocolo relativo', '//static.klipy.com/a.gif'],
    ])('rejeita esquema %s', (_label, url) => {
        expect(isSafeHttpsUrl(url)).toBe(false);
    });

    it('rejeita valores que não são string', () => {
        expect(isSafeHttpsUrl(undefined)).toBe(false);
        expect(isSafeHttpsUrl(null)).toBe(false);
        expect(isSafeHttpsUrl(42)).toBe(false);
        expect(isSafeHttpsUrl({ url: 'https://klipy.com' })).toBe(false);
    });

    it('rejeita string vazia e lixo não parseável', () => {
        expect(isSafeHttpsUrl('')).toBe(false);
        expect(isSafeHttpsUrl('   ')).toBe(false);
        expect(isSafeHttpsUrl('não é url')).toBe(false);
        expect(isSafeHttpsUrl('https://')).toBe(false);
    });

    it('rejeita URL absurdamente longa', () => {
        expect(isSafeHttpsUrl(`https://klipy.com/${'a'.repeat(4000)}.gif`)).toBe(false);
    });

    it('é imune a maiúsculas no esquema', () => {
        expect(isSafeHttpsUrl('HTTPS://static.klipy.com/a.gif')).toBe(true);
        expect(isSafeHttpsUrl('JavaScript:alert(1)')).toBe(false);
    });

    it('recusa HTTPS fora do domínio do KLIPY', () => {
        expect(isSafeHttpsUrl('https://example.com/a.gif')).toBe(false);
        expect(isSafeHttpsUrl('https://klipy.com.example.com/a.gif')).toBe(false);
        expect(isSafeHttpsUrl('https://notklipy.com/a.gif')).toBe(false);
        expect(isSafeHttpsUrl('https://user@example.com/klipy.com/a.gif')).toBe(false);
    });

    it('aceita klipy.com e os subdomínios de mídia', () => {
        expect(isSafeHttpsUrl('https://klipy.com/gifs/festa-123')).toBe(true);
        expect(isSafeHttpsUrl('https://static2.klipy.com/ii/a.gif')).toBe(true);
    });

    it('recusa barra invertida, que outro parser lê como host diferente', () => {
        expect(isSafeHttpsUrl('https://klipy.com\\@evil.com/a.gif')).toBe(false);
    });

    it('recusa espaço, tab ou caractere de controle dentro da URL', () => {
        expect(isSafeHttpsUrl('https://static.klipy.com/a b.gif')).toBe(false);
        expect(isSafeHttpsUrl('https://static.klipy.com/a\tb.gif')).toBe(false);
        expect(isSafeHttpsUrl('https://static.klipy.com/a\x01b.gif')).toBe(false);
    });

    it('é imune a maiúsculas no host', () => {
        expect(isSafeHttpsUrl('HTTPS://STATIC.KLIPY.COM/a.gif')).toBe(true);
    });

    it('recusa host com ponto final', () => {
        expect(isSafeHttpsUrl('https://static.klipy.com./a.gif')).toBe(false);
    });
});

describe('clampResultLimit', () => {
    it('mantém valores dentro da faixa', () => {
        expect(clampResultLimit(9)).toBe(9);
    });

    it('eleva valores abaixo do mínimo', () => {
        expect(clampResultLimit(1)).toBe(MIN_RESULT_LIMIT);
        expect(clampResultLimit(0)).toBe(MIN_RESULT_LIMIT);
        expect(clampResultLimit(-5)).toBe(MIN_RESULT_LIMIT);
    });

    it('reduz valores acima do máximo', () => {
        expect(clampResultLimit(20)).toBe(MAX_RESULT_LIMIT);
        expect(clampResultLimit(999)).toBe(MAX_RESULT_LIMIT);
    });

    it('usa o padrão para valores não numéricos', () => {
        expect(clampResultLimit(undefined)).toBe(DEFAULT_RESULT_LIMIT);
        expect(clampResultLimit(null)).toBe(DEFAULT_RESULT_LIMIT);
        expect(clampResultLimit('abc')).toBe(DEFAULT_RESULT_LIMIT);
        expect(clampResultLimit(NaN)).toBe(DEFAULT_RESULT_LIMIT);
    });

    it('aceita número em string, como vem de alguns formulários', () => {
        expect(clampResultLimit('9')).toBe(9);
    });

    it('trunca frações', () => {
        expect(clampResultLimit(9.7)).toBe(9);
    });
});

describe('normalizeLocale', () => {
    it('aceita idioma com país', () => {
        expect(normalizeLocale('pt_BR')).toBe('pt_BR');
        expect(normalizeLocale('en_US')).toBe('en_US');
    });

    it('aceita idioma sozinho', () => {
        expect(normalizeLocale('es')).toBe('es');
    });

    it('converte o separador de hífen para underscore', () => {
        expect(normalizeLocale('pt-BR')).toBe('pt_BR');
    });

    it('normaliza a caixa para xx_YY', () => {
        expect(normalizeLocale('PT_br')).toBe('pt_BR');
    });

    it('usa o padrão para valores inválidos', () => {
        expect(normalizeLocale('')).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale('   ')).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale('portugues_brasil')).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale('pt_BR; DROP TABLE')).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale(123)).toBe(DEFAULT_LOCALE);
    });
});

describe('normalizeContentFilter', () => {
    it.each(['off', 'low', 'medium', 'high'])('aceita o valor documentado %s', (value) => {
        expect(normalizeContentFilter(value)).toBe(value);
    });

    it('normaliza a caixa', () => {
        expect(normalizeContentFilter('HIGH')).toBe('high');
    });

    it('usa o padrão para valores fora da lista', () => {
        expect(normalizeContentFilter('safe')).toBe(DEFAULT_CONTENT_FILTER);
        expect(normalizeContentFilter('')).toBe(DEFAULT_CONTENT_FILTER);
        expect(normalizeContentFilter(undefined)).toBe(DEFAULT_CONTENT_FILTER);
        expect(normalizeContentFilter(true)).toBe(DEFAULT_CONTENT_FILTER);
    });
});

describe('sanitizeUrlForLog', () => {
    const secret = 'AKIA-super-secreta-1234567890';

    it('remove o valor do parâmetro key', () => {
        const sanitized = sanitizeUrlForLog(
            `https://api.klipy.com/v2/search?key=${secret}&q=teste&limit=10`,
        );

        expect(sanitized).not.toContain(secret);
        expect(sanitized).toContain('key=***');
    });

    it('preserva os demais parâmetros', () => {
        const sanitized = sanitizeUrlForLog(
            `https://api.klipy.com/v2/search?key=${secret}&q=teste&limit=10`,
        );

        expect(sanitized).toContain('limit=10');
    });

    it('remove a consulta do usuário do log', () => {
        const sanitized = sanitizeUrlForLog(
            `https://api.klipy.com/v2/search?key=${secret}&q=algo%20pessoal`,
        );

        expect(sanitized).not.toContain('algo');
        expect(sanitized).toContain('q=***');
    });

    it('funciona em URL sem query string', () => {
        expect(sanitizeUrlForLog('https://api.klipy.com/v2/search')).toBe(
            'https://api.klipy.com/v2/search',
        );
    });

    it('não estoura com entrada que não é URL', () => {
        expect(() => sanitizeUrlForLog('nem url é')).not.toThrow();
    });
});

describe('truncateTitle', () => {
    it('mantém títulos curtos', () => {
        expect(truncateTitle('Festa')).toBe('Festa');
    });

    it('corta títulos longos', () => {
        expect(truncateTitle('x'.repeat(500))).toHaveLength(MAX_TITLE_LENGTH);
    });

    it('devolve string vazia para valores que não são string', () => {
        expect(truncateTitle(undefined)).toBe('');
        expect(truncateTitle(null)).toBe('');
        expect(truncateTitle(999)).toBe('');
    });

    it('remove quebras de linha, que quebrariam o layout da mensagem', () => {
        expect(truncateTitle('linha um\nlinha dois')).toBe('linha um linha dois');
    });
});
