/* Ponto Pro Gestão — Etapa 3: fila completa de batidas, envio imediato e lotes. */
PontoProOperacional.registrar('data.fila-offline', function(S){
  let SINC=false;
  async function filaListar(){const conta=S.getConta();if(!conta)return [];try{const l=await S.idbTx('readonly',s=>s.index('conta').getAll(conta))||[];S.IDB.mem=l.map(x=>x.nsr);return l.map(x=>x.b);}catch(e){return [];}}
  async function filaAdd(b){try{await S.idbTx('readwrite',s=>s.put({id:S.getConta()+'|'+b.nsr,conta:S.getConta(),nsr:b.nsr,b}));S.IDB.mem=[...new Set([...S.IDB.mem,b.nsr])];}
    catch(e){S.salvaPendentes([...S.pendentesLS(),b.nsr]);}}
  async function filaRemover(nsrs){try{await S.idbTx('readwrite',s=>nsrs.forEach(n=>s.delete(S.getConta()+'|'+n)));S.IDB.mem=S.IDB.mem.filter(n=>!nsrs.includes(n));}catch(e){}}
  const pendentesLS=()=>{try{return JSON.parse(S.localStorage.getItem(S.K('pontos_pendentes'))||'[]');}catch(e){return [];}};
  const pendentes=()=>[...new Set([...S.pendentesLS(),...S.IDB.mem])];
  const salvaPendentes=l=>S.localStorage.setItem(S.K('pontos_pendentes'),JSON.stringify([...new Set(l)]));
  async function sincronizarPendentes(){
    if(!S.sb||!S.getConta()||SINC)return 0;
    SINC=true;
    try{
      const filaB=await S.filaListar(),lsN=S.pendentesLS(),mapa=new Map();
      if(lsN.length){const s=new Set(lsN);S.get('batidas',[]).filter(b=>s.has(b.nsr)).forEach(b=>mapa.set(b.nsr,b));}
      filaB.forEach(b=>mapa.set(b.nsr,b));
      if(!mapa.size)return 0;
      const rows=[...mapa.values()].map(S.linhaPonto),enviados=[...mapa.keys()];
      for(let i=0;i<rows.length;i+=500)S.chk(await S.sb.from('pontos').upsert(rows.slice(i,i+500),{onConflict:'email_dono,nsr'}));
      await S.filaRemover(enviados);S.salvaPendentes(S.pendentesLS().filter(n=>!enviados.includes(n)));S.setNuvemOk(true);return rows.length;
    }catch(e){S.setNuvemOk(false);return 0;}
    finally{SINC=false;S.atualizaStatus();}
  }
  function filaPonto(nsr){const b=S.get('batidas',[]).find(x=>x.nsr===nsr);(b?S.filaAdd(b):Promise.resolve(S.salvaPendentes([...S.pendentesLS(),nsr]))).then(()=>S.sincronizarPendentes());}
  return {filaListar,filaAdd,filaRemover,pendentesLS,pendentes,salvaPendentes,sincronizarPendentes,filaPonto,get sincronizando(){return SINC;}};
});
