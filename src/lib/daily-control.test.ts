import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDomainContext } from './operational-domain-harness.ts';

const day = '2026-11-13';
const at = (hora: string) => new Date(`${day}T${hora}:00`);
const employee = (pin = '1', extra: Record<string, unknown> = {}) => ({
  pin, nome: `Colaborador ${pin}`, cargo: 'Atendente', escala: '5x2', status: 'Ativo', admissao: '2026-01-01', ...extra,
});
const punch = (pin: string, hora: string, tipo: string, nsr: number, data = day) => ({
  pin, data, hora, tipo, nsr: String(nsr), fonte: 'PIN',
});

function panel(employees: any[], batidas: any[] = [], hora = '10:00', empregador: any = {}, ocorrencias: any[] = [], escalas: any = {}, carga = 0) {
  const context: any = createDomainContext({
    ...(carga ? { cargaEscala: () => carga } : {}),
    get: (key: string, fallback: unknown) => ({ funcionarios: employees, batidas, empregador: { hEntrada: '08:00', hSaiInt: '12:00', hEntInt: '13:00', hSaida: '17:00', ...empregador }, ocorrencias, escalas, feriados: [] } as any)[key] ?? fallback,
  });
  return context.calcularPainelDia(at(hora));
}

test('painel identifica trabalho em curso sem calcular a folha mensal', () => {
  const p = panel([employee()], [punch('1', '08:00', 'Entrada', 1)]);
  assert.equal(p.linhas[0].status, 'trabalhando');
  assert.equal(p.linhas[0].decorrido, 120);
  assert.equal(p.contadores.trabalhando, 1);
  assert.doesNotMatch(readFileSync('public/operacional/domain/painel-dia-v20261114.js', 'utf8'), /dadosFolha|calcBanco|fetch|setInterval|localStorage|indexedDB/);
});

test('painel identifica intervalo atual e informa tempo realizado versus previsto', () => {
  const p = panel([employee()], [punch('1', '08:00', 'Entrada', 1), punch('1', '12:00', 'Saída Intervalo', 2)], '12:30');
  assert.equal(p.linhas[0].status, 'intervalo');
  assert.equal(p.linhas[0].intervaloRealizado, 30);
  assert.equal(p.linhas[0].intervaloPrevisto, 60);
});

test('jornada acima de seis horas gera alerta crítico após seis horas contínuas', () => {
  const bs = [punch('1', '08:00', 'Entrada', 1)];
  assert.equal(panel([employee()], bs, '14:00', { hSaiInt: '', hEntInt: '' }).linhas[0].status, 'trabalhando');
  const p = panel([employee()], bs, '14:01', { hSaiInt: '', hEntInt: '' });
  assert.equal(p.linhas[0].status, 'alerta');
  assert.match(p.linhas[0].motivoAlerta, /6h/);
  assert.equal(p.contadores.alerta, 1);
});

test('jornada de quatro a seis horas gera alerta somente após quatro horas contínuas', () => {
  const f = employee('1', { escala: '6x1' });
  const bs = [punch('1', '08:00', 'Entrada', 1)];
  const emp = { hSaiInt: '', hEntInt: '', hSaida: '13:00' };
  const p = panel([f], bs, '12:01', emp, [], {}, 300);
  assert.equal(p.linhas[0].status, 'alerta');
  assert.match(p.linhas[0].motivoAlerta, /4h/);
});

test('intervalo pré-assinalado não gera alerta de ausência de batidas de intervalo', () => {
  const f = employee('1', { intervalo: { preAssinalado: true, inicio: '12:00', fim: '13:00' } });
  const p = panel([f], [punch('1', '08:00', 'Entrada', 1)], '14:30');
  assert.notEqual(p.linhas[0].status, 'alerta');
});

test('retorno de intervalo além do previsto vira alerta operacional', () => {
  const p = panel([employee()], [punch('1', '08:00', 'Entrada', 1), punch('1', '12:00', 'Saída Intervalo', 2)], '13:01');
  assert.equal(p.linhas[0].status, 'alerta');
  assert.match(p.linhas[0].motivoAlerta, /Retorno/);
});

test('ausência usa a tolerância configurada e descanso nunca vira atraso', () => {
  const bs: any[] = [];
  assert.equal(panel([employee()], bs, '08:15', { toleranciaAtraso: 15 }).linhas[0].status, 'aguardando');
  assert.equal(panel([employee()], bs, '08:16', { toleranciaAtraso: 15 }).linhas[0].status, 'ausente');
  const domingo = panel([employee()], bs, '10:00');
  const context: any = createDomainContext({ get: (key: string, fallback: unknown) => key === 'funcionarios' ? [employee()] : key === 'empregador' ? { hEntrada: '08:00' } : fallback });
  const rest = context.calcularPainelDia(new Date('2026-11-15T10:00:00'));
  assert.equal(rest.linhas[0].status, 'descanso');
  assert.equal(rest.contadores.ausentes, 0);
  assert.equal(domingo.contadores.ausentes, 1);
});

test('ocorrência aprovada não é contada como não comparecimento', () => {
  const p = panel([employee()], [], '10:00', {}, [{ pin: '1', data: day, tipo: 'Atestado médico', status: 'concluido' }]);
  assert.equal(p.linhas[0].status, 'ocorrencia');
  assert.equal(p.linhas[0].titulo, 'Atestado médico');
  assert.equal(p.contadores.ausentes, 0);
});

test('saída conclui a jornada e trabalho após a saída prevista fica no grupo de concluídos e extras', () => {
  const concluido = panel([employee()], ['08:00', '12:00', '13:00', '17:00'].map((h, i) => punch('1', h, ['Entrada', 'Saída Intervalo', 'Entrada Intervalo', 'Saída'][i], i + 1)), '18:00');
  assert.equal(concluido.linhas[0].status, 'concluido');
  const extra = panel([employee()], [punch('1', '08:00', 'Entrada', 1), punch('1', '12:00', 'Saída Intervalo', 2), punch('1', '13:00', 'Entrada Intervalo', 3)], '17:01');
  assert.equal(extra.linhas[0].status, 'extra');
  assert.equal(extra.linhas[0].extraMin, 1);
  assert.equal(extra.contadores.encerrados, 1);
  assert.equal(extra.contadores.extras, 1);
});

test('jornada noturna aberta ontem permanece visível após meia-noite sem mudar o carimbo civil', () => {
  const context: any = createDomainContext({
    get: (key: string, fallback: unknown) => ({
      funcionarios: [employee()], empregador: { hEntrada: '22:00', hSaida: '05:00' },
      batidas: [punch('1', '22:00', 'Entrada', 1, '2026-11-13')], ocorrencias: [], escalas: {}, feriados: [],
    } as any)[key] ?? fallback,
  });
  const p = context.calcularPainelDia(new Date('2026-11-14T01:00:00'));
  assert.equal(p.linhas[0].data, '2026-11-13');
  assert.equal(p.linhas[0].status, 'trabalhando');
  assert.equal(p.linhas[0].decorrido, 180);
  assert.equal(p.linhas[0].bs[0].data, '2026-11-13');
});

test('cada KPI filtra somente sua categoria e o filtro encerrados reúne saída e extras', () => {
  const fs = [employee('1'), employee('2'), employee('3'), employee('4'), employee('5'), employee('6')];
  const bs = [
    punch('1', '08:00', 'Entrada', 1),
    punch('2', '08:00', 'Entrada', 2), punch('2', '12:00', 'Saída Intervalo', 3),
    punch('3', '08:00', 'Entrada', 4),
    punch('5', '08:00', 'Entrada', 5), punch('5', '12:00', 'Saída Intervalo', 6), punch('5', '13:00', 'Entrada Intervalo', 7),
    punch('6', '08:00', 'Entrada', 8), punch('6', '12:00', 'Saída Intervalo', 9), punch('6', '13:00', 'Entrada Intervalo', 10), punch('6', '17:00', 'Saída', 11),
  ];
  const context: any = createDomainContext({
    get: (key: string, fallback: unknown) => ({ funcionarios: fs, batidas: bs, empregador: { hEntrada: '08:00', hSaiInt: '12:00', hEntInt: '13:00', hSaida: '17:00' }, ocorrencias: [], escalas: {}, feriados: [] } as any)[key] ?? fallback,
  });
  const p = context.calcularPainelDia(at('12:30'));
  assert.equal(p.contadores.trabalhando, 3);
  assert.equal(p.contadores.intervalo, 1);
  assert.equal(p.contadores.ausentes, 1);
  assert.equal(context.filtrarPainelDia(p, 'intervalo').length, 1);
  assert.equal(context.filtrarPainelDia(p, 'ausentes')[0].f.pin, '4');
  const later = context.calcularPainelDia(at('17:01'));
  assert.equal(context.filtrarPainelDia(later, 'encerrados').length, 2);
});
