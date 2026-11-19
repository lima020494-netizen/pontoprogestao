import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html=readFileSync(new URL("../../public/vip-ponto.html",import.meta.url),"utf8");
function managerContext(mode: boolean, count=0, limite=2) {
  const stored={gerenciadores:[{pin:"1000",is_hidden:true},...Array.from({length:count},(_,i)=>({nome:'G'+i,email:`g${i}@empresa.com`}))],funcionarios:[]};
  const fields: Record<string,{value:string;innerHTML:string}>=Object.fromEntries([['g-nome','Gestor'],['g-funcao','Gerente'],['g-email','Novo@Empresa.com'],['g-msg','']].map(([id,value])=>[id,{value:value??'',innerHTML:''}]));
  const ctx={MODO_GESTOR:mode,CONTA:'test@example.com',LIC:{licenca:{plano:1},config:{planos:{1:{gerenciadores:limite}}}},licCache:()=>null,planosCfg:(l: {config: {planos:object}})=>l.config.planos,get:(k:keyof typeof stored)=>stored[k],set:(k:keyof typeof stored,v:never)=>{stored[k]=v;},$: (id:string)=>fields[id],log:()=>{},renderGerenciadores:()=>{},abrirPinModal:()=>{ctx.opened=true;},opened:false};
  const extract=(start:string,end:string)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
  runInNewContext(extract('const gerVisiveis=','function renderGerenciadores()')+extract('function maxGerAtual()','function maxFuncAtual()')+extract('function addGerenciador()','function editarGer(')+extract('function pedirPinGestor()','function pedirPinPortal()'),ctx);
  return {ctx,stored,fields};
}
test('kiosk cannot open the manager PIN entry',()=>{const {ctx}=managerContext(false);runInNewContext('pedirPinGestor()',ctx);assert.equal(ctx.opened,false);});
test('manager mode with authenticated account requests a PIN',()=>{const {ctx}=managerContext(true);runInNewContext('pedirPinGestor()',ctx);assert.equal(ctx.opened,true);});
test('hidden reserve is excluded from the contracted manager capacity',()=>{const {ctx,stored}=managerContext(true,1);runInNewContext('addGerenciador()',ctx);assert.equal(stored.gerenciadores.length,3);});
test('registration is refused once two contracted managers exist',()=>{const {ctx,stored}=managerContext(true,2);runInNewContext('addGerenciador()',ctx);assert.equal(stored.gerenciadores.length,3);});test('authorized manager is stored by lowercase e-mail without a PIN',()=>{const {ctx,stored}=managerContext(true,0);runInNewContext('addGerenciador()',ctx);const g=stored.gerenciadores.at(-1) as {email?:string;pin?:string};assert.equal(g.email,'novo@empresa.com');assert.equal(g.pin,undefined);});
test('authorized managers are capped at four even when the plan allows more',()=>{const {ctx,stored}=managerContext(true,4,10);runInNewContext('addGerenciador()',ctx);assert.equal(stored.gerenciadores.length,5);});
test('the same e-mail cannot be authorized twice',()=>{const {ctx,stored,fields}=managerContext(true,1,10);fields['g-email'].value='G0@empresa.com';runInNewContext('addGerenciador()',ctx);assert.equal(stored.gerenciadores.length,2);});
