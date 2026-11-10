/* Aliases delegantes temporários para o shell e os handlers legados. */
(function (namespace) {
  'use strict';

  function aliases(nomeModulo, nomes) {
    const modulo = namespace.obter(nomeModulo);
    const saida = {};
    nomes.forEach(nome => {
      if (!(nome in modulo)) throw new Error('Alias sem implementação: ' + nomeModulo + '.' + nome);
      saida[nome] = typeof modulo[nome] === 'function'
        ? function () { return modulo[nome].apply(modulo, arguments); }
        : modulo[nome];
    });
    return saida;
  }

  namespace.definir('boot.compatibilidade', Object.freeze({ aliases }));
})(window.PontoProOperacional);
