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
  function html(o){
    const r=resumo(o.hoje),esc=S.esc,max=Math.max(1,...r.semana.map(d=>d.escalados+d.folga));
    const kpi=(cls,ic,rot,val,sub,ok)=>`<article class="mv-kpi ${cls}"><span class="mv-kpi-ic" aria-hidden="true">${ic}</span><small>${rot}</small><strong>${val}</strong><em class="${ok?'ok':''}">${sub}</em></article>`;
    const hero=`<section class="mv-hero"><div><h2>${saudacao(o.hora)}, ${esc(o.nome)}!</h2><p>${r.escaladosHoje?`${r.presentes} de ${r.escaladosHoje} pessoas escaladas já registraram ponto hoje.`:'Ninguém está escalado para hoje.'}</p></div><div class="mv-hero-act"><button type="button" class="btn mv-gold" data-mv="esc">Ver escala</button><button type="button" class="btn mv-ghost" data-mv="bat">Tratar ponto</button></div></section>`;
    const kpis=`<section class="mv-kpis" aria-label="Indicadores de hoje">${kpi('k1','👥','Equipe',`${r.total} <span>pessoas</span>`,'Colaboradores ativos')}${kpi('k2','✅','Equipe Hoje',`${r.presentes} <span>/ ${r.escaladosHoje}</span>`,r.presentes>=r.escaladosHoje?'✓ Cobertura ok':`${r.escaladosHoje-r.presentes} sem registro ainda`,r.presentes>=r.escaladosHoje)}${kpi('k3','🕒','Horas na semana',`${r.horas}h`,'Previstas pela escala')}${kpi('k4','⚠️','Alertas',String(o.alertas||0),o.alertas?'Ver no Tratamento':'✓ Tudo certo',!o.alertas)}</section>`;
    const graf=`<section class="mv-card"><header><h3>Equipe por dia</h3><small>${S.brOf(r.dias[0]).slice(0,5)} a ${S.brOf(r.dias[6]).slice(0,5)}</small></header><div class="mv-chart" role="img" aria-label="Pessoas escaladas e de folga em cada dia da semana">${r.semana.map(d=>`<div class="mv-col${d.data===o.hoje?' hoje':''}"><b>${d.escalados}</b><div class="mv-bar"><i class="f" style="height:${d.folga/max*100}%"></i><i class="p" style="height:${d.escalados/max*100}%"></i></div><span>${DIAS_CURTOS[S.dow(d.data)]}</span></div>`).join('')}</div><p class="mv-legend"><span><i class="p"></i>Presentes na escala</span><span><i class="f"></i>Folga</span></p></section>`;
    const lista=r.equipe.slice(0,12).map(({f,st})=>`<li class="mv-person"><span class="mv-av" style="background:${corDe(f.pin)}">${esc(iniciais(f.nome))}</span><div><strong>${esc(f.nome||'Colaborador')}</strong><small>${esc(st.d)}</small></div><span class="mv-badge ${st.k}">${st.t}</span></li>`).join('')||'<li class="mv-empty">Cadastre colaboradores para ver a equipe.</li>';
    const hojeCard=`<section class="mv-card"><header><h3>Equipe Hoje</h3><small>${DIAS_CURTOS[S.dow(o.hoje)]}, ${S.brOf(o.hoje).slice(0,5)}</small></header><ul class="mv-people">${lista}</ul>${r.equipe.length>12?`<button type="button" class="btn ghost mv-more" data-mv="func">Ver toda a equipe (${r.equipe.length})</button>`:''}</section>`;
    const caps=`<section class="mv-card"><header><h3>Escala da semana</h3><button type="button" class="btn ghost sm" data-mv="esc">Abrir</button></header><div class="mv-caps">${r.equipe.slice(0,8).map(({f,caps})=>`<div class="mv-cap-row"><span class="mv-cap-name">${esc(String(f.nome||'').split(/\s+/)[0])}</span><div>${caps.map(c=>`<span class="mv-cap${c.folga?' folga':''}${c.data===o.hoje?' hoje':''}" title="${S.brOf(c.data)}${c.folga?' — folga':''}">${DIAS_CURTOS[S.dow(c.data)][0]}</span>`).join('')}</div></div>`).join('')||'<p class="mv-empty">Sem escala cadastrada.</p>'}</div></section>`;
    return `<div class="mv-overview">${hero}${kpis}<div class="mv-grid">${graf}${hojeCard}${caps}</div></div>`;
  }
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
  return Object.freeze({resumo,html,notificacoes,menuAvatar,statusDia});
}
ns.definir('gestor.visaoMovel',Object.freeze({criar,iniciais,inicioSemana}));
})(window.PontoProOperacional);
