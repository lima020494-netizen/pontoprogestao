import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const html=readFileSync('public/vip-ponto.html','utf8');
const slice=(a:string,b:string)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const addDias=(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
const format=(n:number)=>`${String(Math.floor(Math.abs(n)/60)).padStart(2,'0')}:${String(Math.abs(n)%60).padStart(2,'0')}`;
const helpers={addDias,toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3,5)),toHHMM:format,toSaldo:(n:number)=>(n<0?'-':'+')+format(n),brOf:(d:string)=>d.split('-').reverse().join('/'),dow:(d:string)=>new Date(d+'T12:00:00Z').getUTCDay(),DIAS:Array(7).fill('Dia'),cargaEscala:()=>440};
function calculate(start='2026-10-03',excluded=false){
 const f={pin:'1',escala:'6x1',admissao:'2026-06-01',inicioVigenciaBancoHoras:start,intervalo:{preAssinalado:false}};
 const hours=[['08:31','12:02','13:04','16:50'],['08:30','12:00','13:00','16:50'],['16:39','23:35','23:39','23:39']];
 const punches=hours.flatMap((hs,j)=>hs.map((hora,i)=>({pin:'1',data:`2026-10-0${j+1}`,hora,tipo:j<2?i===3?'Saída Intervalo':'Entrada':['Entrada','Saída Intervalo','Entrada Intervalo','Saída'][i],nsr:String(j*4+i+1),fonte:j<2?'MANUAL':'PIN',excluida:excluded&&j<2})));
 const data:Record<string,unknown>={batidas:punches,funcionarios:[f],empregador:{hEntrada:'08:30',fatorBancoDomFeriado:1},feriados:[],escalas:{},ocorrencias:[{pin:'1',data:'2026-10-01',tipo:'Folga compensatória'},{pin:'1',data:'2026-10-02',tipo:'Folga compensatória'}]};
 const original=JSON.stringify(punches);
 const ctx={...helpers,get:(k:string,fallback:unknown)=>data[k]??fallback,funcPorPin:()=>f,horarioEscala:()=>null};
 const result=runInNewContext(`;dadosFolha('1','2026-10-01','2026-10-03')`,ctx);
 assert.equal(JSON.stringify(punches),original,'raw types, timestamps and NSRs are never rewritten');
 return result;
}
test('October 1 and 2 remain visible but excluded before October 3 bank activation',()=>{
 const d=calculate();assert.deepEqual(Array.from(d.banco.dias,(r:any)=>r.data),['2026-10-01','2026-10-02','2026-10-03']);
 assert.equal(d.banco.dias[0].vigente,false);assert.equal(d.banco.dias[1].vigente,false);assert.equal(d.banco.dias[2].vigente,true);
 assert.equal(d.banco.debitos,0);assert.equal(d.linhas[0].saldo,0);assert.equal(d.linhas[1].saldo,0);
});
test('historical repeated punch types are interpreted chronologically: 437 and 440 worked minutes',()=>{
 const d=calculate();assert.equal(d.linhas[0].trabalhado,437);assert.equal(d.linhas[1].trabalhado,440);assert.equal(d.linhas[0].e2,'12:02');assert.equal(d.linhas[0].e4,'16:50');
});
test('excluded October 1 and 2 punches stay excluded, with their compensatory occurrences preserved',()=>{
 const d=calculate('2026-10-03',true);assert.equal(d.linhas[0].trabalhado,0);assert.equal(d.linhas[1].trabalhado,0);
 assert.equal(d.banco.dias[0].ocorrencia,'Folga compensatória');assert.equal(d.banco.dias[1].ocorrencia,'Folga compensatória');assert.equal(d.banco.atual,0);
});
test('night reduction gives October 3 430 worked minutes without late-arrival bank debit',()=>{
 const d=calculate();assert.equal(d.linhas[2].trabalhado,430);assert.equal(d.linhas[2].noturno,95);assert.equal(d.linhas[2].saldo,0);
});
test('daily sheet saldo agrees with period bank movement and accumulated balance after activation',()=>{
 const d=calculate('2026-10-01');assert.equal(d.banco.debitos,880);
 assert.equal(d.linhas.reduce((n:number,l:any)=>n+l.saldo,0),d.banco.creditos-d.banco.debitos);
 assert.equal(d.banco.atual,d.banco.anterior+d.banco.creditos-d.banco.debitos);
});
test('bank activation after the whole period still shows all three days with neutral balance',()=>{
 const d=calculate('2026-11-01');assert.equal(d.banco.dias.length,3);assert.equal(d.banco.atual,0);assert.ok(d.banco.dias.every((r:any)=>!r.vigente));
});
test('history pagination loads more than 1000 punches and includes activation eve',async()=>{
 const rows=Array.from({length:1005},(_,i)=>({nsr:String(i),dados:{nsr:String(i),data:'2026-10-01'}}));
 const ranges:number[][]=[],dates:string[]=[],cache:Record<string,unknown>={funcionarios:[{admissao:'2026-06-01'}],batidas:[{nsr:'offline',data:'2026-10-02'}]};
 const query:any={select(){return this},eq(){return this},gte(_k:string,d:string){dates.push(d);return this},lt(){return this},order(){return this},async range(a:number,b:number){ranges.push([a,b]);return {data:rows.slice(a,b+1)}}};
 const ctx={...helpers,sb:{from:()=>query},CONTA:'isolated',NUVEM_DESDE:'2026-10-31',get:(k:string,f:unknown)=>cache[k]??f,set:(k:string,v:unknown)=>{cache[k]=v}};
 await runInNewContext(slice('async function lerPontosNuvem','async function carregarNuvem')+`;garantirHistorico('2026-10-01')`,ctx);
 assert.deepEqual(ranges,[[0,999],[1000,1999]]);assert.equal(dates[0],'2026-05-31');assert.equal((cache['batidas'] as unknown[]).length,1006);
});
test('failed historical page leaves cached punches intact',async()=>{
 const cache={funcionarios:[],batidas:[{nsr:'offline'}]},before=JSON.stringify(cache);
 const q:any={select(){return this},eq(){return this},gte(){return this},lt(){return this},order(){return this},async range(){return {error:new Error('unavailable')}}};
 await assert.rejects(runInNewContext(slice('async function lerPontosNuvem','async function carregarNuvem')+`;garantirHistorico('2026-10-01')`,{...helpers,sb:{from:()=>q},CONTA:'isolated',NUVEM_DESDE:'2026-10-31',get:(k:keyof typeof cache)=>cache[k],set(){throw new Error('must not write')}}),/unavailable/);
 assert.equal(JSON.stringify(cache),before);
});
test('individual bank waits for historical loading before calculating',async()=>{
 const nodes:Record<string,any>={'bh-pin':{value:'1'},'bh-ini':{value:'2026-10-01'},'bh-fim':{value:'2026-10-03'},'bh-out':{innerHTML:''}};
 let loaded=false,computed=false;
 await runInNewContext(slice('async function calcBancoView','/* F) Relatórios */')+';calcBancoView()',{...helpers,$:(id:string)=>nodes[id],esc:(v:string)=>v,garantirHistorico:async()=>{await Promise.resolve();loaded=true},calcBanco:()=>{assert.equal(loaded,true);computed=true;return {vigencia:'2026-10-03',anterior:0,creditos:0,debitos:0,atual:0,dias:[]}}});
 assert.equal(computed,true);
});
test('individual bank does not calculate a misleading balance after historical failure',async()=>{
 const nodes:Record<string,any>={'bh-pin':{value:'1'},'bh-ini':{value:'2026-10-01'},'bh-fim':{value:'2026-10-03'},'bh-out':{innerHTML:''}};let calls=0;
 await runInNewContext(slice('async function calcBancoView','/* F) Relatórios */')+';calcBancoView()',{$:(id:string)=>nodes[id],garantirHistorico:async()=>{throw new Error('offline')},calcBanco:()=>{calls++}});
 assert.equal(calls,0);
});
test('consolidated bank recomputes totals after historical loading',async()=>{
 let loaded=false,rendered=-1;
 const nodes:Record<string,any>={'bhr-out':{innerHTML:''}};
 await runInNewContext(slice('async function renderResumoBanco','async function pdfResumoBanco')+';renderResumoBanco()',{
  ...helpers,$:(id:string)=>nodes[id],esc:(v:string)=>v,garantirHistorico:async()=>{loaded=true},
  dadosResumoBanco:()=>({ini:'2026-10-01',fim:'2026-10-03',st:'Todos',linhas:[{b:{anterior:0,creditos:loaded?120:0,debitos:0,atual:loaded?120:0}}]}),
  tabelaResumoBanco:(r:any)=>{rendered=r.linhas[0].b.atual;return ''},
 });assert.equal(rendered,120);
});
test('consolidated CSV reads freshly loaded bank totals',async()=>{
 let loaded=false,csv='';
 const ctx={...helpers,garantirHistorico:async()=>{loaded=true},toast:()=>{},dadosResumoBanco:()=>({ini:'2026-10-01',fim:'2026-10-03',linhas:[{f:{nome:'Teste',status:'Ativo'},b:{anterior:0,creditos:loaded?120:0,debitos:0,atual:loaded?120:0}}]}),
  Blob:class{constructor(parts:string[]){csv=parts.join('')}},URL:{createObjectURL:()=>''},document:{createElement:()=>({click(){}})}};
 await runInNewContext(slice('async function csvResumoBanco','async function calcBancoView')+';csvResumoBanco()',ctx);
 assert.ok(csv.includes('"02:00"'));assert.ok(csv.includes('"+02:00"'));
});
test('consolidated PDF reads freshly loaded bank totals',async()=>{
 let loaded=false,body:unknown[][]=[];
 await runInNewContext(slice('async function pdfResumoBanco','async function csvResumoBanco')+';pdfResumoBanco()',{
  ...helpers,CONTA:'isolated',toast:()=>{},log:()=>{},garantirHistorico:async()=>{loaded=true},garantirLib:async()=>{},
  dadosResumoBanco:()=>({ini:'2026-10-01',fim:'2026-10-03',st:'Todos',linhas:[{f:{nome:'Teste',status:'Ativo'},b:{anterior:0,creditos:loaded?120:0,debitos:0,atual:loaded?120:0}}]}),
  window:{jspdf:{jsPDF:class{save(){}}}},pdfCabecalhoPadrao:()=>0,pdfRodapesPadrao:()=>{},pdfTabelaPadrao:(_doc:unknown,r:any)=>{body=r.body},
 });assert.equal(body[0]?.[3],'+02:00');assert.equal(body[0]?.[5],'+02:00');
});test('individual statement PDF ends its running balance at the current bank balance',()=>{
  const b={anterior:120,creditos:60,debitos:30,atual:150,dias:[{data:'2026-10-01',previsto:480,trabalhado:540,saldo:60,ocorrencia:'',vigente:true},{data:'2026-10-02',previsto:480,trabalhado:450,saldo:-30,ocorrencia:'',vigente:true}]};
  const rows=runInNewContext(slice('function textoMovBanco','async function pdfExtratoBanco')+';linhasExtratoBanco(b)',{...helpers,b,regraOcorrencia:()=>({})});
  assert.equal(rows[0][5],'+03:00');assert.equal(rows[1][5],'+02:30');assert.equal(rows[1][3],'Débito - Carga incompleta');
});
