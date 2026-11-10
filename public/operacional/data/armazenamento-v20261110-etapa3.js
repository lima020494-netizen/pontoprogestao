/* Ponto Pro Gestão — Etapa 3: namespaces legados e cache local por conta. */
(function (namespace) {
  'use strict';

   function criar(S){
  const CACHE_SESSAO=new Map();
  const K=k=>`vip:${S.getConta()}:${k}`;
  const get=(k,d)=>{
    const compartilhado=S.getShareData();
    if(compartilhado&&Object.prototype.hasOwnProperty.call(compartilhado,k))return compartilhado[k];
    try{
      const chave=K(k),raw=S.localStorage.getItem(chave);
      if(!raw){CACHE_SESSAO.delete(chave);return d;}
      const cache=CACHE_SESSAO.get(chave);if(cache?.raw===raw)return cache.valor;
      const valor=JSON.parse(raw);CACHE_SESSAO.set(chave,{raw,valor});return valor;
    }catch(e){return d;}
  };
  const set=(k,v)=>{
    S.localStorage.setItem(K(k),JSON.stringify(v));
    if(!S.getCarregando()){
      if(['empregador','feriados'].includes(k))S.cacheEstavelInvalidar(S.getConta(),k);
      S.nuvemPush(k,v);
    }
  };
  const chk=r=>{if(r&&r.error)throw r.error;return r;};
  const contas=()=>{try{return JSON.parse(S.localStorage.getItem('vip:contas')||'[]');}catch(e){return [];}};
  const salvaContas=c=>S.localStorage.setItem('vip:contas',JSON.stringify(c));
  return {CACHE_SESSAO,K,get,set,chk,contas,salvaContas};

  }

  namespace.definir('data.armazenamento', Object.freeze({ criar }));
})(window.PontoProOperacional);
