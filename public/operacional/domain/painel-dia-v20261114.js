/* Painel do Dia: leitura operacional da jornada atual, sem folha mensal, rede ou escrita. */
(function (namespace) {
  'use strict';

  function criar(S) {
    const CATEGORIAS = Object.freeze(['trabalhando', 'intervalo', 'alerta', 'ausentes', 'encerrados']);
    const ROTULOS = Object.freeze({
      trabalhando: 'Trabalhando', intervalo: 'Em intervalo', alerta: 'Alerta de intervalo',
      ausente: 'Não compareceu', aguardando: 'Aguardando entrada', extra: 'Horas extras em curso',
      concluido: 'Jornada encerrada', descanso: 'Folga / DSR', ocorrencia: 'Ocorrência',
    });

    function calcular(agora) {
      const hoje = S.isoOf(agora), minutoAgora = S.toMin(S.hhmm(agora));
      const empregador = S.get('empregador', {}) || {};
      const tolerancia = Number.isFinite(Number(empregador.toleranciaAtraso)) ? Number(empregador.toleranciaAtraso) : 10;
      const linhas = [];

      for (const f of S.get('funcionarios', []) || []) {
        let data = hoje;
        if (minutoAgora < 360) {
          const ontem = S.addDias(hoje, -1), anteriores = S.batidasDia(f.pin, ontem);
          const inicioHoje = S.horarioEscala(f.pin, hoje), max = f.intervalo?.preAssinalado ? 2 : 4;
          const aberta = anteriores.length > 0 && anteriores.length < max && !anteriores.some(b => b.tipo === 'Saída');
          if (aberta && !(inicioHoje && S.toMin(inicioHoje) < 360)) data = ontem;
        }
        if ((f.admissao && data < f.admissao) || (f.status === 'Desligado' && f.dataDesligamento && data > f.dataDesligamento)) continue;

        const bs = S.batidasDia(f.pin, data), oc = S.ocorrenciaDia(f.pin, data), previsto = S.previstoDia(f, data);
        const item = S.buscaNaEscala(f.pin, data), sabado = S.dow(data) === 6;
        const inicio = item?.horarioEntrada || (sabado ? empregador.hSabEntrada : '') || empregador.hEntrada || '08:00';
        const saida = item?.horarioSaida || (sabado ? empregador.hSabSaida : '') || empregador.hSaida || '';
        const entrada = bs.find(b => b.tipo === 'Entrada'), saidaIntervalo = bs.find(b => b.tipo === 'Saída Intervalo');
        const retornoIntervalo = bs.find(b => b.tipo === 'Entrada Intervalo');
        const preAssinalado = !!f.intervalo?.preAssinalado;
        const finalizado = bs.some(b => b.tipo === 'Saída') || (preAssinalado && bs.length >= 2);
        const agoraAbs = minutoAgora + (data < hoje ? 1440 : 0), inicioAbs = S.toMin(inicio);
        let saidaAbs = saida ? S.toMin(saida) : null;
        if (saidaAbs !== null && saidaAbs < inicioAbs) saidaAbs += 1440;
        const desde = hora => {
          let minutos = agoraAbs - S.toMin(hora);
          if (minutos < 0) minutos += 1440;
          return minutos;
        };
        let decorrido = 0;
        if (finalizado) decorrido = S.minutosTrabalhados(bs, f);
        else {
          if (entrada && saidaIntervalo) decorrido += S.difMin(entrada.hora, saidaIntervalo.hora);
          const ultima = bs[bs.length - 1];
          if (ultima && (ultima.tipo === 'Entrada' || ultima.tipo === 'Entrada Intervalo')) decorrido += desde(ultima.hora);
        }
        const intervaloPrevisto = preAssinalado
          ? S.difMin(f.intervalo?.inicio || '12:00', f.intervalo?.fim || '13:00')
          : empregador.hSaiInt && empregador.hEntInt
            ? S.difMin(empregador.hSaiInt, empregador.hEntInt)
            : previsto > 360 ? 60 : previsto > 240 ? 15 : 0;
        const intervaloRealizado = saidaIntervalo
          ? retornoIntervalo ? S.difMin(saidaIntervalo.hora, retornoIntervalo.hora) : finalizado ? 0 : desde(saidaIntervalo.hora)
          : 0;

        let motivoAlerta = '';
        if (!preAssinalado && !finalizado && entrada) {
          if (!saidaIntervalo) {
            const ultima = bs[bs.length - 1], continuo = ultima && (ultima.tipo === 'Entrada' || ultima.tipo === 'Entrada Intervalo') ? desde(ultima.hora) : 0;
            const limite = previsto > 360 ? 360 : previsto > 240 ? 240 : Infinity;
            if (continuo > limite) motivoAlerta = limite === 360 ? 'Mais de 6h sem intervalo registrado' : 'Mais de 4h sem intervalo registrado';
            if (!motivoAlerta && empregador.hSaiInt && empregador.hEntInt) {
              let iniInt = S.toMin(empregador.hSaiInt), fimInt = S.toMin(empregador.hEntInt);
              if (fimInt < iniInt) fimInt += 1440;
              if (iniInt < inicioAbs) { iniInt += 1440; fimInt += 1440; }
              if (agoraAbs > fimInt && agoraAbs >= iniInt) motivoAlerta = 'Janela prevista de intervalo ultrapassada';
            }
          } else if (!retornoIntervalo && intervaloRealizado > intervaloPrevisto) {
            motivoAlerta = 'Retorno do intervalo além do tempo previsto';
          }
        }
        const extraEmCurso = !finalizado && !!entrada && previsto > 0 && saidaAbs !== null && agoraAbs > saidaAbs && agoraAbs >= inicioAbs;
        const ausente = !bs.length && !oc && previsto > 0 && data === hoje && agoraAbs > inicioAbs + tolerancia;
        let status;
        if (finalizado) status = 'concluido';
        else if (motivoAlerta) status = 'alerta';
        else if (bs.length && saidaIntervalo && !retornoIntervalo) status = 'intervalo';
        else if (extraEmCurso) status = 'extra';
        else if (bs.length) status = 'trabalhando';
        else if (oc) status = 'ocorrencia';
        else if (previsto === 0) status = 'descanso';
        else if (ausente) status = 'ausente';
        else status = 'aguardando';
        const atrasoMin = entrada ? Math.max(0, S.toMin(entrada.hora) - inicioAbs - tolerancia) : 0;
        const extraMin = finalizado ? Math.max(0, decorrido - previsto) : extraEmCurso ? Math.max(0, agoraAbs - saidaAbs) : 0;

        linhas.push({
          f, data, bs, oc, previsto, inicio, saida, status, titulo: status === 'ocorrencia' ? oc.tipo : ROTULOS[status],
          decorrido, intervaloPrevisto, intervaloRealizado, motivoAlerta, atrasoMin, extraMin,
          finalizadoOuExtra: status === 'concluido' || status === 'extra',
        });
      }

      const prioridade = { alerta: 0, ausente: 1, extra: 2, intervalo: 3, trabalhando: 4, aguardando: 5, concluido: 6, ocorrencia: 7, descanso: 8 };
      linhas.sort((a, b) => prioridade[a.status] - prioridade[b.status] || String(a.f.nome).localeCompare(String(b.f.nome), 'pt-BR'));
      const contadores = {
        trabalhando: linhas.filter(l => l.status === 'trabalhando').length,
        intervalo: linhas.filter(l => l.status === 'intervalo').length,
        alerta: linhas.filter(l => l.status === 'alerta').length,
        ausentes: linhas.filter(l => l.status === 'ausente').length,
        encerrados: linhas.filter(l => l.finalizadoOuExtra).length,
        extras: linhas.filter(l => l.status === 'extra' || l.extraMin > 0).length,
      };
      return { data: hoje, linhas, contadores };
    }

    function filtrar(painel, categoria) {
      if (!categoria || categoria === 'todos') return painel.linhas;
      if (!CATEGORIAS.includes(categoria)) return [];
      if (categoria === 'encerrados') return painel.linhas.filter(l => l.finalizadoOuExtra);
      const status = categoria === 'ausentes' ? 'ausente' : categoria;
      return painel.linhas.filter(l => l.status === status);
    }

    return { CATEGORIAS, calcularPainelDia: calcular, filtrarPainelDia: filtrar };
  }

  namespace.definir('domain.painelDia', Object.freeze({ criar }));
})(window.PontoProOperacional);
