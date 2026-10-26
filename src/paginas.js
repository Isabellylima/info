// HTML das páginas públicas (sem JavaScript): PT e EN, metadados de partilha e diretivas de não indexação.
import { CAPAS, LOGOTIPOS, IMAGENS_PARTILHA, IMAGEM_GERAL } from './enderecos.js';

export const TEXTOS = {
  pt: {
    lang: 'pt-PT', locale: 'pt_PT', titulo: 'Documentação comercial', abrir: 'Abrir',
    descricao: (n) => `Documentação comercial do empreendimento ${n}: brochura, tabela comercial e plantas.`,
    categorias: { brochura: 'Brochura', tabela: 'Tabela comercial', plantas: 'Plantas disponíveis', acabamentos: 'Mapa de acabamentos' },
    idiomas: { pt: 'Português', en: 'Inglês' }, pdf: 'Documento PDF',
    vazio: 'A documentação deste empreendimento estará disponível brevemente.',
    reserva: 'A mostrar a última informação disponível.',
    contacte: 'Contacte-nos', telefone: 'Telefone', morada: 'Morada', redes: 'Redes sociais FERCOPOR',
    indisponivel: ['Página indisponível', 'Esta página não está disponível. Confirme o link que recebeu.'],
    erro: ['Temporariamente indisponível', 'Não foi possível carregar a documentação. Tente novamente dentro de alguns minutos.'],
    inicio: ['Documentação comercial', 'Escolha um empreendimento para consultar a brochura, a tabela comercial e as plantas.'],
    verInformacoes: 'Ver informações', semEmpreendimentos: 'De momento não há empreendimentos com documentação disponível.',
    seletor: 'Idioma',
  },
  en: {
    lang: 'en', locale: 'en_GB', titulo: 'Sales documentation', abrir: 'Open',
    descricao: (n) => `Sales documentation for ${n}: brochure, price list and floor plans.`,
    categorias: { brochura: 'Brochure', tabela: 'Price list', plantas: 'Available floor plans', acabamentos: 'Finishing maps' },
    idiomas: { pt: 'Portuguese', en: 'English' }, pdf: 'PDF document',
    vazio: 'The documentation for this development will be available soon.',
    reserva: 'Showing the latest available information.',
    contacte: 'Contact us', telefone: 'Phone', morada: 'Address', redes: 'FERCOPOR social media',
    indisponivel: ['Page unavailable', 'This page is not available. Please check the link you received.'],
    erro: ['Temporarily unavailable', 'The documentation could not be loaded. Please try again in a few minutes.'],
    inicio: ['Sales documentation', 'Choose a development to view the brochure, price list and floor plans.'],
    verInformacoes: 'View details', semEmpreendimentos: 'There are currently no developments with documentation available.',
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
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/estilo.css">
</head>`;
}

const logo = '<img class="logo" src="/fercopor-logo.svg" alt="FERCOPOR" width="153" height="24">';

function seletor(t, idioma, slug) {
  const pt = slug ? `/${slug}` : '/';
  const en = slug ? `/${slug}/en` : '/en';
  return `<nav class="idiomas" aria-label="${t.seletor}">
      <a href="${pt}" hreflang="pt" lang="pt-PT"${idioma === 'pt' ? ' aria-current="page"' : ''}>PT</a><span aria-hidden="true">|</span><a href="${en}" hreflang="en" lang="en"${idioma === 'en' ? ' aria-current="page"' : ''}>EN</a>
    </nav>`;
}

// Logótipo oficial no lugar do nome escrito (proporção original; o nome fica no texto alternativo e aparece se a
// imagem não carregar). Sem logótipo: o nome escrito.
function logotipoOuNome(e, classe) {
  const l = LOGOTIPOS[e.id];
  if (!l) return `<span class="${classe}-texto">${esc(e.nome)}</span>`;
  return `<img class="${classe}" src="${esc(l.url)}" alt="${esc(e.nome)}" decoding="async">`;
}

// Documentos do IDIOMA da página, escolhidos pela propriedade de cada idioma (nunca pelo nome do ficheiro):
//   PT: brochura · tabela_comercial · plantas_disponiveis · mapa_de_acabamentos
//   EN: brochura_en · tabela_comercial_en · plantas_disponiveis (partilhada) · finishingh_maps
// Um só documento por categoria. Sem link nesse idioma: sem cartão (o PT nunca substitui o EN).
// A cache guarda os dois idiomas; a escolha é feita aqui, em cada pedido.
export function documentosDoIdioma(m, idioma) {
  const l = idioma === 'en' ? 'en' : 'pt';
  return [
    ['brochura', m.brochura[l]],
    ['tabela', m.tabela[l]],
    ['plantas', m.plantas],
    ['acabamentos', m.acabamentos[l]],
  ].filter(([, url]) => url).map(([categoria, url]) => ({ categoria, url }));
}

export function blocosDocumentos(t, idioma, m) {
  const itens = documentosDoIdioma(m, idioma).map(({ categoria, url }) => `<li><a class="documento" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <span class="doc-icone" aria-hidden="true">PDF</span>
          <span class="doc-texto"><strong>${t.categorias[categoria]}</strong></span>
          <span class="doc-abrir">${t.abrir}<span aria-hidden="true"> ↗</span></span>
        </a></li>`);
  return itens.length ? `<section class="categoria" aria-labelledby="t-documentos">
        <h2 id="t-documentos">${t.titulo}</h2>
        <ul>${itens.join('')}</ul>
      </section>` : '';
}

// Rodapé institucional (todas as páginas): contactos, morada e redes sociais
const REDES = [
  ['Instagram', 'https://www.instagram.com/fercopor.ferreiradacosta?xtok=NG5rbGJlZmd4M2Jk',
    '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>'],
  ['Facebook', 'https://www.facebook.com/share/18WGuJvPwX/?mibextid=wwXIfr',
    '<path fill="currentColor" d="M14 8.2V6.6c0-.8.2-1.2 1.4-1.2H17V2.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.3 1.5-4.3 4.4v1.7H7.5v3.4h2.7V22H14V11.6h2.8l.4-3.4z"/>'],
  ['LinkedIn', 'https://www.linkedin.com/company/fercopor/',
    '<path fill="currentColor" d="M4.5 9h3.8v12H4.5zM6.4 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM10.6 9h3.6v1.7h.1c.5-1 1.8-2 3.7-2 3.9 0 4.6 2.6 4.6 5.9V21h-3.8v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21h-3.8z"/>'],
  ['YouTube', 'https://youtube.com/@fercopor?si=1H6uo5WnyFi9SBxN',
    '<path fill="currentColor" d="M22.5 7.2a3 3 0 0 0-2.1-2.1C18.5 4.6 12 4.6 12 4.6s-6.5 0-8.4.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8zM9.8 15.3V8.7l5.7 3.3z"/>'],
];

function rodape(t) {
  return `<footer class="rodape">
    <div class="rodape-interior">
      <div class="rodape-marca">
        <img class="rodape-logo" src="/fercopor-logo.svg" alt="FERCOPOR" width="153" height="24">
        <ul class="redes" aria-label="${t.redes}">
          ${REDES.map(([nome, url, icone]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${nome}" title="${nome}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${icone}</svg></a></li>`).join('\n          ')}
        </ul>
      </div>
      <div class="rodape-contactos">
        <h2>${t.contacte}</h2>
        <p class="rodape-empresa">FERCOPOR</p>
        <p>${t.telefone}: <a href="tel:+351226065245">(+351) 226 065 245</a></p>
        <p>E-mail: <a href="mailto:geral@fercopor.pt">geral@fercopor.pt</a></p>
      </div>
      <div class="rodape-morada">
        <p class="rodape-rotulo">${t.morada}:</p>
        <address>Porto Office Park – Avenida de Sidónio Pais, 153<br>Torre A, Piso 4, Fração 403<br>4100-467 Porto<br>Portugal</address>
      </div>
    </div>
    <p class="rodape-direitos">© FERCOPOR</p>
  </footer>`;
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
      ${capa ? `<img class="capa-imagem" src="${esc(capa)}" alt="" width="1240" height="822" fetchpriority="high" decoding="async">` : ''}
      <div class="capa-texto">
        <p class="sobretitulo">${t.titulo}</p>
        <h1>${logotipoOuNome(e, 'logo-empreendimento')}</h1>
      </div>
    </section>
    <div class="conteudo">
      ${reserva ? `<p class="aviso">${t.reserva}</p>` : ''}
      ${documentos || `<p class="vazio">${t.vazio}</p>`}
    </div>
  </main>
  ${rodape(t)}
</body>
</html>`;
}

// Página inicial: galeria dos empreendimentos publicados (ordem alfabética), em PT (/) ou EN (/en)
export function paginaInicial({ origem, empreendimentos, idioma, reserva }) {
  const t = TEXTOS[idioma];
  const [titulo, texto] = t.inicio;
  const sufixo = idioma === 'en' ? '/en' : '';
  const cartoes = empreendimentos.map((e) => {
    const capa = CAPAS[e.id];
    return `<li><a class="cartao" href="/${e.slug}${sufixo}">
          <span class="cartao-imagem">${capa ? `<img src="${esc(capa)}" alt="" width="1240" height="822" loading="lazy" decoding="async">` : ''}
            <span class="cartao-logo">${logotipoOuNome(e, 'logo-cartao')}</span></span>
          <span class="cartao-acao">${t.verInformacoes}<span aria-hidden="true"> →</span></span>
        </a></li>`;
  }).join('\n        ');
  return `${cabecalho({
    t, titulo: `FERCOPOR — ${titulo}`, descricao: texto, url: origem + (sufixo || '/'), imagem: { url: origem + IMAGEM_GERAL.caminho, largura: IMAGEM_GERAL.largura, altura: IMAGEM_GERAL.altura, alt: 'FERCOPOR' },
    alternativas: [{ lang: 'pt-PT', url: `${origem}/` }, { lang: 'en', url: `${origem}/en` }],
  })}
<body>
  <header class="topo">
    ${logo}
    ${seletor(t, idioma, '')}
  </header>
  <main class="inicio">
    <h1>${titulo}</h1>
    <p class="introducao">${texto}</p>
    ${reserva ? `<p class="aviso">${t.reserva}</p>` : ''}
    ${cartoes ? `<ul class="galeria">
        ${cartoes}
    </ul>` : `<p class="vazio">${t.semEmpreendimentos}</p>`}
  </main>
  ${rodape(t)}
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
  ${rodape(t)}
</body>
</html>`;
}
