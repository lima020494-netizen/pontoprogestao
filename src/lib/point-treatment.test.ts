import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html=readFileSync('public/vip-ponto.html','utf8');
const classification=html.slice(html.indexOf('function classificacaoTratamento('),html.indexOf('function subBatidas('));
const rules=html.slice(html.indexOf('const GRUPOS_OCORRENCIAS='),html.indexOf('function trabalhoApuradoDia('));
const prepare=html.slice(html.indexOf('function validarAuditoriaTratamento('),html.indexOf('async function salvarOcorrencia('));
const addDias=(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
function classify(day:string,prev=480,worked=0,count=0,oc?:Record<string,unknown>){
 return runInNewContext(rules+classification+';classificacaoTratamento(l,oc,bs,"2026-11-02")',{l:{data:day,previsto:prev,trabalhado:worked},oc,bs:Array(count).fill({}),get:()=>({})});
}
test('past untreated absence is pending, red, and counted as absence',()=>{const s=classify('2026-11-01');assert.equal(s.pendente,true);assert.equal(s.falta,true);assert.equal(s.cor,'red');});
test('open current day is never an untreated absence',()=>{const s=classify('2026-11-02');assert.equal(s.pendente,false);assert.equal(s.falta,false);});
test('past odd shift is orange and pending',()=>{const s=classify('2026-11-01',480,240,1);assert.equal(s.impar,true);assert.equal(s.pendente,true);assert.equal(s.cor,'orange');});
test('current odd shift is in progress, not a pending closed shift',()=>{assert.equal(classify('2026-11-02',480,240,1).pendente,false);});
test('approved medical certificate is blue and leaves inbox',()=>{const s=classify('2026-11-01',480,0,0,{tipo:'Atestado médico',status:'concluido'});assert.equal(s.cor,'blue');assert.equal(s.pendente,false);assert.equal(s.falta,false);});
test('real pending certificate request is counted separately',()=>{const s=classify('2026-11-01',480,0,0,{tipo:'Atestado médico',status:'pendente'});assert.equal(s.solicitacao,true);assert.equal(s.pendente,true);});
test('worked rest day is purple without inventing an absence',()=>{const s=classify('2026-11-01',0,480,2);assert.equal(s.cor,'purple');assert.equal(s.falta,false);});
function batch(alvos:unknown[],author='Responsável',reason='Documento válido',existing:unknown[]=[],type='Atestado médico'){
 const data={ocorrencias:existing,empregador:{}},ctx={alvos,author,reason,type,addDias,get:(k:keyof typeof data,f:unknown)=>data[k]??f,GERENCIADOR:{nome:'Gestor'},crypto:{randomUUID:()=> 'periodo'},brOf:(d:string)=>d};
 return runInNewContext(rules+prepare+';prepararTratamentos(alvos,type,reason,author)',ctx);
}
const days=[{pin:'1',ini:'2026-10-01',fim:'2026-10-01'},{pin:'2',ini:'2026-10-02',fim:'2026-10-02'}];
test('every treatment requires authorizer',()=>{assert.match(batch(days,'').erro,/quem autorizou/);});
test('every treatment requires reason',()=>{assert.match(batch(days,'Gestor','').erro,/Motivo obrigatório/);});
test('batch validates every day before modifying anything',()=>{const existing=[{pin:'2',data:'2026-10-02',tipo:'Férias'}];const before=JSON.stringify(existing);assert.match(batch(days,'Gestor','Documento válido',existing).erro,/outra ocorrência/);assert.equal(JSON.stringify(existing),before);});
test('batch records reason and authorizer on every selected day',()=>{const result=batch(days);assert.equal(result.novos.length,2);for(const o of result.novos){assert.equal(o.autorizadoPor,'Responsável');assert.equal(o.motivo,'Documento válido');assert.equal(o.status,'concluido');}assert.equal(result.novos[1].data,'2026-10-02');});
test('absence cannot be submitted as an allowance',()=>{assert.match(batch(days,'Gestor','Documento válido',[],'Falta').erro,/não é um abono/);});
test('attachments reject unsupported files and size over one MiB',()=>{const ctx={};assert.equal(runInNewContext(prepare+';validarAnexoTratamento({type:"application/pdf",size:1048576})',ctx),'');assert.match(runInNewContext(prepare+';validarAnexoTratamento({type:"application/pdf",size:1048577})',ctx),/1 MB/);assert.match(runInNewContext(prepare+';validarAnexoTratamento({type:"text/html",size:1})',ctx),/PDF/);});
const listRules=html.slice(html.indexOf('const normBusca='),html.indexOf('function buscarTratamento('));
function tratList(busca:string,linhas:unknown[],visao='pendentes'){
 return runInNewContext(listRules+';listaTratamento().map(x=>x.key)',{window:{__tratBusca:busca},TRAT_LINHAS:linhas,TRAT_VISAO:visao}) as string[];
}
const linhasPeriodo=[
 {f:{pin:'1',nome:'Ana'},l:{data:'2026-10-03'},st:{pendente:false},key:'1|2026-10-03'},
 {f:{pin:'1',nome:'Ana'},l:{data:'2026-10-01'},st:{pendente:true},key:'1|2026-10-01'},
 {f:{pin:'1',nome:'Ana'},l:{data:'2026-10-02'},st:{pendente:false},key:'1|2026-10-02'},
 {f:{pin:'2',nome:'Beto'},l:{data:'2026-10-01'},st:{pendente:true},key:'2|2026-10-01'},
];
test('inbox without a selected collaborator shows only pendencies',()=>{assert.deepEqual([...tratList('',linhasPeriodo)],['1|2026-10-01','2|2026-10-01']);});
test('selecting a collaborator shows the full period with pendencies on top',()=>{assert.deepEqual([...tratList('Ana — PIN 1',linhasPeriodo)],['1|2026-10-01','1|2026-10-03','1|2026-10-02']);});