/* Etapa 1: registro local síncrono; não inicia conta, rede, timers ou armazenamento. */
(function (global) {
  'use strict';
  if (global.PontoProOperacional) return;

  const modulos = Object.create(null);
  const namespace = {
    versao: '2026-11-10.etapa1',
    definir(nome, implementacao) {
      if (!nome || modulos[nome]) throw new Error('Módulo operacional duplicado ou inválido: ' + nome);
      modulos[nome] = implementacao;
      return implementacao;
    },
    obter(nome) {
      if (!modulos[nome]) throw new Error('Módulo operacional não carregado: ' + nome);
      return modulos[nome];
    },
    tem(nome) {
      return Boolean(modulos[nome]);
    },
  };

  Object.defineProperty(global, 'PontoProOperacional', { value: namespace });
})(window);
