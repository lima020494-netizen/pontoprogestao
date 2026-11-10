import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';
const html=readFileSync('public/vip-ponto.html','utf8');
const format=(n:number)=>`${String(Math.floor(Math.abs(n)/60)).padStart(2,'0')}:${String(Math.abs(n)%60).padStart(2,'0')}`;
const d={f:{pin:'1234'},linhas:[{data:'2026-10-12',previsto:0,trabalhado:480,saldo:480,noturno:60,atrasoMin:0,ocorrencia:'FERIADO'}],tot:{extras:480,extras50:0,extras100:480,trabalhado:480,faltas:0,faltantes:0},just:[],banco:{anterior:120,creditos:480,debitos:0,atual:600}};
const punches=[{tipo:'Entrada',hora:'08:00',fonte:'MANUAL',movimento:'Motivo: esquecimento',nsr:'10'}, {tipo:'Saída',hora:'16:00',fonte:'SERVIDOR',nsr:'11'}];
function model(){return JSON.parse(JSON.stringify(runInNewContext(html.slice(html.indexOf('function miniResumoFolha('),html.indexOf('const gerarFolhaMTE='))+';modeloEspelho(d)',{d,batidasDia:()=>punches,toHHMM:format,toSaldo:(n:number)=>(n<0?'-':'+')+format(n),brOf:(s:string)=>s.split('-').reverse().join('/'),preLegenda:()=>''})));}
test('three summary rows preserve eight holiday hours and bank movement without inferring monetary premiums',()=>{
  const m=model();assert.equal(m.resumo.length,3);assert.equal(m.resumo[1][0][1],'00:00');assert.equal(m.resumo[1][1][1],'08:00');
  assert.deepEqual(m.resumo[2].map((x:string[])=>x[1]),['+02:00','+08:00','+10:00']);assert.equal(m.body[0][7],'08:00');
});
test('manual punch is marked and its reason retained without modifying original timestamps or NSR',()=>{
  const original=JSON.stringify(punches);const m=model();assert.equal(m.body[0][1],'08:00*');assert.equal(m.body[0][4],'16:00');assert.ok(m.notas.some((x:string)=>/^\[1\] 12\/10\/2026: Ajuste manual de marcação 08:00 \(esquecimento\)$/.test(x)));assert.match(m.body[0][10],/\[1\]$/);assert.ok(!m.notas.some((x:string)=>x.includes('Motivo:')));assert.equal(JSON.stringify(punches),original);
});
test('employee can be saved with empty optional bank start',()=>{
  const values:Record<string,string>={'f-nome':'Teste','f-cpf':'123','f-funcao':'Equipe','f-dep':'Operação','f-adm':'2026-10-01','f-pin':'1234','f-status':'Ativo','inicio-vigencia-banco':''};let saved:any;
  const source=html.slice(html.indexOf('function salvarFunc('),html.indexOf('function delFunc('));
  runInNewContext(source+';salvarFunc(-1)',{$:(id:string)=>({value:values[id]||'',checked:false,innerHTML:''}),get:()=>[],set:(_k:string,v:unknown)=>{saved=v;},log:()=>{},fecharModal:()=>{},abaFunc:()=>{},statusTexto:()=>'',maxFuncAtual:()=>10});
  assert.equal(saved?.length,1);assert.equal(saved[0].inicioVigenciaBancoHoras,'');
});
test('work hours show Sunday DSR, weekdays 08-12/14-18 and Saturday 08-12',()=>{
  const company={dsr:'Sim',hEntrada:'08:00',hSaiInt:'12:00',hEntInt:'14:00',hSaida:'18:00'};
  const source=html.slice(html.indexOf('function horarioTrabalhoFolha('),html.indexOf('function totaisCartaoFolha('));
  const rows=JSON.parse(JSON.stringify(runInNewContext(source+';horarioTrabalhoFolha()',{get:()=>company})));
  assert.equal(rows.length,7);assert.equal(rows[0][1],'DSR');
  for(let i=1;i<=5;i++)assert.equal(rows[i][1],'08:00  12:00  14:00  18:00');
  assert.equal(rows[6][1],'08:00  12:00');
  const missing=JSON.parse(JSON.stringify(runInNewContext(source+';horarioTrabalhoFolha()',{get:()=>({})})));
  assert.deepEqual(missing,rows);
});
test('work hours follow separately edited Saturday company settings',()=>{
  const source=html.slice(html.indexOf('function horarioTrabalhoFolha('),html.indexOf('function totaisCartaoFolha('));
  const company={dsr:'Não',hEntrada:'09:00',hSaiInt:'12:30',hEntInt:'14:30',hSaida:'19:00',hSabEntrada:'09:00',hSabSaida:'13:00'};
  const rows=JSON.parse(JSON.stringify(runInNewContext(source+';horarioTrabalhoFolha()',{get:()=>company})));
  assert.equal(rows[6][1],'09:00  13:00');assert.equal(rows[1][1],'09:00  12:30  14:30  19:00');assert.equal(rows[0][1],rows[1][1]);
});test('sheet header shows CPF instead of PIS',()=>{
  const source=html.slice(html.indexOf('function dadosCabecalhoFolha('),html.indexOf('function horarioTrabalhoFolha('));
  const rows=JSON.parse(JSON.stringify(runInNewContext(source+';dadosCabecalhoFolha({nome:"Ana",cpf:"123.456.789-00",admissao:"2026-01-05"},null,null)',{get:()=>({razao:'Empresa X'}),brOf:(s:string)=>s.split('-').reverse().join('/')})));
  const colab=rows[0][1] as string;
  assert.ok(colab.includes('CPF: 123.***.***-00'));assert.ok(!/PIS/.test(colab));
});
