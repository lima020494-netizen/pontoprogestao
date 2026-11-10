/* Ponto Pro Gestão — Etapa 3: composição única dos módulos de dados e offline. */
PontoProOperacional.registrar('data.nucleo',function(dependencias={}){
  const S={...dependencias};
  Object.assign(S,PontoProOperacional.obter('data.armazenamento')(S));
  Object.assign(S,PontoProOperacional.obter('data.indexeddb')(S));
  Object.assign(S,PontoProOperacional.obter('data.fila-offline')(S));
  Object.assign(S,PontoProOperacional.obter('data.supabase')(S));
  Object.assign(S,dependencias.aliases||{});
  return S;
});
