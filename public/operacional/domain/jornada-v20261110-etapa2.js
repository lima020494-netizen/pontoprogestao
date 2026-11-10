/* Etapa 2: ordenação civil e associação das batidas à jornada. */
(function (namespace) {
  'use strict';

  function criar(S) {
    /* Virada noturna: os carimbos originais nunca são alterados; a jornada é derivada. */
    function instanteBatida(b) {
      if (b.fonte === 'MANUAL') return { civil: b.data, key: String(b.data) + 'T' + String(b.hora) + '#' + String(b.nsr || '').padStart(9, '0') };
      const nsr = String(b.nsr || '').padStart(9, '0'), c = b.criadoEm || b.timestamp;
      if (c && b.hora) {
        const d = new Date(c);
        if (!isNaN(d)) {
          const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
          const v = t => partes.find(p => p.type === t)?.value || '', civil = v('year') + '-' + v('month') + '-' + v('day');
          const dif = Math.abs(S.toMin(v('hour') + ':' + v('minute')) - S.toMin(b.hora));
          if (dif <= 1 || dif >= 1439) return { civil, key: civil + 'T' + b.hora + '#' + nsr };
        }
      }
      return { civil: b.data, key: String(b.data) + 'T' + String(b.hora) + '#' + nsr };
    }
    let __jIdx = { sig: '', map: null };
    function indiceJornadas() {
      const all = S.get('batidas', []) || [];
      const sig = all.length + '|' + all.map(b => (b.nsr || '') + (b.excluida ? 'x' : '') + (b.data || '') + (b.hora || '') + (b.jornada || '') + (b.jornadaManual ? 'm' : '') + (b.criadoEm || '')).join(',');
      if (__jIdx.sig === sig && __jIdx.map) return __jIdx.map;
      const map = new Map(), cnt = {};
      all.filter(b => !b.excluida).map(b => ({ b, i: S.instanteBatida(b) })).sort((x, y) => x.i.key.localeCompare(y.i.key)).forEach(({ b, i }) => {
        let j = b.data;
        if (b.fonte === 'MANUAL' && b.jornadaManual && b.jornada) j = b.jornada;
        else if (b.jornada && b.jornada !== b.data) j = b.jornada;
        else if (i.civil !== b.data) j = b.data; // legado: madrugada já gravada com a data da jornada
        else if (S.toMin(b.hora) < 360) {
          const ontem = S.addDias(b.data, -1), k = b.pin + '|' + ontem, n = cnt[k] || 0;
          const h = S.horarioEscala(b.pin, b.data), escMadrugada = h && S.toMin(h) < 360;
          if (n % 2 === 1 && n < 4 && !escMadrugada) j = ontem;
        }
        const k = b.pin + '|' + j; cnt[k] = (cnt[k] || 0) + 1; map.set(b, j); map.set(b.pin + '#' + b.nsr, j);
      });
      __jIdx = { sig, map }; return map;
    }
    function jornadaDe(b) { const m = S.indiceJornadas(); return m.get(b) || m.get(b.pin + '#' + b.nsr) || b.jornada || b.data; }
    const ordemJornada = (a, b) => S.instanteBatida(a).key.localeCompare(S.instanteBatida(b).key);
    function batidasJornada(pin, iso) {
      const bs = S.get('batidas', []).filter(b => !b.excluida && b.pin === pin && S.jornadaDe(b) === iso).sort(S.ordemJornada);
      if (new Set(bs.map(b => b.tipo)).size === bs.length) return bs;
      const tipos = ['Entrada', 'Saída Intervalo', 'Entrada Intervalo', 'Saída'];
      return bs.map((b, i) => ({ ...b, tipo: tipos[i] || b.tipo }));
    }

    return { instanteBatida, indiceJornadas, jornadaDe, ordemJornada, batidasJornada };
  }

  namespace.definir('domain.jornada', Object.freeze({ criar }));
})(window.PontoProOperacional);
