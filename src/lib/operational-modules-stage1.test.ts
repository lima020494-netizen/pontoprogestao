import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const modulePaths = [
  'operacional/boot/namespace-v20261110-etapa1.js',
  'operacional/core/formatos-v20261110-etapa1.js',
  'operacional/boot/contexto-v20261110-etapa1.js',
  'operacional/boot/compatibilidade-v20261110-etapa1.js',
];
const moduleSource = (path: string) => readFileSync('public/' + path, 'utf8');

function loadModules(paths = modulePaths) {
  const context: Record<string, any> = { window: {}, console };
  for (const path of paths) runInNewContext(moduleSource(path), context, { filename: path });
  return context.window.PontoProOperacional;
}

test('stage 1: versioned local modules load synchronously before the existing operational shell', () => {
  const positions = modulePaths.map(path => html.indexOf(`<script src="/${path}"></script>`));
  assert.ok(positions.every(position => position > 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(positions.at(-1)! < html.indexOf('/* ---------- utilitários ---------- */'));
  assert.equal((html.match(/\(async function boot\(\)\{/g) || []).length, 1);
  assert.equal((html.match(/async function iniciarApp\(\)\{/g) || []).length, 1);
});

test('stage 1: one namespace registers modules once and a repeated loader does not reinitialize it', () => {
  const namespace = loadModules();
  assert.equal(namespace.versao, '2026-11-10.etapa1');
  for (const name of ['core.formatos', 'boot.contexto', 'boot.compatibilidade']) assert.equal(namespace.tem(name), true);
  assert.throws(() => namespace.definir('core.formatos', {}), /duplicado/);

  const context: Record<string, any> = { window: {} };
  const source = moduleSource(modulePaths[0]);
  runInNewContext(source, context);
  const first = context.window.PontoProOperacional;
  runInNewContext(source, context);
  assert.equal(context.window.PontoProOperacional, first);
});

test('stage 1: extracted formatting, time conversion and CPF mask retain concrete legacy results', () => {
  const f = loadModules([modulePaths[0], modulePaths[1]]).obter('core.formatos');
  assert.equal(f.pad(7), '07');
  assert.equal(f.esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;');
  assert.equal(f.isoOf(new Date(2026, 10, 10, 8, 7)), '2026-11-10');
  assert.equal(f.brOf('2026-11-10'), '10/11/2026');
  assert.equal(f.hhmm(new Date(2026, 10, 10, 8, 7)), '08:07');
  assert.equal(f.toMin('08:35'), 515);
  assert.equal(f.toHHMM(560), '09:20');
  assert.equal(f.toSaldo(-166), '-02:46');
  assert.equal(f.addDias('2026-10-31', 1), '2026-11-01');
  assert.equal(f.dow('2026-11-10'), 2);
  assert.deepEqual(Array.from(f.DIAS), ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);
  assert.equal(f.cpfMascarado('123.456.789-01'), '123.***.***-01');
  assert.equal(f.cpfMascarado('123'), '***');
  assert.equal(f.cpfMascarado(''), '—');
});

test('stage 1: context exposes current account, manager, data and sync state by reference without duplicate writes', () => {
  const namespace = loadModules([modulePaths[0], modulePaths[2]]);
  const boot = namespace.obter('boot.contexto');
  const state: Record<string, any> = { conta: null, gestor: null, empresa: {}, funcionarios: [], escalas: {}, feriados: [], ocorrencias: [], online: false, carregando: false, enviando: false, historicoDesde: '' };
  const context = boot.ligar({
    conta: () => state.conta,
    sessao: () => ({ autenticada: Boolean(state.conta), cliente: null }),
    gestor: () => state.gestor,
    empresa: () => state.empresa,
    colaboradores: () => state.funcionarios,
    escalas: () => state.escalas,
    feriados: () => state.feriados,
    ocorrencias: () => state.ocorrencias,
    sincronizacao: () => ({ online: state.online, carregando: state.carregando, enviando: state.enviando, historicoDesde: state.historicoDesde }),
  });
  state.conta = 'empresa@example.invalid';
  state.gestor = { nome: 'Gestor fictício' };
  state.funcionarios = [{ pin: '1' }];
  state.online = true;
  assert.equal(context.conta, state.conta);
  assert.equal(context.sessao.autenticada, true);
  assert.equal(context.gestor, state.gestor);
  assert.equal(context.colaboradores, state.funcionarios);
  assert.equal(context.sincronizacao.online, true);
  assert.equal(boot.vinculado, true);
  assert.equal(boot.ligar({ conta: () => 'outra-conta' }), context);
  assert.equal(context.conta, state.conta, 'uma segunda ligação não reinicializa nem substitui o contexto');
});

test('stage 1: compatibility aliases delegate to the extracted module and inline-handler inventory is unchanged', () => {
  const namespace = loadModules();
  const aliases = namespace.obter('boot.compatibilidade').aliases('core.formatos', ['toMin', 'toSaldo', 'DIAS']);
  assert.equal(aliases.toMin('07:20'), 440);
  assert.equal(aliases.toSaldo(560), '+09:20');
  assert.equal(aliases.DIAS, namespace.obter('core.formatos').DIAS);
  assert.match(html, /const \{pad,esc,isoOf,brOf,hhmm,toMin,toHHMM,toSaldo,DIAS,dow,addDias\}=PontoProOperacional\.obter\('boot\.compatibilidade'\)\.aliases\('core\.formatos'/);
  assert.match(html, /function cpfMascarado\(c\)\{return PontoProOperacional\.obter\('core\.formatos'\)\.cpfMascarado\(c\);\}/);
  assert.equal((html.match(/on(?:click|change|input|submit|keydown|keyup)=/g) || []).length, 202);
});

test('stage 1: modules add no Supabase, storage, queue, export or polling behavior', () => {
  for (const path of modulePaths) {
    const source = moduleSource(path);
    assert.doesNotMatch(source, /\bfetch\s*\(|\bsetInterval\s*\(|\bsetTimeout\s*\(|\bsupabase\b|\blocalStorage\b|\bindexedDB\b|\bgarantirLib\b/, path);
  }
  assert.equal((html.match(/\bsetInterval\s*\(/g) || []).length, 3);
  assert.equal((html.match(/\bgarantirLib\s*\(/g) || []).length, 20);
});

test('stage 1: service worker caches all new shell modules atomically and still excludes account data', () => {
  const sw = readFileSync('public/ponto-offline-sw.js', 'utf8');
  assert.match(sw, /ponto-static-20261110-operacional-etapa1-v1/);
  for (const path of modulePaths) assert.ok(sw.includes(`'/${path}'`), path);
  const assets = sw.slice(sw.indexOf('const ASSETS'), sw.indexOf('self.addEventListener'));
  assert.doesNotMatch(assets, /\/api\/|\/rest\/|\/auth\/|pontos_pendentes/);
});
