/* Contexto por referência: os estados legados continuam sendo a única fonte. */
(function (namespace) {
  'use strict';

  const fontes = {
    conta: () => null,
    sessao: () => ({ autenticada: false, cliente: null }),
    gestor: () => null,
    empresa: () => ({}),
    colaboradores: () => [],
    escalas: () => ({}),
    feriados: () => [],
    ocorrencias: () => [],
    sincronizacao: () => ({ online: false, carregando: false, enviando: false, historicoDesde: '' }),
  };
  const contexto = {};
  let vinculado = false;

  Object.keys(fontes).forEach(nome => {
    Object.defineProperty(contexto, nome, {
      enumerable: true,
      get: () => fontes[nome](),
    });
  });

  namespace.definir('boot.contexto', {
    contexto,
    get vinculado() { return vinculado; },
    ligar(novasFontes) {
      if (vinculado) return contexto;
      Object.keys(fontes).forEach(nome => {
        if (typeof novasFontes?.[nome] === 'function') fontes[nome] = novasFontes[nome];
      });
      vinculado = true;
      return contexto;
    },
  });
})(window.PontoProOperacional);
