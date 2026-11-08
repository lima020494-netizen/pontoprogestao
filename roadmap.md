# Roadmap

- [x] Reduzir egress: removido polling de identidade/suporte e recarga periódica do quiosque; preservada retentativa e envio imediato da fila. Auditoria paginada em 50 por fonte, backup completo sob demanda. Empregador/feriados e identidade usam cache IndexedDB por conta com validade de 5 min, invalidação ao salvar e atualização explícita no Terminal/reconexão. 180 testes passaram; cache real e upgrade preservando fila conferidos no navegador, sem erros; build OK. Somente preview; sincronização autenticada externa e economia real de egress não verificadas. Auditoria 6.2 continua bloqueada por conexão expirada conforme abaixo.

- [x] Revisar Banco de Horas: consulta somente leitura confirmou 84 registros da Penina, vigência em 03/10 e todas as batidas de 01/02 excluídas com ocorrências de compensação. Corrigidos extrato sem histórico, paginação, resumo/PDF/CSV calculados antes da carga e saldo diário fora da vigência; extrato mostra todos os dias e vigência. Tipos legados repetidos normalizados apenas na leitura. 174 testes passaram, scripts/build OK e cópia real conferida em desktop/390px sem erros. Sem alteração de registros ou publicação; sessão autenticada da cliente não disponível no Supabase externo, por isso login/sincronização de ponta a ponta não verificados.

- [x] Tratamento de Ponto: inbox, KPIs, timeline por jornada, seleção em massa e gaveta com autorizador/motivo obrigatórios, períodos e anexo PDF/JPG/PNG até 1 MB no registro account-scoped existente. APK permanente em /download, /apk e configuração. 140 testes passaram; prévia desktop/celular, abono em lote até Tudo em dia, anexo e madrugada 00:20 conferidos com dados isolados, sem erros; redirects 302 corretos. Cálculos preservados, sem publicar. Gravação autenticada/sincronização externa não verificáveis; KPI de solicitações conta somente ocorrências realmente pendentes, sem inventar solicitações ou criar novo portal.

- [x] /download e /apk redirecionam à release oficial; Terminal Quiosque oferece APK/instruções; madrugada manual permite tipo e fechamento da noite anterior, com data civil preservada e log único. 127 testes passaram, build OK e formulário/redirects conferidos com dados isolados; sem publicar. Login/sincronização autenticada externos e instalação física do APK não verificáveis; auditoria anterior segue bloqueada abaixo.

- [x] Pacote operacional 31/10: cabeçalho/gaveta simplificados, suporte flutuante contextual, fechamento CSV/XLS sem faltas em dias abertos/futuros, madrugada com fuso Belém e correção de jornada civil legada, vitrine na raiz com recuperação preservada, favicon ICO e base Capacitor com.pontoprogestao.app em /quiosque. 116 testes passaram; prévia e ZIP real conferidos com dados isolados; build OK. Sem publicar. Android é configuração inicial, sem APK/assinatura ou validação física; conta autenticada externa não verificável. Auditoria 6.2 continua bloqueada como abaixo.

- [x] Pacote 6.2 visual: identidade oficial fixa/admin claro sem seletores, card de acesso do Gestor, link/QR copiável do Quiosque e aviso de suporte. 107 testes passam e build OK; PIN/link/QR/aviso conferidos com dados isolados, sem validação autenticada real ou hardware; não publicado. Cálculos e rotina de impressão preservados.
- [ ] Ativar auditoria 6.2 e leitura do aviso pelo dono da empresa: migração supabase-suporte-62.sql bloqueada por conexão Supabase expirada. Tabelas existem, mas consulta confirmou ausência dos triggers; reconexão necessária, sem alegar auditoria ativa. Histórico normal continua na nuvem; API agora verifica erros no início/encerramento do suporte.

- [x] Etapa 6.1: logo enviada/ícones versionados, text_color com contraste por superfície, /gestor com PIN/bloqueio/logoff e limites dinâmicos de gerenciadores, /quiosque e raiz sem engrenagem, suporte/chamados no gestor. 93 testes aprovados, páginas públicas e PIN com dados isolados conferidos em 390/768/1280, build OK. Sem publicar; login real, gravação autenticada global e hardware/PWA instalado não verificáveis no Supabase externo. Chamados usam WhatsApp/e-mail configurados, sem sistema separado de tickets.

- [x] Etapa 4: quatro abas admin; marketing_site_content/app_settings criadas com grants/RLS, planos existentes compartilhados, identidade/Sobre protegidos e refletidos no app/atestado. Gravação autenticada real não verificável no Supabase externo.
- [x] Impressão: aviso de 2s, sem card persistente; conexão ESC/POS BLE, envio em blocos conferido em simulação. InnerPrinter virtual não garantida; impressora física indisponível para validação.
- [x] Manifesto any/maskable separado; id/scope/start_url preservados para instalações existentes. Online sincroniza fila imediatamente e atualiza nuvem; manual corrigido. 33 testes de identidade/cálculos passaram, prévia pública sem erros, API sem sessão 401; não publicado. WebAPK e painel autenticado real não verificáveis aqui.

- [x] V3 operacional: ZIP somente na folha com PDFs/AFD/XLS analítico e CSV; quatro grupos de justificativas, períodos editáveis INSS/maternidade, autorização manual e fator da empresa. Prévia com dados isolados: gravação/edição/recarga, ZIP/XLS e PDF com 31 dias em uma A4 conferidos, sem sobreposição ou erros; férias neutralizadas (não debitadas), descontos em minutos não equivalem a folha salarial/eSocial. Acesso autenticado externo e impressora física não verificáveis; sem publicação ou alteração de dados reais.

- [x] Revisar redundâncias estéticas: retirar estilos sobrescritos e indicador sem uso, harmonizar abas/tabela/cards com tokens da marca, corrigir largura dos cards e remover alça/animação indevidas no Gestor; modais centralizados no desktop e inferiores no celular. 42 testes aprovados e prévia sem erros; dados isolados, folha A4/quiosque/cálculos preservados e sem publicação. Não constitui auditoria legal ou teste em conta real.

- [x] Corrigir importação de escala em grade e formato antigo para aceitar opções do menu e variações de folga compensada; CSV confirmado com dados isolados, 27 testes aprovados e build OK. Sem publicar ou alterar dados reais; sincronização autenticada externa não verificada.

- [x] Separar débito de folga compensatória das faltas e neutralizar débitos de atestado/falta justificada ou abonada na apuração compartilhada; 28 testes aprovados, extrato e folha conferidos com dados isolados e build OK. Supabase/AFD e dados reais preservados; acesso autenticado externo não verificável. Somente preview.

- [x] Vincular jornada do anexo ao cadastro da empresa com sábado separado (08–12), dias úteis 08–12/14–18 e domingo DSR; gravação/edição em dados isolados, folha em desktop/celular, PDF de uma A4 e oito testes conferidos. Apuração e dados reais preservados; sincronização autenticada externa não verificada. Somente preview.

- [x] Mini tabela DOM–SÁB de horário de trabalho conforme anexo, usando cadastro da empresa na tela e no PDF compartilhado; sete testes aprovados, 31 dias em uma A4 e tabela sem transbordamento em 390px, com dados isolados. Somente preview.

- [x] Remover cards duplicados dos colaboradores, mantendo somente a tabela formatada; tabela única e Editar conferidos com dados isolados.

- [x] Aplicar Cartão de Ponto Calculado com logo, identificação e jornada semanal, grade funcional zebrada, totais e quadros Banco/Observações na tela e PDF compartilhado, sem alterar apuração; referência IMG_20261016_221807.jpg ausente, seguido texto enviado.
- [x] Conferir 31 dias e assinaturas em uma A4, justificativas extensas em anexo sem corte e ZIP com PDF/AFD/CSV; 390/768/1280 sem transbordamento, 19 testes aprovados e build OK. Corrigidos jornada semanal cortada e espaço excessivo que provocava anexo desnecessário. Somente preview, sem publicar ou alterar dados reais; conta autenticada externa e impressora física não verificáveis.

- [x] Reformular espelho A4 com cabeçalho dividido, grade diária, asteriscos e resumo em três linhas, preservando apuração e justificativas; 50%/100% não classificados sem regra configurada, extras totais preservadas.
- [x] Simplificar vigência opcional, Batidas sem sub-abas, Escalas, ajuda do Banco e pacote mensal direto; retorno limpo de 2s do Quiosque preservado e conferido.
- [x] Downloads PDF/ZIP conferidos com dados isolados: 31 dias, resumo e assinaturas em uma A4; justificativa duplicada corrigida, notas extensas preservadas em anexo sem corte. Telas 390/768/1280 sem transbordamento, 22 testes aprovados e build OK. Sem publicação ou alteração de dados reais; acesso autenticado externo e dispositivos físicos não verificados.

- [x] Restaurar Dashboard de Frequência abaixo do resumo executivo na entrada e no retorno pela gaveta; filtros, dois gráficos e download PDF conferidos com dados isolados, sem transbordamento em 390px. 18 testes passaram e build OK; somente preview, sem alteração de dados reais ou validação autenticada externa.

- [x] Fixar cabeçalho do Gestor e harmonizar fundo, gaveta e três indicadores com a logo; home sem blocos redundantes, Quiosque intacto.
- [x] Consolidar resumo do período na folha branca e PDF oficial compartilhado pelo ZIP, preservando cálculos e separando saldo mensal do acumulado.
- [x] Conferir rolagem e gaveta em 390/768/1280, PDF A4 de duas páginas com resumo/assinaturas sem sobreposição; 24 testes passaram e build OK. Dados isolados, sem publicação; conta autenticada real não verificada.

- [x] Clarear o Dashboard com saudação, três indicadores e ações compactas, preservando a gaveta.
- [x] Conferir Lei 605/49 art. 9 e Súmula 146 TST; feriados precedem jornadas, descansos não geram falta/débito inferido, crédito integral 1:1 sem presumir adicional monetário ou dobrar banco. Escala específica de sábado/domingo preservada; marcações intactas.
- [x] Fechar gaveta imediatamente e carregar Folha, Banco e Logs com casca visual e cache de sessão preservado.
- [x] 21 testes passaram; navegação em 390/768/1280 sem erros ou transbordamento. Feriado com 09:00 extras/crédito e zero débito conferido na folha e no PDF oficial. Somente preview, sem publicação ou alteração de dados reais; conta autenticada externa não verificável neste ambiente.

- [x] Modernizar navegação do Gestor com gaveta acessível, atalhos diretos e retorno ao Dashboard.
- [x] Adicionar painel executivo com relógio ao vivo e indicadores derivados das jornadas existentes, sem alterar cálculos.
- [x] Conferir navegação em 390px, 768px e 1280px com dados isolados; relógio, indicadores, módulos, ocorrência, retorno e quiosque passaram sem erros. Testes de regras preservadas passaram; conta real e aparelhos físicos não conferidos. Nenhuma publicação.

- [x] Comprimir logo de 752.474 para 22.127 bytes preservando transparência e disponibilizar bibliotecas locais com cache offline; Supabase @2 fixado em 2.117.3, versão efetivamente servida pelo CDN na conferência.
- [x] Trocar Dashboard, Banco e Atestado por PDF; remover funções órfãs e caminho A4 pelo navegador, preservando comprovante térmico.
- [x] Harmonizar botões, tabelas, espaçamentos e ocorrências; celular de 360px e tablet retrato/paisagem conferidos sem transbordamento lateral.
- [x] Validar os três downloads PDF tabelados, recarga offline com bibliotecas disponíveis e seis testes; somente prévia, sem alterar dados reais. Conta autenticada real e dispositivos físicos não verificáveis neste ambiente.

- [x] Remover impressão redundante da folha individual, lote e PINs; downloads de PDFs e ZIP com PDF/AFD/CSV conferidos com dados isolados.
- [x] Neutralizar marcas públicas e alegações regulatórias no sistema e /conheca, inclusive conteúdo comercial legado, preservando identificadores de impressora.
- [x] Corrigir resposta de carregamento comercial e formulário master; testes de permissão passaram e API sem sessão retorna 401. Gravação autenticada com conta real não verificável no Supabase externo deste ambiente.
- [x] Adicionar primeiros passos dispensáveis por conta; três acessos e persistência do ocultar conferidos.
- [x] Ajustar toque mínimo 44px, tabelas, filtros e viewport dinâmico; cinco telas conferidas em computador, tablet e celular. Corrigidos botão cortado no celular e sobreposição lateral no tablet. Teclado virtual físico e impressora não testados; viewport reduzido com campo focado conferido.

- [x] Corrigir a folha PDF no gerador compartilhado por downloads, portal e ZIP; downloads individual, lote, portal e link conferidos com dados isolados (ZIP e conta real não verificados).
- [x] Revisar os demais PDFs com tabelas alinhadas, quebras seguras e conferência visual de folha, PINs, manual, dashboard, atestado e cupom, sem publicar.
- [x] Fazer Imprimir da Folha MTE abrir exclusivamente o espelho A4 completo, isolado do cupom térmico de 58 mm; teste de isolamento passou e A4 conferido visualmente (impressora física não verificada).

- [x] Unificar Sobre global e logo com gravação protegida e leitura compartilhada; testes de permissões e leitura passaram (gravação com conta master real não disponível no ambiente).
- [x] Criar /conheca e convite discreto no login, preservando sistema raiz.
- [x] Configurar metadados, sitemap e robots; validar somente em preview, sem publicação.

- [x] Neutralizar identificação do cupom 58 mm, preservando campos e impressão.
- [x] Organizar ações da folha e criar Pacote do Contador ZIP (PDFs, AFD e CSV).
- [x] Aplicar Escala > Padrão e remover atrasos das ocorrências da folha/PDF.
- [x] Corrigir grafia Ponto Pro Gestão e validar com dados isolados em preview sem publicação (conta real e impressora física não verificadas).

- [x] Aplicar nome Ponto Pro Gestão e logo anexada às telas, documentos e ícones, preservando dados e validando somente em preview.

- [x] Criar links mensais temporários e exclusivos para a folha do colaborador.
- [x] Disponibilizar visualização isolada e download do PDF oficial no celular.
- [x] Permitir compartilhar o link por e-mail enquanto o envio automático aguarda domínio próprio.
- [x] Compactar o teclado do kiosk para telas de baixa altura sem alterar as batidas.
- [x] Adicionar rótulos acessíveis e foco visível ao visualizador de senha e aos controles do kiosk.
- [x] Simplificar e completar o Dashboard de Frequência sem repetir indicadores.
- [x] Validar navegação por teclado, leitura dos rótulos e apresentação do dashboard.
- [x] Compactar as batidas do dia no kiosk em quatro marcações e ações rápidas, sem rolagem.
- [x] Atualizar o comprovante térmico com endereço, SHA-256, QR compacto e avanço seguro para corte.
- [x] Licenças: trial 7 dias, tolerância 7 dias, bloqueio seguro, planos 1-3 empresas, 20 colaboradores.
- [x] Termos de Uso com aceite registrado, tela de Assinatura PIX e painel do desenvolvedor.
- [x] Login: autenticar no Supabase antes de qualquer verificação de plano, sem bloqueio indevido.
- [x] Criar conta: remover a trava de limite de empresas do aparelho, inclusive para o e-mail do desenvolvedor.
- [x] Enviar por e-mail o mesmo texto exibido no comprovante impresso da última marcação.
- [x] Aplicar o visual Enterprise Dark em Planos, Gestor e Quiosque, com cards PIX e métricas destacadas.
- [x] Reorganizar o Gestor em uma central clara com módulos por cards e Dashboard integrado.
- [x] Dividir o quiosque amplo entre informações à esquerda e registro à direita, preservando o celular compacto.
- [x] Padronizar todas as impressões e PDFs com cabeçalho da empresa e rodapé institucional completo.
- [x] Adicionar confirmação para marcações repetidas em menos de 2 minutos.
- [x] Compactar o comprovante térmico de 58 mm sem QR Code e sem tipo de marcação.
- [x] Exibir no quiosque somente os horários cronológicos do dia.
- [x] Zerar margens e condensar a impressão térmica web, SUNMI e RawBT.
- [x] Unificar batidas manuais e ocorrências em uma Gestão de Batidas diária consolidada.
- [x] Corrigir ícones e manifesto PWA com margem segura para a splash do Android.
- [x] Resumo geral do Banco de Horas com filtros, impressão e CSV.
- [x] Mover batidas do REP; editar/excluir batidas manuais e ocorrências com auditoria.
- [x] Folha/PDF com ocorrências enxutas e quadro de Tratamentos e Justificativas.
- [x] Estética VIP: exportações sob demanda (PDF/Excel/ZIP), janela inicial de batidas do mês corrente com histórico sob demanda, vibração e botão "Registrando..." no quiosque, modais em gaveta inferior no celular, cards de colaboradores no celular.
- [x] Planos e limites dinâmicos (app_config 'planos'): painel /admin edita nome, preços, limites e status; app do cliente lê os limites do plano ativo com fallback 10/25/50.
- [x] Ícones PWA regenerados a partir da logo oficial (192/512/apple-touch/favicon, versionados e simples).
- [x] Modo Suporte virou pílula compacta fixa no rodapé, liberando topo, gaveta e quiosque.
- [x] Falta injustificada sem débito no banco (só desconto salarial); banco debita apenas Folga Compensatória e carga incompleta.
- [x] Atrasos removidos da folha e do banco; permanecem só no Dashboard gerencial.
- [x] Lançamento unificado das 4 batidas (Entrada, Saída/Retorno Intervalo, Saída) no Tratamento e na batida manual
