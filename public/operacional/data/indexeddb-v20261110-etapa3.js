/* Ponto Pro Gestão — Etapa 3: IndexedDB v2 e cache estável expirável. */
(function (namespace) {
  'use strict';

   function criar(S){
  const IDB={db:null,mem:[],ok:false};
  function idbAbrir(){return new Promise(res=>{try{const r=S.indexedDB.open('vipponto',2);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('fila')){const s=r.result.createObjectStore('fila',{keyPath:'id'});s.createIndex('conta','conta');}if(!r.result.objectStoreNames.contains('config_cache'))r.result.createObjectStore('config_cache',{keyPath:'id'});};
    r.onsuccess=()=>{IDB.db=r.result;IDB.ok=true;res(true);};r.onerror=()=>res(false);}catch(e){res(false);}});}
  const IDB_PRONTO=idbAbrir();
  function idbTx(modo,fn){return IDB_PRONTO.then(ok=>ok?new Promise((res,rej)=>{const t=IDB.db.transaction('fila',modo),s=t.objectStore('fila');const out=fn(s);
    t.oncomplete=()=>res(out&&out.result);t.onerror=()=>rej(t.error);}):Promise.reject('sem IDB'));}
  const CACHE_ESTAVEL_MS=5*60*1000,CACHE_LEITURAS=new Map(),CACHE_VERSOES=new Map();
  async function cacheEstavelTx(modo,fn){if(!await IDB_PRONTO)throw new Error('sem IDB');return new Promise((res,rej)=>{const t=IDB.db.transaction('config_cache',modo),r=fn(t.objectStore('config_cache'));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
  async function cacheEstavelInvalidar(conta,chave){const id=conta+'|'+chave;CACHE_VERSOES.set(id,(CACHE_VERSOES.get(id)||0)+1);try{await S.cacheEstavelTx('readwrite',s=>s.delete(id));}catch(e){}}
  async function lerEstavel(conta,chave,consultar,forcar=false){
    const id=conta+'|'+chave,versao=CACHE_VERSOES.get(id)||0;
    if(CACHE_LEITURAS.has(id))return CACHE_LEITURAS.get(id);
    const carga=(async()=>{
      if(!forcar){try{const c=await S.cacheEstavelTx('readonly',s=>s.get(id));if(c&&c.expira>Date.now()&&versao===(CACHE_VERSOES.get(id)||0))return c.valor;}catch(e){}}
      const valor=S.chk(await consultar());
      if(versao===(CACHE_VERSOES.get(id)||0))try{await S.cacheEstavelTx('readwrite',s=>s.put({id,expira:Date.now()+CACHE_ESTAVEL_MS,valor}));}catch(e){}
      return valor;
    })();CACHE_LEITURAS.set(id,carga);
    try{return await carga;}finally{CACHE_LEITURAS.delete(id);}
  }
  return {IDB,IDB_PRONTO,idbAbrir,idbTx,CACHE_ESTAVEL_MS,CACHE_LEITURAS,CACHE_VERSOES,cacheEstavelTx,cacheEstavelInvalidar,lerEstavel};

  namespace.definir('data.indexeddb', Object.freeze({ criar }));
})(window.PontoProOperacional);
