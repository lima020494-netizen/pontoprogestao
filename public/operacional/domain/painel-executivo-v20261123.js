/* Painel executivo: somente apresentação sobre as jornadas diárias já apuradas. */
(function (namespace) {
  'use strict';

  function criar(S) {
    const pct = (parte, total) => total ? Math.round(parte / total * 100) : 0;
    const presente = linha => linha.bs.some(b => b.tipo === 'Entrada');
    const pausa = linha => linha.bs.some(b => b.tipo === 'Saída Intervalo');

    function resumoDia(dia) {
      const previstas = dia.linhas.filter(l => l.previsto > 0);
      return {
        data: dia.data,
        previstos: previstas.length,
        presentes: previstas.filter(presente).length,
        pontuais: previstas.filter(l => presente(l) && l.atrasoMin === 0).length,
        intervalos: previstas.filter(l => presente(l) && pausa(l)).length,
        faltas: previstas.filter(l => l.status === 'ausente').length,
        extras: previstas.filter(l => l.extraMin > 0).length,
        folgas: dia.linhas.filter(l => l.previsto === 0).length,
        extraMin: previstas.reduce((n, l) => n + (l.extraMin || 0), 0),
      };
    }

    function totais(painel) {
      const dias = painel.diarios.map(resumoDia);
      const soma = campo => dias.reduce((n, d) => n + d[campo], 0);
      return {
        dias, previstos: soma('previstos'), presentes: soma('presentes'), pontuais: soma('pontuais'),
        intervalos: soma('intervalos'), faltas: soma('faltas'), extras: soma('extras'),
        folgas: soma('folgas'), extraMin: soma('extraMin'),
      };
    }

    function periodoAnterior(intervalo) {
      const dias = Math.max(1, Math.round((Date.parse(`${intervalo.fim}T00:00:00Z`) - Date.parse(`${intervalo.inicio}T00:00:00Z`)) / 86400000) + 1);
      const fim = S.addDias(intervalo.inicio, -1), inicio = S.addDias(fim, -dias + 1);
      return { inicio, fim, horaInicio: intervalo.horaInicio || '00:00', horaFim: intervalo.horaFim || '23:59' };
    }

    function variacao(atual, anterior) {
      return anterior > 0 ? Math.round((atual - anterior) / anterior * 100) : null;
    }

    function modelo(atual, anterior) {
      const t = totais(atual), a = totais(anterior);
      const definicoes = [
        ['presentes', 'Presentes', 'beach', 'presenças confirmadas'],
        ['pontuais', 'No Horário', 'green', 'dentro da tolerância'],
        ['intervalos', 'Em Intervalo', 'blue', 'pausas registradas'],
        ['faltas', 'Pendências / Faltas', 'red', 'faltas em dias apurados'],
        ['extras', 'Horas Extras / Folgas', 'gold', `${t.folgas} folgas ou DSR · ${S.toHHMM(t.extraMin)} extras`],
      ];
      return {
        totalJornadas: t.previstos,
        totais: t,
        cartoes: definicoes.map(([id, titulo, tom, detalhe]) => ({
          id, titulo, tom, detalhe, valor: t[id], percentual: pct(t[id], t.previstos),
          variacao: variacao(t[id], a[id]), serie: t.dias.map(d => d[id]),
        })),
      };
    }

    function filtrar(painel, categoria) {
      if (!categoria || categoria === 'todos') return painel.linhas;
      if (categoria === 'presentes') return painel.linhas.filter(l => painel.agregado ? l.periodo.presentes > 0 : presente(l));
      if (categoria === 'pontuais') return painel.linhas.filter(l => painel.agregado ? l.periodo.pontuais > 0 : presente(l) && l.atrasoMin === 0);
      if (categoria === 'extras') return painel.linhas.filter(l => painel.agregado ? l.periodo.extras > 0 : l.extraMin > 0);
      if (categoria === 'intervalos') {
        const pins = new Set();
        for (const dia of painel.diarios) for (const linha of dia.linhas) if (presente(linha) && pausa(linha)) pins.add(linha.f.pin);
        return painel.linhas.filter(l => pins.has(l.f.pin));
      }
      return S.filtrarPainelPeriodo(painel, categoria);
    }

    function ranking(painel) {
      return painel.linhas.map(linha => {
        const p = painel.agregado ? linha.periodo : {
          previstos: linha.previsto > 0 ? 1 : 0,
          presentes: linha.previsto > 0 && presente(linha) ? 1 : 0,
          pontuais: linha.previsto > 0 && presente(linha) && linha.atrasoMin === 0 ? 1 : 0,
        };
        return { f: linha.f, presenca: pct(p.presentes, p.previstos), pontualidade: pct(p.pontuais, p.presentes), ...p };
      }).sort((a, b) => b.presenca - a.presenca || b.pontualidade - a.pontualidade || String(a.f.nome).localeCompare(String(b.f.nome), 'pt-BR'));
    }

    function evolucao(agora, painel, intervalo) {
      const pontos = S.tendenciaPainelDia(agora, intervalo, painel.diarios);
      const resumos = new Map(painel.diarios.map(d => [d.data, resumoDia(d)]));
      return pontos.map(p => {
        const d = resumos.get(p.data);
        let extras = d ? d.extras : 0, previstos = d ? d.previstos : 0;
        if (painel.diarios.length === 1 && /h$/.test(p.rotulo) && d) {
          const hora = Number(p.rotulo.slice(0, -1));
          const dia = painel.diarios[0];
          extras = dia.linhas.filter(l => {
            if (l.previsto <= 0 || l.extraMin <= 0) return false;
            const saidaReal = l.bs.find(b => b.tipo === 'Saída');
            const marco = saidaReal ? S.toMin(saidaReal.hora) : S.toMin(l.saida || l.inicio) + 1;
            return hora * 60 + 59 >= marco;
          }).length;
        }
        return { ...p, extras: pct(extras, previstos) };
      });
    }

    function caminhoSuave(valores, largura = 300, altura = 72, maximo = null) {
      const lista = valores.length ? valores : [0];
      const max = Math.max(1, maximo === null ? Math.max(...lista) : maximo);
      const pontos = lista.map((v, i) => ({
        x: lista.length === 1 ? 0 : i * largura / (lista.length - 1),
        y: altura - 4 - Math.max(0, Math.min(max, v)) / max * (altura - 12),
      }));
      if (pontos.length === 1) pontos.push({ x: largura, y: pontos[0].y });
      const n = v => Number(v.toFixed(2));
      let d = `M ${n(pontos[0].x)} ${n(pontos[0].y)}`;
      for (let i = 0; i < pontos.length - 1; i++) {
        const p0 = pontos[i - 1] || pontos[i], p1 = pontos[i], p2 = pontos[i + 1], p3 = pontos[i + 2] || p2;
        const limitar = y => Math.max(4, Math.min(altura - 4, y));
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: limitar(p1.y + (p2.y - p0.y) / 6) };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: limitar(p2.y - (p3.y - p1.y) / 6) };
        d += ` C ${n(c1.x)} ${n(c1.y)}, ${n(c2.x)} ${n(c2.y)}, ${n(p2.x)} ${n(p2.y)}`;
      }
      return d;
    }

    return { calcularPainelExecutivo: modelo, filtrarPainelExecutivo: filtrar,
      rankingPainelExecutivo: ranking, evolucaoPainelExecutivo: evolucao,
      periodoAnteriorPainel: periodoAnterior, caminhoSuavePainel: caminhoSuave };
  }

  namespace.definir('domain.painelExecutivo', Object.freeze({ criar }));
})(window.PontoProOperacional);
