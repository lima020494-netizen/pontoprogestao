import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createDomainContext } from './operational-domain-harness.ts';

const source=readFileSync('public/operacional/gestor/matriz-escala-v20261112.js','utf8');
const html=readFileSync('public/vip-ponto.html','utf8');
const f={pin:'1',nome:'Ana',status:'Ativo',escala:'5x2',admissao:'2026-01-01'};
function fixture(){
  const data:any={funcionarios:[f],empregador:{hEntrada:'08:00'},escalas:{},feriados:[]};
  const ctx=createDomainContext({get:(k:string,d:any)=>data[k]??d,cargaEscala:()=>480,funcPorPin:()=>f});
  vm.runInContext(source,ctx);
  const inicioSemana=(d:string)=>{const dt=new Date(d+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-(dt.getUTCDay()+6)%7);return dt.toISOString().slice(0,10);};
  const api=ctx.PontoProOperacional.obter('gestor.matrizEscala').criar({...ctx.NUCLEO_OPERACIONAL,inicioSemana});
  return {ctx,api,data,inicioSemana};
}
test('one-click cycle is M → T → N → F → D → M',()=>{
  const {api}=fixture();assert.deepEqual(['M','T','N','F','D'].map(c=>api.proximo(c)),['T','N','F','D','M']);
});
test('M/T/N preserve canonical worked-day duration and existing hours',()=>{
  const {api}=fixture();for(const c of ['M','T','N']){const it=api.item(c,'1','2026-11-09',{horarioEntrada:'09:15',horarioSaida:'17:15'});assert.equal(it.tipo,'Trabalhado');assert.equal(it.horarioEntrada,'09:15');assert.equal(it.horarioSaida,'17:15');}
});
test('F and D map to existing neutral rest types, without hours',()=>{
  const {api}=fixture();assert.equal(api.item('F','1','2026-11-09').tipo,'Folga Compensada');assert.equal(api.item('D','1','2026-11-09').tipo,'DSR');assert.equal(api.item('F','1','2026-11-09',{horarioEntrada:'08:00'}).horarioEntrada,'');
});
test('unmodified Sunday rest is displayed as D, Saturday rest as F',()=>{
  const {api}=fixture();assert.equal(api.codigo(f,'2026-11-15'),'D');assert.equal(api.codigo(f,'2026-11-14'),'F');
});
test('weekly charge recomputes from 40h to 32h when Monday becomes Folga',()=>{
  const {api,data}=fixture();const dias=Array.from({length:7},(_,i)=>'2026-11-'+String(9+i).padStart(2,'0'));
  assert.equal(api.carga(f,dias),2400);
  data.escalas={'2026-11-09':{semanaInicio:'2026-11-09',semanaFim:'2026-11-15',folgas:[api.item('F','1',dias[0])]}};
  assert.equal(api.carga(f,dias),1920);
});
test('monthly columns include all 31 dates and partial weeks without padding outside period',()=>{
  const {api}=fixture();const dias=Array.from({length:31},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0'));const grupos=api.semanas(dias);
  assert.equal(grupos.length,5);assert.deepEqual(Array.from(grupos.flatMap((g:any)=>g.dias)),dias);
});
test('quick click persists one canonical cell and recalculates once',()=>{
  const {ctx,api,data,inicioSemana}=fixture();let writes=0,renders=0;
  Object.assign(ctx,{MATRIZ_ESCALA:api,inicioSemana,ESC_TRAVA_DIAS:30,set:(k:string,v:any)=>{data[k]=v;writes++;},histEscala:()=>{},subEscala:()=>{renders++;},toast:()=>{}});
  ctx.window.__escIni='2026-11-09';ctx.window.__escFim='2026-11-15';
  vm.runInContext(html.slice(html.indexOf('function escalaObj('),html.indexOf('function setCelula(')),ctx);
  vm.runInContext(html.slice(html.indexOf('function alternarTurnoEscala('),html.indexOf('async function pdfEscalaEquipe(')),ctx);
  vm.runInContext("alternarTurnoEscala('1','2026-11-09')",ctx);
  assert.equal(data.escalas['2026-11-09'].folgas[0].turno,'T');assert.equal(writes,1);assert.equal(renders,1);
});
test('PDF builds all monthly dates and team rows after loading the PDF library',async()=>{
  const {ctx,api,data,inicioSemana}=fixture();let loaded=false,rows=0;const dates:string[]=[];
  ctx.window.jspdf={jsPDF:class{addPage(){}setFontSize(){}text(){}save(){assert.equal(dates.length,31);}}};
  const pdf=ctx.PontoProOperacional.obter('gestor.matrizEscala').criar({...ctx.NUCLEO_OPERACIONAL,inicioSemana,garantirLib:async()=>{loaded=true;},diasPeriodo:()=>Array.from({length:31},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0')),pdfCabecalhoPadrao:()=>47,pdfTabelaPadrao:(_doc:any,o:any)=>{assert.equal(loaded,true);rows+=o.body.length;dates.push(...o.head.slice(2,-1));},pdfRodapesPadrao:()=>{},toast:()=>{}});
  await pdf.pdf('2026-10-01','2026-10-31');assert.equal(rows,5);assert.equal(data.funcionarios.length,1);assert.equal(api.codigo(f,'2026-11-09'),'M');
});