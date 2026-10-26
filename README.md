# FERCOPOR Info

Páginas públicas de documentação comercial por empreendimento, para partilha direta (WhatsApp, e-mail, Teams).
Independente da aplicação interna Comercial FERCOPOR. Sem autenticação, sem formulários, sem JavaScript.

- `https://info.fercopor.workers.dev/` e `/en` — página inicial: galeria dos empreendimentos publicados (ordem alfabética)
- `https://info.fercopor.workers.dev/<slug>` — português
- `https://info.fercopor.workers.dev/<slug>/en` — inglês
- `https://info.fercopor.workers.dev/links.json` — lista para a futura integração «Copiar link»

## Arquitetura

Um Cloudflare Worker (`info`), publicado automaticamente a partir deste repositório (`main`).

| Ficheiro | Função |
|---|---|
| `src/index.js` | Rotas, cabeçalhos de segurança e de não indexação, atualização forçada |
| `src/dados.js` | Leitura do HubSpot (só leitura), validação dos links, endereços, cache |
| `src/paginas.js` | HTML PT/EN, Open Graph e Twitter Card |
| `src/enderecos.js` | Endereços permanentes, redirecionamentos e imagens, por ID do HubSpot |
| `public/` | Estilo, logótipo, `robots.txt`, `_headers`, imagens de partilha (JPEG) |
| `tools/gerar-imagens-partilha.mjs` | Gera os JPEG de partilha a partir das imagens oficiais (WebP) |
| `tools/servidor-local.mjs` | Servidor local com dados fictícios |

O navegador nunca contacta o HubSpot: o Worker lê os dados com um token privado e devolve só o nome e os links dos documentos.

## HubSpot (objeto Empreendimentos — Courses `0-410`)

Elegibilidade: `estado_da_comercializacao` = `Em Comercialização` (valor técnico; filtrado no pedido e verificado de novo no servidor).
«Em Desenvolvimento» e «Comercialização Concluída» não são publicados.

| Página | Propriedade |
|---|---|
| Nome | `hs_course_name` |
| Brochura — Português / Inglês | `brochura` / `brochura_en` |
| Tabela comercial — Português / Inglês | `tabela_comercial` / `tabela_comercial_en` |
| Plantas disponíveis | `plantas_disponiveis` |
| Mapa de acabamentos — Português / Inglês | `mapa_de_acabamentos` / `finishingh_maps` (nome técnico existente) |

Regras: só links `https://27006740.fs1.hubspotusercontent-eu1.net/hubfs/27006740/…`; vazio ou inválido não aparece;
um link «inglês» igual ao português não é apresentado como inglês (caso atual da brochura EN do SERENITY — a corrigir no HubSpot).

## Endereços permanentes

- `src/enderecos.js` → `ENDERECOS` (ID do HubSpot → slug) é a fonte de verdade. Um endereço publicado não muda quando o nome muda.
- Empreendimento elegível novo: endereço gerado do nome (minúsculas, sem acentos, hífenes, sem duplicados) e guardado em KV
  (`slug:<id>`). Copiar depois para `ENDERECOS` para ficar versionado.
- Mudar um endereço (só com autorização): alterar em `ENDERECOS` e acrescentar `REDIRECIONAMENTOS['antigo'] = 'novo'` (301). Nunca apagar redirecionamentos.

## Imagens

Imagens oficiais indicadas pela FERCOPOR (associadas pelo ID do registo, em `CAPAS`):
capa da página = WebP oficial de `fercopor.pt`; partilha (`og:image`) = JPEG 1200 × 795 com a mesma proporção, em `public/partilha/`
(o WebP não é aceite de forma fiável por todas as pré-visualizações). Para atualizar: mudar o URL em `CAPAS` e correr
`node tools/gerar-imagens-partilha.mjs` (Windows, Microsoft Edge). Sem imagem oficial: cartão com o logótipo FERCOPOR.

## Logótipos

Logótipos oficiais (SVG de `fercopor.pt`, em `LOGOTIPOS`, por ID) substituem o nome escrito no título da página e nos cartões; o nome fica no
título HTML, nos metadados e no texto alternativo (aparece se o logótipo não carregar). Sem logótipo: nome escrito.
Só são publicados empreendimentos com pelo menos um documento válido.

## Atualização dos materiais

A equipa atualiza os links no HubSpot; a página mostra-os em até ~10 minutos (cache em memória e KV). O endereço não muda.
Se o HubSpot falhar, mostra-se a última versão válida (até 7 dias), com a nota «A mostrar a última informação disponível»; sem
dados, página «Temporariamente indisponível» (503). Um empreendimento que deixa de ser elegível desaparece na atualização seguinte.

Atualização imediata (equipa): `curl -X POST -H "Authorization: Bearer <ATUALIZAR_TOKEN>" https://info.fercopor.workers.dev/admin/atualizar`
(sem o segredo configurado, a rota não existe).

## Não indexação

`<meta name="robots" content="noindex, nofollow">` em todas as páginas, `X-Robots-Tag: noindex, nofollow` em todas as respostas
(também imagens e `links.json`), `robots.txt` sem `Disallow: /` (os motores precisam de ler a diretiva), sem sitemap.
Os serviços de pré-visualização (WhatsApp, Teams, Facebook…) não são bloqueados. Não-indexação não é controlo de acesso:
quem tiver o link abre a página e os documentos.

## Publicação e configuração (Cloudflare › Workers › info)

1. Ligar o Worker ao repositório GitHub `Isabellylima/info` (branch `main`) — publicação automática.
2. KV `INFO_KV`: criado automaticamente na primeira publicação (aprovisionamento automático do Wrangler, sem `id` no
   `wrangler.jsonc`). Se a publicação falhar por causa do KV: criar o namespace no painel e acrescentar o `id` em `wrangler.jsonc`.
3. Segredos (Settings › Variables and Secrets, tipo **Secret**):
   - `HUBSPOT_TOKEN` — token de uma Private App HubSpot **própria**, só com leitura do objeto Courses/Empreendimentos.
   - `ATUALIZAR_TOKEN` — texto aleatório longo (opcional), para a atualização imediata.

## Integração futura com a app Comercial FERCOPOR («Copiar link»)

`GET /links.json` → `{ atualizado, empreendimentos: [{ id, nome, slug, url, urlEn }] }`, só empreendimentos elegíveis.
A app interna associa pelo `id` (ID do registo Courses que já conhece) e copia `url` (ou `urlEn`). Sem alterações à app interna nesta fase.

## Testes

`node --test tests/*.test.mjs` (HubSpot e KV simulados). Servidor local: `node tools/servidor-local.mjs` → `http://localhost:8795/serenity`.
