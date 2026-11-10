/* Ponto Pro Gestão — Etapa 3: repositórios Supabase, paginação e retaguarda. */
(function (namespace) {
  'use strict';

   function criar(S){
  const NUVEM_TIMERS={};
  const linhaFunc=f=>{const d=Object.assign({},f);delete d.jornada;return {email_dono:S.getConta(),pin:f.pin,nome:f.nome||'(sem nome)',cpf:f.cpf||null,cargo:f.cargo||null,
    departamento:f.departamento||null,escala:f.escala||null,status:f.status||'Ativo',ativo:f.status!=='Desligado',
    inicio_vigencia_banco_horas:(f.inicioVigenciaBancoHoras||f.bancoInicio)||null,intervalo:f.intervalo||null,dados:d};};
  const linhaPonto=b=>({email_dono:S.getConta(),nsr:b.nsr,pin:b.pin,data:b.data,hora:b.hora,tipo:b.tipo,timestamp:b.criadoEm||new Date().toISOString(),origem:b.fonte||'LOCAL',dados:b});
  function janelaNuvemDesde(){return S.addDias(S.hojeISO().slice(0,8)+'01',-1);} // mês corrente + véspera (virada noturna)
  async function lerPontosNuvem(conta,desde,ate){
    const rows=[],tamanho=1000;
    for(let inicio=0;;inicio+=tamanho){
      let q=S.sb.from('pontos').select('nsr,dados').eq('email_dono',conta).gte('dados->>data',desde);
      if(ate)q=q.lt('dados->>data',ate);
      const {data,error}=await q.order('nsr',{ascending:true}).range(inicio,inicio+tamanho-1);
      if(error)throw error;
      rows.push(...(data||[]));if((data||[]).length<tamanho)return rows;
    }
  }
  async function garantirHistorico(dataIni){
    if(!S.sb||!S.getConta()||!dataIni||!S.getNuvemDesde())return;
    const inicios=S.get('funcionarios',[]).map(f=>f.inicioVigenciaBancoHoras||f.bancoInicio||f.admissao||dataIni);
    const desde=S.addDias([dataIni,...inicios].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0]||dataIni,-1);
    if(desde>=S.getNuvemDesde())return;
    const conta=S.getConta(),rows=await S.lerPontosNuvem(conta,desde,S.getNuvemDesde());
    if(S.getConta()!==conta)return;
    const mapa=new Map(S.get('batidas',[]).map(b=>[b.nsr,b]));
    rows.forEach(r=>r.dados&&mapa.set(r.nsr,r.dados));
    S.set('batidas',[...mapa.values()]);
  }
  async function carregarNuvem(forcar=false){
    if(!S.sb||!S.getConta()||S.getCarregando())return;
    S.setCarregando(true);
    const conta=S.getConta();
    try{
      S.setNuvemDesde(S.janelaNuvemDesde());
      await S.sincronizarPendentes();
      const rs=await Promise.all([
        S.lerEstavel(conta,'empregador',()=>S.sb.from('empregador').select('dados').eq('email_dono',conta).maybeSingle(),forcar),
        S.sb.from('funcionarios').select('pin,dados').eq('email_dono',S.getConta()),
        S.lerPontosNuvem(S.getConta(),S.getNuvemDesde()).then(data=>({data})),
        S.lerEstavel(conta,'feriados',()=>S.sb.from('feriados').select('dados,data,nome,tipo').eq('conta',conta),forcar),
        S.sb.from('dados').select('chave,valor').eq('conta',S.getConta()),
        S.sb.from('logs').select('quando,por,acao').eq('email_dono',S.getConta()).order('quando',{ascending:false}).limit(50),
        S.sb.from('escala').select('semana,dados').eq('email_dono',S.getConta())]);
      rs.forEach(S.chk);
      if(S.getConta()!==conta)return;
      const [emp,fun,pon,fer,gen,lg,es]=rs;
      (gen.data||[]).forEach(r=>{if(!['funcionarios','batidas','empregador','feriados','logs'].includes(r.chave))S.set(r.chave,r.valor);});
      if(emp.data&&emp.data.dados)S.set('empregador',emp.data.dados);
      S.set('funcionarios',(fun.data||[]).map(r=>{const d=Object.assign({pin:r.pin},r.dados||{});delete d.jornada;return d;}));
      const filaB=await S.filaListar(),pend=new Set(S.pendentes()),mapa=new Map();
      (pon.data||[]).forEach(r=>r.dados&&mapa.set(r.nsr,r.dados));
      S.get('batidas',[]).filter(b=>pend.has(b.nsr)).forEach(b=>mapa.set(b.nsr,b));
      filaB.forEach(b=>mapa.set(b.nsr,b));
      const todas=[...mapa.values()];S.set('batidas',todas);
      const maxN=todas.reduce((m,b)=>Math.max(m,Number(b.nsr)||0),0);if(maxN>(S.get('nsr',0)||0))S.set('nsr',maxN);
      S.set('feriados',(fer.data||[]).map(r=>r.dados||{data:r.data,nome:r.nome,tipo:r.tipo}));
      S.localStorage.setItem(S.K('logs'),JSON.stringify(lg.data||[]));S.logsSessao().add(S.getConta());
      const escs={};(es.data||[]).forEach(r=>{if(r.semana&&r.dados)escs[r.semana]=r.dados;});
      if(Object.keys(escs).length)S.set('escalas',escs);
      S.setNuvemOk(true);
    }catch(e){S.setNuvemOk(false);console.warn('Nuvem indisponível — usando dados do aparelho.',e);}
    finally{S.setCarregando(false);}
    S.atualizaStatus();
  }
  function nuvemPush(k,v){
    if(!S.sb||!S.getConta())return;
    clearTimeout(NUVEM_TIMERS[k]);
    NUVEM_TIMERS[k]=setTimeout(()=>S.nuvemPushAgora(k,v),400);
  }
  async function nuvemPushAgora(k,v){
    if(['batidas','logs','pontos_pendentes','ntpOffset'].includes(k))return;
    try{
      if(k==='empregador')S.chk(await S.sb.from('empregador').upsert({email_dono:S.getConta(),dados:v,atualizado_em:new Date().toISOString()},{onConflict:'email_dono'}));
      else if(k==='funcionarios'){
        if(v.length)S.chk(await S.sb.from('funcionarios').upsert(v.map(S.linhaFunc),{onConflict:'email_dono,pin'}));
        let q=S.sb.from('funcionarios').delete().eq('email_dono',S.getConta());
        if(v.length)q=q.not('pin','in',`(${v.map(f=>'"'+f.pin+'"').join(',')})`);
        S.chk(await q);
      }
      else if(k==='escalas'){const rows=Object.entries(v||{}).map(([s,d])=>({email_dono:S.getConta(),semana:s,dados:d}));
        if(rows.length)S.chk(await S.sb.from('escala').upsert(rows,{onConflict:'email_dono,semana'}));}
      else if(k==='feriados'){S.chk(await S.sb.from('feriados').delete().eq('conta',S.getConta()));
        if(v.length)S.chk(await S.sb.from('feriados').upsert(v.map(f=>({conta:S.getConta(),data:f.data,nome:f.nome,tipo:f.tipo,dados:f})),{onConflict:'conta,data,nome'}));}
      else S.chk(await S.sb.from('dados').upsert({conta:S.getConta(),chave:k,valor:v,atualizado_em:new Date().toISOString()},{onConflict:'conta,chave'}));
      if(['empregador','feriados'].includes(k))await S.cacheEstavelInvalidar(S.getConta(),k);
      S.setNuvemOk(true);
    }catch(e){S.setNuvemOk(false);console.warn('Falha ao sincronizar com a nuvem:',k,e);}
  }
  async function migrarTudoSunmiParaSupabase(forcar){
    if(!S.sb||!S.getConta())return null;
    const conta=S.getConta(),flag=`${conta}_migracao_feita`;
    if(!forcar&&S.localStorage.getItem(flag))return null;
    const ler=nome=>{const out=[];for(const k of [S.K(nome),`${conta}_${nome}`,`${conta}:${nome}`,nome]){try{const v=S.localStorage.getItem(k);if(v)out.push(JSON.parse(v));}catch(e){}}return out;};
    const arr=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
    const todos=nome=>ler(nome).flatMap(arr);
    try{
      const mf=new Map();todos('funcionarios').filter(f=>f&&f.pin).forEach(f=>mf.set(String(f.pin),Object.assign({},f,{pin:String(f.pin),inicioVigenciaBancoHoras:f.inicioVigenciaBancoHoras||f.bancoInicio})));
      const funcs=[...mf.values()];
      if(funcs.length)S.chk(await S.sb.from('funcionarios').upsert(funcs.map(S.linhaFunc),{onConflict:'email_dono,pin'}));
      const mp=new Map();
      [...todos('batidas'),...todos('pontos'),...todos('pontos_pendentes')].filter(b=>b&&typeof b==='object'&&b.nsr)
        .forEach(b=>{const n=String(b.nsr).padStart(9,'0');mp.set(n,Object.assign({},b,{nsr:n}));});
      const rows=[...mp.values()].map(S.linhaPonto);
      for(let i=0;i<rows.length;i+=500)S.chk(await S.sb.from('pontos').upsert(rows.slice(i,i+500),{onConflict:'email_dono,nsr'}));
      const ml=new Map();
      [...todos('logs'),...todos('historico'),...todos('historico_acoes')].filter(x=>x&&(x.acao||x.texto))
        .forEach(x=>{const o={email_dono:conta,quando:String(x.quando||x.data||new Date().toISOString()),por:x.por||x.gerenciador||'Sistema',acao:x.acao||x.texto};ml.set(o.quando+'|'+o.acao,o);});
      const lgs=[...ml.values()];
      for(let i=0;i<lgs.length;i+=500)S.chk(await S.sb.from('logs').upsert(lgs.slice(i,i+500),{onConflict:'email_dono,quando,acao',ignoreDuplicates:true}));
      const escRows=[];
      [...ler('escalas'),...ler('escala')].forEach(v=>{
        if(Array.isArray(v))v.forEach(e=>e&&e.semanaInicio&&escRows.push({email_dono:conta,semana:e.semanaInicio,dados:e}));
        else if(v&&typeof v==='object')Object.entries(v).forEach(([s,e])=>e&&typeof e==='object'&&escRows.push({email_dono:conta,semana:e.semanaInicio||s,dados:e}));});
      if(escRows.length)S.chk(await S.sb.from('escala').upsert(escRows,{onConflict:'email_dono,semana'}));
      const emp=ler('empregador')[0];if(emp&&typeof emp==='object')S.chk(await S.sb.from('empregador').upsert({email_dono:conta,dados:emp},{onConflict:'email_dono'}));
      S.localStorage.setItem(flag,new Date().toISOString());
      const msg=`Migração: ${funcs.length} func, ${rows.length} batidas, ${lgs.length} logs`;
      if(forcar)S.log(msg);
      return msg;
    }catch(e){console.warn('Migração falhou',e);return 'Migração falhou: '+(e.message||e);}
  }
  return {linhaFunc,linhaPonto,janelaNuvemDesde,lerPontosNuvem,garantirHistorico,carregarNuvem,nuvemPush,nuvemPushAgora,migrarTudoSunmiParaSupabase};

  }

  namespace.definir('data.supabase', Object.freeze({ criar }));
})(window.PontoProOperacional);
