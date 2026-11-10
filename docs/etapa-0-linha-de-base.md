# Etapa 0 — Linha de base do motor operacional

Data: 2026-11-10. Escopo: somente inventário, testes e medições. Nenhuma regra, dado real ou arquivo do motor foi alterado; nada foi publicado.

## 1. Integridade do motor

Os hashes SHA-256 ficaram idênticos antes e depois do trabalho:

| Arquivo | SHA-256 |
| --- | --- |
| `public/vip-ponto.html` | `8d7a45711b400a03ac7d037f99061ec6e477d5b416f343727c2133e0d243c872` |
| `public/ponto-offline-sw.js` | `eee31015ec27890c846b8f0a18e45661f910c58790772a9864d7b4cce24fa534` |
| `public/ponto-offline-register.js` | `07f3c6151fc40710a573ef74a3e58b3d840c98c22eee68949649f0487d643300` |

Inventário inicial para comparação nas extrações:

- 331 funções nomeadas no HTML operacional.
- 202 handlers inline, que continuam sendo contratos temporários de compatibilidade.
- 3 chamadas `setInterval`; a retentativa de dados foi verificada separadamente e não recarrega a empresa.
- 16 chamadas a `garantirLib`, preservando o carregamento sob demanda.
- Dois blocos principais de inicialização e dependências entre escala/jornada: a posição no HTML não será tratada como fronteira automática de módulo.

## 2. Resultado da suíte

- Antes: **182 testes aprovados**, 25 arquivos, nenhuma falha.
- Depois: **194 testes aprovados**, 29 arquivos, nenhuma falha.
- Acréscimo: **12 testes de caracterização**, sem alterar o código de produção.

Novos arquivos:

- `src/lib/operational-baseline.test.ts`: 4 cenários de cálculo.
- `src/lib/offline-queue-baseline.test.ts`: 4 cenários de fila e reconciliação.
- `src/lib/supabase-consumption-baseline.test.ts`: 2 cenários de consumo.
- `src/lib/fiscal-baseline.test.ts`: 2 cenários de AFD/AEJ.

Os testes usam dados sintéticos e mocks. Nenhum registro real foi consultado, criado, editado ou excluído.

## 3. Valores de referência dos cálculos

Cenário misto de 01/10/2026 a 08/10/2026, com banco vigente a partir de 03/10, duas batidas pré-vigência, DSR trabalhado, compensação, atestado, feriado trabalhado e uma falta injustificada:

| Medida | Valor de referência |
| --- | ---: |
| Horas previstas | 2.640 minutos — 44:00 |
| Horas trabalhadas | 1.920 minutos — 32:00 |
| Horas extras | 600 minutos — 10:00 |
| Faltas | 1 dia |
| Horas faltantes | 440 minutos — 07:20 |
| Créditos do banco | 1.000 minutos — 16:40 |
| Débitos do banco | 440 minutos — 07:20 |
| Saldo atual | +560 minutos — +09:20 |

Conciliações confirmadas:

- 01/10 e 02/10 permanecem visíveis, com saldo zero por serem anteriores à vigência.
- A soma dos saldos diários é igual a créditos menos débitos do período.
- Saldo atual = saldo anterior + créditos − débitos.
- Folga compensatória debita 440 minutos, sem falta.
- Atestado e falta injustificada não debitam o banco.
- Domingo/feriado trabalhado usa o fator configurado da empresa.
- Nenhum carimbo, tipo ou NSR é regravado durante a apuração.

Cenário noturno com escala iniciando à meia-noite em 31/10/2026:

- Marcações civis preservadas: 00:00 e 04:00.
- 240 minutos no período noturno.
- 274 minutos trabalhados após a redução da hora noturna.
- Saldo de −166 minutos diante de 440 minutos previstos.

A suíte já existente continua protegendo virada de turno, escala de madrugada, pendências, tratamento em lote atômico e lançamento unificado das quatro batidas.

## 4. Fila offline e upgrade

Testes automatizados:

- IndexedDB e reserva legada são deduplicadas por NSR.
- `timestamp` e o objeto civil original permanecem intactos no envio.
- Falha na segunda página de 501 batidas preserva toda a fila; a repetição usa `email_dono,nsr` e termina idempotente.
- Duas tentativas concorrentes não enviam o mesmo lote duas vezes.
- Fila vazia não gera gravação no Supabase.

Ensaio real no navegador, com respostas Supabase simuladas:

- Banco IndexedDB criado na versão 1 com uma batida pendente foi atualizado para a versão 2.
- Os stores `fila` e `config_cache` ficaram disponíveis e a batida anterior foi preservada.
- Após acrescentar uma segunda batida, a falha de conexão retornou zero envios e manteve as duas na fila.
- Na reconexão, as duas foram enviadas em um único lote, a fila ficou vazia e os carimbos permaneceram iguais.
- Nenhum erro JavaScript foi capturado no preview.

## 5. Consumo do Supabase

A mesma carga foi medida em teste e no navegador com respostas simuladas:

| Situação | Consultas REST |
| --- | ---: |
| Primeira carga | 7 |
| Nova carga dentro da validade do cache | 5 |
| Atualização explícita/forçada | 7 |

Recursos da primeira carga: empregador, funcionários, pontos, feriados, dados, logs e escala.

Comprovações:

- Empregador e feriados não são baixados novamente dentro da validade do cache.
- A atualização explícita ignora esse cache.
- A janela inicial em 10/11/2026 começa em 31/10/2026, cobrindo a véspera da virada noturna.
- Consulta de histórico já coberto não gera download adicional.
- Logs permanecem limitados a 50 registros por página.
- A retentativa de 120 segundos chama somente `sincronizarPendentes`; não recarrega dados da empresa.
- Nenhuma consulta de identidade ou suporte foi incluída nessa sequência.

Esses números medem **quantidade de consultas**, não bytes reais de egress. Nenhuma chamada atingiu o Supabase real durante os testes.

## 6. Folha, PDF/CSV, pacote e arquivos fiscais

A linha de base reúne a cobertura existente e os novos testes:

- Folha e resumo mensal compartilham os resultados diários e o movimento do banco.
- Extrato individual mantém saldo acumulado coerente com o saldo atual.
- PDF e CSV consolidados leem os totais somente depois do histórico.
- Falha de histórico não produz saldo enganoso nem perde o cache local.
- Fechamento contábil não transforma hoje aberto ou futuro em falta.
- Tratamento em massa mantém autorizador, motivo e validação prévia all-or-nothing.
- AFD Tipo 3 mantém ordem de NSR, data/hora civil e exclui somente marcações já excluídas; o trailer registra duas marcações no cenário.
- AEJ preserva os timestamps civis da virada, a sequência da jornada e os totais dos registros 05/06/99.

Nenhum gerador foi alterado. Comparação visual/binária de novos PDFs e ZIPs não foi refeita nesta etapa; impressão física também não foi testada.

## 7. Cuidados obrigatórios nas próximas etapas

- Vários testes recortam funções do HTML por âncoras: cada extração deverá atualizar o harness sem enfraquecer as expectativas.
- Handlers inline e estados em `window` exigem aliases temporários.
- A ordem dos dois blocos de bootstrap deve ser preservada até existir cobertura integrada equivalente.
- Escala e jornada possuem dependência cruzada e devem continuar compartilhando o mesmo núcleo.
- A lista de estáticos do service worker é explícita: qualquer arquivo novo necessário offline precisa entrar nela de forma versionada e atômica.
- Não reintroduzir polling, cache de autenticação/batidas ou carga histórica redundante.

## 8. Limites e ponto de parada

Não foram verificados nesta etapa: sessão externa autenticada, gravação real no Supabase, bytes reais de egress, hardware de impressão ou APK instalado. Nada disso foi necessário para alterar a linha de base e nenhum dado de produção foi tocado.

**Etapa 0 concluída. Etapas 1–7 permanecem paradas até autorização explícita do usuário.**
