// HTML das páginas públicas (sem JavaScript): PT e EN, metadados de partilha e diretivas de não indexação.
import { CAPAS, IMAGENS_PARTILHA, IMAGEM_GERAL } from './enderecos.js';

export const TEXTOS = {
  pt: {
    lang: 'pt-PT', locale: 'pt_PT', titulo: 'Documentação comercial', abrir: 'Abrir',
    descricao: (n) => `Documentação comercial do empreendimento ${n}: brochura, tabela comercial e plantas.`,
    categorias: { brochura: 'Brochura', tabela: 'Tabela comercial', plantas: 'Plantas disponíveis', acabamentos: 'Mapa de acabamentos' },
    idiomas: { pt: 'Português', en: 'Inglês' }, pdf: 'Documento PDF',
    vazio: 'A documentação deste empreendimento estará disponível brevemente.',
    reserva: 'A mostrar a última informação disponível.',
    rodape: 'Os documentos abrem num novo separador. Para mais informações, contacte o seu consultor FERCOPOR.',
    indisponivel: ['Página indisponível', 'Esta página não está disponível. Confirme o link que recebeu.'],
    erro: ['Temporariamente indisponível', 'Não foi possível carregar a documentação. Tente novamente dentro de alguns minutos.'],
    inicio: ['Documentação comercial', 'Abra o link do empreendimento que recebeu da equipa comercial FERCOPOR.'],
    seletor: 'Idioma',
  },
  en: {
    lang: 'en', locale: 'en_GB', titulo: 'Sales documentation', abrir: 'Open',
    descricao: (n) => `Sales documentation for ${n}: brochure, price list and floor plans.`,
    categorias: { brochura: 'Brochure', tabela: 'Price list', plantas: 'Available floor plans', acabamentos: 'Finishing maps' },
    idiomas: { pt: 'Portuguese', en: 'English' }, pdf: 'PDF document',
    vazio: 'The documentation for this development will be available soon.',
    reserva: 'Showing the latest available information.',
    rodape: 'Documents open in a new tab. For more information, please contact your FERCOPOR consultant.',
    indisponivel: ['Page unavailable', 'This page is not available. Please check the link you received.'],
    erro: ['Temporarily unavailable', 'The documentation could not be loaded. Please try again in a few minutes.'],
    inicio: ['Sales documentation', 'Open the development link you received from the FERCOPOR sales team.'],
    seletor: 'Language',
  },
};

export const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cabecalho({ t, titulo, descricao, url, imagem, alternativas = [] }) {
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#202020">
${url ? `<meta property="og:type" content="website">
<meta property="og:site_name" content="FERCOPOR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${t.locale}">
<meta property="og:image" content="${esc(imagem.url)}">
<meta property="og:image:secure_url" content="${esc(imagem.url)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${imagem.largura}">
<meta property="og:image:height" content="${imagem.altura}">
<meta property="og:image:alt" content="${esc(imagem.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${esc(imagem.url)}">
<meta name="twitter:image:alt" content="${esc(imagem.alt)}">
` : ''}${alternativas.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(a.url)}">`).join('\n')}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/estilo.css">
</head>`;
}

const logo = '<img class="logo" src="/fercopor-logo.svg" alt="FERCOPOR" width="153" height="24">';

function seletor(t, idioma, slug) {
  return `<nav class="idiomas" aria-label="${t.seletor}">
      <a href="/${slug}" hreflang="pt" lang="pt-PT"${idioma === 'pt' ? ' aria-current="page"' : ''}>PT</a><span aria-hidden="true">|</span><a href="/${slug}/en" hreflang="en" lang="en"${idioma === 'en' ? ' aria-current="page"' : ''}>EN</a>
    </nav>`;
}

function documento(t, url, rotulo, detalhe) {
  return `<li><a class="documento" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <span class="doc-icone" aria-hidden="true">PDF</span>
          <span class="doc-texto"><strong>${esc(rotulo)}</strong><small>${esc(detalhe)}</small></span>
          <span class="doc-abrir">${t.abrir}<span aria-hidden="true"> ↗</span></span>
        </a></li>`;
}

// Documentos por categoria; o idioma da página aparece primeiro. Sem link: o item não aparece.
export function blocosDocumentos(t, idioma, m) {
  const ordem = idioma === 'en' ? ['en', 'pt'] : ['pt', 'en'];
  const porIdioma = (cat, par) => ordem.filter((l) => par[l]).map((l) => documento(t, par[l], t.categorias[cat], t.idiomas[l]));
  const blocos = [
    ['brochura', porIdioma('brochura', m.brochura)],
    ['tabela', porIdioma('tabela', m.tabela)],
    ['plantas', m.plantas ? [documento(t, m.plantas, t.categorias.plantas, t.pdf)] : []],
    ['acabamentos', porIdioma('acabamentos', m.acabamentos)],
  ].filter(([, itens]) => itens.length);
  return blocos.map(([cat, itens]) => `<section class="categoria" aria-labelledby="c-${cat}">
        <h2 id="c-${cat}">${t.categorias[cat]}</h2>
        <ul>${itens.join('')}</ul>
      </section>`).join('\n      ');
}

export function imagemPartilha(origem, e) {
  const p = IMAGENS_PARTILHA[e.id] || IMAGEM_GERAL;
  return { url: origem + p.caminho, largura: p.largura, altura: p.altura, alt: IMAGENS_PARTILHA[e.id] ? `${e.nome} — FERCOPOR` : 'FERCOPOR' };
}

export function paginaEmpreendimento({ origem, e, idioma, reserva }) {
  const t = TEXTOS[idioma];
  const url = `${origem}/${e.slug}${idioma === 'en' ? '/en' : ''}`;
  const capa = CAPAS[e.id];
  const documentos = blocosDocumentos(t, idioma, e.materiais);
  return `${cabecalho({
    t, titulo: `${e.nome} — ${t.titulo} | FERCOPOR`, descricao: t.descricao(e.nome), url, imagem: imagemPartilha(origem, e),
    alternativas: [{ lang: 'pt-PT', url: `${origem}/${e.slug}` }, { lang: 'en', url: `${origem}/${e.slug}/en` }],
  })}
<body>
  <header class="topo">
    ${logo}
    ${seletor(t, idioma, e.slug)}
  </header>
  <main>
    <section class="capa${capa ? '' : ' sem-imagem'}">
      ${capa ? `<img class="capa-imagem" src="${esc(capa)}" alt="${esc(e.nome)}" width="1240" height="822" fetchpriority="high" decoding="async">` : ''}
      <div class="capa-texto">
        <p class="sobretitulo">${t.titulo}</p>
        <h1>${esc(e.nome)}</h1>
      </div>
    </section>
    <div class="conteudo">
      ${reserva ? `<p class="aviso">${t.reserva}</p>` : ''}
      ${documentos || `<p class="vazio">${t.vazio}</p>`}
    </div>
  </main>
  <footer class="rodape"><p>${t.rodape}</p><p>© FERCOPOR</p></footer>
</body>
</html>`;
}

export function paginaMensagem({ idioma, tipo }) {
  const t = TEXTOS[idioma];
  const [titulo, texto] = t[tipo];
  return `${cabecalho({ t, titulo: `${titulo} | FERCOPOR`, descricao: texto })}
<body class="pagina-mensagem">
  <header class="topo">${logo}</header>
  <main class="mensagem"><h1>${titulo}</h1><p>${texto}</p></main>
</body>
</html>`;
}
