import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html=readFileSync('public/vip-ponto.html','utf8');
const source=html.slice(html.indexOf('function linkQuiosque()'),html.indexOf('async function copiarLinkQuiosque()'));
test('kiosk link shares only the public route, never the current account or support query',()=>{
  assert.equal(runInNewContext(source+';linkQuiosque()', {URL,location:{origin:'https://vippontopro.app',search:'?suporte=1'},CONTA:'private@example.com'}),'https://vippontopro.app/quiosque');
});

test('manager link uses the root without account identifiers or credentials',()=>{
  assert.equal(runInNewContext(source+';linkGestor()', {URL,location:{origin:'https://vippontopro.app',search:'?suporte=1'},CONTA:'private@example.com'}),'https://vippontopro.app/');
});