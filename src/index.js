// FERCOPOR Info — páginas públicas de documentação comercial por empreendimento (Cloudflare Worker).
// Rotas: /<slug> (PT) · /<slug>/en (EN) · /links.json · /robots.txt (ficheiro estático) · POST /admin/atualizar (protegido).
// Os ficheiros de public/ (estilo, logótipo, imagens de partilha) são servidos diretamente pelo Cloudflare.
import { obterDados } from './dados.js';
import { REDIRECIONAMENTOS } from './enderecos.js';
import { paginaEmpreendimento, paginaInicial, paginaMensagem } from './paginas.js';

const SEGURANCA = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; img-src 'self' https:; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function html(corpo, estado = 200, extra = {}) {
  return new Response(corpo, { status: estado, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...SEGURANCA, ...extra } });
}
function json(dados, estado = 200) {
  return new Response(JSON.stringify(dados), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...SEGURANCA } });
}
const redirecionar = (destino) => new Response(null, { status: 301, headers: { Location: destino, ...SEGURANCA } });

// Comparação em tempo constante (hash SHA-256 dos dois lados)
async function igual(a, b) {
  const h = async (t) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0 && a.length === b.length;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origem = url.origin;
    const m = request.method;

    // Atualização forçada da cache (equipa): só com o segredo ATUALIZAR_TOKEN; sem segredo, a rota não existe
    if (url.pathname === '/admin/atualizar') {
      const segredo = String(env.ATUALIZAR_TOKEN || '');
      const dado = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!segredo || m !== 'POST' || !(await igual(dado, segredo))) return paginaNaoEncontrada('pt');
      try {
        const d = await obterDados(env, { forcar: true });
        return json({ atualizado: new Date(d.quando).toISOString(), empreendimentos: d.empreendimentos.length, reserva: d.reserva });
      } catch { return json({ erro: 'HubSpot indisponível' }, 503); }
    }

    if (m !== 'GET' && m !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', ...SEGURANCA } });

    // Endereços normalizados: minúsculas e sem barra final
    const caminho = url.pathname;
    if (caminho !== '/' && (caminho.endsWith('/') || caminho !== caminho.toLowerCase())) {
      return redirecionar(caminho.toLowerCase().replace(/\/+$/, '') || '/');
    }

    // Página inicial: galeria dos empreendimentos publicados (PT em /, EN em /en)
    if (caminho === '/' || caminho === '/en') {
      const idiomaInicio = caminho === '/en' ? 'en' : 'pt';
      try {
        const d = await obterDados(env);
        const lista = [...d.empreendimentos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
        return html(paginaInicial({ origem, empreendimentos: lista, idioma: idiomaInicio, reserva: d.reserva }), 200, { 'Content-Language': idiomaInicio === 'en' ? 'en' : 'pt-PT' });
      } catch {
        return html(paginaMensagem({ idioma: idiomaInicio, tipo: 'erro' }), 503, { 'Retry-After': '300', 'Cache-Control': 'no-store' });
      }
    }

    if (caminho === '/links.json') {
      try {
        const d = await obterDados(env);
        // Só o necessário para o botão «Copiar link» da app interna: ID do registo, nome e endereços públicos
        return json({
          atualizado: new Date(d.quando).toISOString(),
          empreendimentos: d.empreendimentos.map((e) => ({ id: e.id, nome: e.nome, slug: e.slug, url: `${origem}/${e.slug}`, urlEn: `${origem}/${e.slug}/en` })),
        });
      } catch { return json({ erro: 'Temporariamente indisponível' }, 503); }
    }

    const partes = caminho.slice(1).split('/');
    if (partes.length > 2 || (partes.length === 2 && partes[1] !== 'en') || !/^[a-z0-9-]{1,60}$/.test(partes[0])) return paginaNaoEncontrada(partes[1] === 'en' ? 'en' : 'pt');
    const [slug, sufixo] = partes;
    const idioma = sufixo === 'en' ? 'en' : 'pt';
    if (REDIRECIONAMENTOS[slug]) return redirecionar(`/${REDIRECIONAMENTOS[slug]}${sufixo ? '/en' : ''}`);

    let dados;
    try { dados = await obterDados(env); } catch {
      return html(paginaMensagem({ idioma, tipo: 'erro' }), 503, { 'Retry-After': '300', 'Cache-Control': 'no-store' });
    }
    const e = dados.empreendimentos.find((x) => x.slug === slug);
    // Inexistente ou não elegível: a mesma resposta (sem revelar se o empreendimento existe)
    if (!e) return paginaNaoEncontrada(idioma);
    return html(paginaEmpreendimento({ origem, e, idioma, reserva: dados.reserva }), 200, { 'Content-Language': idioma === 'en' ? 'en' : 'pt-PT' });
  },
};

function paginaNaoEncontrada(idioma) {
  return html(paginaMensagem({ idioma, tipo: 'indisponivel' }), 404, { 'Cache-Control': 'public, max-age=60' });
}
