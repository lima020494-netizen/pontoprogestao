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
  'core/formatos-v1.js', 'boot/compatibilidade-v1.js', 'boot/runtime-v1.js',
  'domain/nucleo-v1.js', 'domain/jornada-v1.js', 'domain/escala-v1.js',
  'domain/ocorrencias-v1.js', 'domain/banco-v1.js', 'domain/nucleo-v1.js',
  'data/armazenamento-v1.js', 'data/indexeddb-v1.js', 'data/fila-offline-v1.js',
  'data/supabase-v1.js', 'data/nucleo-v1.js',
];
const modules = moduleFiles.map((path) => source(`public/operacional/${path}`));

export function createDomainContext(overrides: Record<string, any> = {}) {
  const context: Record<string, any> = { ...overrides, window: overrides.window || {} };
  context.window.window = context.window;
  vm.createContext(context);
  for (const code of modules) vm.runInContext(code, context);
  const api = context.window.PontoProOperacional.obter('domain.nucleo').criar(overrides);
  Object.assign(context, api, overrides);
  context.NUCLEO_OPERACIONAL = api;
  if (!context.LOGS_SESSAO) context.LOGS_SESSAO = new Set();
  const memoria = new Map<string, string>();
  const localStorage = overrides.localStorage || {
    getItem: (key: string) => memoria.has(key) ? memoria.get(key)! : null,
    setItem: (key: string, value: unknown) => { memoria.set(key, String(value)); },
    removeItem: (key: string) => { memoria.delete(key); },
  };
  const dataApi = context.window.PontoProOperacional.obter('data.nucleo')({
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
  Object.assign(context, dataApi, api, overrides);
  context.NUCLEO_OPERACIONAL = api;
  context.DATA_NUCLEO = dataApi;
  return context;
}

export function runWithDomain<T>(code: string, overrides: Record<string, any> = {}): T {
  const context = createDomainContext(overrides);
  return vm.runInContext(code, context) as T;
}

export const createDataContext = createDomainContext;
export const runWithData = runWithDomain;
