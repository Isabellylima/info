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

// Imagem e logótipo vêm do HubSpot (Courses: imagem_do_empreendimento, logo), lidos em cada atualização.
// Partilha (og:image): o WhatsApp não aceita WebP de forma fiável. Para os empreendimentos abaixo há uma cópia JPEG
// (mesma proporção) gerada por tools/gerar-imagens-partilha.mjs; um empreendimento novo usa a imagem do HubSpot se for
// JPG/PNG, senão o cartão FERCOPOR.
export const IMAGENS_PARTILHA = {
  '1357339027666': { caminho: '/partilha/serenity.jpg', largura: 1200, altura: 795 },
  '1357289521370': { caminho: '/partilha/raiz.jpg', largura: 1200, altura: 795 },
  '1357336474850': { caminho: '/partilha/foliage.jpg', largura: 1200, altura: 795 },
};
// Sem imagem oficial: cartão com o logótipo FERCOPOR (não é uma imagem do empreendimento)
export const IMAGEM_GERAL = { caminho: '/partilha/fercopor.jpg', largura: 1200, altura: 630 };

// Caminhos que nunca podem ser endereços de empreendimentos
export const RESERVADOS = ['en', 'pt', 'admin', 'api', 'links.json', 'robots.txt', 'partilha', 'estilo.css', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'fercopor-logo.svg', 'sitemap.xml'];
