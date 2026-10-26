// Dados dos empreendimentos: leitura do HubSpot (só leitura), validação dos links, endereços e cache.
import { ENDERECOS, REDIRECIONAMENTOS, RESERVADOS } from './enderecos.js';

// Valor técnico da opção em «Estado da Comercialização» (confirmado no HubSpot a 2026-10-26)
export const ESTADO_PUBLICAVEL = 'Em Comercialização';
const OBJETO = '0-410';   // Empreendimentos (Courses)
// Propriedades lidas (nomes internos confirmados; «finishingh_maps» é o nome técnico existente do Finishing Maps)
const PROPRIEDADES = ['hs_course_name', 'estado_da_comercializacao', 'brochura', 'brochura_en', 'tabela_comercial',
  'tabela_comercial_en', 'plantas_disponiveis', 'mapa_de_acabamentos', 'finishingh_maps'];
const PORTAL = '27006740';
const HOSTS_PERMITIDOS = [`${PORTAL}.fs1.hubspotusercontent-eu1.net`];

export const FRESCO_MS = 10 * 60e3;          // atualização: ~10 minutos
export const RESERVA_MS = 7 * 24 * 3600e3;   // HubSpot indisponível: última versão válida até 7 dias
const CHAVE_DADOS = 'dados:v1';

let memoria = null;      // { quando, empreendimentos }
let emCurso = null;      // um só pedido ao HubSpot de cada vez por instância

export function limparMemoria() { memoria = null; emCurso = null; }

// Endereço a partir do nome: minúsculas, sem acentos, espaços → hífen, sem caracteres especiais
export function gerarSlug(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// Só links HTTPS dos ficheiros públicos do portal FERCOPOR no HubSpot; o resto é ignorado (não aparece)
export function linkValido(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  let u;
  try { u = new URL(texto); } catch { return ''; }
  if (u.protocol !== 'https:' || u.username || u.password) return '';
  if (!HOSTS_PERMITIDOS.includes(u.hostname) || !u.pathname.startsWith(`/hubfs/${PORTAL}/`)) return '';
  return u.href;
}

// Só o necessário para a página pública. Um documento «inglês» igual ao português não é apresentado como inglês.
export function materiaisDe(p) {
  const par = (pt, en) => {
    const a = linkValido(p[pt]);
    const b = linkValido(p[en]);
    return { pt: a, en: b && b !== a ? b : '', enIgualPt: Boolean(b && b === a) };
  };
  return {
    brochura: par('brochura', 'brochura_en'),
    tabela: par('tabela_comercial', 'tabela_comercial_en'),
    plantas: linkValido(p.plantas_disponiveis),
    acabamentos: par('mapa_de_acabamentos', 'finishingh_maps'),
  };
}

// Pelo menos um documento válido (sem documentos, o empreendimento não é publicado)
export function temMateriais(m) {
  return Boolean(m.plantas || [m.brochura, m.tabela, m.acabamentos].some((p) => p.pt || p.en));
}

async function lerHubSpot(env) {
  const token = String(env.HUBSPOT_TOKEN || '').trim();
  if (!token) throw new Error('HUBSPOT_TOKEN em falta');
  const resultados = [];
  let after;
  for (let pagina = 0; pagina < 5; pagina++) {
    const r = await fetch(`https://api.hubapi.com/crm/v3/objects/${OBJETO}/search`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'estado_da_comercializacao', operator: 'EQ', value: ESTADO_PUBLICAVEL }] }],
        properties: PROPRIEDADES,
        sorts: [{ propertyName: 'hs_course_name', direction: 'ASCENDING' }],
        limit: 100,
        ...(after ? { after } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`HubSpot respondeu ${r.status}`);   // sem corpo nem token nos registos
    const dados = await r.json();
    resultados.push(...(dados.results || []));
    after = dados.paging && dados.paging.next && dados.paging.next.after;
    if (!after) break;
  }
  // Segunda verificação do estado (valor técnico), além do filtro do pedido
  return resultados.filter((o) => (o.properties || {}).estado_da_comercializacao === ESTADO_PUBLICAVEL)
    .map((o) => ({ id: String(o.id), nome: String(o.properties.hs_course_name || '').trim(), materiais: materiaisDe(o.properties) }))
    .filter((e) => e.nome && temMateriais(e.materiais));
}

// Endereço de cada empreendimento: fixo (enderecos.js) → já atribuído (KV) → novo, gerado do nome e guardado
async function atribuirEnderecos(env, lista) {
  const usados = new Set([...Object.values(ENDERECOS), ...Object.keys(REDIRECIONAMENTOS), ...RESERVADOS]);
  const resultado = [];
  for (const e of lista) {
    let slug = ENDERECOS[e.id] || (env.INFO_KV ? await env.INFO_KV.get(`slug:${e.id}`) : null);
    if (!slug) {
      const base = gerarSlug(e.nome) || `empreendimento-${e.id}`;
      slug = base;
      for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
      if (env.INFO_KV) await env.INFO_KV.put(`slug:${e.id}`, slug);
    }
    usados.add(slug);
    resultado.push({ ...e, slug });
  }
  return resultado;
}

// Dados atuais: memória (10 min) → KV (10 min, partilhado) → HubSpot. Falha do HubSpot: última versão válida (≤ 7 dias),
// marcada como «reserva». Cada leitura bem-sucedida substitui a lista inteira: um empreendimento que deixa de ser
// elegível desaparece logo.
export async function obterDados(env, { forcar = false } = {}) {
  const agora = Date.now();
  if (!forcar && memoria && agora - memoria.quando < FRESCO_MS) return { ...memoria, reserva: false };
  let guardado = null;
  if (env.INFO_KV) { try { guardado = await env.INFO_KV.get(CHAVE_DADOS, 'json'); } catch { guardado = null; } }
  if (!forcar && guardado && agora - guardado.quando < FRESCO_MS) { memoria = guardado; return { ...guardado, reserva: false }; }
  if (!emCurso) {
    emCurso = (async () => {
      const lista = await atribuirEnderecos(env, await lerHubSpot(env));
      const novo = { quando: Date.now(), empreendimentos: lista };
      memoria = novo;
      if (env.INFO_KV) await env.INFO_KV.put(CHAVE_DADOS, JSON.stringify(novo), { expirationTtl: Math.ceil(RESERVA_MS / 1000) });
      return novo;
    })().finally(() => { emCurso = null; });
  }
  try {
    return { ...(await emCurso), reserva: false };
  } catch (e) {
    console.error(JSON.stringify({ evento: 'hubspot_indisponivel', erro: String(e && e.message).slice(0, 120) }));
    const reserva = [memoria, guardado].filter((x) => x && agora - x.quando < RESERVA_MS).sort((a, b) => b.quando - a.quando)[0];
    if (reserva) return { ...reserva, reserva: true };
    throw new Error('sem dados');
  }
}
