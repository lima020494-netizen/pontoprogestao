import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const modules = [
  ['core.namespace', 'public/operacional/boot/namespace-v20261110-etapa1.js'],
  ['core.formatos', 'public/operacional/core/formatos-v20261110-etapa1.js'],
  ['domain.escala', 'public/operacional/domain/escala-v20261110-etapa2.js'],
  ['domain.ocorrencias', 'public/operacional/domain/ocorrencias-v20261110-etapa2.js'],
  ['domain.jornada', 'public/operacional/domain/jornada-v20261110-etapa2.js'],
  ['domain.banco', 'public/operacional/domain/banco-v20261110-etapa2.js'],
  ['domain.nucleo', 'public/operacional/domain/nucleo-v20261110-etapa2.js'],
] as const;
const sources = modules.map(([name, path]) => ({ name, path, source: readFileSync(path, 'utf8') }));

export function createDomainContext(overrides: Record<string, any> = {}) {
  const context: Record<string, any> = { console, ...overrides };
  if (!context['window']) context['window'] = {};
  for (const { name, path, source } of sources) {
    const namespace = context['window'].PontoProOperacional;
    if (name === 'core.namespace' ? namespace : namespace?.tem(name)) continue;
    runInNewContext(source, context, { filename: path });
  }
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
