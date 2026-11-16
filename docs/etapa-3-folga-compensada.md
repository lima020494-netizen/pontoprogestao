# Etapa 3 — Folga Compensada na Escala

## Entrega
- Ao alternar N → F, o gestor informa motivo de pelo menos cinco caracteres; cancelamento não grava. A autoria vem do gestor logado, não do campo editável. O menu da célula permite rever o motivo e o seletor semanal usa o mesmo fluxo. Importação de folgas pede autorização/motivo antes de salvar.
- O registro da escala captura carga nominal, motivo, autorizador e instante. A apuração compartilhada deriva um único débito, sem lançamento duplicado de ocorrência ou batida. A previsão de trabalho permanece zero. Vigência do banco é respeitada; mudar para DSR remove o débito derivado.
- Folgas antigas sem autorização explícita permanecem neutras. Abonos, férias e faltas existentes mantêm suas regras; compensação duplicada não gera dois débitos.
- Sem batidas nem solicitação realmente pendente, o dia sai do inbox; histórico mostra Folga Compensatória (Escala), abatimento, motivo e autoria. Anomalias reais de marcação continuam revisáveis.
- Escala e histórico de escala usam uma outbox IndexedDB por conta no armazenamento existente, com fallback local imediato; falha de envio conserva o snapshot e bloqueia sua substituição por leitura antiga. Reconexão envia antes da leitura. A fila fiscal de batidas não foi alterada.

## Validação
- 260 testes em 37 arquivos aprovados, incluindo dez cenários novos de motivo, gestor, cargas 06:00/07:20/08:00/12:00, idempotência, descansos legados, inbox, exceções reais, troca para DSR, vigência, salvamento e falha/reconexão por conta.
- Linha de base de consumo continua 7/5/7 consultas; nenhum polling adicionado. Suíte de fila, virada noturna, NSR, formatos fiscais e relatórios passou.
- Navegador com empresa fictícia: quatro caracteres rejeitados, motivo válido e autoria gravados, chip F, débito nominal 08:00 para 5x2, histórico sem pendência artificial e snapshot IndexedDB; sem erros de execução.
- Prévia compilada sem erros. Nenhum dado real acessado/alterado; nenhuma publicação.

## Limites e próxima etapa
Supabase externo autenticado e impressão física não verificados; envio/falha/reconexão validados com serviço simulado. Etapa 4 (acesso direto de gestor sem PIN) aguarda autorização e não foi implementada.