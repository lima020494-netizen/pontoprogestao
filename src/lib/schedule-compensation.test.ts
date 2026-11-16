import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createDomainContext, createDataContext, operationalSlice } from './operational-domain-harness';

function fixture(minutes = 480) {
  const f = { pin: '1', nome: 'Ana', escala: '5x2', status: 'Ativo', admissao: '2026-11-01' };
  const data: any = { escalas: {}, batidas: [], ocorrencias: [], feriados: [], empregador: {} };
  const ctx = createDomainContext({ get: (k: string, d: any) => data[k] ?? d, funcPorPin: () => f, cargaEscala: () => minutes });
  const plan = ctx.prepararCompensacaoEscala(f, '2026-11-09', 'Compensação acordada', { nome: 'Gestor RH', funcao: 'Gerente' });
  data.escalas.a = { semanaInicio: '2026-11-09', semanaFim: '2026-11-15', folgas: [plan.item] };
  return { f, data, ctx, item: plan.item };
}

test('schedule compensation requires at least five trimmed characters and identified manager', () => {
  const { ctx, f } = fixture();
  assert.match(ctx.prepararCompensacaoEscala(f, '2026-11-09', ' abcd ', { nome: 'Gestor' }).erro, /5 caracteres/);
  assert.equal(ctx.prepararCompensacaoEscala(f, '2026-11-09', 'abcde', { nome: 'Gestor' }).item.motivo, 'abcde');
  assert.match(ctx.prepararCompensacaoEscala(f, '2026-11-09', 'abcde', null).erro, /gestor identificado/);
});
test('schedule compensation debits nominal workload, not hardcoded seven hours twenty', () => {
  for (const minutes of [360, 440, 480, 720]) {
    const { ctx, data } = fixture(minutes); const before = JSON.stringify(data.batidas);
    const sheet = ctx.dadosFolha('1', '2026-11-09', '2026-11-09');
    assert.equal(sheet.banco.debitos, minutes); assert.equal(sheet.linhas[0].saldo, -minutes);
    assert.equal(sheet.linhas[0].previsto, 0); assert.equal(sheet.tot.faltas, 0); assert.equal(sheet.tot.faltantes, 0);
    assert.equal(JSON.stringify(data.batidas), before); assert.equal(data.ocorrencias.length, 0);
  }
});
test('recalculation and duplicate explicit compensation never double debit', () => {
  const { ctx, data } = fixture();
  data.ocorrencias.push({ pin: '1', data: '2026-11-09', tipo: 'Folga compensatória' });
  for (let i = 0; i < 3; i++) assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 480);
});
test('legacy F, DSR, holidays and unplanned rest stay neutral without retroactive debt', () => {
  const { ctx, item, data } = fixture();
  delete item.compensacaoBanco;
  assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 0);
  item.tipo = 'DSR'; assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 0);
  data.escalas = {}; data.feriados.push({ data: '2026-11-09' });
  assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 0);
});
test('planned compensation leaves Inbox Zero and retains reason, manager and debit in full history', () => {
  const { ctx, f } = fixture(); const triage = ctx.triagemTratamentoDia(f, '2026-11-09', '2026-11-10');
  assert.equal(triage.st.pendente, false); assert.equal(triage.st.falta, false);
  assert.equal(triage.st.titulo, 'Folga Compensatória (Escala)'); assert.equal(triage.l.saldo, -480);
  assert.equal(triage.compensada.motivo, 'Compensação acordada'); assert.equal(triage.compensada.autorizadoPor, 'Gestor RH');
});
test('actual pending requests and anomalous punches remain reviewable on compensation day', () => {
  const { ctx, f, data } = fixture();
  data.ocorrencias.push({ pin: '1', data: '2026-11-09', tipo: 'Atestado médico', status: 'pendente' });
  assert.equal(ctx.triagemTratamentoDia(f, '2026-11-09', '2026-11-10').st.solicitacao, true);
  data.ocorrencias = []; data.batidas.push({ pin: '1', data: '2026-11-09', hora: '08:00', tipo: 'Entrada', nsr: '1' });
  assert.equal(ctx.triagemTratamentoDia(f, '2026-11-09', '2026-11-10').st.pendente, true);
});
test('switching compensated F to DSR removes only derived debit and preserves original punches', () => {
  const { ctx, data, item } = fixture();
  vm.runInContext(readFileSync('public/operacional/gestor/matriz-escala-v20261112.js', 'utf8'), ctx);
  const api = ctx.PontoProOperacional.obter('gestor.matrizEscala').criar(ctx.NUCLEO_OPERACIONAL);
  const before = JSON.stringify(data.batidas);
  data.escalas.a.folgas[0] = api.item('D', '1', '2026-11-09', item);
  assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 0);
  assert.equal(data.escalas.a.folgas[0].compensacaoBanco, undefined); assert.equal(JSON.stringify(data.batidas), before);
});
test('bank activation excludes prior compensation and preserves nominal opening balance after activation', () => {
  const { ctx, f } = fixture();
  Object.assign(f, { inicioVigenciaBancoHoras: '2026-11-10' });
  assert.equal(ctx.calcBanco('1', '2026-11-09', '2026-11-09').debitos, 0);
  Object.assign(f, { inicioVigenciaBancoHoras: '2026-11-09' });
  assert.equal(ctx.calcBanco('1', '2026-11-10', '2026-11-10').anterior, -480);
});
test('quick save writes author and reason to schedule and corresponding audit without manual occurrence', () => {
  const { ctx, f, data, item } = fixture(); let audit: any[] = [];
  Object.assign(ctx, { GERENCIADOR: { nome: 'Gestor RH' }, ESC_TRAVA_DIAS: 30, inicioSemana: () => '2026-11-09',
    set: (k: string, v: any) => { data[k] = v; }, histEscala: (...args: any[]) => { audit = args; },
    atualizarMatrizTurno: () => {}, toast: () => {}, fecharModal: () => {},
    $: () => ({ value: 'Acordo de compensação' }) });
  ctx.window.__escIni = '2026-11-09';
  vm.runInContext(operationalSlice('function registrarItemEscala(', 'function alternarTurnoEscala(') +
    operationalSlice('function salvarFolgaCompensada(', 'function editarHorarioMatriz('), ctx);
  assert.equal(vm.runInContext("salvarFolgaCompensada('1','2026-11-09')", ctx), '');
  assert.equal(data.escalas.a.folgas[0].motivo, 'Acordo de compensação'); assert.equal(audit[5].autorizadoPor, 'Gestor RH');
  assert.equal(ctx.calcBanco(f.pin, item.dia, item.dia).debitos, 480); assert.equal(data.ocorrencias.length, 0);
});
test('offline schedule and audit survive failure/reload and flush once before cloud reads, account scoped', async () => {
  const ls = new Map<string, string>(), idb = new Map<string, any>(); let ok = false; const writes: string[] = [];
  const localStorage = { getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => ls.set(k, v), removeItem: (k: string) => ls.delete(k) };
  const cacheEstavelTx = async (_mode: string, fn: any) => fn({ get: (id: string) => ({ result: idb.get(id) }),
    put: (row: any) => { idb.set(row.id, row); return {}; }, delete: (id: string) => { idb.delete(id); return {}; } })?.result;
  const sb = { from: (table: string) => ({ upsert: async () => { writes.push(table); return ok ? {} : { error: new Error('offline') }; } }) };
  const api = () => createDataContext({ CONTA: 'test-a', localStorage, cacheEstavelTx, sb }).DATA_NUCLEO;
  const first = api(); first.guardarEscalaPendente('escalas', { week: { folgas: [fixture().item] } });
  first.guardarEscalaPendente('logsEscala', [{ motivo: 'Acordo', autorizadoPor: 'Gestor' }]);
  assert.equal(await first.sincronizarEscalaPendente(), false); assert.equal(idb.size, 2);
  const other = createDataContext({ CONTA: 'test-b', localStorage, cacheEstavelTx, sb }).DATA_NUCLEO;
  const before = writes.length; assert.equal(await other.sincronizarEscalaPendente(), true); assert.equal(writes.length, before);
  ok = true; const reloaded = api(); assert.equal(await reloaded.sincronizarEscalaPendente(), true);
  assert.equal(ls.size, 0); assert.equal(idb.size, 0);
  const sent = writes.length; assert.equal(await reloaded.sincronizarEscalaPendente(), true); assert.equal(writes.length, sent);
});