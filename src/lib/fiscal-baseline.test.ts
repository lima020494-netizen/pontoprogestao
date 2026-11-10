import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const slice = (a: string, b: string) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const soNum = (v: unknown) => String(v || '').replace(/\D/g, '');
const padL = (v: unknown, n: number, c = '0') => String(v ?? '').slice(-n).padStart(n, c);
const padR = (v: unknown, n: number) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, n).padEnd(n, ' ');
const dtTZ = (iso: string, hm: string) => `${iso}T${(hm || '00:00').slice(0, 5)}:00-0300`;
const employer = { tipo: 'CNPJ', doc: '12.345.678/0001-90', razao: 'Empresa fictícia', cei: '', hEntrada: '08:00', hSaiInt: '12:00', hEntInt: '13:00', hSaida: '17:00' };
const punches = [
  { pin: '1', cpf: '12345678900', data: '2026-11-10', hora: '00:10', tipo: 'Saída', nsr: '2', fonte: 'LOCAL' },
  { pin: '1', cpf: '12345678900', data: '2026-11-09', hora: '23:59', tipo: 'Entrada', nsr: '1', fonte: 'LOCAL' },
  { pin: '1', cpf: '12345678900', data: '2026-11-10', hora: '01:00', tipo: 'Saída', nsr: '3', fonte: 'LOCAL', excluida: true },
];

test('baseline AFD type 3 keeps NSR order, civil date/time and excludes only excluded punches', () => {
  const source = slice('function conteudoAFDOficial', 'function gerarAFDOficial');
  const original = JSON.stringify(punches);
  const content = runInNewContext(source + `;conteudoAFDOficial('2026-11-09','2026-11-10')`, {
    get: (key: string) => key === 'empregador' ? employer : punches,
    soNum, padL, padR,
    getHoraOficial: () => new Date('2026-11-10T22:10:00Z'),
    isoOf: (d: Date) => d.toISOString().slice(0, 10),
    hhmm: (d: Date) => d.toISOString().slice(11, 16),
  }) as string;
  const lines = content.trim().split('\r\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[1].startsWith('0000000013' + '09112026' + '2359'));
  assert.ok(lines[2].startsWith('0000000023' + '10112026' + '0010'));
  assert.equal(lines.some(line => line.startsWith('0000000033')), false);
  assert.equal(lines[3], '999999999000000002Ponto Pro Gestão');
  assert.equal(JSON.stringify(punches), original);
});

test('baseline AEJ retains overnight civil timestamps, journey sequence and occurrence totals', () => {
  const source = slice('function gerarAEJ', '/* ===================== ATESTADO TÉCNICO');
  const original = JSON.stringify(punches);
  let download: { nome: string; content: string } | null = null;
  const data: Record<string, unknown> = {
    empregador: employer,
    batidas: punches,
    funcionarios: [{ pin: '1', cpf: '12345678900', nome: 'Colaboradora fictícia', escala: '6x1' }],
    ocorrencias: [{ pin: '1', data: '2026-11-10', tipo: 'Atestado médico', motivo: 'Documento fictício' }],
  };
  runInNewContext(source + `;gerarAEJ('2026-11-09','2026-11-10')`, {
    get: (key: string, fallback: unknown) => data[key] ?? fallback,
    devCfg: () => ({ registroINPI: '', programa: 'Ponto Pro Gestão', versao: '1.0.0', tipoDoc: 'CPF', doc: '', nome: 'Desenvolvedor fictício' }),
    soNum, padL, dtTZ, cargaEscala: () => 440,
    ordemJornada: (a: any, b: any) => a.nsr.localeCompare(b.nsr),
    jornadaDe: () => '2026-11-09',
    baixar: (nome: string, content: string) => { download = { nome, content }; },
    brOf: (d: string) => d, log: () => {}, alert: () => { throw new Error('período inválido inesperado'); },
  });
  assert.ok(download);
  const lines = download!.content.trim().split('\r\n');
  const marks = lines.filter(x => x.startsWith('05|'));
  assert.equal(marks.length, 2);
  assert.ok(marks[0].includes('2026-11-09T23:59:00-0300|E|1|O'), marks[0]);
  assert.ok(marks[1].includes('2026-11-10T00:10:00-0300|S|1|O'), marks[1]);
  assert.equal(lines.filter(x => x.startsWith('06|')).length, 1);
  assert.equal(lines.at(-1), '99|1|1|1|1|2|1|1');
  assert.equal(JSON.stringify(punches), original);
});
