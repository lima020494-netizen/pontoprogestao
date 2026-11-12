import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), 'utf8');
export const operationalHtml = source('public/vip-ponto.html');
export const operationalSlice = (start: string, end: string) => {
  const a = operationalHtml.indexOf(start);
  const b = operationalHtml.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Trecho operacional não encontrado: ${start} → ${end}`);
  return operationalHtml.slice(a, b);
};

const moduleFiles = [
  'boot/namespace-v20261110-etapa1.js', 'core/formatos-v20261110-etapa1.js',
  'boot/contexto-v20261110-etapa1.js', 'boot/compatibilidade-v20261110-etapa1.js',
  'domain/escala-v20261110-etapa2.js', 'domain/ocorrencias-v20261110-etapa2.js',
  'domain/jornada-v20261110-etapa2.js', 'domain/banco-v20261110-etapa2.js',
  'domain/nucleo-v20261110-etapa2.js',
  'data/armazenamento-v20261110-etapa3.js', 'data/indexeddb-v20261110-etapa3.js',
  'data/fila-offline-v20261110-etapa3.js', 'data/supabase-v20261110-etapa3.js',
  'data/nucleo-v20261110-etapa3.js',
  'reports/documentos-v20261110-etapa4.js', 'reports/folha-v20261110-etapa4.js',
  'reports/fiscal-v20261110-etapa4.js', 'reports/exportacoes-v20261110-etapa4.js',
  'reports/nucleo-v20261110-etapa4.js',
];
const modules = moduleFiles.map((path) => source(`public/operacional/${path}`));

export function createDomainContext(overrides: any = {}) {
  const context: any = { ...overrides, window: overrides.window || {} };
  context.window.window = context.window;
  vm.createContext(context);
  if (!context.window.PontoProOperacional) for (const code of modules) vm.runInContext(code, context);
  const api = context.window.PontoProOperacional.obter('domain.nucleo').criar({ ...overrides, aliases: overrides });
  Object.assign(context, api, overrides);
  context.NUCLEO_OPERACIONAL = api;
  if (!context.LOGS_SESSAO) context.LOGS_SESSAO = new Set();
  const memoria = new Map<string, string>();
  const localStorage = overrides.localStorage || {
    getItem: (key: string) => memoria.has(key) ? memoria.get(key)! : null,
    setItem: (key: string, value: unknown) => { memoria.set(key, String(value)); },
    removeItem: (key: string) => { memoria.delete(key); },
  };
  const dataApi = context.window.PontoProOperacional.obter('data.nucleo').criar({
    sb: overrides.sb || null, localStorage, indexedDB: overrides.indexedDB,
    getConta: () => context.CONTA ?? null,
    getShareData: () => context.SHARE_DATA ?? null,
    getCarregando: () => Boolean(context.CARREGANDO),
    setCarregando: (value: boolean) => { context.CARREGANDO = value; },
    setNuvemOk: (value: boolean) => { context.NUVEM_OK = value; },
    getNuvemDesde: () => context.NUVEM_DESDE || '',
    setNuvemDesde: (value: string) => { context.NUVEM_DESDE = value; },
    hojeISO: () => context.hojeISO ? context.hojeISO() : '2026-11-10',
    addDias: (date: string, days: number) => context.addDias(date, days),
    atualizaStatus: () => { if (context.atualizaStatus) context.atualizaStatus(); },
    logsSessao: () => context.LOGS_SESSAO,
    log: (message: string) => { if (context.log) context.log(message); },
    aliases: overrides,
  });
  Object.assign(context, api, dataApi, overrides);
  context.NUCLEO_OPERACIONAL = api;
  context.DATA_NUCLEO = dataApi;
  context.PontoProOperacional = context.window.PontoProOperacional;
  context.RELATORIOS_NUCLEO = context.window.PontoProOperacional.obter('reports.nucleo').criar({
    ...api, ...overrides, getConta: () => context.CONTA, getGerenciador: () => context.GERENCIADOR,
    aliases: overrides,
  });
  return context;
}

export function runWithDomain<T = any>(code: string, overrides: any = {}): T {
  const context = createDomainContext(overrides);
  return vm.runInContext(code, context) as T;
}

export const createDataContext = createDomainContext;
export const runWithData = runWithDomain;
