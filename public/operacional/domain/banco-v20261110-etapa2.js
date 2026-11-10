/* Etapa 2: trabalho apurado, banco, folha, resumo e pendências. */
(function (namespace) {
  'use strict';

  function criar(S) {
    function batidasDia(pin, iso) { return S.batidasJornada(pin, iso); }
    /* Pares de batidas (máx. 4: Entrada | Intervalo Saída | Intervalo Volta | Saída) */
    function paresBatidas(bs) {
      const g = tp => bs.filter(b => b.tipo === tp)[0];
      const e1 = g('Entrada'), s1 = g('Saída Intervalo'), e2 = g('Entrada Intervalo'), s2 = g('Saída');
      if (e1 && s1 && e2 && s2) return [[e1.hora, s1.hora], [e2.hora, s2.hora]];
      const fim = s2 || s1; return e1 && fim ? [[e1.hora, fim.hora]] : [];
    }
    const difMin = (a, b) => { let d = S.toMin(b) - S.toMin(a); if (d < 0) d += 1440; return d; }; // virada noturna
    function minutosTrabalhados(bs, f) {
      const pares = S.paresBatidas(bs);
      let t = pares.reduce((s, [a, b]) => s + S.difMin(a, b), 0);
      // Intervalo pré-assinalado (Art. 71 CLT): (Saída − Entrada) − intervalo, sem alerta de falta de intervalo
      const iv = f && f.intervalo;
      if (iv && iv.preAssinalado && pares.length === 1 && t > 0) t = Math.max(0, t - S.difMin(iv.inicio || '12:00', iv.fim || '13:00'));
      return t;
    }
    /* Hora noturna reduzida (Art. 73 CLT): 22h–05h, hora de 52m30s (×1,142857) */
    function calculaNoturna(bs, horaFim) {
      let min = 0;
      (typeof bs === 'string' ? [[bs, horaFim]] : S.paresBatidas(bs)).forEach(([a, b]) => { let s = S.toMin(a), e = S.toMin(b); if (e < s) e += 1440; for (let m = s; m < e; m++) { const h = m % 1440; if (h >= 1320 || h < 300) min++; } });
      const reduzida = Math.round(min * 1.142857);
      return { min, reduzida, adicional: reduzida - min };
    }
    const trabalhadoDia = (f, bs) => S.minutosTrabalhados(bs, f) + S.calculaNoturna(bs).adicional;
    function trabalhoApuradoDia(f, data, bs) { return S.regraOcorrencia(S.ocorrenciaDia(f.pin, data)?.tipo).externo ? Math.max(440, S.trabalhadoDia(f, bs)) : S.trabalhadoDia(f, bs); }
    function descontoDsrDia(pin, data, prev) {
      if (prev !== 0) return 0;
      const f = S.funcPorPin(pin) || {}, diaEscala = S.buscaNaEscala(pin, data), e = S.get('empregador', {}) || {}, dsr = diaEscala ? /DSR|DOMINGO/i.test(diaEscala.tipo) : S.dow(data) === 0 && (e.dsr === 'Sim' || f.escala === '6x1');
      if (!dsr) return 0;
      const ini = S.addDias(data, -6); return (S.get('ocorrencias', []) || []).some(o => o.pin === pin && o.data >= ini && o.data <= data && S.regraOcorrencia(o.tipo).suspensao) ? S.cargaEscala(f.escala) : 0;
    }
    /* Atraso de entrada: métrica operacional exclusiva do Dashboard. Nunca debita banco nem aparece na folha. */
    function atrasoDia(pin, data, bs, prev) {
      if (!(prev > 0) || !bs.length) return 0;
      const ent = bs.filter(b => b.tipo === 'Entrada')[0]; if (!ent) return 0;
      const inicio = S.horarioEscala(pin, data) || (S.get('empregador', {}) || {}).hEntrada || '08:00';
      let at = S.toMin(ent.hora) - S.toMin(inicio); if (at < -720) at += 1440; else if (at > 720) at -= 1440;
      return at > 10 ? at : 0;
    }
    function movimentoBancoDia(pin, data, prev, trab, atraso = 0) {
      const oc = S.ocorrenciaDia(pin, data), regra = S.regraOcorrencia(oc?.tipo), e = S.get('empregador', {}) || {};
      const fator = Number(e.fatorBancoDomFeriado) === 1 ? 1 : 2, multiplica = trab > 0 && (!!S.feriadoDe(data) || S.dow(data) === 0);
      // Falta injustificada: desconto salarial na folha/holerite, saldo neutro no banco.
      const falta = regra.falta || (trab === 0 && prev > 0 && !oc?.tipo);
      const credito = (multiplica ? Math.round(trab * fator) : trab) - prev;
      // O banco só debita saída antecipada/expediente parcial não abonado — nunca atraso de entrada.
      const deficit = Math.max(0, prev - trab - Math.min(atraso, Math.max(0, prev - trab)));
      const saldo = regra.abonado ? Math.max(0, credito) : regra.compensacao ? -440 : regra.externo ? 0 : falta ? 0 : (credito > 0 ? credito : -deficit);
      const faltantes = regra.compensacao || regra.abonado || regra.externo ? 0 : falta ? prev : deficit;
      return { ...regra, saldo: saldo || 0, faltantes };
    }
    /* Linhas da folha + totais + banco de horas */
    function dadosFolha(pin, ini, fim) {
      const f = S.funcPorPin(pin) || {}; const linhas = [];
      let tot = { faltas: 0, faltasJust: 0, faltasInj: 0, folgas: 0, feriados: 0, extras: 0, extras50: 0, extras100: 0, faltantes: 0, trabalhado: 0, atrasos: 0 };
      const just = [];
      for (let d = ini; d <= fim; d = S.addDias(d, 1)) {
        const bs = S.batidasDia(pin, d), prev = S.previstoDia(f, d), trab = S.trabalhoApuradoDia(f, d, bs), noct = S.calculaNoturna(bs);
        const atrasoMin = S.atrasoDia(pin, d, bs, prev); // só Dashboard; folha e banco não exibem nem debitam atraso
        const movimento = S.movimentoBancoDia(pin, d, prev, trab, atrasoMin);
        const fer = S.feriadoDe(d), folga = S.folgaEscala(pin, d);
        let oc = '', cls = '';
        const por = b => b ? (b.hora) : '';
        const g = tp => bs.filter(b => b.tipo === tp)[0];
        if (f.status === 'Desligado' && d > f.dataDesligamento) { oc = 'DESLIGADO'; cls = 't-deslig'; }
        else if (f.status === 'Férias' && d >= f.feriasIni && d <= f.feriasFim) { oc = 'FÉRIAS'; cls = 't-ferias'; }
        else if (f.status === 'Afastamento' && d >= f.afastDe && d <= f.afastAte) { oc = 'AFASTAMENTO'; cls = 't-afast'; just.push(`${S.brOf(d)} - AFASTAMENTO - ${(f.motivoAfast || '').toUpperCase()}`); }
        else if (folga) { oc = folga.tipo.toUpperCase(); cls = 't-folga'; tot.folgas++; }
        else if (fer) { oc = 'FERIADO'; cls = 't-feriado'; tot.feriados++; just.push(`${S.brOf(d)} - FERIADO - ${fer.nome}`); }
        const ocorr = S.ocorrenciaDia(pin, d);
        if (ocorr) {
          oc = movimento.etiqueta;
          if (ocorr.motivo) { const periodo = ocorr.periodoId ? `${S.brOf(ocorr.inicio)} a ${S.brOf(ocorr.fim)}` : S.brOf(d), nota = `${periodo} - ${ocorr.tipo.toUpperCase()} - ${ocorr.motivo}${ocorr.autorizadoPor ? ' - Autorizado por: ' + ocorr.autorizadoPor : ''}`; if (!just.includes(nota)) just.push(nota); }
          cls = movimento.afastado ? 't-afast' : ocorr.tipo === 'Falta' || movimento.suspensao ? 't-falta' : 't-folga';
          if (ocorr.tipo === 'Falta' || movimento.suspensao) { tot.faltas++; tot.faltasInj++; }
          else tot.folgas++;
        }
        if (!bs.length && prev > 0 && (!oc || oc === 'FERIADO')) { oc = 'FALTA'; cls = 't-falta'; tot.faltas++; tot.faltasInj++; }
        if (!oc && !bs.length && prev === 0) { oc = 'FOLGA'; cls = 't-folga'; tot.folgas++; }
        if (atrasoMin > 0) tot.atrasos++;
        if (bs.length || movimento.externo) {
          tot.trabalhado += trab;
          if (prev > 0) { if (trab > prev) { tot.extras += trab - prev; tot.extras50 += trab - prev; } }
          else { tot.extras += trab; tot.extras100 += trab; } // trabalho em folga/feriado credita
        }
        tot.faltantes += movimento.faltantes;
        const mov = bs.filter(b => b.movimento).map(b => `_${b.hora} ${b.movimento}`).join(' | ');
        bs.filter(b => b.movimento).forEach(b => just.push(`${S.brOf(d)} ${b.hora} - ${b.movimento}`));
        linhas.push({ data: d, dia: S.DIAS[S.dow(d)], e1: por(g('Entrada')), e2: por(g('Saída Intervalo')), e3: por(g('Entrada Intervalo')), e4: por(g('Saída')),
          noturno: noct.min, trabalhado: trab, previsto: prev, saldo: d < (f.inicioVigenciaBancoHoras || f.bancoInicio || f.admissao || ini) ? 0 : movimento.saldo,
          descontoDia: movimento.suspensao ? prev : 0, descontoDsr: S.descontoDsrDia(pin, d, prev),
          atrasoMin, ocorrencia: oc || (f.intervalo?.preAssinalado ? 'INTERVALO PRÉ-ASSINALADO ART. 71' : ''), cls, fonte: bs[0] ? bs[0].fonte : '—', mov, nsr: bs.map(b => b.nsr).join(' / ') });
      }
      linhas.filter(l => l.descontoDia || l.descontoDsr).forEach(l => just.push(`${S.brOf(l.data)} - Suspensão: desconto dia ${S.toHHMM(l.descontoDia)}, DSR ${S.toHHMM(l.descontoDsr)} (minutos para fechamento; não cálculo salarial).`));
      const banco = S.calcBanco(pin, ini, fim);
      return { f, ini, fim, linhas, tot, just, banco };
    }
    function resumoMensalFolha(d) {
      return [
        ['Horas Previstas no Mês', S.toHHMM(d.linhas.reduce((n, l) => n + l.previsto, 0))],
        ['Horas Efetivamente Trabalhadas', S.toHHMM(d.tot.trabalhado)],
        ['Total de Horas Extras', S.toHHMM(d.tot.extras)],
        ['Total de Faltas / Horas Faltantes', `${d.tot.faltas} falta(s) / ${S.toHHMM(d.tot.faltantes)}`],
        ['Adicional Noturno do Período', S.toHHMM(d.linhas.reduce((n, l) => n + l.noturno, 0))],
        ['Saldo do Mês (Banco de Horas)', S.toSaldo(d.banco.creditos - d.banco.debitos)],
      ];
    }
    function calcBanco(pin, ini, fim) {
      const f = S.funcPorPin(pin) || {};
      const soma = (de, ate) => {
        let cred = 0, deb = 0, det = [], dias = [];
        for (let d = de; d <= ate; d = S.addDias(d, 1)) {
          const bs = S.batidasDia(pin, d), prev = S.previstoDia(f, d), trab = S.trabalhoApuradoDia(f, d, bs);
          const movimento = S.movimentoBancoDia(pin, d, prev, trab, S.atrasoDia(pin, d, bs, prev));
          dias.push({ data: d, previsto: prev, trabalhado: trab, saldo: movimento.saldo, ocorrencia: typeof S.ocorrenciaDia === 'function' ? S.ocorrenciaDia(pin, d)?.tipo || '' : '', vigente: true });
          if (movimento.saldo > 0) { cred += movimento.saldo; det.push(`Crédito - Hora Extra dia ${S.brOf(d)} - Previsto ${S.toHHMM(prev)} / Realizado ${S.toHHMM(trab)} / Banco ${S.toHHMM(movimento.saldo)}`); }
          else if (movimento.saldo < 0) { deb -= movimento.saldo; det.push(`${movimento.compensacao ? 'Débito - Folga Compensatória' : 'Débito - Carga incompleta'} dia ${S.brOf(d)} - ${S.toHHMM(-movimento.saldo)}`); }
        }
        // Descanso cadastrado não prova compensação; crédito não representa remuneração salarial.
        return { cred, deb, det, dias };
      };
      const vig = f.inicioVigenciaBancoHoras || f.bancoInicio || f.admissao || ini;
      const ant = vig < ini ? soma(vig, S.addDias(ini, -1)) : { cred: 0, deb: 0, det: [] };
      const per = vig > fim ? { cred: 0, deb: 0, det: [`Banco de horas vigente a partir de ${S.brOf(vig)}`] } : soma(vig > ini ? vig : ini, fim);
      const anterior = ant.cred - ant.deb;
      const dias = [];
      for (let d = ini; d <= fim && d < vig; d = S.addDias(d, 1)) { const bs = S.batidasDia(pin, d); dias.push({ data: d, previsto: S.previstoDia(f, d), trabalhado: S.trabalhoApuradoDia(f, d, bs), saldo: 0, ocorrencia: typeof S.ocorrenciaDia === 'function' ? S.ocorrenciaDia(pin, d)?.tipo || '' : '', vigente: false }); }
      dias.push(...(per.dias || []));
      return { anterior, creditos: per.cred, debitos: per.deb, atual: anterior + per.cred - per.deb, detalhes: per.det, dias, vigencia: vig };
    }
    function classificacaoTratamento(l, oc, bs, hoje) {
      const r = S.regraOcorrencia(oc?.tipo), passado = l.data < hoje;
      const solicitacao = oc?.status === 'pendente';
      const impar = bs.length % 2 === 1, erro = bs.length > 4;
      const falta = passado && l.previsto > 0 && !bs.length && (!oc || r.falta);
      const parcial = passado && l.previsto > 0 && l.trabalhado < l.previsto && !r.abonado && !r.compensacao && !r.externo && !falta;
      const intervalo = passado && l.previsto > 360 && bs.length === 2 && !r.abonado && !r.compensacao && !r.externo;
      const pendente = solicitacao || erro || falta || (passado && (impar || intervalo || parcial));
      if (erro) return { cor: 'red', titulo: 'Revisar marcações', pendente, falta, impar, solicitacao };
      if (solicitacao) return { cor: 'blue', titulo: 'Solicitação pendente', pendente, falta, impar, solicitacao };
      if (falta) return { cor: 'red', titulo: 'Falta não tratada', pendente, falta, impar, solicitacao };
      if (impar) return { cor: 'orange', titulo: passado ? 'Batidas ímpares' : 'Jornada em andamento', pendente, falta, impar, solicitacao };
      if (intervalo) return { cor: 'orange', titulo: 'Intervalo não registrado', pendente, falta, impar, solicitacao };
      if (parcial) return { cor: 'orange', titulo: 'Revisar jornada', pendente, falta, impar, solicitacao };
      if (r.abonado) return { cor: 'blue', titulo: oc.tipo, pendente, falta, impar, solicitacao };
      if (l.trabalhado > 0 && l.previsto === 0) return { cor: 'purple', titulo: 'Trabalho em descanso / feriado', pendente, falta, impar, solicitacao };
      return { cor: 'green', titulo: oc?.tipo || (l.previsto === 0 ? 'Descanso' : 'Concluído'), pendente, falta, impar, solicitacao };
    }

    return { batidasDia, paresBatidas, difMin, minutosTrabalhados, calculaNoturna, trabalhadoDia, trabalhoApuradoDia, descontoDsrDia, atrasoDia, movimentoBancoDia, dadosFolha, resumoMensalFolha, calcBanco, classificacaoTratamento };
  }

  namespace.definir('domain.banco', Object.freeze({ criar }));
})(window.PontoProOperacional);
