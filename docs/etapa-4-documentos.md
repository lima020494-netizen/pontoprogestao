# Etapa 4 — Documentos compartilhados

Somente preview, sem publicação ou alteração de dados reais.

## Extração

Cinco arquivos locais/versionados em `public/operacional/reports`: documentos (cabeçalho/AutoTable), folha (tela/PDF), fiscal (XML/AFD/AEJ/atestado), exportações (extratos/planilhas/ZIP) e núcleo. O shell mantém os handlers globais e injeta as dependências atuais. Domínio, dados e autenticação não foram reescritos. Bibliotecas permanecem sob demanda; o service worker inclui os novos arquivos, nunca APIs/dados.

## Comparação e validação

- Suíte completa: **228 testes em 34 arquivos aprovados**, incluindo cálculos de referência, fila offline, histórico, banco, folha, NSR e datas civis fiscais.
- Consumo simulado mantém **7/5/7 consultas** na primeira carga/cache/recarga forçada; auditoria em 50 e retentativa exclusiva de batidas preservadas.
- Navegador com empresa fictícia e PIN: gerados PDF mensal, extrato individual, manual, PINs, cupom, atestado, XML, AFD, AEJ e ZIP. Folha e extrato renderizados e conferidos visualmente.
- XML bem-formado; AFD/AEJ contêm quatro marcações do cenário. ZIP contém folha PDF, AFD, resumo CSV e XLS analítico BIFF8 (assinatura OLE confirmada).
- Recarga offline manteve uma batida no IndexedDB e disponibilizou os módulos de documentos e a matriz. Reconexão simulada esvaziou a fila; nenhum erro de página.
- Scripts JavaScript válidos; último registro de compilação: **build OK**.

## Solicitação adicional — matriz de escalas Fase 1

Implementada separadamente da extração: colaboradores × dias, períodos semana/mês (preservando 15/30 dias), ciclo M/T/N/F/D, carga por semana e PDF com logo/cabeçalho por semana. Horários existentes continuam editáveis na seção detalhada. M/T/N identificam turnos sem presumir novas durações; previsto vem do domínio atual. F mapeia Folga Compensada, D mapeia DSR. Clique confirma 40:00→32:00 ao folgar um dia, persistência após recarga e apresentação móvel sem overflow da página.

## Limitações e parada

Rede/Supabase foram simulados; autenticação externa real, bytes de egress, impressão física e compartilhamento via WhatsApp não foram testados. PDFs são arquivos prontos para impressão/envio manual. A matriz salva no mesmo caminho de escala existente. Nenhum dado real alterado. Etapas 5–7 aguardam autorização.