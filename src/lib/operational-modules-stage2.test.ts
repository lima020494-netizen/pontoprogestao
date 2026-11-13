import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDomainContext } from './operational-domain-harness.ts';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const modulePaths = [
  'operacional/domain/escala-v20261110-etapa2.js',
  'operacional/domain/ocorrencias-v20261110-etapa2.js',
  'operacional/domain/jornada-v20261110-etapa2.js',
  'operacional/domain/banco-v20261110-etapa2.js',
  'operacional/domain/nucleo-v20261110-etapa2.js',
];

test('stage 2: five domain modules load synchronously before the existing shell and bootstrap', () => {
  const positions = modulePaths.map(path => html.indexOf(`<script src="/${path}"></script>`));
  assert.ok(positions.every(position => position > 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(positions.at(-1)! < html.indexOf('/* ---------- utilitários ---------- */'));
  assert.equal((html.match(/\(async function boot\(\)\{/g) || []).length, 1);
  assert.equal((html.match(/async function iniciarApp\(\)\{/g) || []).length, 1);
  assert.match(html, /PontoProOperacional\.obter\('domain\.nucleo'\)\.criar/);
});

test('stage 2: domain files have no DOM, cloud, storage, queue, export or polling side effects', () => {
  for (const path of modulePaths) {
    const source = readFileSync('public/' + path, 'utf8');
    assert.doesNotMatch(source, /\bdocument\b|\blocalStorage\b|\bindexedDB\b|\bfetch\s*\(|\bsupabase\b|\bsetInterval\s*\(|\bsetTimeout\s*\(|\bgarantirLib\b|\bfilaPonto\b|\bnuvemPush\b/, path);
  }
  assert.equal((html.match(/\bsetInterval\s*\(/g) || []).length, 3);
  assert.equal((html.match(/\bgarantirLib\s*\(/g) || []).length, 4);
});

test('stage 2: every extracted rule has one delegating global and inline handlers remain compatible', () => {
  const names = ['instanteBatida', 'indiceJornadas', 'jornadaDe', 'batidasJornada', 'escalaDaSemana', 'folgaEscala', 'horarioEscala', 'previstoDia', 'batidasDia', 'paresBatidas', 'minutosTrabalhados', 'calculaNoturna', 'tiposTratamentoLote', 'regraOcorrencia', 'ocorrenciaDia', 'validarPeriodoOcorrencia', 'trabalhoApuradoDia', 'descontoDsrDia', 'atrasoDia', 'movimentoBancoDia', 'dadosFolha', 'resumoMensalFolha', 'calcBanco', 'classificacaoTratamento', 'triagemTratamentoDia', 'lerCelulaEscala'];
  for (const name of names) {
    const matches = html.match(new RegExp(`function ${name}\\(`, 'g')) || [];
    assert.equal(matches.length, 1, name);
    assert.ok(html.includes(`NUCLEO_OPERACIONAL.${name}(`), name);
  }
  assert.doesNotMatch(html, /let __jIdx=/);
  assert.equal((html.match(/on(?:click|change|input|submit|keydown|keyup)=/g) || []).length, 204);
});

test('stage 2: real shared modules reproduce every mixed-month baseline total without rewriting punches', () => {
  const f = { pin: '1', nome: 'Colaboradora fictícia', escala: '6x1', status: 'Ativo', admissao: '2026-10-01', inicioVigenciaBancoHoras: '2026-10-03' };
  const types = ['Entrada', 'Saída Intervalo', 'Entrada Intervalo', 'Saída'];
  const hours: Record<string, string[]> = {
    '2026-10-01': ['08:00', '12:00', '13:00', '17:00'],
    '2026-10-02': ['08:00', '16:00'],
    '2026-10-03': ['08:00', '12:00', '13:00', '17:00'],
    '2026-10-04': ['08:00', '12:00'],
    '2026-10-07': ['08:00', '12:00'],
  };
  let nsr = 0;
  const punches = Object.entries(hours).flatMap(([data, hs]) => hs.map((hora, i) => ({ pin: '1', data, hora, tipo: hs.length === 2 ? (i ? 'Saída' : 'Entrada') : types[i], nsr: String(++nsr), fonte: 'PIN' })));
  const entries = Object.keys({ ...hours, '2026-10-05': [], '2026-10-06': [], '2026-10-08': [] }).map(dia => ({ pin: '1', dia, tipo: dia === '2026-10-04' ? 'DSR' : 'Trabalhado', horarioEntrada: '08:00' }));
  const data: Record<string, any> = {
    batidas: punches,
    empregador: { hEntrada: '08:00', fatorBancoDomFeriado: 2 },
    feriados: [{ data: '2026-10-07', nome: 'Feriado fictício' }],
    escalas: {
      a: { semanaInicio: '2026-10-01', semanaFim: '2026-10-04', folgas: entries.filter(x => x.dia <= '2026-10-04') },
      b: { semanaInicio: '2026-10-05', semanaFim: '2026-10-11', folgas: entries.filter(x => x.dia >= '2026-10-05') },
    },
    ocorrencias: [{ pin: '1', data: '2026-10-05', tipo: 'Folga compensatória' }, { pin: '1', data: '2026-10-06', tipo: 'Atestado médico' }],
  };
  const original = JSON.stringify(punches);
  const context: any = createDomainContext({ get: (key: string, fallback: unknown) => data[key] ?? fallback, funcPorPin: () => f });
  const sheet = context.dadosFolha('1', '2026-10-01', '2026-10-08');
  assert.equal(sheet.linhas.reduce((n: number, l: any) => n + l.previsto, 0), 2640);
  assert.equal(sheet.tot.trabalhado, 1920);
  assert.equal(sheet.tot.extras, 600);
  assert.equal(sheet.tot.faltas, 1);
  assert.equal(sheet.tot.faltantes, 440);
  assert.equal(sheet.banco.creditos, 1000);
  assert.equal(sheet.banco.debitos, 440);
  assert.equal(sheet.banco.atual, 560);
  assert.deepEqual(Array.from(sheet.banco.dias, (row: any) => [row.data, row.saldo, row.vigente]), [
    ['2026-10-01', 0, false], ['2026-10-02', 0, false], ['2026-10-03', 40, true],
    ['2026-10-04', 480, true], ['2026-10-05', -440, true], ['2026-10-06', 0, true],
    ['2026-10-07', 480, true], ['2026-10-08', 0, true],
  ]);
  assert.equal(JSON.stringify(punches), original);
  const summary = context.resumoMensalFolha(sheet);
  assert.equal(summary[0][1], '44:00');
  assert.equal(summary[1][1], '32:00');
  assert.equal(summary[2][1], '10:00');
  assert.equal(summary[5][1], '+09:20');
});

test('stage 2: schedule aliases and occurrence catalog retain all approved options and rules', () => {
  const context: any = createDomainContext({ get: (key: string, fallback: unknown) => key === 'empregador' ? { empresaCidada: true } : fallback });
  for (const alias of ['Folga Compensada', 'Folga Domingo', 'folga Compensanda', ' Folga   compensatória ', 'FOLGA']) {
    assert.equal(context.lerCelulaEscala(alias).tipo, 'Folga Compensada');
  }
  assert.equal(context.lerCelulaEscala('08:00-12:00').horarioSaida, '12:00');
  assert.equal(context.GRUPOS_OCORRENCIAS.length, 4);
  assert.equal(context.tiposTratamentoLote().length, 15);
  assert.ok(context.tiposTratamentoLote().includes('Esquecimento de Marcação'));
  assert.ok(!context.tiposTratamentoLote().includes('Falta'));
  assert.equal(context.regraOcorrencia('Afastamento INSS').codigo, '03');
  assert.equal(context.validarPeriodoOcorrencia('Licença Paternidade', '2026-10-01', '2026-10-20', '1'), '');
});

test('stage 2: treatment priorities and bank occurrence rules remain concrete', () => {
  const data: Record<string, any> = { empregador: {}, ocorrencias: [] };
  const context: any = createDomainContext({ get: (key: string, fallback: unknown) => data[key] ?? fallback });
  const interval = context.classificacaoTratamento({ data: '2026-11-01', previsto: 480, trabalhado: 480 }, null, [{}, {}], '2026-11-02');
  assert.equal(interval.titulo, 'Intervalo não registrado');
  assert.equal(interval.cor, 'orange');
  assert.equal(context.classificacaoTratamento({ data: '2026-11-01', previsto: 480, trabalhado: 300 }, null, [{}, {}, {}, {}], '2026-11-02').titulo, 'Revisar jornada');
  data['ocorrencias'] = [{ pin: '1', data: '2026-10-13', tipo: 'Folga compensatória' }];
  assert.equal(context.movimentoBancoDia('1', '2026-10-13', 440, 0).saldo, -440);
  data['ocorrencias'][0].tipo = 'Atestado médico';
  assert.equal(context.movimentoBancoDia('1', '2026-10-13', 440, 240).saldo, 0);
  data['ocorrencias'][0].tipo = 'Falta';
  assert.equal(context.movimentoBancoDia('1', '2026-10-13', 440, 0).saldo, 0);
});

test('stage 2: offline shell includes every domain module and still excludes APIs and account data', () => {
  const sw = readFileSync('public/ponto-offline-sw.js', 'utf8');
  assert.match(sw, /ponto-static-20261113-heatmap-v1/);
  for (const path of modulePaths) assert.ok(sw.includes(`'/${path}'`), path);
  const assets = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf('self.addEventListener'));
  assert.doesNotMatch(assets, /\/api\/|\/rest\/|\/auth\/|pontos_pendentes/);
});
