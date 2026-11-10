# Motor operacional — transição incremental

`public/vip-ponto.html` continua sendo a entrada e o shell. A Etapa 1 ativa somente o registro local, o contexto por referência, os aliases delegantes e `core/formatos`.

## Ordem síncrona de carga

1. `boot/namespace-v20261110-etapa1.js`
2. `core/formatos-v20261110-etapa1.js`
3. `boot/contexto-v20261110-etapa1.js`
4. `boot/compatibilidade-v20261110-etapa1.js`
5. script principal existente em `vip-ponto.html`

O namespace único é `window.PontoProOperacional`. O contexto não copia nem grava conta, sessão ou dados: seus getters leem as fontes legadas já existentes. Os aliases preservam os nomes usados pelo HTML e pelos handlers inline até as extrações futuras.

Os demais diretórios contêm somente fronteiras documentadas. Nenhum cálculo, repositório, relatório, tela, quiosque ou impressão foi extraído nesta etapa.
