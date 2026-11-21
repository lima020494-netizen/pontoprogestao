import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDomainContext } from './operational-domain-harness.ts';

const tipos = ['Entrada', 'Saída Intervalo', 'Entrada Intervalo', 'Saída'];
let nsr = 0;
const employee = (pin = '1', extra: Record<string, unknown> = {}) => ({
  pin, nome: `Colaborador ${pin}`, cargo: 'Atendente', departamento: 'Operação', escala: '5x2', status: 'Ativo', admissao: '2026-01-01', ...extra,
});
const punches = (pin: string, data: string, horas: string[]) => horas.map((hora, i) => ({
  pin, data, hora, tipo: horas.length === 2 ? (i ? 'Saída' : 'Entrada') : tipos[i], nsr: String(++nsr), fonte: 'PIN',
}));
function contextFor({ fs = [employee()], batidas = [], ocorrencias = [], empregador = {}, escalas = {}, feriados = [] }: any = {}) {
  const data: Record<string, any> = {
    funcionarios: fs, batidas, ocorrencias, escalas, feriados,
    empregador: { hEntrada: '08:00', hSaiInt: '12:00', hEntInt: '13:00', hSaida: '17:00', dsr: 'Sim', fatorBancoDomFeriado: 2, ...empregador },
  };
  return createDomainContext({ CONTA: 'teste@example.invalid', log: () => {}, getHoraOficial: () => new Date('2026-11-20T12:00:00'), cargaEscala: (escala: string) => escala === '5x2' ? 480 : 440, get: (key: string, fallback: unknown) => data[key] ?? fallback, funcPorPin: (pin: string) => fs.find((f: any) => f.pin === pin) || {} });
}
function report(context: any, inicio: string, fim: string, extra: Record<string, unknown> = {}) {
  return JSON.parse(JSON.stringify(context.RELATORIOS_NUCLEO.calcularRelatoriosAnaliticos({ inicio, fim, hoje: '2026-11-20', ...extra })));
}

test('pontualidade usa 10 minutos de tolerância, 10 minutos líquidos e recorrência de segunda-feira', () => {
  const batidas = [...punches('1', '2026-11-16', ['08:20', '12:00', '13:00', '17:00']), ...punches('1', '2026-11-17', ['08:05', '12:00', '13:00', '17:05'])];
  const c = contextFor({ batidas });
  const original = JSON.stringify(batidas);
  const r = report(c, '2026-11-16', '2026-11-17');
  assert.equal(r.pontualidade.entradas, 2); assert.equal(r.pontualidade.pontuais, 1); assert.equal(r.pontualidade.taxa, 50);
  assert.equal(r.pontualidade.atrasos, 1); assert.equal(r.pontualidade.minutos, 10);
  assert.deepEqual(r.colaboradores[0].pontualidade.atrasos[0], { data: '2026-11-16', dia: 'Segunda-feira', previsto: '08:00', realizado: '08:20', tolerancia: 10, minutos: 10 });
  assert.equal(r.pontualidade.recorrencia[0].dia, 'Segunda-feira');
  assert.equal(r.consolidado[0].atrasos, 1); assert.equal(r.consolidado[0].saldoBanco, 0);
  assert.equal(JSON.stringify(batidas), original);
});

test('intervalos sinaliza 7h sem pausa e pausa de 30 minutos, mas não 60 minutos nem exatamente 6h', () => {
  const batidas = [
    ...punches('1', '2026-11-16', ['08:00', '15:00']),
    ...punches('1', '2026-11-17', ['08:00', '12:00', '12:30', '17:30']),
    ...punches('1', '2026-11-18', ['08:00', '12:00', '13:00', '17:00']),
    ...punches('1', '2026-11-19', ['08:00', '14:00']),
  ];
  const r = report(contextFor({ batidas }), '2026-11-16', '2026-11-19');
  assert.equal(r.intervalos.total, 2); assert.equal(r.intervalos.colaboradores, 1); assert.equal(r.intervalos.reincidentes, 1);
  assert.deepEqual(r.intervalos.ocorrencias.map((o: any) => [o.data, o.tipo, o.trabalhado, o.pausa]), [
    ['2026-11-17', 'Pausa inferior a 1h', 540, 30], ['2026-11-16', 'Sem intervalo registrado', 420, 0],
  ]);
  assert.equal(r.setores[0].intervalos, 2); assert.equal(r.setores[0].reincidentes, 1);
});

test('intervalo pré-assinalado não é convertido em ocorrência de pausa não usufruída', () => {
  const f = employee('1', { intervalo: { preAssinalado: true, inicio: '12:00', fim: '13:00' } });
  const r = report(contextFor({ fs: [f], batidas: punches('1', '2026-11-16', ['08:00', '16:00']) }), '2026-11-16', '2026-11-16');
  assert.equal(r.intervalos.total, 0);
});

test('extras separa 60 minutos em 50%, 4h em DSR 100% e mantém fator 2 somente no banco', () => {
  const batidas = [...punches('1', '2026-11-16', ['08:00', '12:00', '13:00', '18:00']), ...punches('1', '2026-11-15', ['08:00', '12:00'])];
  const r = report(contextFor({ batidas }), '2026-11-15', '2026-11-16');
  assert.equal(r.extras.extras50, 60); assert.equal(r.extras.extras100, 240); assert.equal(r.extras.total, 300);
  assert.equal(r.extras.creditos, 540); assert.equal(r.extras.debitos, 0); assert.equal(r.extras.movimentoBanco, 540);
  assert.equal(r.consolidado[0].normais, 480); assert.equal(r.consolidado[0].diasTrabalhados, 2); assert.equal(r.consolidado[0].dsrs, 1);
  assert.equal(r.setores[0].extras50, 60); assert.equal(r.setores[0].extras100, 240);
});

test('consolidado pré-folha conta somente falta de dia passado concluído, nunca hoje ou futuro', () => {
  const r = report(contextFor(), '2026-11-19', '2026-11-23');
  assert.equal(r.consolidado[0].faltas, 1);
  assert.equal(r.colaboradores[0].folha.linhas.find((l: any) => l.data === '2026-11-20').ocorrencia, '');
  assert.equal(r.colaboradores[0].folha.linhas.find((l: any) => l.data === '2026-11-23').ocorrencia, '');
  assert.equal(r.consolidado[0].saldoBanco, 0);
});

test('filtros de setor e colaborador restringem todos os relatórios sem recriar outra apuração', () => {
  const fs = [employee('1', { departamento: 'Bar' }), employee('2', { departamento: 'Cozinha' })];
  const c = contextFor({ fs });
  assert.equal(report(c, '2026-11-16', '2026-11-16', { setor: 'Bar' }).colaboradores.length, 1);
  const r = report(c, '2026-11-16', '2026-11-16', { pin: '2' });
  assert.equal(r.colaboradores[0].f.pin, '2'); assert.equal(r.consolidado[0].setor, 'Cozinha');
  const source = readFileSync('public/operacional/reports/relatorios-analiticos-v20261120.js', 'utf8');
  assert.match(source, /dadosFechamentoContador\(S\.dadosFolha/); assert.doesNotMatch(source, /movimentoBancoDia\s*\(/);
});

test('modelo e PDF da ficha trazem previsto, realizado, tolerância, anotações e assinaturas', async () => {
  const c = contextFor({ batidas: punches('1', '2026-11-16', ['08:20', '12:00', '13:00', '17:00']) });
  const dados = c.RELATORIOS_NUCLEO.calcularRelatoriosAnaliticos({ inicio: '2026-11-16', fim: '2026-11-16', hoje: '2026-11-20' });
  const modelo = c.RELATORIOS_NUCLEO.modeloFichaPontualidade(dados.colaboradores[0], dados.periodo);
  assert.deepEqual(Array.from(modelo.body[0]), ['16/11/2026', 'Segunda-feira', '08:00', '08:20', '10 min', '00:10']);
  let saved = '', loads = 0, instance: any;
  class Doc {
    tables: any[] = []; texts: any[] = []; lastAutoTable = { finalY: 50 };
    constructor() { instance = this; }
    setTextColor() {} setFont() {} setFontSize() {} setDrawColor() {} setFillColor() {} setPage() {} setLineWidth() {}
    line() {} roundedRect() {}
    text(value: any) { this.texts.push(value); }
    splitTextToSize(value: string) { return [value]; }
    autoTable(options: any) { this.tables.push(options); this.lastAutoTable = { finalY: options.startY + 30 }; }
    getCurrentPageInfo() { return { pageNumber: 1 }; } getNumberOfPages() { return 1; }
    save(name: string) { saved = name; }
  }
  c.window.jspdf = { jsPDF: Doc }; c.RELATORIOS_NUCLEO.garantirLib = async () => { loads++; };
  await c.RELATORIOS_NUCLEO.pdfFichaPontualidade({ dados, pin: '1', anotacoes: 'Revisar deslocamento' });
  assert.equal(loads, 1); assert.match(saved, /^Ficha_1on1_Colaborador_1_2026-11-16_2026-11-16\.pdf$/);
  assert.deepEqual(Array.from(instance.tables[2].body[0]), Array.from(modelo.body[0]));
  assert.ok(instance.texts.flat().includes('Revisar deslocamento'));
  assert.ok(instance.texts.flat().includes('Colaborador')); assert.ok(instance.texts.flat().includes('Gestor responsável'));
});

test('16:00 previsto e 16:37 realizado resulta em 27 minutos líquidos sem alterar folha nem banco',()=>{
 const c=contextFor({empregador:{hEntrada:'16:00',hSaiInt:'20:00',hEntInt:'21:00',hSaida:'23:00'},batidas:punches('1','2026-11-16',['16:37','20:00','21:00','23:00'])});
 const r=report(c,'2026-11-16','2026-11-16');assert.equal(r.pontualidade.minutos,27);assert.equal(r.setores[0].atrasoMin,27);assert.equal(r.consolidado[0].atrasoMin,27);assert.equal(r.colaboradores[0].folha.linhas[0].atrasoMin,37);
});
test('intervalos 1-on-1 apura 60 minutos ausentes e 30 suprimidos sem pausa de 60',()=>{
 const c=contextFor({batidas:[...punches('1','2026-11-16',['08:00','15:00']),...punches('1','2026-11-17',['08:00','12:00','12:30','17:30'])]});
 const r=report(c,'2026-11-16','2026-11-17');assert.equal(r.intervalos.suprimido,90);const m=c.RELATORIOS_NUCLEO.modeloFichaIntervalos(r.colaboradores[0],r.periodo);assert.equal(m.resumo[0][1],'01:30');assert.equal(m.body[0][5],'01:00');
});
test('modelos de exportação reutilizam os valores filtrados dos quatro relatórios',()=>{
 const c=contextFor({batidas:punches('1','2026-11-16',['08:37','12:00','12:30','18:00'])});const r=report(c,'2026-11-16','2026-11-16');
 assert.equal(c.RELATORIOS_NUCLEO.modeloRelatorio(r,'pontualidade').body[0][5],'00:27');
 assert.equal(c.RELATORIOS_NUCLEO.modeloRelatorio(r,'intervalos').body[0][5],'00:30');
 assert.equal(c.RELATORIOS_NUCLEO.modeloRelatorio(r,'extras').body[0][1],c.toHHMM(r.consolidado[0].extras50));
 assert.equal(c.RELATORIOS_NUCLEO.modeloRelatorio(r,'consolidado').body[0][7],'00:27');
});

test('tolerância de 10 minutos zera atraso até 10 e deixa 1 minuto líquido aos 11',()=>{
 const r=report(contextFor({batidas:[...punches('1','2026-11-16',['08:10','12:00','13:00','17:00']),...punches('1','2026-11-17',['08:11','12:00','13:00','17:00'])]}),'2026-11-16','2026-11-17');assert.equal(r.pontualidade.pontuais,1);assert.equal(r.pontualidade.minutos,1);assert.equal(r.pontualidade.atrasos,1);
});
