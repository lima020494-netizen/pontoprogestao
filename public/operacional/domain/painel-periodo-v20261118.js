/* Agregação de leitura por período; reutiliza o motor diário sem folha mensal, rede ou escrita. */
(function (namespace) {
  'use strict';

  function criar(S) {
    const percentual = (parte, total) => total ? Math.round(parte / total * 100) : 0;
    function resumo(linhas) {
      const previstos = linhas.reduce((n, l) => n + (l.periodo?.previstos || 0), 0);
      const presentes = linhas.reduce((n, l) => n + (l.periodo?.presentes || 0), 0);
      const concluidos = linhas.reduce((n, l) => n + (l.periodo?.concluidos || 0), 0);
      const pontuais = linhas.reduce((n, l) => n + (l.periodo?.pontuais || 0), 0);
      return { previstos, presentes, concluidos, pontuais, presenca: percentual(presentes, previstos), conclusao: percentual(concluidos, previstos), pontualidade: percentual(pontuais, presentes) };
    }

    function calcular(agora, intervalo) {
      const hoje = S.isoOf(agora), inicio = intervalo.inicio, fim = intervalo.fim < hoje ? intervalo.fim : hoje;
      if (inicio === intervalo.fim) {
        const referencia = inicio === hoje ? agora : new Date(`${inicio}T23:59:00`);
        const dia = S.calcularPainelDia(referencia);
        return { ...dia, inicio, fim: intervalo.fim, agregado: false, diarios: [{ data: inicio, linhas: dia.linhas }], resumo: S.resumirPainelDia(dia.linhas) };
      }
      const grupos = new Map(), vazio = [];
      if (inicio > fim) return { data: hoje, inicio, fim: intervalo.fim, linhas: vazio, agregado: true, diarios: [], resumo: resumo(vazio), contadores: { trabalhando: 0, intervalo: 0, alerta: 0, ausentes: 0, encerrados: 0, extras: 0 } };
      const diarios = [];
      for (let data = inicio; data <= fim; data = S.addDias(data, 1)) {
        const referencia = data === hoje ? agora : new Date(`${data}T23:59:00`);
        const dia = S.calcularPainelDia(referencia); diarios.push({ data, linhas: dia.linhas });
        for (const linha of dia.linhas) {
          const pin = linha.f.pin, grupo = grupos.get(pin) || { f: linha.f, ultima: linha, previstos: 0, presentes: 0, concluidos: 0, pontuais: 0, faltas: 0, atrasos: 0, extras: 0, alertas: 0, decorrido: 0, extraMin: 0 };
          if (linha.previsto > 0) {
            const presente = linha.bs.some(b => b.tipo === 'Entrada');
            grupo.previstos++;
            if (presente) grupo.presentes++;
            if (presente && linha.atrasoMin === 0) grupo.pontuais++;
            if (linha.status === 'concluido') grupo.concluidos++;
            if (linha.status === 'ausente') grupo.faltas++;
            if (linha.atrasoMin > 0) grupo.atrasos++;
            if (linha.extraMin > 0) grupo.extras++;
            if (linha.status === 'alerta') grupo.alertas++;
            grupo.decorrido += linha.decorrido; grupo.extraMin += linha.extraMin;
          }
          if (linha.previsto > 0 || linha.bs.length || linha.oc) grupo.ultima = linha;
          grupos.set(pin, grupo);
        }
      }
      const linhas = [...grupos.values()].map(g => ({
        ...g.ultima, f: g.f, agregado: true, titulo: `${percentual(g.presentes, g.previstos)}% de presença`,
        periodo: { previstos: g.previstos, presentes: g.presentes, concluidos: g.concluidos, pontuais: g.pontuais, faltas: g.faltas, atrasos: g.atrasos, extras: g.extras, alertas: g.alertas, decorrido: g.decorrido, extraMin: g.extraMin },
      })).sort((a, b) => String(a.f.nome).localeCompare(String(b.f.nome), 'pt-BR'));
      const total = campo => linhas.reduce((n, l) => n + l.periodo[campo], 0);
      return { data: hoje, inicio, fim: intervalo.fim, linhas, agregado: true, diarios, resumo: resumo(linhas), contadores: {
        trabalhando: total('presentes'), intervalo: total('pontuais'), alerta: total('atrasos'), ausentes: total('faltas'), extras: total('extras'), encerrados: total('concluidos'),
      } };
    }

    function filtrar(painel, categoria) {
      if (!painel.agregado) return S.filtrarPainelDia(painel, categoria);
      if (!categoria || categoria === 'todos') return painel.linhas;
      const mapa = { trabalhando: 'presentes', intervalo: 'pontuais', alerta: 'atrasos', ausentes: 'faltas', extra: 'extras', encerrados: 'concluidos' };
      const campo = mapa[categoria];
      return campo ? painel.linhas.filter(l => l.periodo[campo] > 0) : [];
    }

    function setores(painel) {
      if (!painel.agregado) return S.setoresPainelDia(painel);
      const grupos = new Map();
      for (const linha of painel.linhas) {
        const setor = linha.f.departamento || 'Sem setor', unidade = linha.f.unidade || '', nome = unidade ? `${unidade} · ${setor}` : setor;
        if (!grupos.has(nome)) grupos.set(nome, []);
        grupos.get(nome).push(linha);
      }
      return [...grupos].map(([nome, linhas]) => ({ nome, ...resumo(linhas) }));
    }

    return { calcularPainelPeriodo: calcular, filtrarPainelPeriodo: filtrar, setoresPainelPeriodo: setores, resumirPainelPeriodo: resumo };
  }

  namespace.definir('domain.painelPeriodo', Object.freeze({ criar }));
})(window.PontoProOperacional);
