/* Etapa 2: composição única das dependências do domínio, sem DOM ou nuvem. */
(function (namespace) {
  'use strict';

  function criar(dependencias) {
    const S = Object.assign({
      get: (_chave, fallback) => fallback,
      funcPorPin: () => ({}),
      cargaEscala: () => 440,
    }, namespace.obter('core.formatos'), dependencias || {});

    Object.assign(S, namespace.obter('domain.escala').criar(S));
    Object.assign(S, namespace.obter('domain.ocorrencias').criar(S));
    Object.assign(S, namespace.obter('domain.jornada').criar(S));
    Object.assign(S, namespace.obter('domain.banco').criar(S));
    Object.assign(S, namespace.obter('domain.painelDia').criar(S));
    Object.assign(S, dependencias?.aliases || {});
    return S;
  }

  namespace.definir('domain.nucleo', Object.freeze({ criar }));
})(window.PontoProOperacional);
