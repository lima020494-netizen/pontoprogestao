import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';
const html=readFileSync('public/vip-ponto.html','utf8');
const source='';
function env(tipo='',company:Record<string,unknown>={},day='2026-10-13',hours:string[]=[],rest=false){
 const f={pin:'1',status:'Ativo',escala:'6x1',admissao:day},ocorrencias=tipo?[{pin:'1',data:day,tipo}]:[];
 const data:Record<string,unknown>={ocorrencias,empregador:company,feriados:company['holiday']?[{data:day,nome:'Feriado'}]:[],escalas:rest?{a:{semanaInicio:day,semanaFim:day,folgas:[{pin:'1',dia:day,tipo:'DSR'}]}}:{}};
 const punches=hours.map((hora,i)=>({pin:'1',data:day,hora,tipo:i?'Saída':'Entrada',nsr:String(i+1)}));
 return {day, data, punches, get:(k:string,fallback:unknown)=>data[k]??fallback,funcPorPin:()=>f,batidasJornada:()=>punches,cargaEscala:()=>440,
 toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3,5)),addDias:(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),dow:(d:string)=>new Date(d+'T12:00:00Z').getUTCDay(),brOf:(d:string)=>d,toHHMM:(n:number)=>String(n),DIAS:Array(7).fill('Dia')};
}
function calc(tipo='',company:Record<string,unknown>={},day='2026-10-13',hours:string[]=[],rest=false){const e=env(tipo,company,day,hours,rest);const original=JSON.stringify(e.punches);const d=runInNewContext(source+`;dadosFolha('1',day,day)`,e);assert.equal(JSON.stringify(e.punches),original);return d;}
for(const tipo of ['Atestado médico','Licença Gala','Licença Nojo','Licença Paternidade','Doação de Sangue','Alistamento Eleitoral','Falta Justificada','Afastamento INSS','Licença Maternidade','Férias'])test(`${tipo} has no bank debt or absence`,()=>{const d=calc(tipo);assert.equal(d.banco.debitos,0);assert.equal(d.tot.faltas,0);assert.equal(d.tot.faltantes,0);});
for(const tipo of ['Folga compensatória','Folga de Feriado/DSR Trabalhado'])test(`${tipo} debits 440 minutes without absence`,()=>{const d=calc(tipo);assert.equal(d.banco.debitos,440);assert.equal(d.tot.faltas,0);});
test('external travel computes 440 minutes without synthetic punches or bank debt',()=>{const d=calc('Trabalho Externo / Viagem');assert.equal(d.tot.trabalhado,440);assert.equal(d.banco.debitos,0);assert.equal(d.linhas[0].nsr,'');});
test('Sunday factor defaults to two: 480 worked minutes yield 960 bank minutes',()=>{const d=calc('',{},'2026-10-18',['08:00','16:00']);assert.equal(d.banco.creditos,960);assert.equal(d.tot.trabalhado,480);assert.equal(d.linhas[0].saldo,960);});
test('holiday factor one yields 480 bank minutes',()=>{assert.equal(calc('',{holiday:true,fatorBancoDomFeriado:1},'2026-10-13',['08:00','16:00']).banco.creditos,480);});
test('holiday factor two yields 960 bank minutes',()=>{assert.equal(calc('',{holiday:true,fatorBancoDomFeriado:2},'2026-10-13',['08:00','16:00']).banco.creditos,960);});
test('generic Tuesday rest retains one-to-one credit',()=>{assert.equal(calc('',{},'2026-10-13',['08:00','16:00'],true).banco.creditos,480);});
test('INSS period requires more than 15 days and carries requested analytical code 03',()=>{assert.match(runInNewContext(source+`;validarPeriodoOcorrencia('Afastamento INSS','2026-10-01','2026-10-15','1')`,env()),/superior a 15/);assert.equal(runInNewContext(source+`;validarPeriodoOcorrencia('Afastamento INSS','2026-10-01','2026-10-16','1')`,env()),'');assert.equal(runInNewContext(source+`;regraOcorrencia('Afastamento INSS').codigo`,env()),'03');});
for(const [cidada,length,end] of [[false,120,'2027-01-28'],[true,180,'2027-03-29']] as const)test(`maternity requires ${length} days`,()=>{assert.equal(runInNewContext(source+`;validarPeriodoOcorrencia('Licença Maternidade','2026-10-01','${end}','1')`,env('',{empresaCidada:cidada})),'');assert.match(runInNewContext(source+`;validarPeriodoOcorrencia('Licença Maternidade','2026-10-01','2026-10-02','1')`,env('',{empresaCidada:cidada})),new RegExp(String(length)));});
for(const [tipo,limit] of [['Licença Gala',3],['Licença Nojo',2],['Licença Paternidade',5],['Doação de Sangue',1],['Alistamento Eleitoral',2],['Atestado médico',15]] as const)test(`${tipo} enforces ${limit} day limit`,()=>{assert.match(runInNewContext(source+`;validarPeriodoOcorrencia('${tipo}','2026-10-01','2026-10-${String(limit+1).padStart(2,'0')}','1')`,env()),/Limite/);});
test('Empresa Cidada paternity accepts twenty days',()=>{assert.equal(runInNewContext(source+`;validarPeriodoOcorrencia('Licença Paternidade','2026-10-01','2026-10-20','1')`,env('',{empresaCidada:true})),'');});
test('suspension records day and weekly DSR payroll adjustment separately',()=>{const e=env('Suspensão Disciplinar');e.data['escalas']={a:{semanaInicio:'2026-10-18',semanaFim:'2026-10-18',folgas:[{pin:'1',dia:'2026-10-18',tipo:'DSR'}]}};const d=runInNewContext(source+`;dadosFolha('1','2026-10-13','2026-10-18')`,e);assert.equal(d.linhas[0].descontoDia,440);assert.equal(d.linhas[5].descontoDsr,440);});
test('manual punch cannot be saved without authorizer',()=>{
 const values:Record<string,string>={'ib-pin':'1','ib-data':'2026-10-13','ib-hora':'08:00','ib-tipo':'Entrada','ib-motivo':'Esquecimento','ib-autorizou':''};let saves=0;
 const fn=html.slice(html.indexOf('function salvarBatidaManual('),html.indexOf('function lancarOcorrencia('));
  runInNewContext(fn+';salvarBatidaManual()',{TIPOS:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'],toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3)),$:(k:string)=>({value:values[k]||''}),toast:()=>{},alert:()=>{},set:()=>{saves++}});assert.equal(saves,0);
});
test('INSS save expands all sixteen days without changing punches; period edit replaces old interval',async()=>{
 const e=env(),values:Record<string,string>={'oc-pin':'1','oc-data':'2026-10-01','oc-fim':'2026-10-16','oc-tipo':'Afastamento INSS','oc-motivo':'Documento apresentado','oc-autorizou':'Gestor'};
 const fn=html.slice(html.indexOf('function validarAuditoriaTratamento('),html.indexOf("document.addEventListener('keydown',e=>{const modal=$('modal-generico')"));
 const context={...e,$:(k:string)=>({value:values[k]||'',textContent:''}),window:{__ocEdit:{}},crypto:{randomUUID:()=> 'periodo-teste'},GERENCIADOR:{nome:'Gestor'},set:(k:string,v:unknown)=>{e.data[k]=v},log:()=>{},fecharModal:()=>{},subBatidas:()=>{},toast:()=>{},TRAT_SELECAO:new Set()};
 const original=JSON.stringify(e.punches);await runInNewContext(source+fn+';salvarOcorrencia()',context);
 const rows=e.data['ocorrencias'] as {data:string;inicio:string;fim:string;periodoId:string}[];assert.equal(rows.length,16);assert.equal(rows[0]?.data,'2026-10-01');assert.equal(rows[15]?.data,'2026-10-16');assert.equal(JSON.stringify(e.punches),original);
 values['oc-fim']='2026-10-17';await runInNewContext(source+fn+';salvarOcorrencia()',{...context,window:{__ocEdit:rows[7]}});assert.equal((e.data['ocorrencias'] as unknown[]).length,17);
});