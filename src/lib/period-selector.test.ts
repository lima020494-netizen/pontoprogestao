import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function api() {
  const w: any = { PontoProOperacional: { m: {} as any, definir(n: string, v: any) { this.m[n] = v; } } };
  w.window = w;
  vm.runInNewContext(readFileSync('public/operacional/gestor/seletor-periodo-v20261118.js', 'utf8'), { window: w });
  return w.PontoProOperacional.m['gestor.seletorPeriodo'];
}

test('atalho Esse mês cobre novembro inteiro com horários de corte', () => {
  const p = api().atalho('mes', new Date('2026-11-18T00:07:00'));
  assert.deepEqual(JSON.parse(JSON.stringify(p)), { inicio: '2026-11-01', fim: '2026-11-30', horaInicio: '00:00', horaFim: '23:59' });
  assert.equal(api().formatar(p), '01/11/2026 - 00:00 a 30/11/2026 - 23:59');
});

test('semana começa segunda e semana passada termina no domingo anterior', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(api().atalho('semana', new Date('2026-11-18T12:00:00')))), { inicio: '2026-11-16', fim: '2026-11-22', horaInicio: '00:00', horaFim: '23:59' });
  assert.deepEqual(JSON.parse(JSON.stringify(api().atalho('semanaPassada', new Date('2026-11-18T12:00:00')))), { inicio: '2026-11-09', fim: '2026-11-15', horaInicio: '00:00', horaFim: '23:59' });
});

test('mês passado respeita ano novo e o último dia real do mês', () => {
  const p = api().atalho('mesPassado', new Date('2026-01-10T12:00:00'));
  assert.equal(p.inicio, '2025-12-01'); assert.equal(p.fim, '2025-12-31');
});

test('calendário usa semana de domingo a sábado e mantém dias adjacentes identificados', () => {
  const dias = api().calendario(2026, 11);
  assert.equal(dias.length, 42); assert.equal(dias[0].data, '2026-11-01');
  assert.equal(dias[0].fora, false); assert.equal(dias[41].data, '2026-12-12'); assert.equal(dias[41].fora, true);
});

test('validação rejeita intervalo invertido, data inexistente e hora inválida', () => {
  const a = api();
  assert.equal(a.validar({ inicio: '2026-11-30', fim: '2026-11-01', horaInicio: '00:00', horaFim: '23:59' }).ok, false);
  assert.equal(a.validar({ inicio: '2026-02-30', fim: '2026-03-01', horaInicio: '00:00', horaFim: '23:59' }).ok, false);
  assert.equal(a.validar({ inicio: '2026-11-01', fim: '2026-11-30', horaInicio: '00:00', horaFim: '24:00' }).ok, false);
});

test('seletor e agregação ficam no shell offline, sem rede, fila ou armazenamento próprios', () => {
  const modulos = ['operacional/gestor/seletor-periodo-v20261118.js', 'operacional/domain/painel-periodo-v20261118.js'];
  const html = readFileSync('public/vip-ponto.html', 'utf8'), sw = readFileSync('public/ponto-offline-sw.js', 'utf8');
  for (const modulo of modulos) {
    assert.ok(html.includes(`src="/${modulo}"`), modulo);
    assert.ok(sw.includes(`'/${modulo}'`), modulo);
    assert.doesNotMatch(readFileSync(`public/${modulo}`, 'utf8'), /fetch\s*\(|localStorage|indexedDB|filaPonto\s*\(|nuvemPush\s*\(|setInterval\s*\(/, modulo);
  }
});
