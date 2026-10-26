// Gera as imagens de partilha (og:image) em JPEG a partir das imagens oficiais (WebP), sem cortar nem distorcer:
// mesma proporção da original, largura 1200 px. Também gera o cartão FERCOPOR (sem imagem de empreendimento).
// Usa o Microsoft Edge em modo headless (Windows).  Uso:  node tools/gerar-imagens-partilha.mjs
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { CAPAS, ENDERECOS } from '../src/enderecos.js';

const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SAIDA = new URL('../public/partilha/', import.meta.url);
mkdirSync(SAIDA, { recursive: true });
const LARGURA = 1200;
const QUALIDADE = 82;

const perfil = join(tmpdir(), 'fercopor-info-edge');   // perfil temporário do Edge, fora do repositório
const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9351', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let alvos;
for (let i = 0; i < 40; i++) { try { alvos = await (await fetch('http://127.0.0.1:9351/json')).json(); if (alvos.find((t) => t.type === 'page')) break; } catch { /* a arrancar */ } await espera(250); }
const ws = new WebSocket(alvos.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let n = 0; const pend = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const av = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;
await cdp('Page.enable');

async function captar(html, largura, altura, ficheiro) {
  await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
  await espera(500);
  await av(`Promise.all([...document.images].map((i) => i.decode().catch(() => null)))`);
  await espera(300);
  const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: QUALIDADE, clip: { x: 0, y: 0, width: largura, height: altura, scale: 1 } });
  writeFileSync(new URL(ficheiro, SAIDA), Buffer.from(r.result.data, 'base64'));
  console.log(ficheiro, `${largura}×${altura}`, Math.round(Buffer.from(r.result.data, 'base64').length / 1024) + ' KB');
}

const base = 'margin:0;padding:0;overflow:hidden;background:#202020';
for (const [id, url] of Object.entries(CAPAS)) {
  const img = Buffer.from(await (await fetch(url)).arrayBuffer());
  const dados = 'data:image/webp;base64,' + img.toString('base64');
  // dimensões reais da imagem, para manter a proporção
  await cdp('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(`<img id="i" src="${dados}">`).toString('base64') });
  await espera(400);
  const [w, h] = await av(`(async () => { const i = document.getElementById('i'); await i.decode(); return [i.naturalWidth, i.naturalHeight]; })()`);
  const altura = Math.round(LARGURA * h / w);
  await captar(`<body style="${base}"><img src="${dados}" style="display:block;width:${LARGURA}px;height:${altura}px"></body>`, LARGURA, altura, `${ENDERECOS[id]}.jpg`);
}
// Cartão FERCOPOR (1200 × 630) para empreendimentos sem imagem oficial: só o logótipo, sem imagens inventadas
const logo = readFileSync(new URL('../public/fercopor-logo.svg', import.meta.url)).toString('base64');
await captar(`<body style="${base};display:grid;place-items:center;width:1200px;height:630px"><img src="data:image/svg+xml;base64,${logo}" style="width:620px"></body>`, 1200, 630, 'fercopor.jpg');
ws.close(); edge.kill(); process.exit(0);
