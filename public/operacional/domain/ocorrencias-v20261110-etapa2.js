/* Etapa 2: catálogo e regras compartilhadas das ocorrências. */
(function (namespace) {
  'use strict';

  function criar(S) {
    /* Shared occurrence rules: no synthetic fiscal punches, wages or eSocial transmission. */
    const GRUPOS_OCORRENCIAS = [
      { nome: 'Grupo 1 — Abonam o dia (sem desconto/débito)', itens: [['Atestado médico', 'Atestado Médico (1 a 15 dias)', 15], ['Licença Gala', 'Licença Gala (Casamento) — 3 dias', 3], ['Licença Nojo', 'Licença Nojo (Falecimento) — 2 dias', 2], ['Licença Paternidade', 'Nascimento Filho / Paternidade — 5 ou 20 dias', 5], ['Doação de Sangue', 'Doação de Sangue — 1 dia/ano', 1], ['Alistamento Eleitoral', 'Alistamento Eleitoral — 2 dias', 2], ['Falta Justificada', 'Falta Justificada pela Empresa', 15]] },
      { nome: 'Grupo 2 — Afastamentos INSS (início e fim)', itens: [['Afastamento INSS', 'Afastamento INSS — Auxílio por Incapacidade / Acidente (>15 dias)'], ['Licença Maternidade', 'Licença Maternidade — 120 ou 180 dias']] },
      { nome: 'Grupo 3 — Compensações e descansos', itens: [['Folga compensatória', 'Folga Compensatória (Banco de Horas)'], ['Férias', 'Férias (início e fim)'], ['Folga de Feriado/DSR Trabalhado', 'Folga de Feriado / DSR Trabalhado']] },
      { nome: 'Grupo 4 — Ajustes operacionais', itens: [['Trabalho Externo / Viagem', 'Trabalho Externo / Viagem (jornada prevista)'], ['Esquecimento de Marcação', 'Esquecimento de Marcação'], ['Suspensão Disciplinar', 'Suspensão Disciplinar (desconta dia + DSR)'], ['Falta', 'Falta não justificada']] },
    ];
    /* Em massa ficam disponíveis todos os abonos, licenças, compensações e ajustes, incluindo a batida esquecida. */
    function tiposTratamentoLote() { return GRUPOS_OCORRENCIAS.flatMap(g => g.itens).map(([v]) => v).filter(v => v !== 'Falta'); }
    function regraOcorrencia(tipo) {
      const t = String(tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const afastado = t === 'afastamento inss' || t === 'licenca maternidade';
      const abonado = afastado || t === 'ferias' || t.startsWith('atestado medico') || /^falta (justificada|abonada)(?:\s*\/\s*(?:justificada|abonada))?$/.test(t) || ['licenca gala', 'licenca nojo', 'licenca paternidade', 'doacao de sangue', 'alistamento eleitoral'].includes(t);
      const compensacao = ['folga compensatoria', 'compensacao de banco', 'folga de feriado/dsr trabalhado'].includes(t);
      return { abonado, afastado, compensacao, falta: t === 'falta', externo: t === 'trabalho externo / viagem', suspensao: t === 'suspensao disciplinar', manual: t === 'esquecimento de marcacao', codigo: t === 'afastamento inss' ? '03' : '', etiqueta: t === 'afastamento inss' ? 'AFASTADO INSS - AUXÍLIO DOENÇA' : t === 'licenca maternidade' ? 'LICENÇA MATERNIDADE' : String(tipo || '').toUpperCase(), pagador: t === 'afastamento inss' ? 'Empresa: primeiros 15 dias; INSS: a partir do 16º, sujeito à concessão' : t === 'licenca maternidade' ? 'Empresa / compensação previdenciária conforme enquadramento' : abonado ? 'Empresa / sem desconto' : '' };
    }
    function ocorrenciaDia(pin, data) { return (S.get('ocorrencias', []) || []).find(o => o.pin === pin && o.data === data); }
    function validarPeriodoOcorrencia(tipo, ini, fim, pin, periodoId) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ini || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '') || !Number.isFinite(Date.parse(ini)) || !Number.isFinite(Date.parse(fim)) || ini > fim) return 'Informe início e fim válidos.';
      const dias = Math.round((Date.parse(fim) - Date.parse(ini)) / 86400000) + 1, cidada = !!S.get('empregador', {}).empresaCidada;
      if (dias > 366) return 'O período deve ter até 366 dias.';
      if (tipo === 'Afastamento INSS' && dias <= 15) return 'Auxílio INSS exige período superior a 15 dias.';
      if (tipo === 'Licença Maternidade' && dias !== (cidada ? 180 : 120)) return 'Licença maternidade exige ' + (cidada ? 180 : 120) + ' dias nesta empresa.';
      const item = GRUPOS_OCORRENCIAS.flatMap(g => g.itens).find(x => x[0] === tipo), limite = tipo === 'Licença Paternidade' && cidada ? 20 : item?.[2];
      if (limite && dias > limite) return 'Limite deste motivo: ' + limite + ' dia(s).';
      if (tipo === 'Doação de Sangue' && (S.get('ocorrencias', []) || []).some(o => o.pin === pin && o.tipo === tipo && o.data.slice(0, 4) === ini.slice(0, 4) && o.periodoId !== periodoId)) return 'Já existe doação de sangue registrada neste ano.';
      return '';
    }

    return { GRUPOS_OCORRENCIAS, tiposTratamentoLote, regraOcorrencia, ocorrenciaDia, validarPeriodoOcorrencia };
  }

  namespace.definir('domain.ocorrencias', Object.freeze({ criar }));
})(window.PontoProOperacional);
