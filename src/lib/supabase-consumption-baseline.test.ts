import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { runWithData } from './operational-domain-harness';

const html = readFileSync('public/vip-ponto.html', 'utf8');

test('baseline egress: first cloud load reads seven resources, cached reload five and forced reload seven', async () => {
  const reads: string[] = [], pointDates: string[] = [], logLimits: number[] = [];
  const stored = new Map<string, any>(), localData: Record<string, any> = {};
  let queueSyncs = 0;
  const addDias = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const resultFor = (table: string) => ({ data: table === 'empregador' ? { dados: { razao: 'Empresa fictícia' } } : [] });
  const sb = { from: (table: string) => {
    reads.push(table);
    const q: any = {
      select: () => q, eq: () => q,
      gte: (_field: string, value: string) => { if (table === 'pontos') pointDates.push(value); return q; },
      lt: () => q, order: () => q, range: async () => ({ data: [] }),
      limit: (n: number) => { logLimits.push(n); return Promise.resolve({ data: [] }); },
      maybeSingle: async () => resultFor(table),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(resultFor(table)).then(resolve, reject),
    };
    return q;
  } };
  const context: Record<string, any> = {
    CONTA: 'empresa-ficticia@example.invalid', CARREGANDO: false, NUVEM_OK: false,
    stored, sb, hojeISO: () => '2026-11-10', addDias,
    sincronizarPendentes: async () => { queueSyncs++; },
    get: (k: string, fallback: unknown) => localData[k] ?? fallback,
    set: (k: string, value: unknown) => { localData[k] = value; },
    K: (k: string) => `vip:${context['CONTA']}:${k}`,
    localStorage: { setItem: () => {} }, LOGS_SESSAO: new Set(), atualizaStatus: () => {},
    chk: (r: any) => { if (r?.error) throw r.error; return r; },
    cacheEstavelTx: async (_modo: string, fn: (store: any) => any) => fn({
      get: (id: string) => ({ result: stored.get(id) }),
      put: (row: any) => { stored.set(row.id, row); return {}; },
      delete: (id: string) => { stored.delete(id); return {}; },
    }).result,
  };
  const api = runWithData('({carregarNuvem:DATA_NUCLEO.carregarNuvem,garantirHistorico:DATA_NUCLEO.garantirHistorico})', context);

  await api.carregarNuvem();
  assert.deepEqual(reads.sort(), ['dados', 'empregador', 'escala', 'feriados', 'funcionarios', 'logs', 'pontos']);
  assert.deepEqual(pointDates, ['2026-10-31']); assert.deepEqual(logLimits, [50]); assert.equal(queueSyncs, 1);
  assert.equal(stored.size, 2, 'empregador e feriados foram gravados no cache estável');

  reads.length = 0; await api.carregarNuvem();
  assert.deepEqual(reads.sort(), ['dados', 'escala', 'funcionarios', 'logs', 'pontos']);
  assert.equal(reads.filter(x => x === 'empregador' || x === 'feriados').length, 0); assert.equal(queueSyncs, 2);

  reads.length = 0; await api.carregarNuvem(true);
  assert.deepEqual(reads.sort(), ['dados', 'empregador', 'escala', 'feriados', 'funcionarios', 'logs', 'pontos']);
  assert.equal(queueSyncs, 3);
  assert.deepEqual(pointDates, ['2026-10-31', '2026-10-31', '2026-10-31']); assert.deepEqual(logLimits, [50, 50, 50]);
  assert.ok(reads.every(x => !['app_settings', 'app_config', 'support_sessions'].includes(x)), 'identidade e suporte não entram na carga periódica');

  const before = reads.length; await api.garantirHistorico('2026-11-01');
  assert.equal(reads.length, before, 'período já coberto não dispara histórico redundante');
});

test('baseline egress: retry timer sends only pending punches every 120 seconds', () => {
  const start = html.indexOf("window.addEventListener('online',async()=>{await sincronizarPendentes()");
  const source = html.slice(start, html.indexOf('async function atualizarDadosNuvem', start));
  const callbacks: Array<() => unknown> = []; let syncs = 0, companyLoads = 0;
  runInNewContext(source, {
    window: { addEventListener: () => {} },
    setInterval: (callback: () => unknown, ms: number) => { assert.equal(ms, 120000); callbacks.push(callback); },
    CONTA: 'empresa-ficticia@example.invalid', sincronizarPendentes: () => { syncs++; }, carregarNuvem: () => { companyLoads++; },
  });
  assert.equal(callbacks.length, 1); callbacks[0]?.(); assert.equal(syncs, 1); assert.equal(companyLoads, 0);
});
