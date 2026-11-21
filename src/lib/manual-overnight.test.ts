import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDomainContext, operationalSlice } from './operational-domain-harness.ts';
import vm from 'node:vm';
function manual(itens:any[], initial:any[]=[]){
 const rows:any[]=[...initial],logs:string[]=[],fila:string[]=[];
 const ctx=createDomainContext({TIPOS:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'],get:(k:string,d:any)=>k==='batidas'?rows:d,set:(_:string,v:any[])=>{rows.splice(0,rows.length,...v)},funcPorPin:()=>({nome:'Teste',cpf:'000'}),proximoNSR:()=>String(rows.length+1),filaPonto:(n:string)=>fila.push(n),log:(s:string)=>logs.push(s),GERENCIADOR:{nome:'Gestor'},$:()=>null,window:{}});
 vm.runInContext(operationalSlice('function reordenarJornada','/* Documentos da Etapa 4')+operationalSlice('function registrarBatidaManual','function lancarOcorrencia'),ctx);
 const erro=ctx.registrarVariasBatidas({pin:'1',data:'2026-11-20',itens,motivo:'Esquecimento',autorizadoPor:'Gestor'});
 return {rows,logs,fila,erro,ctx};
}
test('22:00 entrada e 06:00 saída persistem D+1 na jornada inicial com NSR e fila',()=>{
 const r=manual([{tipo:'Entrada',hora:'22:00'},{tipo:'Saída',hora:'06:00'}]);assert.equal(r.erro,'');assert.equal(r.rows[1].data,'2026-11-21');assert.equal(r.rows[1].jornada,'2026-11-20');assert.equal(r.rows[1].tipo,'Saída');assert.equal(r.rows[1].hora,'06:00');assert.equal(r.fila.length,2);assert.equal(r.logs.length,2);assert.equal(r.ctx.batidasJornada('1','2026-11-20').length,2);
});
test('intervalos noturnos 22/02/03/06 preservam quatro tipos e timestamps civis',()=>{
 const r=manual(['22:00','02:00','03:00','06:00'].map((hora,i)=>({hora,tipo:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'][i]})));assert.deepEqual(r.rows.map(b=>b.data),['2026-11-20','2026-11-21','2026-11-21','2026-11-21']);assert.equal(r.rows[2].tipoManual,'Entrada Intervalo');assert.equal(JSON.parse(JSON.stringify(r.rows))[3].jornada,'2026-11-20');
});
test('completar saída noturna considera entrada existente sem regravar ou renumerar',()=>{
 const r=manual([{tipo:'Saída',hora:'06:00'}],[{pin:'1',data:'2026-11-20',hora:'22:00',tipo:'Entrada',nsr:'1',fonte:'PIN'}]);assert.equal(r.rows[1].data,'2026-11-21');assert.equal(r.rows[0].nsr,'1');assert.equal(r.rows[0].hora,'22:00');
});
test('limite quatro e auditoria invalidada não gravam batidas',()=>{
 const r=manual([{tipo:'Entrada',hora:'08:00'}]);const antes=r.rows.length;
 for(const extras of [{motivo:''},{autorizadoPor:''},{itens:Array.from({length:4},()=>({tipo:'Saída',hora:'17:00'}))}]){assert.notEqual(r.ctx.registrarVariasBatidas({pin:'1',data:'2026-11-20',itens:[{tipo:'Saída',hora:'17:00'}],motivo:'Esquecimento',autorizadoPor:'Gestor',...extras}),'');assert.equal(r.rows.length,antes);}
});
test('busca universal filtra por nome acentuado, matrícula e CPF formatado, limitada a oito',()=>{
 const ctx=createDomainContext(),api=ctx.PontoProOperacional.obter('gestor.colaboradores');const fs=[{pin:'1',nome:'José Lima',matricula:'ABC42',cpf:'123.456.789-01'},{pin:'2',nome:'Ana',matricula:'XYZ',cpf:'98765432100'}];
 assert.equal(api.buscar(fs,'jose')[0].pin,'1');assert.equal(api.buscar(fs,'ABC42')[0].pin,'1');assert.equal(api.buscar(fs,'12345678901')[0].pin,'1');assert.equal(api.buscar(fs,'não existe').length,0);assert.equal(api.buscar(Array.from({length:20},()=>fs[0]),'').length,8);
});
