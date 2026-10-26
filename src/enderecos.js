// Endereços permanentes (slug) por empreendimento, associados ao ID do registo no HubSpot (objeto Courses, 0-410).
// Este ficheiro é a fonte de verdade: um endereço aqui nunca muda, mesmo que o nome do empreendimento mude no HubSpot.
// Um empreendimento elegível que ainda não esteja aqui recebe um endereço gerado do nome, guardado em KV (slug:<id>)
// na primeira vez — e deve ser copiado para aqui para ficar também versionado.
export const ENDERECOS = {
  '1357339027666': 'serenity',
  '1357289521370': 'raiz',
  '1357336474850': 'foliage',
};

// Endereços antigos → atuais (redirecionamento 301). Só com alteração autorizada; nunca apagar uma entrada.
export const REDIRECIONAMENTOS = {};

// Imagens oficiais (indicadas pela FERCOPOR a 2026-10-26), associadas pelo ID do registo — nunca pelo nome.
// Capa da página: o WebP oficial. Partilha (og:image): JPEG com a mesma proporção, gerado por tools/gerar-imagens-partilha.mjs
// (o WebP não é aceite de forma fiável por todas as pré-visualizações, p. ex. WhatsApp).
export const CAPAS = {
  '1357339027666': 'https://fercopor.pt/wp-content/uploads/2026/01/Residencial_SERENITY.webp',
  '1357289521370': 'https://fercopor.pt/wp-content/uploads/2026/01/Residencial_RAIZ.webp',
  '1357336474850': 'https://fercopor.pt/wp-content/uploads/2026/01/Residencial_FOLIAGE.webp',
};
export const IMAGENS_PARTILHA = {
  '1357339027666': { caminho: '/partilha/serenity.jpg', largura: 1200, altura: 795 },
  '1357289521370': { caminho: '/partilha/raiz.jpg', largura: 1200, altura: 795 },
  '1357336474850': { caminho: '/partilha/foliage.jpg', largura: 1200, altura: 795 },
};
// Sem imagem oficial: cartão com o logótipo FERCOPOR (não é uma imagem do empreendimento)
export const IMAGEM_GERAL = { caminho: '/partilha/fercopor.jpg', largura: 1200, altura: 630 };

// Caminhos que nunca podem ser endereços de empreendimentos
export const RESERVADOS = ['en', 'pt', 'admin', 'api', 'links.json', 'robots.txt', 'partilha', 'estilo.css', 'favicon.svg', 'fercopor-logo.svg', 'sitemap.xml'];
