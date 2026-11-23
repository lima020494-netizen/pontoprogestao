import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import kioskConfig from '../../capacitor.config.ts';
import gestorConfig from '../../capacitor.gestor.config.ts';

const workflow = readFileSync('.github/workflows/build-apk.yml', 'utf8');

test('Android separa Quiosque e Gestor com IDs e destinos HTTPS corretos', () => {
  assert.equal(kioskConfig.appId, 'com.pontoprogestao.app');
  assert.equal(kioskConfig.server?.url, 'https://vippontopro.app/quiosque');
  assert.equal(gestorConfig.appId, 'com.pontoprogestao.gestor');
  assert.equal(gestorConfig.appName, 'Ponto Pro Gestor');
  assert.equal(gestorConfig.server?.url, 'https://vippontopro.app/');
  assert.equal(gestorConfig.server?.cleartext, false);
});

test('automação gera os dois APKs, limita RawBT ao Quiosque e preserva seu download legado', () => {
  assert.match(workflow, /variant: quiosque[\s\S]+apk: PontoPro-Quiosque\.apk/);
  assert.match(workflow, /variant: gestor[\s\S]+apk: PontoPro-Gestor\.apk/);
  assert.match(workflow, /Habilitar impressao RawBT somente no Quiosque\s+if: matrix\.variant == 'quiosque'/);
  assert.match(workflow, /cp "\$CAPACITOR_CONFIG" capacitor\.config\.ts/);
  assert.match(workflow, /cp release\/PontoPro-Quiosque\.apk release\/Ponto-pro-gestao\.apk/);
  assert.match(workflow, /release\/PontoPro-Quiosque\.apk\s+release\/PontoPro-Gestor\.apk\s+release\/Ponto-pro-gestao\.apk/);
});

test('cada variante Android usa seu próprio ícone nos cinco mipmaps', () => {
  assert.match(workflow, /variant: quiosque[\s\S]+icon: public\/icon-quiosque\.png/);
  assert.match(workflow, /variant: gestor[\s\S]+icon: public\/icon-gestor\.png/);
  assert.match(workflow, /ICON_FILE: \$\{\{ matrix\.icon \}\}/);
  for (const folder of ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi']) assert.ok(workflow.includes(`'${folder}'`));
  for (const name of ['quiosque', 'gestor']) {
    const png = readFileSync(`public/icon-${name}.png`);
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
  }
});
