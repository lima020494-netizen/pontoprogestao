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
const drawerRules=html.slice(html.indexOf('function lancarOcorrencia('),html.indexOf('function camposOcorrencia('));
const saveRules=html.slice(html.indexOf('async function salvarOcorrencia('),html.indexOf("document.addEventListener('keydown',e=>{const modal=$('modal-generico')"));
const LOTE=[{pin:'1',data:'2026-10-02'}];
function drawer(lote:unknown[]|null){
 let out='';
 const modal={classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},querySelector:()=>null};
 const ctx={window:{__tratLote:lote},document:{activeElement:null},get:(k:string,f:unknown)=>k==='funcionarios'?[{pin:'1',nome:'Ana'}]:f,
  ocorrenciaDia:()=>undefined,batidasJornada:()=>[],funcPorPin:()=>({nome:'Ana'}),esc:(x:unknown)=>String(x),
  abrirModal:(h:string)=>{out=h},brOf:(d:string)=>d,$:((id:string)=>id==='modal-generico'?modal:{value:'',textContent:''}) as unknown as (id:string)=>unknown,
  camposOcorrencia:()=>{},camposQuatroBatidas:()=>'',hojeISO:()=>'2026-11-04',TIPOS:['Entrada','Saída']};
 runInNewContext(rules+drawerRules+';lancarOcorrencia("1","2026-10-02")',ctx);
 return out;
}
test('batch selector offers every allowance, license, rest day and adjustment',()=>{
 const tipos=[...runInNewContext(rules+';tiposTratamentoLote()',{}) as string[]];
 for(const t of ['Atestado médico','Licença Gala','Licença Nojo','Licença Paternidade','Doação de Sangue','Alistamento Eleitoral','Falta Justificada','Folga compensatória','Férias','Folga de Feriado/DSR Trabalhado','Trabalho Externo / Viagem','Suspensão Disciplinar'])assert.ok(tipos.includes(t),t);
  assert.ok(!tipos.includes('Falta'));assert.ok(tipos.includes('Esquecimento de Marcação'));
});
test('batch drawer lists every reason instead of only two',()=>{
 const h=drawer(LOTE);
 for(const t of ['Atestado Médico','Licença Gala','Licença Nojo','Nascimento Filho / Paternidade','Doação de Sangue','Alistamento Eleitoral','Falta Justificada pela Empresa','Folga Compensatória','Férias','Folga de Feriado / DSR Trabalhado','Trabalho Externo / Viagem','Suspensão Disciplinar'])assert.ok(h.includes('>'+t),t);
 assert.ok(h.includes('>Esquecimento de Marcação<'));assert.ok(!h.includes('value="Falta"'));
});
test('single-day drawer keeps the forgotten-punch adjustment available',()=>{assert.ok(drawer(null).includes('>Esquecimento de Marcação<'));});
test('batch cannot submit a continuous leave, which needs a start and end date',()=>{
 const values:Record<string,string>={'oc-pin':'1','oc-data':'2026-10-02','oc-fim':'2026-10-02','oc-tipo':'Afastamento INSS','oc-motivo':'Documento apresentado','oc-autorizou':'Gestor'};
 let erro='',saves=0;
 const ctx={window:{__tratLote:LOTE,__ocEdit:{}},$:(id:string)=>id==='oc-erro'?{set textContent(v:string){erro=v},get textContent(){return erro}}:{value:values[id]||'',textContent:''},set:()=>{saves++},log:()=>{},fecharModal:()=>{},subBatidas:()=>{},toast:()=>{},TRAT_SELECAO:new Set()};
 runInNewContext(rules+prepare+saveRules+';salvarOcorrencia()',ctx);
 assert.match(erro,/per[ií]odo cont[ií]nuo/);assert.equal(saves,0);
});
const manualRules=html.slice(html.indexOf('function registrarBatidaManual('),html.indexOf('function lancarOcorrencia('));
function loteEsquecimento(dias:{pin:string;data:string}[],punches:Record<string,unknown>[],values:Record<string,string>){
 const data:Record<string,unknown>={batidas:punches,funcionarios:[{pin:'1',nome:'Ana',cpf:'123.456.789-00'}],ntpOffset:0};
 const nodes:Record<string,Record<string,unknown>>={};
 for(const [k,v] of Object.entries(values))nodes[k]={value:v,checked:false,textContent:'',files:[]};
 const ctx={window:{__tratLote:dias,__ocEdit:{}},
  get:(k:string,f:unknown)=>data[k]??f,set:(k:string,v:unknown)=>{data[k]=v},
  funcPorPin:(pin:string)=>(data['funcionarios'] as {pin:string}[]).find(f=>f.pin===pin),
  batidasJornada:(pin:string,dia:string)=>(data['batidas'] as {pin:string;data:string}[]).filter(b=>b.pin===pin&&b.data===dia),
  TIPOS:['Entrada','Saída Intervalo','Entrada Intervalo','Saída'],
  toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3,5)),
  addDias:(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),
  brOf:(d:string)=>d,proximoNSR:()=>String((data['batidas'] as unknown[]).length+1),
  filaPonto:()=>{},reordenarJornada:()=>{},log:()=>{},GERENCIADOR:{nome:'Gestor'},
  TRAT_SELECAO:new Set(),TRAT_VISAO:'pendentes',fecharModal:()=>{},subBatidas:()=>{},toast:()=>{},
  $:((id:string)=>nodes[id]??={value:'',checked:false,textContent:'',files:[]}) as unknown as (id:string)=>unknown};
 return {ctx,data,nodes};
}
const ESQUECIMENTO={'oc-pin':'1','oc-tipo':'Esquecimento de Marcação','oc-hora':'12:00','oc-btipo':'Saída Intervalo','oc-motivo':'Esqueci de marcar o intervalo','oc-autorizou':'Gestor RH'};
test('batch inserts the forgotten punch on every selected day',async()=>{
 const dias=[{pin:'1',data:'2026-10-02'},{pin:'1',data:'2026-10-03'}];
 const {ctx,data}=loteEsquecimento(dias,[{pin:'1',data:'2026-10-02',hora:'08:00',tipo:'Entrada',nsr:'1'}],ESQUECIMENTO);
 await runInNewContext(rules+prepare+manualRules+saveRules+';salvarOcorrencia()',ctx);
 const bs=data['batidas'] as {data:string;hora:string;tipo:string;fonte:string;autorizadoPor:string}[];
 assert.equal(bs.length,3);
 assert.deepEqual(bs.slice(1).map(b=>[b.data,b.hora,b.tipo]),[['2026-10-02','12:00','Saída Intervalo'],['2026-10-03','12:00','Saída Intervalo']]);
 assert.ok(bs.slice(1).every(b=>b.fonte==='MANUAL'&&b.autorizadoPor==='Gestor RH'));
});
test('batch aborts the whole forgotten-punch insert when one selected day cannot take it',async()=>{
 const cheias=['08:00','12:00','13:00','17:00'].map((h,i)=>({pin:'1',data:'2026-10-02',hora:h,tipo:'Entrada',nsr:String(i+1)}));
 const dias=[{pin:'1',data:'2026-10-02'},{pin:'1',data:'2026-10-03'}];
 const {ctx,data,nodes}=loteEsquecimento(dias,cheias,ESQUECIMENTO);
 await runInNewContext(rules+prepare+manualRules+saveRules+';salvarOcorrencia()',ctx);
 assert.equal((data['batidas'] as unknown[]).length,4);
 assert.match(String(nodes['oc-erro']?.['textContent']),/Limite de 4/);
});test('closed manual adjustment with full hours leaves the inbox as green',()=>{const s=classify('2026-11-01',480,480,4,{tipo:'Esquecimento de Marcação',status:'concluido'});assert.equal(s.pendente,false);assert.equal(s.cor,'green');});
test('shift over six hours with only two punches flags missing break',()=>{const s=classify('2026-11-01',480,480,2);assert.equal(s.pendente,true);assert.equal(s.cor,'orange');assert.equal(s.titulo,'Intervalo não registrado');});
test('six-hour shift with two punches does not require a break',()=>{assert.equal(classify('2026-11-01',360,360,2).pendente,false);});
test('short worked time without allowance stays as review shift',()=>{const s=classify('2026-11-01',480,300,4);assert.equal(s.pendente,true);assert.equal(s.titulo,'Revisar jornada');});
test('one form inserts the four punches at once and skips types the day already has',async()=>{
  const dias=[{pin:'1',data:'2026-10-02'},{pin:'1',data:'2026-10-03'}];
  const v={'oc-pin':'1','oc-tipo':'Esquecimento de Marcação','oc-h0':'08:00','oc-h1':'12:00','oc-h2':'13:00','oc-h3':'17:00','oc-motivo':'Lançamento das marcações','oc-autorizou':'Gestor RH'};
  const {ctx,data}=loteEsquecimento(dias,[{pin:'1',data:'2026-10-02',hora:'08:05',tipo:'Entrada',nsr:'1'}],v);
  await runInNewContext(rules+prepare+manualRules+saveRules+';salvarOcorrencia()',ctx);
  const bs=data['batidas'] as {data:string;tipo:string}[];
  assert.equal(bs.filter(b=>b.data==='2026-10-02').length,4);
  assert.equal(bs.filter(b=>b.data==='2026-10-03').length,4);
});
