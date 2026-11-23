import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function api() {
  const w: any = { PontoProOperacional: { m: {} as any, definir(n: string, v: any) { this.m[n] = v; } } };
  w.window = w;
  vm.runInNewContext(readFileSync('public/operacional/domain/painel-executivo-v20261123.js', 'utf8'), { window: w });
  return w.PontoProOperacional.m['domain.painelExecutivo'];
}

const dia = (data: string, linhas: any[]) => ({ data, linhas });
const linha = (pin: string, nome: string, extra: Record<string, unknown> = {}) => ({
  f: { pin, nome, departamento: 'Bar' }, data: '2026-11-23', previsto: 480, bs: [{ tipo: 'Entrada', hora: '08:00' }],
  status: 'concluido', atrasoMin: 0, extraMin: 0, ...extra,
});
const painel = (diarios: any[], agregado = true) => ({
  agregado, diarios,
  linhas: diarios.at(-1)?.linhas.map((l: any) => agregado ? { ...l, periodo: { previstos: 1, presentes: l.bs.length ? 1 : 0, pontuais: l.atrasoMin === 0 && l.bs.length ? 1 : 0, faltas: l.status === 'ausente' ? 1 : 0, extras: l.extraMin > 0 ? 1 : 0 } } : l) || [],
});

test('painel executivo compara o período anterior equivalente sem inventar variação com base zero', () => {
  const a = api().criar({ addDias: (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }, toHHMM: (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), toMin: (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3)), filtrarPainelPeriodo: () => [] });
  assert.deepEqual(JSON.parse(JSON.stringify(a.periodoAnteriorPainel({ inicio: '2026-11-16', fim: '2026-11-22' }))), { inicio: '2026-11-09', fim: '2026-11-15', horaInicio: '00:00', horaFim: '23:59' });
  const atual = painel([dia('2026-11-23', [linha('1', 'Ana'), linha('2', 'Bruno', { bs: [], status: 'ausente' })])]);
  const anterior = painel([dia('2026-11-16', [linha('1', 'Ana'), linha('2', 'Bruno')])]);
  const m = a.calcularPainelExecutivo(atual, anterior);
  assert.equal(m.totalJornadas, 2);
  assert.equal(m.cartoes[0].variacao, -50);
  assert.equal(m.cartoes[0].percentual, 50);
  assert.equal(m.cartoes[3].variacao, null);
});

test('cinco cartões usam presenças, pontualidade, pausas, faltas e extras das mesmas jornadas', () => {
  const a = api().criar({ addDias: (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }, toHHMM: (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), toMin: (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3)), filtrarPainelPeriodo: () => [] });
  const p = painel([dia('2026-11-23', [
    linha('1', 'Ana', { bs: [{ tipo: 'Entrada' }, { tipo: 'Saída Intervalo' }] }),
    linha('2', 'Bruno', { atrasoMin: 12, extraMin: 30 }),
    linha('3', 'Carla', { bs: [], status: 'ausente' }),
    linha('4', 'Daniel', { previsto: 0, bs: [], status: 'descanso' }),
  ])]);
  const vazio = painel([dia('2026-11-16', [])]);
  const m = a.calcularPainelExecutivo(p, vazio);
  assert.deepEqual(Array.from(m.cartoes, (x: any) => x.valor), [2, 1, 1, 1, 1]);
  assert.equal(m.totais.folgas, 1);
  assert.equal(m.totais.extraMin, 30);
  assert.equal(a.filtrarPainelExecutivo(p, 'intervalos')[0].f.pin, '1');
  assert.equal(a.filtrarPainelExecutivo(p, 'extras')[0].f.pin, '2');
});

test('ranking ordena por presença, pontualidade e nome sem alterar a lista original', () => {
  const a = api().criar({ addDias: (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }, toHHMM: (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'), toMin: (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3)), filtrarPainelPeriodo: () => [] });
  const p = painel([dia('2026-11-23', [linha('2', 'Bruno', { atrasoMin: 5 }), linha('1', 'Ana')])]);
  const antes = p.linhas.map((l: any) => l.f.pin);
  const r = a.rankingPainelExecutivo(p);
  assert.deepEqual(Array.from(r, (x: any) => x.f.nome), ['Ana', 'Bruno']);
  assert.equal(r[0].presenca, 100);
  assert.equal(r[1].pontualidade, 0);
  assert.deepEqual(p.linhas.map((l: any) => l.f.pin), antes);
});

test('evolução de hoje só marca hora extra depois da saída que a originou', () => {
  const a = api().criar({
    toMin: (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3)),
    tendenciaPainelDia: () => [
      { data: '2026-11-23', rotulo: '17h', presenca: 100, pontualidade: 100 },
      { data: '2026-11-23', rotulo: '18h', presenca: 100, pontualidade: 100 },
    ],
  });
  const p = painel([dia('2026-11-23', [linha('1', 'Ana', { bs: [{ tipo: 'Entrada', hora: '08:00' }, { tipo: 'Saída', hora: '18:00' }], saida: '17:00', inicio: '08:00', extraMin: 60 })])], false);
  const pontos = a.evolucaoPainelExecutivo(new Date('2026-11-23T18:30:00'), p, { inicio: '2026-11-23', fim: '2026-11-23' });
  assert.equal(pontos[0].extras, 0);
  assert.equal(pontos[1].extras, 100);
});
