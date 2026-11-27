/* Visão geral do Gestor (hero, KPIs, semana, Equipe Hoje, escala em cápsulas) e menu de avatar.
   Somente leitura: usa as funções de escala/jornada existentes, nunca grava batidas, banco ou auditoria. */
(function(ns){
'use strict';
const DIAS_CURTOS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const CORES=['#03446C','#1E86C0','#0B7A75','#B7791F','#7B4FA0','#C2410C','#2F6F3E','#9D174D'];
function iniciais(nome){return String(nome||'?').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()||'?';}
function corDe(pin){let h=0;for(const c of String(pin||''))h=(h*31+c.charCodeAt(0))>>>0;return CORES[h%CORES.length];}
function inicioSemana(S,iso){const d=S.dow(iso);return S.addDias(iso,-(d===0?6:d-1));}
function criar(S){
  const ativos=hoje=>(S.get('funcionarios',[])||[]).filter(f=>(f.status||'Ativo')!=='Desligado'&&(!f.admissao||f.admissao<=hoje)).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
  function jornadaTexto(f,data){const e=S.get('empregador',{})||{},it=S.buscaNaEscala(f.pin,data),sab=S.dow(data)===6;const ini=it?.horarioEntrada||(sab?e.hSabEntrada:'')||e.hEntrada||'08:00',fim=it?.horarioSaida||(sab?e.hSabSaida:'')||e.hSaida||'';return fim?`${ini} às ${fim}`:`Entrada ${ini}`;}
  function statusDia(f,data,hoje){
    const prev=S.previstoDia(f,data),oc=S.ocorrenciaDia(f.pin,data),bs=data===hoje?S.batidasDia(f.pin,data):[];
    if(bs.length){const fim=bs.some(b=>b.tipo==='Saída')||(f.intervalo?.preAssinalado&&bs.length>=2);return fim?{k:'encerrou',t:'Encerrou',d:jornadaTexto(f,data)}:{k:'presente',t:'Em jornada',d:'Desde '+bs[0].hora}; }
    if(oc)return {k:'afastado',t:'Ausência',d:String(oc.tipo||oc.motivo||'Ocorrência registrada')};
    if(!(prev>0))return {k:'folga',t:'Folga',d:'Folga hoje'};
    return {k:'aguardando',t:'Escalado',d:jornadaTexto(f,data)};
  }
  function resumo(hoje){
    const fs=ativos(hoje),ini=inicioSemana(S,hoje),dias=Array.from({length:7},(_,i)=>S.addDias(ini,i));
    const semana=dias.map(d=>{let escalados=0,folga=0;fs.forEach(f=>{if(S.previstoDia(f,d)>0&&!S.ocorrenciaDia(f.pin,d))escalados++;else folga++;});return {data:d,escalados,folga};});
    const horas=Math.round(fs.reduce((t,f)=>t+dias.reduce((s,d)=>s+Math.max(0,S.previstoDia(f,d)||0),0),0)/60);
    const equipe=fs.map(f=>({f,st:statusDia(f,hoje,hoje),caps:dias.map(d=>({data:d,folga:!(S.previstoDia(f,d)>0)}))}));
    const presentes=equipe.filter(x=>x.st.k==='presente'||x.st.k==='encerrou').length,escaladosHoje=equipe.filter(x=>x.st.k!=='folga'&&x.st.k!=='afastado').length;
    return {total:fs.length,presentes,escaladosHoje,horas,semana,equipe,dias};
  }
  function saudacao(h){return h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';}
  /* Hero de boas-vindas: o seletor de período é montado logo abaixo pelo shell. */
  function html(o){
    const r=resumo(o.hoje),esc=S.esc;
    return `<section class="mv-hero"><div><h2>${saudacao(o.hora)}, ${esc(o.nome)}!</h2><p>${r.escaladosHoje?`${r.presentes} de ${r.escaladosHoje} pessoas escaladas já registraram ponto hoje.`:'Ninguém está escalado para hoje.'}</p></div><div class="mv-hero-act"><button type="button" class="btn mv-gold" data-mv="esc">Ver escala</button><button type="button" class="btn mv-ghost" data-mv="bat">Tratar ponto</button></div></section>`;
  }
  function statusAoVivo(f,hoje){const st=statusDia(f,hoje,hoje);if(st.k==='presente'){const bs=S.batidasDia(f.pin,hoje),ult=bs[bs.length-1];if(ult&&ult.tipo==='Saída Intervalo')return {k:'intervalo',t:'Intervalo',d:'Saiu às '+ult.hora};}return st;}
  /* Conteúdo do Início: 4 KPIs clicáveis, barras da semana, rosca de presença e Equipe Hoje com busca. */
  function conteudo(o){
    const r=resumo(o.hoje),esc=S.esc,max=Math.max(1,...r.semana.map(d=>d.escalados+d.folga)),p=o.periodo||{};
    const hojeSo=!!o.hojeSo,pres=hojeSo?r.presentes:(p.presentes||0),prev=hojeSo?r.escaladosHoje:(p.previstos||0),taxa=prev?Math.round(Math.min(pres,prev)/prev*100):0;
    const kpi=(cls,k,ic,rot,val,sub,ok)=>`<button type="button" class="mv-kpi ${cls}" data-mv="${k}"><span class="mv-kpi-ic" aria-hidden="true">${ic}</span><small>${rot}</small><strong>${val}</strong><em class="${ok?'ok':''}">${sub}</em></button>`;
    const kpis=`<section class="mv-kpis" aria-label="Indicadores">${kpi('k1','func','👥','Equipe',`${r.total} <span>ativos</span>`,'Ver colaboradores')}${kpi('k2','__equipe','✅',hojeSo?'Em jornada':'Presentes',`${pres} <span>/ ${prev}</span>`,prev&&pres>=prev?'✓ Cobertura ok':`${taxa}% de cobertura`,prev&&pres>=prev)}${kpi('k3','esc','🕒','Horas na semana',`${r.horas}h`,'Previstas pela escala')}${kpi('k4','bat','⚠️','Alertas',String(o.alertas||0),o.alertas?'Tratar agora →':'✓ Tudo certo',!o.alertas)}</section>`;
    const barras=`<section class="mv-card"><header><h3>Equipe por dia</h3><small>${S.brOf(r.dias[0]).slice(0,5)} a ${S.brOf(r.dias[6]).slice(0,5)}</small></header><div class="mv-chart" role="img" aria-label="Pessoas em jornada e de folga em cada dia da semana">${r.semana.map(d=>`<div class="mv-col${d.data===o.hoje?' hoje':''}"><b>${d.escalados}</b><div class="mv-bar"><i class="f" style="height:${d.folga/max*100}%"></i><i class="p" style="height:${d.escalados/max*100}%"></i></div><span>${DIAS_CURTOS[S.dow(d.data)]}</span></div>`).join('')}</div><p class="mv-legend"><span><i class="p"></i>Em jornada</span><span><i class="f"></i>Folga</span></p></section>`;
    const C=2*Math.PI*52;
    const rosca=`<section class="mv-card"><header><h3>Presença</h3><small>${esc(o.rotulo||'Hoje')}</small></header><div class="mv-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Presença de ${taxa}%"><circle cx="60" cy="60" r="52" class="t"/><circle cx="60" cy="60" r="52" class="v${taxa?'':' zero'}" stroke-dasharray="${(taxa*C/100).toFixed(1)} ${C.toFixed(1)}"/></svg><div><strong>${taxa}%</strong><span>presença</span></div></div><div class="mv-donut-foot"><span><b>${pres}</b>presentes</span><span><b>${Math.max(0,prev-pres)}</b>sem registro</span><span><b>${r.total-r.escaladosHoje}</b>de folga hoje</span></div></section>`;
    const lista=r.equipe.map(({f})=>{const st=statusAoVivo(f,o.hoje),cargo=f.cargo||f.funcao||'Colaborador';return `<li class="mv-person" data-busca="${esc(String((f.nome||'')+' '+cargo).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())}"><span class="mv-av" style="background:${corDe(f.pin)}">${esc(iniciais(f.nome))}</span><div><strong>${esc(f.nome||'Colaborador')}</strong><small>${esc(cargo)} · ${esc(st.d)}</small></div><span class="mv-badge ${st.k}">${st.t}</span></li>`;}).join('')||'<li class="mv-empty">Cadastre colaboradores para ver a equipe.</li>';
    const equipe=`<section class="mv-card mv-team" id="mv-equipe"><header><h3>Equipe Hoje</h3><small>${DIAS_CURTOS[S.dow(o.hoje)]}, ${S.brOf(o.hoje).slice(0,5)}</small></header><input type="search" class="mv-search" data-mv-busca placeholder="Buscar por nome ou cargo" aria-label="Buscar na Equipe Hoje"/><ul class="mv-people">${lista}</ul><p class="mv-empty hidden" data-mv-vazio>Ninguém encontrado.</p></section>`;
    return `${kpis}<div class="mv-grid">${barras}${rosca}</div>${equipe}`;
  }
  /* Escala da semana no estilo de grade com folgas destacadas e diagnóstico de equilíbrio. */
  function diagnosticoSemana(linhas,dias,minimo){
    const porDia=dias.map((_,i)=>linhas.filter(l=>!l.celulas[i].folga).length);
    const folgas=linhas.map(l=>l.celulas.filter(c=>c.folga).length),semFolga=linhas.filter((l,i)=>folgas[i]===0).map(l=>l.f.nome);
    const abaixo=dias.filter((_,i)=>porDia[i]<minimo);
    const iguais=folgas.length>0&&folgas.every(n=>n===folgas[0]);
    const ok=linhas.length>0&&!semFolga.length&&!abaixo.length;
    const texto=!linhas.length?'Cadastre colaboradores para montar a escala.':ok?`Escala equilibrada: ${iguais?`todo mundo com ${folgas[0]} folga${folgas[0]>1?'s':''}`:'todos com folga na semana'} e nenhum dia abaixo do mínimo`:[semFolga.length?`${semFolga.length} pessoa(s) sem folga na semana`:'',abaixo.length?`${abaixo.length} dia(s) abaixo do mínimo de ${minimo}`:''].filter(Boolean).join(' · ');
    return {ok,texto,porDia,semFolga,abaixo};
  }
  function semanaEscala(ini,opts={}){
    const esc=S.esc,dias=Array.from({length:7},(_,i)=>S.addDias(ini,i)),fs=ativos(dias[6]);
    const linhas=fs.map(f=>({f,celulas:dias.map(d=>{const folga=!(S.previstoDia(f,d)>0)||!!S.ocorrenciaDia(f.pin,d);return {data:d,folga,txt:folga?'Folga':jornadaTexto(f,d).replace(' às ','–').replace('Entrada ','').replace(/:00/g,'h')};})}));
    const minimo=Math.max(1,Math.ceil(fs.length/2)),dg=diagnosticoSemana(linhas,dias,minimo),num=Math.ceil(Number(ini.slice(8))/7);
    const cab=`<header class="esw-head"><button type="button" class="esw-nav" data-mv="__semPrev" aria-label="Semana anterior">‹</button><div><strong>Semana ${num}</strong><small>${S.brOf(dias[0]).slice(0,5)} a ${S.brOf(dias[6]).slice(0,5)}</small></div><button type="button" class="esw-nav" data-mv="__semNext" aria-label="Próxima semana">›</button></header>`;
    const grade=`<div class="esw-wrap"><table class="esw"><thead><tr><th scope="col">Equipe</th>${dias.map(d=>`<th scope="col">${DIAS_CURTOS[S.dow(d)]}<small>${d.slice(8)}</small></th>`).join('')}</tr></thead><tbody>${linhas.map(l=>`<tr><th scope="row"><span class="mv-av sm" style="background:${corDe(l.f.pin)}">${esc(iniciais(l.f.nome))}</span>${esc(String(l.f.nome||'').split(/\s+/)[0])}</th>${l.celulas.map(c=>`<td class="${c.folga?'folga':''}">${esc(c.txt)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="8" class="mv-empty">Sem colaboradores ativos.</td></tr>`}</tbody><tfoot><tr><th scope="row">Em jornada</th>${dg.porDia.map(n=>`<td class="${n<minimo?'baixo':'ok'}">${n} ${n<minimo?'!':'✓'}</td>`).join('')}</tr></tfoot></table></div>`;
    return `<section class="mv-card esw-card" aria-label="Escala da semana">${cab}${opts.semGrade?'':grade}<p class="esw-diag ${dg.ok?'ok':'alerta'}">${dg.ok?'✓':'⚠'} ${esc(dg.texto)}</p><div class="esw-act"><button type="button" class="btn ghost" data-mv="__imprimirEsc">🖨 Imprimir</button><button type="button" class="btn" data-mv="__enviarEsc">📤 Enviar pro time</button></div></section>`;
  }
  function textoSemana(ini){const dias=Array.from({length:7},(_,i)=>S.addDias(ini,i));return ativos(dias[6]).map(f=>`${f.nome}: `+dias.map(d=>`${DIAS_CURTOS[S.dow(d)]} ${!(S.previstoDia(f,d)>0)||S.ocorrenciaDia(f.pin,d)?'Folga':jornadaTexto(f,d)}`).join(' | ')).join('\n');}
  /* Cartão de colaborador: avatar, nome, cargo/jornada e chips de carga semanal e contato. */
  function cartaoColaborador(f,hoje){const esc=S.esc,ini=inicioSemana(S,hoje),min=Array.from({length:7},(_,i)=>S.addDias(ini,i)).reduce((t,d)=>t+Math.max(0,S.previstoDia(f,d)||0),0),h=Math.round(min/60);return {av:`<span class="mv-av" style="background:${corDe(f.pin)}">${esc(iniciais(f.nome))}</span>`,jornada:jornadaTexto(f,hoje),horas:h};}
  function notificacoes(o){
    const n=[],e=S.get('empregador',{})||{};
    if(o.pendentes)n.push(['📶','Batidas aguardando envio',`${o.pendentes} marcação(ões) serão enviadas quando houver conexão.`]);
    if(o.alertas)n.push(['⚠️','Pontos para tratar',`${o.alertas} ocorrência(s) hoje no Tratamento de Ponto.`,'bat']);
    if(!e.logo)n.push(['🏢','Coloque o logo da empresa','Ele aparece nos comprovantes e na folha.','emp']);
    if(!e.responsavel)n.push(['👤','Complete o perfil','Informe o responsável pela empresa.','emp']);
    if(!n.length)n.push(['✅','Tudo em dia','Nenhuma pendência no momento.']);
    return n;
  }
  function menuAvatar(o){
    const esc=S.esc,ns=notificacoes(o);
    return `<div class="mv-menu-prof"><span class="mv-av lg">${esc(iniciais(o.nome))}</span><div><strong>${esc(o.nome)}</strong><small>${esc(o.email||o.funcao||'')}</small><small>${esc(o.plano||'')}</small></div></div><div class="mv-menu-sec"><h4>Notificações</h4>${ns.map(([i,t,d,k])=>`<button type="button" class="mv-noti"${k?` data-mv="${k}"`:' disabled'}><span aria-hidden="true">${i}</span><div><strong>${esc(t)}</strong><small>${esc(d)}</small></div></button>`).join('')}</div><div class="mv-menu-act"><button type="button" class="btn ghost" data-mv="emp">Perfil da empresa</button><button type="button" class="btn ghost" data-mv="__bloquear">🔒 Bloquear</button><button type="button" class="btn ghost" data-mv="__sair">⏻ Sair</button></div>`;
  }
  return Object.freeze({resumo,html,conteudo,notificacoes,menuAvatar,statusDia,statusAoVivo,semanaEscala,textoSemana,diagnosticoSemana,cartaoColaborador});
}
ns.definir('gestor.visaoMovel',Object.freeze({criar,iniciais,inicioSemana}));
})(window.PontoProOperacional);
