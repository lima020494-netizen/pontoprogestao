/* Etapa 2: escala, feriados, previsão e leitura canônica da grade. */
(function (namespace) {
  'use strict';

  function criar(S) {
    const feriadoDe = iso => S.get('feriados', []).find(f => f.data === iso);
    function escalaDaSemana(iso, pin) {
      const all = Object.values(S.get('escalas', {}) || {}).filter(e => e && e.semanaInicio <= iso && (e.semanaFim || S.addDias(e.semanaInicio, 6)) >= iso)
        .sort((a, b) => b.semanaInicio.localeCompare(a.semanaInicio));
      if (pin) { const c = all.find(e => (e.folgas || []).some(x => x.pin === pin && x.dia === iso)); if (c) return c; }
      return all[0] || null;
    }
    function folgaEscala(pin, iso) {
      const e = S.escalaDaSemana(iso, pin); if (!e) return null;
      const f = (e.folgas || []).find(x => x.pin === pin && x.dia === iso);
      return f && f.tipo !== 'Trabalhado' ? f : null;
    }
    function horarioEscala(pin, iso) {
      const e = S.escalaDaSemana(iso, pin); if (!e) return null;
      const f = (e.folgas || []).find(x => x.pin === pin && x.dia === iso);
      return f && f.tipo === 'Trabalhado' ? (f.horarioEntrada || null) : null;
    }
    function previstoDia(f, iso) {
      if (f.status === 'Desligado' && iso > f.dataDesligamento) return 0;
      if (iso < f.admissao) return 0;
      if (f.status === 'Férias' && iso >= f.feriasIni && iso <= f.feriasFim) return 0;
      if (f.status === 'Afastamento' && iso >= f.afastDe && iso <= f.afastAte) return 0;
      if (S.feriadoDe(iso)) return 0;
      const diaEscala = S.buscaNaEscala(f.pin, iso);
      if (diaEscala) return diaEscala.tipo === 'Trabalhado' ? S.cargaEscala(f.escala) : 0;
      const d = S.dow(iso);
      if (f.escala === '5x2' && (d === 0 || d === 6)) return 0;
      if (f.escala === '6x1' && d === 0) return 0;
      if (f.escala === '4x3' && (d === 0 || d === 6)) return 0;
      return S.cargaEscala(f.escala);
    }
    const buscaNaEscala = (pin, data) => { const e = S.escalaDaSemana(data, pin); return e ? ((e.folgas || []).find(x => x.pin === pin && x.dia === data) || null) : null; };

    const TIPOS_ESC = ['Trabalhado', 'DSR', 'Folga Compensada']; // 'Folga Domingo' legado é exibido como Folga Compensada
    function lerCelulaEscala(v) {
      v = String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
      if (!v || v === 'TRABALHADO') return { tipo: 'Trabalhado', horarioEntrada: '' };
      const m = v.match(/^(\d{1,2}):(\d{2})(?:\s*[-–às]+\s*(\d{1,2}):(\d{2}))?$/);
      if (m) return { tipo: 'Trabalhado', horarioEntrada: S.pad(m[1]) + ':' + m[2], horarioSaida: m[3] ? S.pad(m[3]) + ':' + m[4] : '' };
      const t = TIPOS_ESC.find(tipo => tipo.toUpperCase() === v) || { FOLGA: 'Folga Compensada', 'FOLGA COMPENSANDA': 'Folga Compensada', 'FOLGA COMPENSATORIA': 'Folga Compensada', 'FOLGA DE DOMINGO': 'Folga Compensada', 'FOLGA DOMINGO': 'Folga Compensada' }[v];
      return t ? { tipo: t, horarioEntrada: '' } : null;
    }

    return { feriadoDe, escalaDaSemana, folgaEscala, horarioEscala, previstoDia, buscaNaEscala, TIPOS_ESC, lerCelulaEscala };
  }

  namespace.definir('domain.escala', Object.freeze({ criar }));
})(window.PontoProOperacional);
