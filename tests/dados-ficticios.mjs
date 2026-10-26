// Dados fictícios no formato da API do HubSpot (Courses 0-410), para os testes e o servidor local. Não contactam o HubSpot.
const F = 'https://27006740.fs1.hubspotusercontent-eu1.net/hubfs/27006740';

export function empreendimentosFicticios() {
  return [
    { id: '1357339027666', properties: {
      hs_course_name: 'SERENITY', estado_da_comercializacao: 'Em Comercialização',
      brochura: `${F}/SERENITY/brochura_PT.pdf`, brochura_en: `${F}/SERENITY/brochura_PT.pdf`,   // como no HubSpot: EN = PT
      tabela_comercial: `${F}/SERENITY/tabela_PT.pdf`, tabela_comercial_en: `${F}/SERENITY/price_list_EN.pdf`,
      plantas_disponiveis: `${F}/SERENITY/plantas.pdf`,
      mapa_de_acabamentos: `${F}/SERENITY/mapa_acabamentos_PT.pdf`, finishingh_maps: `${F}/SERENITY/finishing_maps_EN.pdf`,
    } },
    { id: '1357289521370', properties: {
      hs_course_name: 'RAIZ', estado_da_comercializacao: 'Em Comercialização',
      brochura: `${F}/RAIZ/brochura_PT.pdf`, brochura_en: `${F}/RAIZ/brochura_EN.pdf`,
      tabela_comercial: `${F}/RAIZ/tabela_PT.pdf`, tabela_comercial_en: `${F}/RAIZ/price_list_EN.pdf`,
      plantas_disponiveis: `${F}/RAIZ/plantas.pdf`, mapa_de_acabamentos: '', finishingh_maps: null,
    } },
    { id: '1357336474850', properties: {
      hs_course_name: 'FOLIAGE', estado_da_comercializacao: 'Em Comercialização',
      brochura: `${F}/FOLIAGE/brochura_PT.pdf`, brochura_en: `${F}/FOLIAGE/brochura_EN.pdf`,
      tabela_comercial: `${F}/FOLIAGE/tabela_PT.pdf`, tabela_comercial_en: '',
      plantas_disponiveis: 'http://inseguro.exemplo/plantas.pdf',   // link inválido: não aparece
    } },
    { id: '1357281829085', properties: { hs_course_name: 'PÁTIO', estado_da_comercializacao: 'Em Desenvolvimento', brochura: `${F}/PATIO/b.pdf` } },
    { id: '1357295795387', properties: { hs_course_name: 'LUMARE', estado_da_comercializacao: 'Comercialização Concluída', brochura: `${F}/LUMARE/b.pdf` } },
  ];
}

// fetch simulado do HubSpot: devolve TODOS os registos (para provar a segunda verificação do estado)
export function hubspotFicticio({ registos = empreendimentosFicticios(), falhar = false } = {}) {
  const estado = { pedidos: [], registos, falhar };
  estado.fetch = async (url, op = {}) => {
    const u = String(url);
    if (!u.startsWith('https://api.hubapi.com/')) throw new Error('pedido inesperado: ' + u);
    estado.pedidos.push({ url: u, corpo: JSON.parse(op.body || '{}'), autorizacao: op.headers && op.headers.Authorization });
    if (estado.falhar) return new Response('{"message":"indisponível"}', { status: 503 });
    return new Response(JSON.stringify({ total: estado.registos.length, results: estado.registos }));
  };
  return estado;
}

export function kvMemoria() {
  const m = new Map();
  return { m, async get(k, t) { const v = m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); } };
}
