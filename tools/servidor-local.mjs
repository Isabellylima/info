// Servidor local para ver as páginas com dados FICTÍCIOS (nunca contacta o HubSpot).  Uso: node tools/servidor-local.mjs [porta]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
import { hubspotFicticio, kvMemoria } from '../tests/dados-ficticios.mjs';

const porta = Number(process.argv[2] || 8795);
const raiz = fileURLToPath(new URL('../public/', import.meta.url));
const tipos = { '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' };
const hubspot = hubspotFicticio();
globalThis.fetch = ((original) => (url, op) => (String(url).startsWith('https://api.hubapi.com/') ? hubspot.fetch(url, op) : original(url, op)))(globalThis.fetch);
const env = { HUBSPOT_TOKEN: 'token-ficticio', INFO_KV: kvMemoria() };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${porta}`);
  const ficheiro = normalize(join(raiz, url.pathname));
  if (ficheiro.startsWith(raiz) && extname(ficheiro) && extname(ficheiro) !== '.json') {
    try { res.writeHead(200, { 'Content-Type': tipos[extname(ficheiro)] || 'application/octet-stream' }); return res.end(await readFile(ficheiro)); } catch { /* segue para o Worker */ }
  }
  const r = await worker.fetch(new Request(url, { method: req.method }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(porta, () => console.log(`FERCOPOR Info (dados fictícios) em http://localhost:${porta}/serenity`));
