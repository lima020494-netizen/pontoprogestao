import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const html=readFileSync('public/vip-ponto.html','utf8');
const source=html.slice(html.indexOf('function dadosFechamentoContador('),html.indexOf('async function pacoteContador('));
function closing(day:string, punches:unknown[]=[], occurrence:unknown=null) {
  const original={f:{pin:'1'},tot:{faltas:1,faltasInj:1,faltantes:440},linhas:[{data:day,previsto:440,ocorrencia:'FALTA',descontoDia:0,descontoDsr:0}],banco:{debitos:0}};
  const before=JSON.stringify(original);
  const result=runInNewContext(source+';dadosFechamentoContador(d,"2026-10-31")',{d:original,batidasDia:()=>punches,ocorrenciaDia:()=>occurrence,regraOcorrencia:(tipo:string)=>({falta:tipo==='Falta'})});
  assert.equal(JSON.stringify(original),before);
  return result;
}
test('October 31 still open is not a closing absence or 440 missing minutes',()=>{
  const d=closing('2026-10-31');assert.equal(d.tot.faltas,0);assert.equal(d.tot.faltantes,0);assert.equal(d.linhas[0].ocorrencia,'');
});
test('future November 1 is not counted as a closing absence',()=>{assert.equal(closing('2026-11-01').tot.faltas,0);});
test('completed October 30 without punch or justification counts one absence, neutral bank',()=>{
  const d=closing('2026-10-30');assert.equal(d.tot.faltas,1);assert.equal(d.tot.faltantes,440);assert.equal(d.banco.debitos,0);
});
test('completed day with a punch cannot count a full unjustified absence',()=>{assert.equal(closing('2026-10-30',[{hora:'08:00'}]).tot.faltas,0);});
test('completed day with medical justification cannot count an absence',()=>{assert.equal(closing('2026-10-30',[],{tipo:'Atestado médico'}).tot.faltas,0);});