import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createDataContext } from './operational-domain-harness';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const modulePaths = [
  'operacional/data/armazenamento-v20261110-etapa3.js',
  'operacional/data/indexeddb-v20261110-etapa3.js',
  'operacional/data/fila-offline-v20261110-etapa3.js',
  'operacional/data/supabase-v20261110-etapa3.js',
  'operacional/data/nucleo-v20261110-etapa3.js',
];
const moduleSource = (path: string) => readFileSync('public/' + path, 'utf8');

function memoryStorage() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: (key: string) => rows.has(key) ? rows.get(key)! : null,
    setItem: (key: string, value: unknown) => { rows.set(key, String(value)); },
    removeItem: (key: string) => { rows.delete(key); },
  };
}

test('stage 3: five data modules load synchronously after the domain and before the legacy shell', () => {
  const positions = modulePaths.map(path => html.indexOf(`<script src="/${path}"></script>`));
  assert.ok(positions.every(position => position > 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(positions[0]! > html.indexOf('/operacional/domain/nucleo-v20261110-etapa2.js'));
  assert.ok(positions.at(-1)! < html.indexOf('/* ---------- utilitários ---------- */'));
  assert.equal((html.match(/PontoProOperacional\.obter\('data\.nucleo'\)\.criar\(/g) || []).length, 1);
});

test('stage 3: data modules do not replace authentication, policies, export loading or periodic polling', () => {
  const source = modulePaths.map(moduleSource).join('\n');
  assert.doesNotMatch(source, /createClient|signIn|signOut|setInterval\s*\(|garantirLib|CREATE\s+TABLE|CREATE\s+POLICY/i);
  assert.equal((html.match(/const sb = window\.supabase \? window\.supabase\.createClient\(SUPA_URL,SUPA_KEY\) : null;/g) || []).length, 1);
  assert.equal((html.match(/\bsetInterval\s*\(/g) || []).length, 3);
});

test('stage 3: global storage, queue and cloud names remain single delegating aliases', () => {
  for (const name of ['idbAbrir','idbTx','cacheEstavelTx','cacheEstavelInvalidar','lerEstavel','filaListar','filaAdd','filaRemover','janelaNuvemDesde','lerPontosNuvem','garantirHistorico','carregarNuvem','nuvemPush','nuvemPushAgora','sincronizarPendentes','filaPonto','migrarTudoSunmiParaSupabase']) {
    assert.equal((html.match(new RegExp(`function ${name}\\(`, 'g')) || []).length, 1, name);
    assert.match(html, new RegExp(`return DATA_NUCLEO\\.${name}\\(`), name);
  }
  assert.match(html, /const get = \(k,d\) => DATA_NUCLEO\.get\(k,d\);/);
  assert.match(html, /const set = \(k,v\) => DATA_NUCLEO\.set\(k,v\);/);
  assert.match(html, /enviando:DATA_NUCLEO\.sincronizando/);
});

test('stage 3: legacy storage remains isolated by account and monthly shared reads stay read-only', () => {
  const localStorage = memoryStorage();
  const context = createDataContext({ CONTA: 'conta-a', CARREGANDO: true, localStorage });
  context.DATA_NUCLEO.set('empregador', { nome: 'Empresa A' });
  context.CONTA = 'conta-b';
  context.DATA_NUCLEO.set('empregador', { nome: 'Empresa B' });
  assert.equal(context.DATA_NUCLEO.get('empregador', null)?.nome, 'Empresa B');
  context.CONTA = 'conta-a';
  assert.equal(context.DATA_NUCLEO.get('empregador', null)?.nome, 'Empresa A');
  context.SHARE_DATA = { empregador: { nome: 'Folha compartilhada' } };
  assert.equal(context.DATA_NUCLEO.get('empregador', null)?.nome, 'Folha compartilhada');
  assert.deepEqual([...localStorage.rows.keys()].sort(), ['vip:conta-a:empregador', 'vip:conta-b:empregador']);
});

test('stage 3: a new punch enters the queue and triggers immediate synchronization once', async () => {
  const punch = { nsr: '1', pin: '10', data: '2026-11-10', hora: '08:00', tipo: 'Entrada', criadoEm: '2026-11-10T11:00:00Z' };
  const added: any[] = []; let syncs = 0;
  const context = createDataContext({
    CONTA: 'conta-a', get: () => [punch],
    filaAdd: async (row: any) => { added.push(row); },
    sincronizarPendentes: async () => { syncs++; return 1; },
  });
  context.DATA_NUCLEO.filaPonto('1');
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(added, [punch]); assert.equal(syncs, 1);
});

test('stage 3: IndexedDB failure retains the full pending NSR in the legacy fallback without duplicates', async () => {
  const localStorage = memoryStorage();
  const context = createDataContext({ CONTA: 'conta-a', localStorage, idbTx: async () => { throw new Error('IDB indisponível'); } });
  const punch = { nsr: '000000001', pin: '10', data: '2026-11-10', hora: '08:00', tipo: 'Entrada' };
  await context.DATA_NUCLEO.filaAdd(punch);
  await context.DATA_NUCLEO.filaAdd(punch);
  assert.equal(localStorage.rows.get('vip:conta-a:pontos_pendentes'), '["000000001"]');
});

test('stage 3: reconnection synchronizes pending punches before one forced cloud refresh', async () => {
  const events: string[] = []; let online!: () => Promise<void>;
  const start = html.indexOf("window.addEventListener('online',async()=>{await sincronizarPendentes()");
  const source = html.slice(start, html.indexOf('// Retentativa da fila', start));
  runInNewContext(source, {
    window: { addEventListener: (name: string, callback: () => Promise<void>) => { assert.equal(name, 'online'); online = callback; } },
    CONTA: 'conta-a', CARREGANDO: false,
    sincronizarPendentes: async () => { events.push('fila'); },
    carregarNuvem: async (force: boolean) => { events.push(`carga:${force}`); },
  });
  await online();
  assert.deepEqual(events, ['fila', 'carga:true']);
});

test('stage 3: stable reads cache only employer and holidays, never punches or authorization', () => {
  const source = moduleSource(modulePaths[3]!);
  const keys = [...source.matchAll(/S\.lerEstavel\(conta,'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(keys, ['empregador', 'feriados']);
  assert.doesNotMatch(source, /S\.lerEstavel\([^\n]+(?:pontos|batidas|auth|sessao)/i);
});

test('stage 3: offline shell caches every data module and still excludes APIs and account data', () => {
  const sw = readFileSync('public/ponto-offline-sw.js', 'utf8');
  assert.match(sw, /ponto-static-20261113-triagem-matriz-v1/);
  for (const path of modulePaths) assert.ok(sw.includes(`'/${path}'`), path);
  const assets = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf('self.addEventListener'));
  assert.doesNotMatch(assets, /\/api\/|\/rest\/|\/auth\/|pontos_pendentes/);
});
