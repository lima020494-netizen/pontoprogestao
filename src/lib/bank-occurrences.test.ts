import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runWithDomain as runInNewContext } from './operational-domain-harness.ts';

const source='';
function calculate(tipo:string,hours?:[string,string],previous=false,rest=false){
  const day='2026-10-13',f={pin:'1',status:'Ativo',escala:'5x2',admissao:day};
  const punches=(hours||[]).map((hora,i)=>({pin:'1',data:day,hora,tipo:i?'Saída':'Entrada',nsr:String(i+1),criadoEm:`${day}T${hora}:00`}));
  const original=JSON.stringify(punches);
  const data:Record<string,unknown>={ocorrencias:[{pin:'1',data:day,tipo}],escalas:rest?{a:{semanaInicio:day,semanaFim:day,folgas:[{pin:'1',dia:day,tipo:'DSR'}]}}:{},empregador:{},feriados:[]};
  const result=runInNewContext(source+`;dadosFolha('1',ini,ini)`,{
    ini:previous?'2026-10-14':day,get:(k:string,fallback:unknown)=>data[k]??fallback,funcPorPin:()=>f,
    batidasJornada:(_pin:string,d:string)=>d===day?punches:[],cargaEscala:()=>480,
    toMin:(h:string)=>Number(h.slice(0,2))*60+Number(h.slice(3,5)),
    addDias:(d:string,n:number)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),
    dow:(d:string)=>new Date(d+'T12:00:00Z').getUTCDay(),brOf:(d:string)=>d,
    toHHMM:(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`,DIAS:Array(7).fill('Dia'),
  });
  assert.equal(JSON.stringify(punches),original,'timestamps, NSR and original punches stay intact');
  return JSON.parse(JSON.stringify(result));
}
test('compensatory leave debits seven hours twenty, never an absence or missing hours',()=>{
  const d=calculate('Folga compensatória');
  assert.equal(d.banco.debitos,440);assert.equal(d.banco.atual,-440);
  assert.equal(d.linhas[0].saldo,-440);assert.equal(d.tot.faltas,0);assert.equal(d.tot.faltantes,0);
  assert.match(d.banco.detalhes[0],/^Débito - Folga Compensatória.*07:20$/);
  assert.equal(d.banco.detalhes.length,1);
});
for(const tipo of ['Atestado médico','Falta Justificada','Falta Abonada','Falta Justificada/Abonada']){
  test(`${tipo} generates no bank debit, even with partial punches`,()=>{
    for(const hours of [undefined,['08:00','12:00'] as [string,string]]){
      const d=calculate(tipo,hours);assert.equal(d.banco.debitos,0);assert.equal(d.banco.atual,0);
      assert.equal(d.linhas[0].saldo,0);assert.equal(d.tot.faltantes,0);assert.deepEqual(d.banco.detalhes,[]);
    }
  });
}
test('opening balance uses the same compensated and excused occurrence rules',()=>{
  assert.equal(calculate('Folga compensatória',undefined,true).banco.anterior,-440);
  assert.equal(calculate('Atestado médico',undefined,true).banco.anterior,0);
  assert.equal(calculate('Falta Justificada',undefined,true).banco.anterior,0);
});
test('explicit compensation debits seven hours twenty even on a rest day, without absence',()=>{
  const d=calculate('Folga compensatória',undefined,false,true);assert.equal(d.banco.debitos,440);assert.equal(d.tot.faltas,0);
});
test('unjustified absence never debits the bank: wage deduction only, neutral balance',()=>{
  for(const tipo of ['Falta','']){
    const d=calculate(tipo);
    assert.equal(d.banco.debitos,0);assert.equal(d.banco.atual,0);assert.equal(d.linhas[0].saldo,0);
    assert.equal(d.tot.faltas,1);assert.equal(d.tot.faltantes,480); // desconto salarial na folha, não no banco
  }
});
test('late arrival never debits the bank; only early departure does',()=>{
  const late=calculate('',['09:00','17:00']); // 1h de atraso, jornada completa de 8h
  assert.equal(late.banco.debitos,0);assert.equal(late.linhas[0].saldo,0);assert.equal(late.linhas[0].atrasoMin,60);
  const lateShort=calculate('',['09:00','15:00']); // atraso 1h + saída 1h antes: só a saída antecipada debita
  assert.equal(lateShort.banco.debitos,60);assert.equal(lateShort.linhas[0].saldo,-60);
  const early=calculate('',['08:00','15:00']); // sem atraso, saída 1h antes
  assert.equal(early.banco.debitos,60);assert.equal(early.linhas[0].atrasoMin,0);
});
test('partial work keeps scheduled debits and excess work keeps its credit',()=>{
  assert.equal(calculate('', ['08:00','12:00']).banco.debitos,240);
   assert.equal(calculate('Atestado médico',['08:00','17:00']).banco.creditos,60);
});