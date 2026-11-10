import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const paths = [
  'public/operacional/boot/namespace-v20261110-etapa1.js',
  'public/operacional/core/formatos-v20261110-etapa1.js',
  'public/operacional/domain/escala-v20261110-etapa2.js',
  'public/operacional/domain/ocorrencias-v20261110-etapa2.js',
  'public/operacional/domain/jornada-v20261110-etapa2.js',
  'public/operacional/domain/banco-v20261110-etapa2.js',
  'public/operacional/domain/nucleo-v20261110-etapa2.js',
];
const sources = paths.map(path => ({ path, source: readFileSync(path, 'utf8') }));

export function createDomainContext(overrides: Record<string, any> = {}) {
  const context: Record<string, any> = { console, ...overrides };
  if (!context['window']) context['window'] = {};
  for (const { path, source } of sources) runInNewContext(source, context, { filename: path });
  const namespace = context['window'].PontoProOperacional;
  const { get, funcPorPin, cargaEscala, ...aliases } = overrides;
  const api = namespace.obter('domain.nucleo').criar({
    get: get || ((_key: string, fallback: unknown) => fallback),
    funcPorPin: funcPorPin || (() => ({})),
    cargaEscala: cargaEscala || (() => 440),
    aliases,
  });
  Object.assign(context, api, overrides);
  return context;
}

export function runWithDomain(source: string, context: Record<string, any>) {
  return runInNewContext(source, createDomainContext(context));
}
