# Dados — Etapa 3 concluída em preview

Os módulos versionados `armazenamento`, `indexeddb`, `fila-offline`, `supabase` e `nucleo` concentram o acesso local e à nuvem. O shell mantém o cliente Supabase, a autenticação, o estado da conta e aliases globais delegantes.

A carga inicial continua limitada ao mês corrente e à véspera; o histórico é paginado sob demanda. Empregador e feriados usam cache expirável por conta; batidas e autorização ficam fora desse cache. A fila permanece em IndexedDB versão 2 com reserva local e envio imediato.
