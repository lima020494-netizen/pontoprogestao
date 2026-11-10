import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const html = readFileSync('public/vip-ponto.html', 'utf8');
const slice = (start: string, end: string) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
function manual(hora='00:20', tipo='Saída', previous=true, authorize='Gestor', motivo='Esquecimento', initial=1) {
  const rows: Record<string, unknown>[] = Array.from({length:initial},(_,i)=>({pin:'1',data:'2026-10-31',hora:['16:00','20:00','21:00','23:00'][i],tipo:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'][i],nsr:String(i+1)}));
  const fields: Record<string, {value:string;checked?:boolean}> = Object.fromEntries(Object.entries({'ib-pin':'1','ib-data':'2026-11-01','ib-hora':hora,'ib-tipo':tipo,'ib-motivo':motivo,'ib-autorizou':authorize}).map(([k,value])=>[k,{value}]));
  fields['ib-anterior']={value:'',checked:previous};
  const logs:string[]=[], errors:string[]=[];
  const ctx={rows,TIPOS:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'],$: (id:string)=>fields[id], get:(key:string)=>key==='batidas'?rows:0,set:(_:string,v:Record<string,unknown>[])=>{rows.splice(0,rows.length,...v)},toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3)),addDias:(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),horarioEscala:()=>null,funcPorPin:()=>({nome:'Teste',cpf:'000'}),proximoNSR:()=> '5',filaPonto:()=>{},log:(s:string)=>logs.push(s),alert:(s:string)=>errors.push(s),toast:(s:string)=>errors.push(s),GERENCIADOR:{nome:'Gestor'},brOf:(s:string)=>s,fecharModal:()=>{},window:{},subBatidas:()=>{}};
  runInNewContext(slice('function reordenarJornada','function miniResumoFolha')+slice('function salvarBatidaManual','function lancarOcorrencia'),ctx);
  runInNewContext('salvarBatidaManual()',ctx);
  return {rows,logs,errors,ctx};
}
test('00:20 manual exit closes October 31 16:00 shift and preserves November 1 civil date',()=>{
  const r=manual();const b=r.rows[1];assert.equal(b?.['data'],'2026-11-01');assert.equal(b?.['hora'],'00:20');assert.equal(b?.['jornada'],'2026-10-31');assert.equal(b?.['tipo'],'Saída');
  assert.equal(runInNewContext("batidasJornada('1','2026-10-31').length",r.ctx),2);
  assert.equal(runInNewContext("batidasJornada('1','2026-11-01').length",r.ctx),0);
  assert.deepEqual(r.logs,['2026-11-01 00:20 * Marcação Manual - Motivo: Esquecimento - Autorizado por: Gestor']);
});
for(const tipo of ['Entrada','Saída Intervalo','Entrada Intervalo','Saída'])test(`05:59 explicit ${tipo} stays on civil day when previous shift is not chosen`,()=>{
  const r=manual('05:59',tipo,false);assert.equal(r.rows[1]?.['jornada'],'2026-11-01');assert.equal(r.rows[1]?.['tipo'],tipo);
});
test('06:00 follows normal chronological auto classification',()=>{const r=manual('06:00','Saída',true);assert.equal(r.rows[1]?.['jornadaManual'],false);assert.equal(r.rows[1]?.['tipo'],'Entrada');});
test('explicit overnight assignment survives cloud JSON roundtrip unchanged',()=>{
  const r=manual(),before=JSON.stringify(r.rows);
  const serialized=runInNewContext(slice('const linhaPonto=','async function garantirHistorico')+';JSON.stringify(rows.map(linhaPonto))',{...r.ctx,CONTA:'test@example.com'});
  const restored=JSON.parse(serialized).map((row:{dados:unknown})=>row.dados);
  assert.equal(JSON.stringify(restored),before);
});
test('previous shift limit of four punches prevents a fifth manual exit',()=>{assert.equal(manual('00:20','Saída',true,'Gestor','Esquecimento',4).rows.length,4);});
test('manual punch requires authorizer',()=>{const r=manual('00:20','Saída',true,'');assert.equal(r.rows.length,1);assert.equal(r.logs.length,0);});
test('manual punch requires reason',()=>{const r=manual('00:20','Saída',true,'Gestor','');assert.equal(r.rows.length,1);assert.equal(r.logs.length,0);});