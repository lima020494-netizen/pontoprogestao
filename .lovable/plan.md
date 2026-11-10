# Plano incremental — separar o motor operacional por módulos

## Objetivo e limites

Dividir `public/vip-ponto.html` aos poucos, sem reescrever o produto, migrar o motor para React ou alterar regras aprovadas. O arquivo continuará sendo o endereço de entrada durante toda a transição; `/gestor`, `/quiosque`, links mensais, recuperação de acesso e o Android não mudam.

Não alterar cálculos, dados, namespaces legados, autenticação, permissões, rotas de API, fila offline, impressão, apresentação ou frequência de sincronização. Não publicar sem autorização. Este plano não executa nenhuma extração agora.

## Estrutura de destino

Usar inicialmente arquivos JavaScript locais e versionados, carregados em ordem explícita, com um único namespace e aliases temporários para as funções globais e handlers existentes. Isso evita uma migração simultânea para outro sistema de módulos e reduz riscos em WebViews Android antigas.

```text
public/vip-ponto.html              entrada e shell temporários
public/operacional/
  boot/                            inicialização, conta, sessão e compatibilidade
  core/                            tempo, formatação, constantes e tipos
  domain/                          jornada, escala, ocorrências, banco e resumos
  data/                            Supabase, caches, fila offline e sincronização
  reports/                         folha, PDFs, banco, fiscal e pacote mensal
  features/gestor/                 dashboard, cadastros, tratamento e consultas
  features/portal/                 folha do colaborador e link mensal
  features/quiosque/               PIN, batidas, NSR, confirmação e comprovantes
  printing/                        cascata de impressão térmica
```

A separação exata de arquivos pode ser menor no início: um módulo só nasce quando sua entrada e saída estiverem cobertas por testes. A camada de compatibilidade delega para a implementação nova; não mantém duas regras concorrentes.

## Dependências que determinam a ordem

```text
conta/sessão/contexto ──> acesso a dados e caches ──> telas e relatórios

tempo/tipos ──> jornada e virada noturna ──> tratamento, folha, banco e fiscal
escala + feriados + empresa ──> previsto do dia ──> banco, folha e dashboard
ocorrências ──> movimento diário do banco ──> folha, extrato, PDF, CSV e portal
histórico paginado ──> abertura do banco, folha, lote e pacote do contador
geradores A4 compartilhados ──> folha, extrato, portal e ZIP
fila offline + NSR + horário + impressão ──> quiosque
```

Por isso, telas não devem ser extraídas antes das regras que compartilham. O quiosque, apesar de visualmente isolado, fica por último por concentrar escrita fiscal, contingência e hardware.

## Ordem de extração

### Etapa 0 — Congelar o comportamento e medir a linha de base

- Inventariar funções, variáveis globais, handlers inline, eventos, chaves de armazenamento e dependências entre modos Gestor, Quiosque e Portal.
- Criar cenários de referência com dados sintéticos/anonimizados: jornada diurna e noturna, escala de madrugada, DSR móvel, feriado, ocorrências, banco antes/depois da vigência, histórico anterior ao mês atual e fechamento com hoje/futuro.
- Registrar resultados atuais de tela, folha, extrato, PDF/CSV/AFD/AEJ, tratamento em lote e lançamento unificado das quatro batidas.
- Exercitar upgrade com fila offline existente: batidas pendentes precisam sobreviver à atualização, manter carimbo civil e sincronizar uma única vez.
- Medir chamadas de rede e confirmar a ausência de novos polling/downloads.

**Saída:** suíte de paridade e inventário de dependências. Nenhuma extração começa com essa base falhando.

### Etapa 1 — Criar shell, contexto e compatibilidade

- Introduzir o carregador local e o namespace único, sem mudar a interface nem a ordem funcional do bootstrap.
- Explicitar o contexto compartilhado: conta, sessão, gestor, empresa, colaboradores, escalas, feriados, ocorrências e estado de sincronização.
- Manter aliases para funções chamadas por HTML inline e pelas rotas atuais; cada alias apenas encaminha para a implementação extraída.
- Fazer uma extração pequena de utilitários sem efeitos colaterais, como formatação, máscara de CPF e conversões de horário.

**Depende de:** Etapa 0.  
**Risco principal:** ordem de inicialização e funções globais deixarem de existir.  
**Critério para avançar:** login, PIN, navegação, Portal e abertura do Quiosque inalterados; nenhum erro de console ou dupla inicialização.

### Etapa 2 — Extrair a base de cálculo, ainda sem telas

1. Tempo e ordenação: America/Belem, `instanteBatida`, `ordemJornada`, `indiceJornadas` e `batidasJornada`.
2. Escala e previsão: leitura canônica da grade, prevalência da escala, DSR/folgas, feriados e `previstoDia`.
3. Ocorrências: catálogo dos quatro grupos, regras contextuais, períodos e `regraOcorrencia`.
4. Apuração: trabalho realizado, `movimentoBancoDia`, resumo mensal, saldo anterior/movimento/saldo acumulado e pendências do Tratamento.

As funções devem receber dados e devolver resultados, sem consultar DOM ou nuvem. As regras existentes permanecem idênticas, inclusive falta injustificada neutra no banco, atraso apenas no Dashboard, fator de domingo/feriado, compensatória, abonos e prioridade das pendências.

**Depende de:** Etapa 1.  
**Risco principal:** divergência silenciosa entre Folha, Banco, Dashboard, Portal e exportações.  
**Critério para avançar:** mesmos resultados, dia a dia e nos totais, para todos os cenários da Etapa 0; testes específicos para cada regra extraída.

### Etapa 3 — Isolar dados, cache e contingência offline

- Extrair repositórios Supabase sem mudar tabelas, RLS, autenticação ou endpoints.
- Preservar `NUVEM_DESDE`, paginação e `garantirHistorico(dataIni)` antes de qualquer cálculo ou exportação que dependa de abertura histórica.
- Encapsular localStorage legado sem renomear chaves; manter IndexedDB por conta, validade, atualização explícita e invalidação ao salvar.
- Isolar fila pendente, envio imediato, retentativas e reconciliação sem alterar carimbos, NSR ou ordem civil.
- Não colocar autenticação, autorização ou batidas no cache estável; não reintroduzir polling nem aumentar auditoria além da paginação atual.

**Depende de:** Etapas 1 e 2 para entregar dados no formato já consumido pelo domínio.  
**Risco principal:** perda/duplicação de batidas, leitura histórica incompleta, cache entre contas ou aumento de egress.  
**Critério para avançar:** testes online, offline, reconexão, troca de conta e atualização do aplicativo; nenhuma perda, duplicidade ou vazamento entre empresas.

### Etapa 4 — Separar documentos e exportações

- Extrair primeiro cabeçalho, tabela, rodapé, assinaturas e formatação compartilhados.
- Em seguida: Folha/PDF, extrato individual do banco, Portal/link mensal, Pacote do Contador, AFD/AEJ/Atestado Técnico e planilhas.
- Manter `garantirLib()` e todas as bibliotecas sob demanda; não antecipar jsPDF, AutoTable, JSZip ou XLSX na inicialização.
- Garantir que todos consumam os mesmos resultados do domínio, sem recalcular regras nos geradores.

**Depende de:** Etapas 2 e 3.  
**Risco principal:** totais diferentes, documentos visualmente quebrados, bibliotecas duplicadas ou ausentes offline.  
**Critério para avançar:** paridade de conteúdo e totais, inspeção visual de A4/cupom, pacotes completos e bibliotecas carregadas apenas no uso.

### Etapa 5 — Extrair as telas do Gestor, da menor para a maior escrita

1. Dashboard e consultas somente leitura.
2. Empresa/parâmetros, Colaboradores e Escalas.
3. Banco de Horas e Folha/Portal.
4. Tratamento de Ponto, ocorrências, períodos, abonos e batidas manuais/em massa por último entre as telas do Gestor.

Cada tela recebe serviços e resultados já extraídos; navegação, gaveta, filtros, responsividade, identidade e auditoria permanecem iguais. O Tratamento só é extraído depois de domínio e dados estarem estáveis porque grava ocorrências e marcações fiscais.

**Depende de:** Etapas 2–4; cada subetapa depende da anterior.  
**Risco principal:** eventos ligados duas vezes, estado de tela divergente e escritas parciais em lote.  
**Critério para avançar:** fluxos completos no navegador, validação prévia all-or-nothing dos lotes, log único, autorizador/motivo e nenhuma mudança de cálculo.

### Etapa 6 — Extrair Quiosque e impressão por último

- Separar leitura de PIN, confirmação, classificação das batidas, obtenção de horário, NSR, fila offline e retorno automático da tela.
- Isolar a cascata de impressão e os identificadores técnicos sem mudar os nomes neutros visíveis nem abrir impressão do navegador automaticamente.
- Manter Portal do Colaborador e links mensais compatíveis com o token opaco existente.

**Depende de:** todas as anteriores, especialmente dados offline e regras de jornada.  
**Risco principal:** impedir uma batida real, duplicar registro/impressão ou quebrar contingência em terminal Android.  
**Critério para avançar:** ensaio online/offline/reconexão e validação em terminal real com impressora integrada e Bluetooth compatível antes de considerar a etapa concluída.

### Etapa 7 — Remover o monólito residual com segurança

- Remover somente aliases e código morto comprovadamente sem chamadores.
- Atualizar o shell e o manifesto de arquivos estáticos do service worker de forma atômica e versionada, sem cachear API, autenticação ou dados da empresa.
- Manter `public/vip-ponto.html` como entrada fina e todos os endereços públicos atuais.
- Repetir a suíte completa, testes de atualização offline e uma amostra de paridade antes/depois.

**Critério final:** nenhuma regra duplicada, nenhum namespace legado removido, nenhum aumento de carga inicial/egress e nenhuma alteração percebida pelo usuário.

## Matriz de riscos e proteção

| Risco | Proteção obrigatória |
| --- | --- |
| Acoplamento oculto a globais e handlers inline | Inventário, namespace único e aliases delegantes até o fim |
| Divergência de cálculos entre telas/documentos | Domínio puro compartilhado e comparação com resultados de referência |
| Perda ou duplicidade offline | Mesmas chaves, testes de upgrade/reconexão e nenhuma migração destrutiva |
| Versões antigas misturadas pelo service worker | Arquivos versionados e ativação atômica; testar atualização com fila pendente |
| Vazamento entre empresas ou enfraquecimento de acesso | APIs/RLS inalteradas, cache por conta e testes de isolamento |
| Mais consumo de dados ou carga inicial | Sem novos polling; medição de rede e lazy loading preservado |
| PDFs/planilhas diferentes | Mesmo domínio, paridade de conteúdo e inspeção visual |
| Falha em NSR, virada noturna ou impressão | Extração do Quiosque por último e ensaio em hardware real |

## Regra de execução e reversão

Executar **uma etapa por vez**, com alterações pequenas e revisáveis. Cada etapa exige testes existentes e novos verdes, typecheck/build, comparação funcional no preview e validação dos fluxos afetados em sessão autenticada. Falhou a paridade, não avança.

A reversão restaura apenas a versão anterior dos arquivos e do manifesto estático; nunca apaga nem converte dados, fila pendente ou registros fiscais. Após cada etapa, o sistema deve continuar plenamente utilizável, inclusive offline. Publicação continua fora do escopo e depende de autorização explícita.
