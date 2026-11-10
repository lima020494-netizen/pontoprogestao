/* Utilitários puros extraídos sem alterar fuso, formato ou arredondamento. */
(function (namespace) {
  'use strict';

  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const brOf = iso => iso ? iso.split('-').reverse().join('/') : '';
  const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const toMin = h => { if (!h) return 0; const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0); };
  const toHHMM = m => `${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`;
  const toSaldo = m => (m < 0 ? '-' : '+') + toHHMM(m);
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const dow = iso => new Date(iso + 'T12:00:00').getDay();
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
  const cpfMascarado = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}.***.***-${d.slice(9)}` : (d ? '***' : '—'); };

  namespace.definir('core.formatos', {
    pad, esc, isoOf, brOf, hhmm, toMin, toHHMM, toSaldo,
    DIAS, dow, addDias, cpfMascarado,
  });
})(window.PontoProOperacional);
