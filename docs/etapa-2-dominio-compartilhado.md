# Etapa 2 — Domínio compartilhado de cálculos

Data: 2026-11-10. Escopo executado: somente jornada, escala, ocorrências, trabalho apurado, banco, folha/resumo e pendências. Nenhum dado real foi consultado ou alterado; nada foi publicado.

## 1. Módulos extraídos

Foram ativados cinco arquivos locais e versionados:

1. `public/operacional/domain/escala-v20261110-etapa2.js`
2. `public/operacional/domain/ocorrencias-v20261110-etapa2.js`
3. `public/operacional/domain/jornada-v20261110-etapa2.js`
4. `public/operacional/domain/banco-v20261110-etapa2.js`
5. `public/operacional/domain/nucleo-v20261110-etapa2.js`

O compositor recebe `get`, `funcPorPin` e `cargaEscala` do shell e cria um único objeto de serviços compartilhados. As implementações não acessam DOM, Supabase, localStorage, IndexedDB, fila, timers ou bibliotecas de exportação.

O shell conserva somente aliases delegantes para os nomes globais existentes. Permanecem fora desta etapa: gravação e reordenação de batidas, repositórios, caches, fila offline, telas, PDFs, AFD/AEJ, Quiosque e impressão.

## 2. Regras cobertas

- Instante civil em America/Belem, ordenação, índice e associação das batidas à jornada, inclusive virada e escala começando de madrugada.
- Previsão pela escala específica, DSR/folgas, feriados, jornada padrão e leitura canônica da grade com seus aliases.
- Catálogo dos quatro grupos, validações contextuais e regras de abono, afastamento, compensação, trabalho externo, esquecimento, suspensão e falta.
- Pares de batidas, intervalo pré-assinalado, hora noturna reduzida, trabalho apurado, atraso apenas gerencial, movimento diário do banco e desconto de DSR por suspensão.
- Folha, resumo mensal, saldo anterior/movimento/acumulado, dias anteriores à vigência e classificação das pendências do Tratamento.

## 3. Comparação com a linha de base

Os testes que antes recortavam as regras do HTML passaram a carregar os módulos de produção por `src/lib/operational-domain-harness.ts`, sem alterar os valores esperados.

O novo teste de composição real reproduziu o cenário misto da Etapa 0:

| Medida | Linha de base e Etapa 2 |
| --- | ---: |
| Horas previstas | 2.640 minutos — 44:00 |
| Horas trabalhadas | 1.920 minutos — 32:00 |
| Horas extras | 600 minutos — 10:00 |
| Faltas | 1 dia |
| Horas faltantes | 440 minutos — 07:20 |
| Créditos do banco | 1.000 minutos — 16:40 |
| Débitos do banco | 440 minutos — 07:20 |
| Saldo atual | +560 minutos — +09:20 |

Também foram preservados: dias pré-vigência visíveis e neutros, compensatória em −440, atestado e falta injustificada neutros no banco, fator de domingo/feriado, 240 minutos noturnos e 274 minutos trabalhados no cenário de madrugada, além de carimbos, tipos e NSRs sem regravação durante a apuração.

## 4. Testes e preview

- Antes: **201 testes aprovados em 30 arquivos**.
- Depois: **208 testes aprovados em 31 arquivos**, nenhuma falha.
- Acréscimo: 7 testes estruturais e de paridade em `src/lib/operational-modules-stage2.test.ts`.
- Todos os testes anteriores continuaram verdes, incluindo ocorrências, escalas, pendências, folha/PDF, AFD/AEJ, fila e consumo.
- Verificação de tipos, build e sintaxe dos novos arquivos: **OK**.
- Os 202 handlers inline, os três `setInterval` existentes e o carregamento sob demanda das exportações permaneceram inalterados.

No preview, com dados fictícios e Supabase simulado:

- login, PIN do Quiosque, Portal com espelho e navegação do Gestor concluídos;
- nenhum erro JavaScript ou erro de console inesperado;
- upgrade IndexedDB 1 → 2 com batida anterior preservada;
- falha manteve duas batidas e a reconexão enviou ambas em um único lote, com timestamps intactos;
- consultas mantidas em **7/5/7** na primeira carga, cache e atualização explícita;
- recarga offline encontrou os nove módulos das Etapas 1–2 em cache, executou aliases e regras de domínio e preservou uma batida pendente.

## 5. Integridade e limites

Hashes após a etapa:

| Arquivo | SHA-256 |
| --- | --- |
| `public/vip-ponto.html` | `bd92b25be2f9d47e82b1ea7034df7323e5af5cc5472c97243132e78b1e6616fc` |
| `public/ponto-offline-sw.js` | `11e157a445e2aeaa39bf687bb619331779cce9703b326d8475da03f641a744fd` |
| `public/ponto-offline-register.js` | `07f3c6151fc40710a573ef74a3e58b3d840c98c22eee68949649f0487d643300` (inalterado) |

O service worker passou a `ponto-static-20261110-operacional-etapa2-v1`, incluindo os cinco novos arquivos sem cachear API, autenticação ou dados da empresa.

Não foram verificados sessão externa autenticada real, gravações reais no Supabase, bytes reais de egress, hardware de impressão ou APK instalado. Os testes usaram mocks e dados sintéticos.

**Etapa 2 concluída. Etapas 3–7 permanecem paradas até autorização explícita do usuário.**
