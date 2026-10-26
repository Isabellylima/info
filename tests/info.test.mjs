// Testes do FERCOPOR Info: HubSpot e KV simulados (nenhum pedido sai para o HubSpot real).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { limparMemoria, gerarSlug, linkValido, FRESCO_MS } from '../src/dados.js';
import { ENDERECOS, CAPAS, IMAGENS_PARTILHA } from '../src/enderecos.js';
import { hubspotFicticio, kvMemoria, empreendimentosFicticios } from './dados-ficticios.mjs';

const TOKEN = 'pat-eu1-segredo-de-teste-0000';
function ambiente(op = {}) {
  limparMemoria();
  const hs = hubspotFicticio(op);
  const env = { HUBSPOT_TOKEN: TOKEN, INFO_KV: kvMemoria(), ...(op.env || {}) };
  return { hs, env };
}
async function pedir(a, caminho, op = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = a.hs.fetch;
  try {
    const r = await worker.fetch(new Request(`https://info.fercopor.workers.dev${caminho}`, op), a.env);
    return { r, texto: await r.text() };
  } finally { globalThis.fetch = original; }
}
const meta = (texto, prop) => (texto.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`)) || [])[1];
const links = (texto) => [...texto.matchAll(/class="documento" href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));

test('1-3. Só «Em Comercialização» (valor técnico): pedido filtrado e segunda verificação no servidor', async () => {
  const a = ambiente();
  for (const s of ['serenity', 'raiz', 'foliage']) assert.equal((await pedir(a, `/${s}`)).r.status, 200, s);
  assert.equal((await pedir(a, '/patio')).r.status, 404, 'Em Desenvolvimento');
  assert.equal((await pedir(a, '/lumare')).r.status, 404, 'Comercialização Concluída');
  const filtro = a.hs.pedidos[0].corpo.filterGroups[0].filters[0];
  assert.deepEqual(filtro, { propertyName: 'estado_da_comercializacao', operator: 'EQ', value: 'Em Comercialização' });
  assert.equal(a.hs.pedidos[0].url, 'https://api.hubapi.com/crm/v3/objects/0-410/search');
});

test('4-5. Materiais lidos das propriedades certas; vazios, inválidos e «EN igual a PT» não aparecem', async () => {
  const a = ambiente();
  const s = (await pedir(a, '/serenity')).texto;
  const F = 'https://27006740.fs1.hubspotusercontent-eu1.net/hubfs/27006740/SERENITY';
  assert.deepEqual(links(s), [`${F}/brochura_PT.pdf`, `${F}/tabela_PT.pdf`, `${F}/price_list_EN.pdf`, `${F}/plantas.pdf`, `${F}/mapa_acabamentos_PT.pdf`, `${F}/finishing_maps_EN.pdf`]);
  assert.equal((s.match(/<strong>Brochura<\/strong>/g) || []).length, 1, 'a brochura EN (= PDF PT) não é apresentada como inglesa');
  const raiz = (await pedir(a, '/raiz')).texto;
  assert.ok(!raiz.includes('Mapa de acabamentos'), 'sem mapa de acabamentos: categoria oculta');
  const foliage = (await pedir(a, '/foliage')).texto;
  assert.ok(!foliage.includes('Plantas disponíveis'), 'link http/fora do HubSpot: oculto');
  assert.ok(!foliage.includes('Tabela comercial</strong><small>Inglês'), 'tabela EN vazia: oculta');
  assert.equal(linkValido('javascript:alert(1)'), '');
  assert.equal(linkValido('https://outro.exemplo/hubfs/27006740/x.pdf'), '');
});

test('6. PT e EN: mesma estrutura, interface traduzida, idioma da página primeiro, seletor PT | EN', async () => {
  const a = ambiente();
  const pt = (await pedir(a, '/serenity')).texto;
  const en = (await pedir(a, '/serenity/en')).texto;
  assert.match(pt, /<html lang="pt-PT">/); assert.match(en, /<html lang="en">/);
  assert.match(pt, /Documentação comercial/); assert.match(en, /Sales documentation/);
  assert.match(en, /Price list<\/strong><small>English/);
  assert.ok(links(en).indexOf(links(en).find((l) => l.endsWith('price_list_EN.pdf'))) < links(en).indexOf(links(en).find((l) => l.endsWith('tabela_PT.pdf'))), 'EN primeiro');
  assert.deepEqual(links(pt).sort(), links(en).sort(), 'os mesmos documentos nos dois idiomas');
  assert.match(pt, /<a href="\/serenity" hreflang="pt" lang="pt-PT" aria-current="page">PT<\/a>/);
  assert.match(en, /<a href="\/serenity\/en" hreflang="en" lang="en" aria-current="page">EN<\/a>/);
});

test('7-8. Imagem certa por ID (capa WebP oficial; og:image JPEG) e metadados Open Graph/Twitter no HTML do servidor', async () => {
  const a = ambiente();
  const s = (await pedir(a, '/serenity')).texto;
  assert.match(s, /class="capa-imagem" src="https:\/\/fercopor\.pt\/wp-content\/uploads\/2026\/01\/Residencial_SERENITY\.webp"/);
  assert.equal(meta(s, 'og:image'), 'https://info.fercopor.workers.dev/partilha/serenity.jpg');
  assert.equal(meta(s, 'og:image:type'), 'image/jpeg');
  assert.equal(meta(s, 'og:url'), 'https://info.fercopor.workers.dev/serenity');
  assert.equal(meta(s, 'og:type'), 'website');
  assert.equal(meta(s, 'og:title'), 'SERENITY — Documentação comercial | FERCOPOR');
  assert.ok(meta(s, 'og:description').includes('SERENITY'));
  assert.equal(meta(s, 'twitter:card'), 'summary_large_image');
  assert.equal(meta(s, 'twitter:image'), 'https://info.fercopor.workers.dev/partilha/serenity.jpg');
  assert.equal(meta((await pedir(a, '/raiz/en')).texto, 'og:image'), 'https://info.fercopor.workers.dev/partilha/raiz.jpg');
  assert.equal(meta((await pedir(a, '/raiz/en')).texto, 'og:url'), 'https://info.fercopor.workers.dev/raiz/en');
  // associação pelo ID do registo, não pelo nome; ficheiros JPEG existem e têm a proporção declarada
  for (const [id, slug] of Object.entries(ENDERECOS)) {
    assert.ok(CAPAS[id].includes(`Residencial_${slug.toUpperCase()}.webp`));
    const jpg = readFileSync(new URL(`../public${IMAGENS_PARTILHA[id].caminho}`, import.meta.url));
    assert.equal(jpg[0], 0xff); assert.equal(jpg[1], 0xd8, 'JPEG');
    assert.ok(jpg.length < 300 * 1024, 'abaixo de 300 KB (WhatsApp)');
  }
  // um empreendimento com outro nome mas o mesmo ID mantém a imagem e o endereço
  const b = ambiente({ registos: empreendimentosFicticios().map((r) => (r.id === '1357339027666' ? { ...r, properties: { ...r.properties, hs_course_name: 'SERENITY Vilamoura' } } : r)) });
  const s2 = (await pedir(b, '/serenity')).texto;
  assert.match(s2, /<h1>SERENITY Vilamoura<\/h1>/);
  assert.equal(meta(s2, 'og:image'), 'https://info.fercopor.workers.dev/partilha/serenity.jpg');
});

test('9. Não indexação: meta robots e X-Robots-Tag em páginas, erros e JSON; robots.txt sem Disallow global; sem sitemap', async () => {
  const a = ambiente();
  for (const c of ['/serenity', '/serenity/en', '/nao-existe', '/', '/links.json']) {
    const { r, texto } = await pedir(a, c);
    assert.equal(r.headers.get('X-Robots-Tag'), 'noindex, nofollow', c);
    if (c !== '/links.json') assert.match(texto, /<meta name="robots" content="noindex, nofollow">/, c);
  }
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /User-agent: \*\nAllow: \//);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
  assert.doesNotMatch(robots, /^\s*Sitemap:/im, 'sem diretiva Sitemap');
  assert.match(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'), /\/\*\n {2}X-Robots-Tag: noindex, nofollow/);
});

test('10. Endereços permanentes: fixos por ID, normalizados, redirecionamentos e novos guardados em KV sem duplicar', async () => {
  assert.equal(gerarSlug('Pátio Ávila  Nº 2'), 'patio-avila-n-2');
  const a = ambiente();
  assert.equal((await pedir(a, '/Serenity')).r.status, 301);
  assert.equal((await pedir(a, '/Serenity')).r.headers.get('Location'), '/serenity');
  assert.equal((await pedir(a, '/serenity/')).r.headers.get('Location'), '/serenity');
  // novo empreendimento elegível: endereço gerado uma vez e guardado; outro com o mesmo nome não duplica
  const novos = [...empreendimentosFicticios(),
    { id: '900', properties: { hs_course_name: 'Nova Era', estado_da_comercializacao: 'Em Comercialização' } },
    { id: '901', properties: { hs_course_name: 'NOVA ERA', estado_da_comercializacao: 'Em Comercialização' } }];
  const b = ambiente({ registos: novos });
  const j = JSON.parse((await pedir(b, '/links.json')).texto);
  const slugs = j.empreendimentos.map((e) => e.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'sem duplicados');
  assert.equal(b.env.INFO_KV.m.get('slug:900'), 'nova-era');
  assert.equal(b.env.INFO_KV.m.get('slug:901'), 'nova-era-2');
  // o nome muda: o endereço guardado mantém-se
  b.hs.registos = novos.map((r) => (r.id === '900' ? { ...r, properties: { ...r.properties, hs_course_name: 'Outro Nome' } } : r));
  limparMemoria(); b.env.INFO_KV.m.delete('dados:v1');
  assert.equal(JSON.parse((await pedir(b, '/links.json')).texto).empreendimentos.find((e) => e.id === '900').slug, 'nova-era');
});

test('11. Cache de ~10 minutos: sem novos pedidos ao HubSpot dentro do prazo; depois, os links novos aparecem', async () => {
  const a = ambiente();
  await pedir(a, '/serenity'); await pedir(a, '/raiz'); await pedir(a, '/nao-existe');
  assert.equal(a.hs.pedidos.length, 1, 'um só pedido ao HubSpot');
  a.hs.registos = empreendimentosFicticios().map((r) => (r.id === '1357289521370' ? { ...r, properties: { ...r.properties, tabela_comercial: r.properties.tabela_comercial.replace('tabela_PT', 'tabela_PT_v2') } } : r));
  assert.ok(!(await pedir(a, '/raiz')).texto.includes('tabela_PT_v2'), 'ainda dentro do prazo');
  // prazo ultrapassado: a próxima visita lê o HubSpot
  const kv = a.env.INFO_KV; const d = JSON.parse(kv.m.get('dados:v1')); d.quando -= FRESCO_MS + 1000; kv.m.set('dados:v1', JSON.stringify(d));
  limparMemoria();
  assert.ok((await pedir(a, '/raiz')).texto.includes('tabela_PT_v2'), 'link atualizado');
  // estado alterado no HubSpot: a página deixa de existir na atualização seguinte
  a.hs.registos = a.hs.registos.filter((r) => r.id !== '1357289521370');
  limparMemoria(); kv.m.delete('dados:v1');
  assert.equal((await pedir(a, '/raiz')).r.status, 404);
  // atualização forçada: só com o segredo
  const b = ambiente({ env: { ATUALIZAR_TOKEN: 'segredo-de-atualizacao' } });
  assert.equal((await pedir(b, '/admin/atualizar', { method: 'POST' })).r.status, 404);
  assert.equal((await pedir(b, '/admin/atualizar', { method: 'POST', headers: { Authorization: 'Bearer errado' } })).r.status, 404);
  assert.equal((await pedir(b, '/admin/atualizar', { method: 'GET', headers: { Authorization: 'Bearer segredo-de-atualizacao' } })).r.status, 404);
  const ok = await pedir(b, '/admin/atualizar', { method: 'POST', headers: { Authorization: 'Bearer segredo-de-atualizacao' } });
  assert.equal(ok.r.status, 200);
  assert.equal(JSON.parse(ok.texto).empreendimentos, 3);
  assert.equal((await pedir(ambiente(), '/admin/atualizar', { method: 'POST', headers: { Authorization: 'Bearer ' } })).r.status, 404, 'sem segredo configurado: não existe');
});

test('12. HubSpot indisponível: última versão válida (marcada); sem dados: 503 genérico', async () => {
  const a = ambiente();
  await pedir(a, '/serenity');
  const kv = a.env.INFO_KV; const d = JSON.parse(kv.m.get('dados:v1')); d.quando -= FRESCO_MS + 1000; kv.m.set('dados:v1', JSON.stringify(d));
  limparMemoria(); a.hs.falhar = true;
  const r = await pedir(a, '/serenity');
  assert.equal(r.r.status, 200);
  assert.match(r.texto, /A mostrar a última informação disponível\./);
  const b = ambiente({ falhar: true });
  const e = await pedir(b, '/serenity');
  assert.equal(e.r.status, 503);
  assert.match(e.texto, /Temporariamente indisponível/);
  assert.doesNotMatch(e.texto, /503|HubSpot|token/i, 'sem detalhes internos');
  const sem = ambiente({ env: { HUBSPOT_TOKEN: '' } });
  assert.equal((await pedir(sem, '/serenity')).r.status, 503);
  assert.equal(sem.hs.pedidos.length, 0);
});

test('13. Token protegido: só no cabeçalho do pedido ao HubSpot; nunca nas respostas nem no código', async () => {
  const a = ambiente();
  for (const c of ['/serenity', '/serenity/en', '/links.json', '/nao-existe']) {
    const { r, texto } = await pedir(a, c);
    assert.ok(!texto.includes(TOKEN) && ![...r.headers.values()].some((v) => v.includes(TOKEN)), c);
  }
  assert.equal(a.hs.pedidos[0].autorizacao, `Bearer ${TOKEN}`);
  for (const f of ['../src/index.js', '../src/dados.js', '../src/paginas.js', '../src/enderecos.js', '../wrangler.jsonc']) {
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /pat-(na|eu)1-[0-9a-f]{4}/, f);
  }
  // a página não leva propriedades internas
  const s = (await pedir(a, '/serenity')).texto;
  assert.doesNotMatch(s, /estado_da_comercializacao|Em Comercialização|1357339027666|hs_course_name/);
});

test('14. /links.json: só elegíveis, só ID, nome, slug e endereços públicos', async () => {
  const a = ambiente();
  const { r, texto } = await pedir(a, '/links.json');
  assert.equal(r.headers.get('Content-Type'), 'application/json; charset=utf-8');
  const j = JSON.parse(texto);
  assert.deepEqual(j.empreendimentos.map((e) => e.nome).sort(), ['FOLIAGE', 'RAIZ', 'SERENITY']);
  for (const e of j.empreendimentos) assert.deepEqual(Object.keys(e).sort(), ['id', 'nome', 'slug', 'url', 'urlEn']);
  assert.deepEqual(j.empreendimentos.find((e) => e.nome === 'SERENITY'), {
    id: '1357339027666', nome: 'SERENITY', slug: 'serenity', url: 'https://info.fercopor.workers.dev/serenity', urlEn: 'https://info.fercopor.workers.dev/serenity/en',
  });
  assert.doesNotMatch(texto, /pdf|estado|hubspotusercontent/);
});

test('15. Página responsiva e segura: viewport, sem JavaScript, CSP, botões grandes; métodos e caminhos inválidos', async () => {
  const a = ambiente();
  const { r, texto } = await pedir(a, '/serenity');
  assert.match(texto, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.doesNotMatch(texto, /<script/i);
  assert.match(r.headers.get('Content-Security-Policy'), /default-src 'none'; img-src 'self' https:\/\/fercopor\.pt/);
  assert.match(texto, /target="_blank" rel="noopener noreferrer"/);
  const css = readFileSync(new URL('../public/estilo.css', import.meta.url), 'utf8');
  assert.match(css, /\.documento \{[^}]*min-height: 64px/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.equal((await pedir(a, '/serenity', { method: 'POST' })).r.status, 405);
  assert.equal((await pedir(a, '/serenity/fr')).r.status, 404);
  assert.equal((await pedir(a, '/../etc')).r.status, 404);
  const nome = ambiente({ registos: [{ id: '1357339027666', properties: { hs_course_name: '<script>x</script>', estado_da_comercializacao: 'Em Comercialização' } }] });
  assert.match((await pedir(nome, '/serenity')).texto, /<h1>&lt;script&gt;x&lt;\/script&gt;<\/h1>/, 'nome escapado');
});
