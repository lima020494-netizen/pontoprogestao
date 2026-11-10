# Etapa 1 — Shell, contexto e compatibilidade

Data: 2026-11-10. Escopo executado: somente estrutura de módulos, namespace, contexto por referência, aliases temporários e extração de utilitários puros. Nenhum dado real foi consultado ou alterado; nada foi publicado.

## 1. Estrutura criada

Foi criada a área `public/operacional/` com as fronteiras previstas para `boot`, `core`, `domain`, `data`, `reports`, `features/gestor`, `features/portal`, `features/quiosque` e `printing`.

Somente estes quatro arquivos são carregados nesta etapa, de forma local, síncrona e versionada:

1. `boot/namespace-v20261110-etapa1.js`
2. `core/formatos-v20261110-etapa1.js`
3. `boot/contexto-v20261110-etapa1.js`
4. `boot/compatibilidade-v20261110-etapa1.js`

Os demais diretórios contêm apenas documentação de fronteira. Nenhum cálculo de jornada/banco, repositório Supabase, fila, relatório, tela, quiosque ou impressão foi extraído.

## 2. Compatibilidade e inicialização

- O namespace único é `window.PontoProOperacional`.
- O registro local rejeita módulos duplicados; recarregar o script do namespace não reinicializa o motor.
- Foram extraídos somente `pad`, `esc`, `isoOf`, `brOf`, `hhmm`, `toMin`, `toHHMM`, `toSaldo`, `DIAS`, `dow`, `addDias` e `cpfMascarado`.
- Os nomes legados continuam disponíveis por aliases delegantes. `cpfMascarado` conserva também seu wrapper de função global.
- O contexto expõe conta, sessão, gestor, empresa, colaboradores, escalas, feriados, ocorrências e sincronização por getters. Ele não copia nem grava estado; as variáveis e o armazenamento legados continuam sendo a única fonte.
- A ligação do contexto ocorre uma única vez, antes do boot existente. O conteúdo e a ordem do boot, de `iniciarApp`, da autenticação e da recuperação não foram alterados.
- Os 202 handlers inline permanecem no inventário. Não foram acrescentados timers, consultas Supabase, caches de dados ou carregamentos de bibliotecas de exportação.

## 3. Offline e consumo

O service worker passou à versão `ponto-static-20261110-operacional-etapa1-v1` e inclui os quatro novos arquivos no mesmo conjunto estático. APIs, autenticação e dados da empresa continuam fora do cache. `ponto-offline-register.js` não mudou.

O ensaio de navegador repetiu a linha de base com respostas simuladas:

| Verificação | Resultado |
| --- | --- |
| Upgrade IndexedDB 1 → 2 | `fila` e `config_cache` presentes; batida anterior preservada |
| Falha de conexão | zero envios; duas batidas preservadas |
| Reconexão | duas batidas enviadas em um único lote; fila vazia; timestamps intactos |
| Consultas na primeira carga | 7 |
| Nova carga dentro do cache | 5 |
| Atualização explícita | 7 |
| Recarga offline do shell | quatro módulos disponíveis; aliases funcionais; uma batida pendente preservada |

Esses números medem consultas simuladas, não bytes reais de egress.

## 4. Testes e comparação funcional

- Linha de base: **194 testes aprovados em 29 arquivos**.
- Depois da Etapa 1: **201 testes aprovados em 30 arquivos**, nenhuma falha.
- Foram acrescentados 7 testes em `src/lib/operational-modules-stage1.test.ts` para ordem de carga, namespace único, paridade dos utilitários, contexto por referência, aliases/handlers, ausência de novos efeitos colaterais e cache estático.
- Todos os testes da Etapa 0 continuaram verdes, incluindo cálculos de referência, fila, consumo e AFD/AEJ.
- Verificação de tipos e build: **OK**.
- Sintaxe dos novos scripts e do service worker: **OK**.

No preview, com empresa e pessoas fictícias e Supabase simulado:

- login apresentado normalmente;
- abertura do Quiosque e leitura do PIN do colaborador concluídas;
- Portal aberto por PIN e espelho mensal renderizado;
- Gestor aberto por PIN e navegação até Colaboradores concluída;
- contexto refletindo conta e gestor atuais;
- nenhum erro JavaScript ou erro de console inesperado;
- nenhuma dupla inicialização observada.

## 5. Integridade e limites

Hashes após a etapa:

| Arquivo | SHA-256 |
| --- | --- |
| `public/vip-ponto.html` | `6f3f60c479b8a48f53ec43946e3ce401dc514434c61d49925ebad5201e28796e` |
| `public/ponto-offline-sw.js` | `feaa57a146031675f248cf88473615cf542bfdd160e30213b57c7ffdbf82fc6f` |
| `public/ponto-offline-register.js` | `07f3c6151fc40710a573ef74a3e58b3d840c98c22eee68949649f0487d643300` (inalterado) |

Não foram verificados sessão externa autenticada real, gravações reais no Supabase, bytes reais de egress, hardware de impressão ou APK instalado. Os testes usaram mocks e dados sintéticos. Nenhuma regra, cálculo, namespace de armazenamento ou registro fiscal foi alterado.

**Etapa 1 concluída. Etapas 2–7 permanecem paradas até autorização explícita do usuário.**
