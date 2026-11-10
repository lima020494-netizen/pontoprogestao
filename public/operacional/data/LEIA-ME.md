# Dados, cache e funcionamento offline — Etapa 3

- `armazenamento-v1.js`: namespaces `vip:` por conta, leitura compartilhada, cache de sessão e contas locais.
- `indexeddb-v1.js`: banco `vipponto` versão 2, transações e cache estável de cinco minutos; nunca armazena autorização nem batidas nesse cache.
- `fila-offline-v1.js`: fila completa em IndexedDB, reserva em `pontos_pendentes`, envio imediato e lotes de 500 com chave idempotente.
- `supabase-v1.js`: clientes consultivos por tabela, carga inicial do mês corrente, paginação, retaguarda histórica e escrita de configurações.
- `nucleo-v1.js`: compõe os módulos uma única vez e aplica aliases temporários usados pelo shell.

O cliente Supabase e a sessão/autenticação continuam no shell. O namespace preserva `get`, `set`, `K`, `IDB`, `IDB_PRONTO`, `fila*`, `pendentes*`, `sincronizarPendentes`, `carregarNuvem`, `garantirHistorico`, `nuvemPush*`, `lerEstavel` e os demais identificadores globais usados por handlers ou testes.

Não há tabelas, políticas, autenticação, polling ou cálculos novos nestes arquivos.
