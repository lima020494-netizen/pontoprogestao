import { test } from "node:test";
import assert from "node:assert/strict";
import { appSettingsSchema, resolveAppSettings } from "./app-settings";
import { canSaveDeveloperInfo } from "./developer-info";
import { readableTextColor, contrastRatio, resolvePlatformLogo, PLATFORM_LOGO } from "./platform-identity";

test("global identity preserves configured logo, version and maintenance", () => {
  const s = resolveAppSettings({logo_url:"https://example.com/logo.png",version:"4.0",maintenance:true});
  assert.equal(s.logo_url,"https://example.com/logo.png"); assert.equal(s.version,"4.0"); assert.equal(s.maintenance,true);
});
test("official deep blue replaces a legacy custom primary color", () => {
  assert.equal(resolveAppSettings({primary_color:"#c9992b"}).primary_color,"#03446C");
});
test("official gold replaces a legacy custom accent color", () => {
  assert.equal(resolveAppSettings({accent_color:"#c9992b"}).accent_color,"#FEBE45");
});
test("global font no longer applies custom colors", () => {
  assert.equal(resolveAppSettings({text_color:"#ffffff"}).text_color,"#0B2130");
});
test("unreadable global text is adjusted to at least 4.5 contrast", () => {
  assert.ok(contrastRatio(readableTextColor("#ffffff","#ffffff"),"#ffffff")>=4.5);
});
test("previous platform logo resolves to the new official art", () => {
  assert.equal(resolvePlatformLogo("/__l5e/assets-v1/798df0df-fee7-4f44-b98f-df1e096c0ace/ponto-pro-gestao-logo.jpg"),PLATFORM_LOGO);
});
test("custom platform logos stay configured", () => {
  assert.equal(resolvePlatformLogo("https://example.com/custom.png"),"https://example.com/custom.png");
});
test("logo rejects script protocols and SVG content", () => {
  assert.equal(appSettingsSchema.safeParse({...resolveAppSettings(null),logo_url:"javascript:alert(1)"}).success,false);
  assert.equal(appSettingsSchema.safeParse({...resolveAppSettings(null),logo_url:"data:image/svg+xml;base64,AAAA"}).success,false);
});
test("global settings authorization requires master plus admin plus reserve confirmation", () => {
  assert.equal(canSaveDeveloperInfo("pontoprogestao@gmail.com",true,"1000"),true);
  assert.equal(canSaveDeveloperInfo("other@example.com",true,"1000"),false);
  assert.equal(canSaveDeveloperInfo("pontoprogestao@gmail.com",false,"1000"),false);
  assert.equal(canSaveDeveloperInfo("pontoprogestao@gmail.com",true,"1234"),false);
});