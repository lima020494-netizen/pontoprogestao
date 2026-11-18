/* Seletor de período reutilizável: datas locais, sem rede, storage ou regras de ponto. */
(function (namespace) {
  'use strict';

  const ROTULOS = Object.freeze([
    ['hoje', 'Hoje'], ['ontem', 'Ontem'], ['semana', 'Essa semana'],
    ['semanaPassada', 'Semana passada'], ['mes', 'Esse mês'], ['mesPassado', 'Mês passado'],
  ]);
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const data = valor => {
    if (Object.prototype.toString.call(valor) === '[object Date]') return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(NaN);
  };
  const validaData = valor => {
    const d = data(valor);
    return Number.isFinite(d.getTime()) && iso(d) === valor;
  };
  const add = (valor, dias) => { const d = data(valor); d.setDate(d.getDate() + dias); return iso(d); };
  const ultimoDia = (ano, mes) => new Date(ano, mes, 0).getDate();
  const horaValida = valor => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''));

  function atalho(tipo, agora = new Date()) {
    const hoje = iso(data(agora)), d = data(hoje), ano = d.getFullYear(), mes = d.getMonth() + 1;
    const segunda = add(hoje, -((d.getDay() + 6) % 7));
    let inicio = hoje, fim = hoje;
    if (tipo === 'ontem') inicio = fim = add(hoje, -1);
    if (tipo === 'semana') { inicio = segunda; fim = add(segunda, 6); }
    if (tipo === 'semanaPassada') { inicio = add(segunda, -7); fim = add(segunda, -1); }
    if (tipo === 'mes') { inicio = `${ano}-${pad(mes)}-01`; fim = `${ano}-${pad(mes)}-${pad(ultimoDia(ano, mes))}`; }
    if (tipo === 'mesPassado') {
      const anterior = new Date(ano, mes - 2, 1), a = anterior.getFullYear(), m = anterior.getMonth() + 1;
      inicio = `${a}-${pad(m)}-01`; fim = `${a}-${pad(m)}-${pad(ultimoDia(a, m))}`;
    }
    return { inicio, fim, horaInicio: '00:00', horaFim: '23:59' };
  }

  function validar(periodo) {
    if (!periodo || !validaData(periodo.inicio) || !validaData(periodo.fim)) return { ok: false, erro: 'Informe datas válidas.' };
    if (!horaValida(periodo.horaInicio) || !horaValida(periodo.horaFim)) return { ok: false, erro: 'Informe horários válidos.' };
    if (`${periodo.inicio} ${periodo.horaInicio}` > `${periodo.fim} ${periodo.horaFim}`) return { ok: false, erro: 'O início deve ser anterior ao fim.' };
    return { ok: true, periodo: { inicio: periodo.inicio, fim: periodo.fim, horaInicio: periodo.horaInicio, horaFim: periodo.horaFim } };
  }

  function formatar(periodo) {
    const br = d => validaData(d) ? `${d.slice(8)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '--/--/----';
    return `${br(periodo.inicio)} - ${periodo.horaInicio} a ${br(periodo.fim)} - ${periodo.horaFim}`;
  }

  function calendario(ano, mes) {
    const primeiro = `${ano}-${pad(mes)}-01`, deslocamento = data(primeiro).getDay(), inicio = add(primeiro, -deslocamento);
    return Array.from({ length: 42 }, (_, i) => {
      const dia = add(inicio, i);
      return { data: dia, dia: Number(dia.slice(8)), fora: Number(dia.slice(5, 7)) !== mes };
    });
  }

  function criar({ alvo, periodo, aoAplicar }) {
    if (!alvo) throw new Error('Informe o elemento do seletor de período.');
    let atual = validar(periodo).ok ? { ...periodo } : atalho('hoje'), rascunho = { ...atual };
    let overlay = null, cursor = atual.inicio.slice(0, 7), escolhendo = 'inicio', focoAnterior = null;
    const uid = `periodo-${Math.random().toString(36).slice(2, 9)}`;
    alvo.classList.add('period-picker');
    alvo.innerHTML = `<button type="button" class="period-trigger" aria-haspopup="dialog" aria-expanded="false"><span aria-hidden="true">📅</span><span class="period-trigger-text"></span><span class="period-chevron" aria-hidden="true">⌄</span></button>`;
    const botao = alvo.querySelector('button');
    const texto = () => { alvo.querySelector('.period-trigger-text').textContent = formatar(atual); botao.setAttribute('aria-label', `Período: ${formatar(atual)}. Alterar período`); };
    texto();

    function fechar() {
      if (!overlay) return;
      overlay.remove(); overlay = null; botao.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', teclado); focoAnterior?.focus?.();
    }
    function teclado(e) {
      if (e.key === 'Escape') { e.preventDefault(); fechar(); return; }
      if (e.key !== 'Tab' || !overlay) return;
      const itens = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro?.focus(); }
    }
    function grade() {
      if (!overlay) return;
      const [ano, mes] = cursor.split('-').map(Number), dias = calendario(ano, mes);
      overlay.querySelector('.period-month-title').textContent = `${MESES[mes - 1]}, ${ano}`;
      overlay.querySelector('.period-year').value = String(ano);
      overlay.querySelector('.period-grid').innerHTML = dias.map(d => {
        const antes = d.data < rascunho.inicio, depois = d.data > rascunho.fim;
        const dentro = !antes && !depois, ponta = d.data === rascunho.inicio ? ' start' : d.data === rascunho.fim ? ' end' : '';
        return `<button type="button" class="period-day${d.fora ? ' outside' : ''}${dentro ? ' in-range' : ''}${ponta}" data-date="${d.data}" aria-pressed="${dentro}" aria-label="${d.data.split('-').reverse().join('/')}">${d.dia}</button>`;
      }).join('');
      overlay.querySelectorAll('.period-day').forEach(el => el.addEventListener('click', () => {
        const valor = el.dataset.date;
        if (escolhendo === 'inicio' || valor < rascunho.inicio) { rascunho.inicio = valor; rascunho.fim = valor; escolhendo = 'fim'; }
        else { rascunho.fim = valor; escolhendo = 'inicio'; }
        campos(); grade();
      }));
    }
    function campos() {
      if (!overlay) return;
      for (const [nome, valor] of Object.entries(rascunho)) { const input = overlay.querySelector(`[data-field="${nome}"]`); if (input) input.value = valor; }
    }
    function abrir() {
      if (overlay) return fechar();
      focoAnterior = document.activeElement; rascunho = { ...atual }; cursor = atual.inicio.slice(0, 7); escolhendo = 'inicio';
      overlay = document.createElement('div'); overlay.className = 'period-overlay';
      overlay.innerHTML = `<section class="period-dialog" role="dialog" aria-modal="true" aria-labelledby="${uid}-title"><header class="period-dialog-head"><div><h3 id="${uid}-title">Selecionar período</h3><p>Escolha um atalho ou um intervalo no calendário.</p></div><button type="button" class="period-close" aria-label="Fechar seletor">×</button></header><div class="period-body"><nav class="period-shortcuts" aria-label="Atalhos de período">${ROTULOS.map(([id, nome]) => `<button type="button" data-shortcut="${id}">${nome}</button>`).join('')}</nav><div class="period-calendar"><div class="period-calendar-nav"><button type="button" class="period-prev" aria-label="Mês anterior">‹</button><strong class="period-month-title"></strong><button type="button" class="period-next" aria-label="Próximo mês">›</button></div><label class="period-year-label">Ano<select class="period-year" aria-label="Ano do calendário">${Array.from({ length: 21 }, (_, i) => Number(atual.inicio.slice(0, 4)) - 10 + i).map(a => `<option value="${a}">${a}</option>`).join('')}</select></label><div class="period-week" aria-hidden="true">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span>${d}</span>`).join('')}</div><div class="period-grid"></div><div class="period-fields"><label>De<span><input type="date" data-field="inicio" aria-label="Data inicial"/><input type="time" data-field="horaInicio" aria-label="Hora inicial"/></span></label><label>Até<span><input type="date" data-field="fim" aria-label="Data final"/><input type="time" data-field="horaFim" aria-label="Hora final"/></span></label></div></div></div><p class="period-error" role="alert"></p><footer class="period-footer"><button type="button" class="period-cancel">Cancelar</button><button type="button" class="period-apply">Aplicar</button></footer></section>`;
      document.body.appendChild(overlay); botao.setAttribute('aria-expanded', 'true');
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) fechar(); });
      overlay.querySelector('.period-close').addEventListener('click', fechar); overlay.querySelector('.period-cancel').addEventListener('click', fechar);
      overlay.querySelector('.period-prev').addEventListener('click', () => { cursor = add(`${cursor}-01`, -1).slice(0, 8) + '01'; cursor = cursor.slice(0, 7); grade(); });
      overlay.querySelector('.period-next').addEventListener('click', () => { const [a, m] = cursor.split('-').map(Number); cursor = iso(new Date(a, m, 1)).slice(0, 7); grade(); });
      overlay.querySelector('.period-year').addEventListener('change', e => { cursor = `${e.target.value}-${cursor.slice(5)}`; grade(); });
      overlay.querySelectorAll('[data-shortcut]').forEach(el => {
        const sugerido = atalho(el.dataset.shortcut, new Date());
        el.setAttribute('aria-pressed', String(Object.keys(sugerido).every(k => sugerido[k] === rascunho[k])));
        el.addEventListener('click', () => {
        rascunho = atalho(el.dataset.shortcut, new Date()); cursor = rascunho.inicio.slice(0, 7); escolhendo = 'inicio'; campos(); grade();
        overlay.querySelectorAll('[data-shortcut]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
        });
      });
      overlay.querySelectorAll('[data-field]').forEach(input => input.addEventListener('change', () => {
        rascunho[input.dataset.field] = input.value;
        if (input.dataset.field === 'inicio' && validaData(input.value)) cursor = input.value.slice(0, 7);
        grade();
      }));
      overlay.querySelector('.period-apply').addEventListener('click', async e => {
        const resultado = validar(rascunho), erro = overlay.querySelector('.period-error');
        if (!resultado.ok) { erro.textContent = resultado.erro; return; }
        erro.textContent = ''; e.currentTarget.disabled = true; e.currentTarget.textContent = 'Aplicando…';
        try { await aoAplicar?.({ ...resultado.periodo }); atual = { ...resultado.periodo }; texto(); fechar(); }
        catch (err) { erro.textContent = err?.message || 'Não foi possível aplicar o período.'; e.currentTarget.disabled = false; e.currentTarget.textContent = 'Aplicar'; }
      });
      document.addEventListener('keydown', teclado); campos(); grade(); overlay.querySelector('.period-close').focus();
    }
    botao.addEventListener('click', abrir);
    return { abrir, fechar, obter: () => ({ ...atual }), destruir: () => { fechar(); botao.removeEventListener('click', abrir); alvo.innerHTML = ''; } };
  }

  namespace.definir('gestor.seletorPeriodo', Object.freeze({ atalho, validar, formatar, calendario, criar, ultimoDia }));
})(window.PontoProOperacional);
