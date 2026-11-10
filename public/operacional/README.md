# Motor operacional — transição incremental

`public/vip-ponto.html` continua sendo a entrada e o shell. A transição usa arquivos JavaScript clássicos, locais e versionados, sem mudar rotas, autenticação ou o modelo de armazenamento.

## Etapa 1 — base ativa

1. `boot/namespace-v20261110-etapa1.js`
2. `core/formatos-v20261110-etapa1.js`
3. `boot/contexto-v20261110-etapa1.js`
4. `boot/compatibilidade-v20261110-etapa1.js`

O namespace único é `window.PontoProOperacional`. O contexto não copia nem grava conta, sessão ou dados: seus getters leem as fontes legadas já existentes. Os aliases preservam os nomes usados pelo HTML e pelos handlers inline.

## Etapa 2 — domínio ativo

5. `domain/escala-v20261110-etapa2.js`
6. `domain/ocorrencias-v20261110-etapa2.js`
7. `domain/jornada-v20261110-etapa2.js`
8. `domain/banco-v20261110-etapa2.js`
9. `domain/nucleo-v20261110-etapa2.js`

O compositor recebe `get`, `funcPorPin` e `cargaEscala` do shell e monta um único núcleo compartilhado. As implementações não consultam DOM, nuvem, IndexedDB ou fila. Jornada, escala, ocorrências, trabalho apurado, banco, folha, resumo e pendências usam esse núcleo; os nomes globais antigos são apenas delegações.

Os demais diretórios contêm somente fronteiras documentadas. Nenhum repositório, relatório, tela, quiosque ou impressão foi extraído.
