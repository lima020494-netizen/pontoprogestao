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
        const intervaloPrevisto = previsto <= 0 ? 0 : preAssinalado
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

    function resumir(linhas) {
      const previstas = linhas.filter(l => l.previsto > 0);
      const presentes = previstas.filter(l => l.bs.some(b => b.tipo === 'Entrada'));
      const concluidas = presentes.filter(l => l.status === 'concluido');
      const pontuais = presentes.filter(l => l.atrasoMin === 0);
      return { previstos: previstas.length, presentes: presentes.length, concluidos: concluidas.length,
        presenca: previstas.length ? Math.round(presentes.length / previstas.length * 100) : 0,
        conclusao: previstas.length ? Math.round(concluidas.length / previstas.length * 100) : 0,
        pontualidade: presentes.length ? Math.round(pontuais.length / presentes.length * 100) : 0 };
    }

    function setores(painel) {
      const grupos = new Map();
      for (const l of painel.linhas) {
        const nome = l.f.departamento || 'Sem setor', unidade = l.f.unidade || '';
        const chave = unidade ? unidade + ' · ' + nome : nome;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(l);
      }
      return [...grupos].map(([nome, linhas]) => ({ nome, ...resumir(linhas) }));
    }

    function acompanhar(painel, { busca = '', status = 'todos', pagina = 1, limite = 20 } = {}) {
      const normalizar = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const termo = normalizar(busca);
      const filtradas = painel.linhas.filter(l => {
        const categoria = status === 'todos' || (status === 'trabalhando' ? ['trabalhando', 'alerta', 'extra'].includes(l.status) && l.bs[l.bs.length - 1]?.tipo !== 'Saída Intervalo'
          : status === 'extra' ? l.extraMin > 0 || l.status === 'extra'
          : status === 'intervalo' ? l.bs.some(b => b.tipo === 'Saída Intervalo') && !l.bs.some(b => b.tipo === 'Entrada Intervalo') && l.status !== 'concluido'
          : status === 'ausentes' ? l.status === 'ausente' : status === 'encerrados' ? l.status === 'concluido' : l.status === status);
        return categoria && normalizar(l.f.nome + ' ' + l.f.pin).includes(termo);
      });
      const tamanho = Number(limite) === 15 ? 15 : 20;
      const paginas = Math.max(1, Math.ceil(filtradas.length / tamanho));
      const atual = Math.min(paginas, Math.max(1, Number(pagina) || 1));
      return { linhas: filtradas.slice((atual - 1) * tamanho, atual * tamanho), total: filtradas.length, paginas, pagina: atual, limite: tamanho };
    }

    function tendencia(agora, modo = 'mes', diarios = null) {
      const personalizado = !!modo && typeof modo === 'object';
      const hoje = S.isoOf(agora), emp = S.get('empregador', {}) || {}, fs = S.get('funcionarios', []) || [];
      const pontos = [];
      const ranking = new Map();
      const primeiro = personalizado ? modo.inicio : modo === 'hoje' ? hoje : hoje.slice(0, 8) + '01';
      const ultimo = personalizado && modo.fim < hoje ? modo.fim : hoje;
      for (let data = primeiro; data <= ultimo; data = S.addDias(data, 1)) {
        const linhas = [], existente = personalizado && diarios?.find(d => d.data === data);
        if (existente) {
          for (const l of existente.linhas) {
            if (!l.previsto) continue;
            const r = ranking.get(l.f.pin) || { f: l.f, previstos: 0, presentes: 0 };
            r.previstos++; if (l.bs.some(b => b.tipo === 'Entrada')) r.presentes++;
            ranking.set(l.f.pin, r); linhas.push(l);
          }
        } else for (const f of fs) {
          if ((f.admissao && f.admissao > data) || (f.dataDesligamento && f.dataDesligamento < data)) continue;
          const previsto = S.previstoDia(f, data);
          if (!previsto) continue;
          const bs = S.batidasDia(f.pin, data), item = S.buscaNaEscala(f.pin, data);
          const inicio = item?.horarioEntrada || (S.dow(data) === 6 ? emp.hSabEntrada : '') || emp.hEntrada || '08:00';
          const entrada = bs.find(b => b.tipo === 'Entrada');
          const r = ranking.get(f.pin) || { f, previstos: 0, presentes: 0 };
          r.previstos++; if (entrada) r.presentes++;
          ranking.set(f.pin, r);
          const tolerancia = Number.isFinite(Number(emp.toleranciaAtraso)) ? Number(emp.toleranciaAtraso) : 10;
          let atraso = entrada ? S.toMin(entrada.hora) - S.toMin(inicio) : 0;
          if (atraso < -720) atraso += 1440;
          else if (atraso > 720) atraso -= 1440;
          linhas.push({ previsto, bs, atrasoMin: Math.max(0, atraso - tolerancia), status: bs.some(b => b.tipo === 'Saída') ? 'concluido' : '' });
        }
        if (modo === 'hoje') {
          const horaAtual = Math.floor(S.toMin(S.hhmm(agora)) / 60);
          for (let hora = 0; hora <= horaAtual; hora++) {
            const parciais = linhas.map(l => ({ ...l, bs: l.bs.filter(b => S.toMin(b.hora) <= hora * 60 + 59) }));
            pontos.push({ data, rotulo: String(hora).padStart(2, '0') + 'h', ...resumir(parciais) });
          }
        } else pontos.push({ data, rotulo: data.slice(8), ...resumir(linhas) });
      }
      pontos.ranking = [...ranking.values()].map(r => ({ ...r, presenca: Math.round(r.presentes / r.previstos * 100) }))
        .sort((a, b) => b.presenca - a.presenca || String(a.f.nome).localeCompare(String(b.f.nome)));
      return pontos;
    }

    return { CATEGORIAS, calcularPainelDia: calcular, filtrarPainelDia: filtrar,
      resumirPainelDia: resumir, setoresPainelDia: setores, acompanharPainelDia: acompanhar, tendenciaPainelDia: tendencia };
  }

  namespace.definir('domain.painelDia', Object.freeze({ criar }));
})(window.PontoProOperacional);
