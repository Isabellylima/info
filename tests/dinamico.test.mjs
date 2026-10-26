// Empreendimentos dinâmicos a partir do HubSpot (imagem_do_empreendimento, logo, estado) — HubSpot simulado.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { limparMemoria, imagemValida } from '../src/dados.js';
import { hubspotFicticio, kvMemoria, empreendimentosFicticios } from './dados-ficticios.mjs';

const F = 'https://27006740.fs1.hubspotusercontent-eu1.net/hubfs/27006740';
const W = 'https://fercopor.pt/wp-content/uploads/2027/03';
async function pedir(registos, caminho, env = { HUBSPOT_TOKEN: 'pat-teste', INFO_KV: kvMemoria() }) {
  limparMemoria();
  const hs = hubspotFicticio({ registos });
  const original = globalThis.fetch; globalThis.fetch = hs.fetch;
  try { const r = await worker.fetch(new Request(`https://info.fercopor.workers.dev${caminho}`), env); return { r, texto: await r.text(), hs, env }; } finally { globalThis.fetch = original; }
}
const NOVO = { id: '1400000000001', properties: {
  hs_course_name: 'Atlântico Vista', estado_da_comercializacao: 'Em Comercialização',
  imagem_do_empreendimento: `${W}/Residencial_ATLANTICO.jpg`, logo: `${W}/atlantico_logo.svg`,
  brochura: `${F}/ATLANTICO/brochura-PT.pdf`, brochura_en: `${F}/ATLANTICO/brochure-EN.pdf`, plantas_disponiveis: `${F}/ATLANTICO/plantas.pdf`,
} };

test('Propriedades lidas do HubSpot: imagem_do_empreendimento e logo pedidas na pesquisa (só leitura)', async () => {
  const { hs } = await pedir(empreendimentosFicticios(), '/');
  const props = hs.pedidos[0].corpo.properties;
  assert.ok(props.includes('imagem_do_empreendimento') && props.includes('logo'));
  assert.ok(hs.pedidos.every((p) => p.url.endsWith('/search')), 'só pesquisas');
});

test('Imagens dos existentes vêm do HubSpot (capa e logótipo); cartões por ordem alfabética', async () => {
  const { texto } = await pedir(empreendimentosFicticios(), '/');
  assert.deepEqual([...texto.matchAll(/class="cartao" href="([^"]+)"/g)].map((m) => m[1]), ['/foliage', '/raiz', '/serenity']);
  for (const n of ['FOLIAGE', 'RAIZ', 'SERENITY']) {
    assert.ok(texto.includes(`src="https://fercopor.pt/wp-content/uploads/2026/01/Residencial_${n}.webp"`), n);
    assert.ok(texto.includes(`src="https://fercopor.pt/wp-content/uploads/2026/01/${n.toLowerCase()}_logo.svg" alt="${n}"`), n);
  }
});

test('Novo empreendimento em comercialização: aparece sozinho (endereço gerado e guardado), com imagem, logótipo e documentos PT/EN', async () => {
  const registos = [...empreendimentosFicticios(), NOVO];
  const inicio = await pedir(registos, '/');
  assert.deepEqual([...inicio.texto.matchAll(/class="cartao" href="([^"]+)"/g)].map((m) => m[1]), ['/atlantico-vista', '/foliage', '/raiz', '/serenity'], 'ordem alfabética');
  assert.equal(inicio.env.INFO_KV.m.get('slug:1400000000001'), 'atlantico-vista', 'endereço guardado (estável)');
  const pt = await pedir(registos, '/atlantico-vista', inicio.env);
  assert.equal(pt.r.status, 200);
  assert.ok(pt.texto.includes(`class="capa-imagem" src="${W}/Residencial_ATLANTICO.jpg"`));
  assert.ok(pt.texto.includes(`class="logo-empreendimento" src="${W}/atlantico_logo.svg" alt="Atlântico Vista"`));
  assert.ok(pt.texto.includes(`<meta property="og:image" content="${W}/Residencial_ATLANTICO.jpg">`), 'JPG do HubSpot como miniatura');
  assert.ok(pt.texto.includes(`${F}/ATLANTICO/brochura-PT.pdf`) && !pt.texto.includes('brochure-EN.pdf'));
  const en = await pedir(registos, '/atlantico-vista/en', inicio.env);
  assert.ok(en.texto.includes(`${F}/ATLANTICO/brochure-EN.pdf`) && !en.texto.includes('brochura-PT.pdf'));
  // o nome muda no HubSpot: o endereço mantém-se
  const renomeado = registos.map((r) => (r.id === NOVO.id ? { ...r, properties: { ...r.properties, hs_course_name: 'Atlântico Vista Mar' } } : r));
  assert.equal((await pedir(renomeado, '/atlantico-vista', inicio.env)).r.status, 200);
});

test('Deixa de estar em comercialização: sai da página inicial e a página fica indisponível; em desenvolvimento nunca aparece', async () => {
  const fora = [...empreendimentosFicticios(), { ...NOVO, properties: { ...NOVO.properties, estado_da_comercializacao: 'Comercialização Concluída' } }];
  const r = await pedir(fora, '/');
  assert.ok(!r.texto.includes('Atlântico') && !r.texto.includes('PÁTIO'));
  assert.equal((await pedir(fora, '/atlantico-vista')).r.status, 404);
});

test('Imagem ou logótipo vazios/inválidos: alternativa (faixa FERCOPOR, nome escrito, cartão de partilha FERCOPOR)', async () => {
  const sem = { ...NOVO, properties: { ...NOVO.properties, imagem_do_empreendimento: 'http://inseguro.exemplo/x.jpg', logo: 'javascript:alert(1)' } };
  const { texto } = await pedir([sem], '/atlantico-vista');
  assert.match(texto, /class="capa sem-imagem"/);
  assert.match(texto, /<h1><span class="logo-empreendimento-texto">Atlântico Vista<\/span><\/h1>/);
  assert.match(texto, /og:image" content="https:\/\/info\.fercopor\.workers\.dev\/partilha\/fercopor\.jpg"/);
  assert.equal(imagemValida('https://fercopor.pt/doc.pdf'), '', 'só imagens');
  assert.equal(imagemValida(' https://fercopor.pt/a.webp '), 'https://fercopor.pt/a.webp');
  const webp = await pedir([{ ...NOVO, properties: { ...NOVO.properties, imagem_do_empreendimento: `${W}/x.webp` } }], '/atlantico-vista');
  assert.match(webp.texto, /og:image" content="https:\/\/info\.fercopor\.workers\.dev\/partilha\/fercopor\.jpg"/, 'WebP não serve de miniatura (WhatsApp)');
});
