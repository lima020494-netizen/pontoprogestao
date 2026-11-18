import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDomainContext } from './operational-domain-harness.ts';

const f = (pin: string, departamento = 'Salão') => ({ pin, nome: `Pessoa ${pin}`, departamento, escala: '5x2', status: 'Ativo', admissao: '2026-01-01' });
const b = (pin: string, data: string, hora: string, tipo: string, nsr: number) => ({ pin, data, hora, tipo, nsr: String(nsr) });

function contexto() {
  const dados: any = {
    funcionarios: [f('1'), f('2', 'Cozinha')], empregador: { hEntrada: '08:00', hSaiInt: '12:00', hEntInt: '13:00', hSaida: '17:00', toleranciaAtraso: 10 },
    batidas: [b('1', '2026-11-16', '08:00', 'Entrada', 1), b('1', '2026-11-16', '17:00', 'Saída', 2), b('1', '2026-11-17', '08:20', 'Entrada', 3), b('1', '2026-11-17', '17:00', 'Saída', 4)],
    ocorrencias: [], escalas: {}, feriados: [],
  };
  const antes = JSON.stringify(dados);
  const c: any = createDomainContext({ get: (k: string, d: any) => dados[k] ?? d });
  return { c, dados, antes };
}

test('período agrega jornadas, faltas, presença e pontualidade sem alterar os registros', () => {
  const { c, dados, antes } = contexto();
  const p = c.calcularPainelPeriodo(new Date('2026-11-18T10:00:00'), { inicio: '2026-11-16', fim: '2026-11-18' });
  const um = p.linhas.find((l: any) => l.f.pin === '1');
  assert.equal(um.periodo.previstos, 3); assert.equal(um.periodo.presentes, 2);
  assert.equal(um.periodo.faltas, 1); assert.equal(um.periodo.atrasos, 1);
  assert.equal(p.resumo.previstos, 6); assert.equal(p.resumo.presentes, 2); assert.equal(p.resumo.presenca, 33);
  assert.equal(p.contadores.trabalhando, 2); assert.equal(p.contadores.intervalo, 1); assert.equal(p.contadores.alerta, 1);
  assert.equal(JSON.stringify(dados), antes);
});

test('setores e filtros usam os totais do período sem misturar denominadores', () => {
  const { c } = contexto();
  const p = c.calcularPainelPeriodo(new Date('2026-11-18T10:00:00'), { inicio: '2026-11-16', fim: '2026-11-18' });
  const setores = c.setoresPainelPeriodo(p);
  assert.equal(setores.find((s: any) => s.nome === 'Salão').presenca, 67);
  assert.equal(setores.find((s: any) => s.nome === 'Cozinha').presenca, 0);
  assert.equal(c.filtrarPainelPeriodo(p, 'trabalhando').length, 1);
  assert.equal(c.filtrarPainelPeriodo(p, 'ausentes').length, 2);
  assert.equal(c.filtrarPainelPeriodo(p, 'intervalo')[0].f.pin, '1');
});

test('período futuro não inventa faltas e um único dia preserva o motor diário', () => {
  const { c } = contexto();
  const futuro = c.calcularPainelPeriodo(new Date('2026-11-18T10:00:00'), { inicio: '2026-11-19', fim: '2026-11-30' });
  assert.equal(futuro.linhas.length, 0); assert.equal(futuro.resumo.previstos, 0);
  const dia = c.calcularPainelPeriodo(new Date('2026-11-18T10:00:00'), { inicio: '2026-11-16', fim: '2026-11-16' });
  assert.equal(dia.agregado, false); assert.equal(dia.linhas.find((l: any) => l.f.pin === '1').status, 'concluido');
});
