import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDataContext, runWithData } from './operational-domain-harness';

type Punch = { pin: string; data: string; hora: string; tipo: string; nsr: string; criadoEm: string; fonte: string };
const punch = (n: number): Punch => ({
  pin: '1', data: '2026-11-09', hora: '23:59', tipo: 'Entrada', nsr: String(n), criadoEm: `2026-11-10T02:59:${String(n % 60).padStart(2, '0')}Z`, fonte: 'LOCAL',
});

function harness(initial: Punch[], localPending: string[] = []) {
  const queue = [...initial];
  let pending = [...localPending];
  const localPunches = [...initial];
  const uploaded = new Map<string, any>();
  const batches: Punch[][] = [];
  const conflictOptions: { onConflict: string }[] = [];
  let failOnBatch = 0;
  const context: Record<string, any> = {
    CONTA: 'empresa-ficticia@example.invalid', NUVEM_OK: false,
    filaListar: async () => [...queue], pendentesLS: () => [...pending], get: () => localPunches,
    filaRemover: async (nsrs: string[]) => {
      for (let i = queue.length - 1; i >= 0; i--) {
        const item = queue[i]; if (item && nsrs.includes(item.nsr)) queue.splice(i, 1);
      }
    },
    salvaPendentes: (nsrs: string[]) => { pending = [...nsrs]; },
    chk: (r: any) => { if (r?.error) throw r.error; return r; }, atualizaStatus: () => {},
  };
  context['sb'] = { from: (table: string) => {
    assert.equal(table, 'pontos');
    return { upsert: async (rows: any[], options: unknown) => {
      batches.push(rows); conflictOptions.push(options as { onConflict: string });
      if (failOnBatch === batches.length) return { error: new Error('conexão simulada indisponível') };
      for (const row of rows) uploaded.set(row.email_dono + '|' + row.nsr, row);
      return { data: [] };
    } };
  } };
  const run = () => runWithData('DATA_NUCLEO.sincronizarPendentes()', context);
  return { context, queue, localPunches, uploaded, batches, conflictOptions, run,
    get pending() { return pending; }, failOnNext(batch: number) { failOnBatch = batch; },
  };
}

test('baseline queue: IndexedDB and legacy fallback deduplicate by NSR and preserve the civil timestamp', async () => {
  const original = punch(1);
  const second = { ...punch(2), hora: '00:10', data: '2026-11-10', tipo: 'Saída', criadoEm: '2026-11-10T03:10:00Z' };
  const h = harness([original, second], ['1']);
  const originalCopy = JSON.stringify([original, second]);
  assert.equal(await h.run(), 2);
  assert.equal(h.batches.length, 1); assert.equal(h.batches[0]?.length, 2); assert.equal(h.uploaded.size, 2);
  assert.equal(h.uploaded.get('empresa-ficticia@example.invalid|1').timestamp, original.criadoEm);
  assert.equal(h.uploaded.get('empresa-ficticia@example.invalid|1').dados.data, original.data);
  assert.equal(h.conflictOptions.length, 1); assert.equal(h.conflictOptions[0]?.onConflict, 'email_dono,nsr');
  assert.equal(h.queue.length, 0); assert.deepEqual(h.pending, []);
  assert.equal(JSON.stringify(h.localPunches), originalCopy);
});

test('baseline queue: failed page retains every pending punch and retry is idempotent', async () => {
  const rows = Array.from({ length: 501 }, (_, i) => punch(i + 1));
  const original = JSON.stringify(rows); const h = harness(rows); h.failOnNext(2);
  assert.equal(await h.run(), 0);
  assert.equal(h.uploaded.size, 500); assert.equal(h.queue.length, 501); assert.equal(JSON.stringify(h.localPunches), original);
  assert.equal(await h.run(), 501);
  assert.equal(h.uploaded.size, 501); assert.equal(h.queue.length, 0); assert.equal(JSON.stringify(h.localPunches), original);
});

test('baseline queue: concurrent retries cannot send the same pending batch twice', async () => {
  const h = harness([punch(1)]); let release!: (value: { data: unknown[] }) => void;
  h.context['sb'] = { from: () => ({ upsert: (rows: Punch[]) => {
    h.batches.push(rows); return new Promise(resolve => { release = resolve; });
  } }) };
  const api = createDataContext(h.context);
  const first = api.DATA_NUCLEO.sincronizarPendentes();
  const second = api.DATA_NUCLEO.sincronizarPendentes();
  assert.equal(await second, 0);
  for (let i = 0; i < 10 && !release; i++) await Promise.resolve();
  assert.ok(release, 'o primeiro envio alcançou o Supabase simulado');
  release({ data: [] });
  assert.equal(await first, 1); assert.equal(h.batches.length, 1); assert.equal(h.queue.length, 0);
});

test('baseline queue: an empty queue performs no Supabase write', async () => {
  const h = harness([]); assert.equal(await h.run(), 0); assert.equal(h.batches.length, 0);
});
