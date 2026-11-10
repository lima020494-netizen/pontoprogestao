# Etapa 3 — Supabase, caches e funcionamento offline

Data: 2026-11-10. Escopo executado: somente acesso a dados, armazenamento local, IndexedDB, fila e sincronização. Nenhuma tabela, política, regra de cálculo ou registro real foi alterado; nada foi publicado.

## 1. Módulos extraídos

Foram ativados cinco arquivos locais, síncronos e versionados:

1. `public/operacional/data/armazenamento-v20261110-etapa3.js`
2. `public/operacional/data/indexeddb-v20261110-etapa3.js`
3. `public/operacional/data/fila-offline-v20261110-etapa3.js`
4. `public/operacional/data/supabase-v20261110-etapa3.js`
5. `public/operacional/data/nucleo-v20261110-etapa3.js`

- **Armazenamento:** namespaces `vip:<conta>:<chave>`, cache de sessão, leitura compartilhada da folha e contas locais.
- **IndexedDB:** banco `vipponto` versão 2, stores `fila` e `config_cache`, transações e cache estável expirável.
- **Fila:** batidas completas, reserva em `pontos_pendentes`, deduplicação por NSR, envio imediato e lotes de 500.
- **Supabase:** repositórios das tabelas existentes, carga inicial, paginação, histórico e escritas de configurações.
- **Núcleo:** composição única e aliases temporários aplicados sobre o mesmo objeto de serviços.

O cliente Supabase e toda a autenticação continuam no shell. Não houve nova chamada `createClient`, alteração de sessão, login, recuperação, RLS ou grants. Os nomes globais `get`, `set`, `K`, `IDB`, `IDB_PRONTO`, `fila*`, `pendentes*`, `sincronizarPendentes`, `carregarNuvem`, `garantirHistorico`, `nuvemPush*` e `lerEstavel` continuam disponíveis por delegação.

## 2. Otimizações preservadas

- Carga inicial de pontos limitada ao mês corrente e à véspera (`NUVEM_DESDE`).
- Histórico antigo somente sob demanda, com paginação de 1.000 e inclusão da vigência/véspera.
- Empregador e feriados com cache IndexedDB por conta e validade de cinco minutos; atualização explícita ignora o cache e salvar invalida a chave correspondente.
- Autorização, sessão e batidas fora do cache estável.
- Logs de auditoria limitados a 50 por página, com páginas antigas apenas sob solicitação.
- Envio imediato da batida pela fila e reenvio idempotente com `email_dono,nsr`.
- Retentativa existente de 120 segundos somente para batidas pendentes; nenhuma recarga periódica da empresa, identidade ou suporte foi criada.
- Permanecem somente os três `setInterval` anteriores e o debounce de 400 ms já existente para gravação de configurações.

## 3. Comparação com a linha de base

A suíte de dados deixou de recortar implementações do HTML e passou a carregar os módulos reais por `src/lib/operational-domain-harness.ts`, mantendo os mesmos valores esperados.

| Verificação | Linha de base e Etapa 3 |
| --- | --- |
| Primeira carga | 7 consultas REST simuladas |
| Nova carga dentro do cache | 5 consultas |
| Atualização explícita | 7 consultas |
| Falha com duas batidas | zero envios; duas preservadas |
| Reconexão | duas enviadas em um único lote; fila vazia |
| Falha na segunda página de 501 batidas | primeira página aceita; fila integral mantida para reenvio idempotente |
| Concorrência | uma única sincronização envia o lote |
| Timestamps e JSON civil | preservados |
| Cache estável | cinco minutos, isolado por conta, falha não cacheada e leituras concorrentes compartilhadas |

O cenário misto de cálculos e todos os demais testes da Etapa 2 continuaram verdes sem alteração dos módulos de domínio.

## 4. Suíte e verificações

- Antes: **208 testes aprovados em 31 arquivos**.
- Depois: **217 testes aprovados em 32 arquivos**, nenhuma falha.
- Acréscimo: 9 testes em `src/lib/operational-modules-stage3.test.ts` para ordem/integração, autenticação não duplicada, aliases, isolamento local, envio imediato, fallback de IndexedDB, reconexão, limites do cache e shell offline.
- Tipagem, build e sintaxe dos cinco módulos: **OK**.

No preview, com dados fictícios e Supabase simulado:

- upgrade IndexedDB 1 → 2 manteve a batida anterior e criou `config_cache` sem recriar `fila`;
- falha de rede manteve duas batidas; a sincronização posterior enviou as duas em um lote, com timestamps e dados originais intactos;
- consultas repetiram **7/5/7**;
- login, PIN do Quiosque, Portal, espelho e navegação do Gestor continuaram funcionando;
- recarga totalmente offline encontrou os módulos das Etapas 1–3 em cache e manteve uma batida pendente;
- nenhum erro JavaScript ou erro de console inesperado.

## 5. Service worker e integridade

A versão estática passou a `ponto-static-20261110-operacional-etapa3-v1`, incluindo os cinco módulos de dados no mesmo conjunto. APIs, autenticação e dados da empresa continuam fora do cache.

Hashes após a etapa:

| Arquivo | SHA-256 |
| --- | --- |
| `public/vip-ponto.html` | `19bf00ef25112be055ba9aed734c7fed6dbccbabfb96c89b8dac79e4cdf7be40` |
| `public/ponto-offline-sw.js` | `95832ecbcceac94ed273edff57d027e0fc7cd77a6567040c0c31192e2b674994` |
| `public/ponto-offline-register.js` | `07f3c6151fc40710a573ef74a3e58b3d840c98c22eee68949649f0487d643300` (inalterado) |

Os cinco módulos de domínio da Etapa 2 não foram editados.

## 6. Limites e ponto de parada

Os testes de rede usaram mocks; não houve consulta ou gravação no Supabase real. Sessão externa autenticada, bytes reais de egress, impressão física e APK instalado não foram verificados. As quantidades 7/5/7 medem consultas, não bytes.

**Etapa 3 concluída. Etapas 4–7 permanecem paradas até autorização explícita do usuário.**
