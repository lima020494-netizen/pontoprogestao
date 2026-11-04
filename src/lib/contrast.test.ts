import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from './platform-identity';

const html = readFileSync(new URL('../../public/vip-ponto.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const navy = '#1e3a8a'; // fundo institucional escuro usado em faixas, cabeçalhos e barras

function declaration(selector: string, file: string) {
  const rule = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(file);
  assert.ok(rule, `regra CSS ausente: ${selector}`);
  return rule[1];
}

function colorOf(decl: string, selector: string) {
  const color = /color:\s*(#[0-9a-fA-F]{6})/.exec(decl)?.[1];
  assert.ok(color, `cor não declarada em ${selector}: ${decl}`);
  return color.toLowerCase();
}

test('department band of the schedule grid keeps white text on the navy row', () => {
  const decl = declaration('#gestor-body td.dept-head', html);
  assert.ok(contrastRatio(colorOf(decl, '#gestor-body td.dept-head'), navy) >= 4.5);
});

test('schedule band stays readable while the row is hovered', () => {
  const hover = /#gestor-body tr:hover td\.dept-head\s*\{([^}]*)\}/.exec(html);
  assert.ok(hover, 'regra de hover para a faixa da escala ausente');
  assert.ok(contrastRatio(colorOf(hover[1], 'tr:hover td.dept-head'), navy) >= 4.5);
});

test('month label of the accountant package banner is light on the navy hero', () => {
  const decl = declaration('#gestor-body .pacote-hero label', html);
  assert.ok(contrastRatio(colorOf(decl, '#gestor-body .pacote-hero label'), navy) >= 4.5);
});

test('indicator cards use gradient stops dark enough for white text', () => {
  for (const name of ['ind-green', 'ind-red', 'ind-orange']) {
    const stops = [...html.matchAll(new RegExp(`\\.${name}\\{background:linear-gradient\\(135deg,(#[0-9a-fA-F]{6}),(#[0-9a-fA-F]{6})\\)`, 'g'))];
    assert.equal(stops.length, 1, `gradiente ${name} não encontrado`);
    const lightest = [stops[0][1], stops[0][2]].sort((a, b) => contrastRatio(b, '#ffffff') - contrastRatio(a, '#ffffff'))[0];
    assert.ok(contrastRatio(lightest, '#ffffff') >= 4.5, `${name}: branco sobre ${lightest} rende ${contrastRatio(lightest, '#ffffff').toFixed(2)}`);
  }
});

test('soft text token clears AA on every light surface used by the manager', () => {
  const soft = /--soft:\s*(#[0-9a-fA-F]{6})/.exec(html)?.[1];
  assert.ok(soft, 'token --soft ausente');
  for (const surface of ['#ffffff', '#f8fafc', '#fef2f2', '#eff6ff', '#fff7ed', '#f0fdf4']) {
    assert.ok(contrastRatio(soft, surface) >= 4.5, `${soft} sobre ${surface} rende ${contrastRatio(soft, surface).toFixed(2)}`);
  }
});

test('manager labels and muted text use the soft token instead of a lighter gray', () => {
  assert.match(html, /#gestor-body label\{color:var\(--soft\)\}/);
  assert.match(html, /#gestor-body \.muted\{color:var\(--soft\)\}/);
  assert.doesNotMatch(html, /#gestor-body \.muted\{color:#6d8794\}/);
});

test('treatment cards and timeline use the soft token', () => {
  for (const selector of ['.treatment-card time', '.treatment-timeline small', '.treatment-values', '.treatment-drawer-head small']) {
    assert.ok(declaration(selector, html).includes('var(--soft)'), `${selector} sem var(--soft)`);
  }
});

test('commercial eyebrow clears AA on the navy storefront background', () => {
  const eyebrow = /--commercial-eyebrow:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
  assert.ok(eyebrow, 'token --commercial-eyebrow ausente');
  assert.ok(contrastRatio(eyebrow, navy) >= 4.5);
  assert.match(css, /\.commercial-eyebrow\s*\{\s*color:\s*var\(--commercial-eyebrow\);\s*\}/);
});

test('storefront eyebrows use the high contrast class, not primary', () => {
  const page = readFileSync(new URL('../components/conheca-page.tsx', import.meta.url), 'utf8');
  assert.equal((page.match(/className="text-xs font-bold uppercase commercial-eyebrow"/g) || []).length, 3);
  assert.equal((page.match(/className="text-xs font-bold uppercase text-primary"/g) || []).length, 0);
});
