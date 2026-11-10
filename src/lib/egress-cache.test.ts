import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createDataContext } from './operational-domain-harness';

const html = readFileSync('public/vip-ponto.html', 'utf8');
function cacheHarness() {
  const rows = new Map<string, any>();
  let now = 1000;
  const context: Record<string, any> = {
    Date: { now: () => now }, Map, Error, Promise,
    chk: (r: any) => { if (r.error) throw r.error; return r; },
    cacheEstavelTx: async (_modo: string, fn: (store: any) => any) => fn({
      get: (id: string) => ({ result: rows.get(id) }),
      put: (row: any) => { rows.set(row.id, row); return {}; },
      delete: (id: string) => { rows.delete(id); return {}; },
    }).result,
  };
  const api = createDataContext(context);
  return { api, advance: (ms: number) => { now += ms; } };
}

test('stable employer cache avoids repeat downloads and expires after five minutes', async () => {
  const { api, advance } = cacheHarness(); let reads = 0;
  const query = async () => ({ data: { dados: { revision: ++reads } } });
  await api.lerEstavel('owner-a', 'empregador', query);
  await api.lerEstavel('owner-a', 'empregador', query);
  assert.equal(reads, 1);
  advance(300000);
  await api.lerEstavel('owner-a', 'empregador', query);
  assert.equal(reads, 2);
});

test('stable parameters are isolated by account and explicit refresh bypasses cache', async () => {
  const { api } = cacheHarness(); let reads = 0;
  const query = async () => ({ data: [++reads] });
  await api.lerEstavel('a', 'feriados', query);
  await api.lerEstavel('b', 'feriados', query);
  assert.equal(reads, 2);
  await api.lerEstavel('a', 'feriados', query, true);
  assert.equal(reads, 3);
  await api.cacheEstavelInvalidar('a', 'feriados');
  await api.lerEstavel('a', 'feriados', query);
  assert.equal(reads, 4);
});

test('failed cloud responses are not cached and concurrent reads share a request', async () => {
  const { api } = cacheHarness(); let reads = 0;
  await assert.rejects(api.lerEstavel('a', 'feriados', async () => { throw Error('offline'); }));
  const query = async () => ({ data: [++reads] });
  await Promise.all([api.lerEstavel('a', 'feriados', query), api.lerEstavel('a', 'feriados', query)]);
  assert.equal(reads, 1);
});

test('IndexedDB upgrade preserves an existing pending-punch store', () => {
  const created: string[] = [];
  const request: any = { result: { objectStoreNames: { contains: (name: string) => name === 'fila' }, createObjectStore: (name: string) => { created.push(name); return { createIndex() {} }; } } };
  let opens = 0;
  createDataContext({ indexedDB: { open: (_: string, version: number) => { opens++; assert.equal(version, 2); return request; } } });
  assert.equal(opens, 1);
  request.onupgradeneeded();
  assert.deepEqual(created, ['config_cache']);
});

test('audit pages load fifty rows and older rows only on explicit next-page request', async () => {
  const ranges: number[][] = [];
  const rows = Array.from({ length: 50 }, (_, n) => ({ quando: '2026-11-05', por: 'Gestor', acao: String(n) }));
  const query = (table: string): any => {
    const q: any = { select: () => q, eq: () => q, order: () => q, range: (a: number, b: number) => { ranges.push([a,b]);return Promise.resolve({ data: table === 'logs' ? rows : [] }); } };
    return q;
  };
  const source = html.slice(html.indexOf('const LOGS_PAGINA='), html.indexOf('function renderLogs('));
  const open = runInNewContext(`${source};abaLogs`, { sb: { from: query }, CONTA: 'a', SHARE_DATA: null, ABA: 'logs', LOGS_CARGAS: new Map(), LOGS_SESSAO: new Set(), get: () => [], renderLogs() {}, localStorage: { setItem() {} }, chk: (r: any) => r, toast() {} });
  await open();assert.deepEqual(ranges, [[0,49],[0,49]]);
  await open(true);assert.deepEqual(ranges.slice(2), [[50,99],[50,99]]);
});

test('periodic retry still sends pending punches but never reloads kiosk company data', async () => {
  let retry = 0, loads = 0;
  const callbacks: Array<() => unknown> = [];
  const source = html.slice(html.indexOf("window.addEventListener('online',async()=>{await sincronizarPendentes()"), html.indexOf('async function atualizarDadosNuvem'));
  runInNewContext(source, { window: { addEventListener() {} }, setInterval: (cb: () => unknown, ms: number) => { assert.equal(ms,120000);callbacks.push(cb); }, CONTA: 'a', sincronizarPendentes: () => { retry++; }, carregarNuvem: () => { loads++; } });
  await callbacks[0]?.();assert.equal(retry,1);assert.equal(loads,0);
});
