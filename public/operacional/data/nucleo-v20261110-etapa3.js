/* Ponto Pro Gestão — Etapa 3: composição única dos módulos de dados e offline. */
(function (namespace) {
  'use strict';

  function criar(dependencias={}){
  const S={...dependencias};
  Object.assign(S,namespace.obter('data.armazenamento').criar(S));
  Object.assign(S,namespace.obter('data.indexeddb').criar(S));
  Object.assign(S,namespace.obter('data.fila-offline').criar(S));
  Object.assign(S,namespace.obter('data.supabase').criar(S));
  Object.assign(S,dependencias.aliases||{});
  return S;

  }

  namespace.definir('data.nucleo', Object.freeze({ criar }));
})(window.PontoProOperacional);
