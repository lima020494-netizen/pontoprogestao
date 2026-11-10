/* Etapa 4: composição única dos documentos, sem duplicar apuração ou dados. */
(function (namespace) {
  'use strict';
  function criar(dependencias={}) {
    const S={...dependencias};
    Object.assign(S,namespace.obter('reports.documentos').criar(S));
    Object.assign(S,namespace.obter('reports.folha').criar(S));
    Object.assign(S,namespace.obter('reports.fiscal').criar(S));
    Object.assign(S,namespace.obter('reports.exportacoes').criar(S));
    Object.assign(S,dependencias.aliases||{});
    return S;
  }
  namespace.definir('reports.nucleo',Object.freeze({criar}));
})(window.PontoProOperacional);
