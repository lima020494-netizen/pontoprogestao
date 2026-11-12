/* Etapa 4: documentos e exportações compartilhadas; regras permanecem no domínio. */
(function (namespace) {
  'use strict';

  function criar(S) {
function miniResumoFolha(d){
  const r=S.resumoMensalFolha(d);
  return [[['Horas Previstas',r[0][1]],['Horas Realizadas',r[1][1]],['Adicional Noturno',r[4][1]]],
    [['Horas Extras 50%',S.toHHMM(d.tot.extras50||0)],['Horas Extras 100%',S.toHHMM(d.tot.extras100||0)],['Faltas',r[3][1]]],
    [['Saldo Anterior',S.toSaldo(d.banco.anterior)],['Saldo do Mês',r[5][1]],['Saldo Acumulado',S.toSaldo(d.banco.atual)]]];
}
const FOLHA_RODAPE='Ponto Pro Gestão v1.0 · Sistema de Tratamento de Ponto · Emissão conforme Portaria MTE nº 671/2021';
const FOLHA_CIENCIA='Declaro ciência das marcações e dos tratamentos apresentados neste espelho de ponto.';
function modeloEspelho(d){
  const head=['Dia','E1','S1','E2','S2','Prevista','Trabalhadas','Extras','Faltas','Saldo','Ocorrência'];
  const notas=[],porDia={},curto=t=>String(t||'').replace(/\s*-\s*Autorizado por:.*$/i,'').replace(/^\s*Motivo:\s*/i,'').replace(/\s+/g,' ').trim();
  const nota=(dia,texto)=>{const t=`${S.brOf(dia)}: ${texto}`;let i=notas.indexOf(t);if(i<0){notas.push(t);i=notas.length-1;}(porDia[dia]=porDia[dia]||new Set()).add(i+1);};
  const rows=d.linhas.map(l=>{
    const bs=S.batidasDia(d.f.pin,l.data),marca=tipo=>{const b=bs.find(x=>x.tipo===tipo);if(!b)return '--:--';const tratada=!!(b.manual||b.movimento||b.fonte==='MANUAL');
      if(tratada){const m=curto(b.movimento||b.motivo).replace(/^\d{4}-\d\d-\d\d \d\d:\d\d \* /,'').replace(/^Marcação Manual\s*-\s*/i,'');nota(l.data,`${b.fonte==='MANUAL'||b.manual?'Ajuste manual de marcação':'Reclassificação de marcação'} ${b.hora}${m?' ('+m+')':''}`);}
      return b.hora+(tratada?'*':'');};
    return {l,cells:[S.brOf(l.data).slice(0,5),marca('Entrada'),marca('Saída Intervalo'),marca('Entrada Intervalo'),marca('Saída'),S.toHHMM(l.previsto),S.toHHMM(l.trabalhado),S.toHHMM(Math.max(0,l.trabalhado-l.previsto)),S.toHHMM(Math.max(0,-l.saldo)),l.saldo?S.toSaldo(l.saldo):'00:00',l.ocorrencia||(bs.length%2?'INCOMPLETO':bs.length?'TRABALHADO':'—')]};
  });
  const iso=br=>{const m=/^(\d\d)\/(\d\d)\/(\d{4})/.exec(br);return m?`${m[3]}-${m[2]}-${m[1]}`:'';};
  for(const j of d.just||[]){if(/^\d\d\/\d\d\/\d{4} \d\d:\d\d - /.test(j))continue;const dia=iso(j);if(!dia)continue;
    const resto=curto(j.replace(/^\d\d\/\d\d\/\d{4}( a \d\d\/\d\d\/\d{4})?\s*-\s*/,'')).split(' - ').map(x=>x.trim()).filter(Boolean);
    const per=/ a (\d\d\/\d\d\/\d{4})/.exec(j.slice(0,24));const tipo=(resto.shift()||'').toLowerCase().replace(/^./,c=>c.toUpperCase());
    nota(dia,`${tipo}${per?' até '+per[1]:''}${resto.length?' — '+[...new Set(resto)].join('; '):''}`);}
  const body=rows.map(({l,cells})=>{const n=porDia[l.data];if(n)cells[10]=`${cells[10]} ${[...n].sort((a,b)=>a-b).map(x=>'['+x+']').join('')}`;return cells;});
  const out=notas.map((t,i)=>`[${i+1}] ${t}`);out.push('* Marcação manual ou reclassificada. Registros originais, NSR e trilha de auditoria preservados no sistema.');
  if(S.preLegenda(d.f))out.push(S.preLegenda(d.f));
  return {head,body,resumo:S.miniResumoFolha(d),notas:out};
}
function dadosCabecalhoFolha(f,ini,fim){
  const e=S.get('empregador',{})||{},end=[e.logradouro,e.numero,e.complemento,e.bairro,e.cep].filter(Boolean).join(', ');
  return [[`EMPREGADOR\nRazão Social: ${e.razao||e.fantasia||'Não informado'}\n${e.tipo||'CNPJ'}: ${e.doc||'—'} · Cidade/UF: ${[e.cidade,e.uf].filter(Boolean).join('/')||'—'}`,
    `COLABORADOR\nNome: ${f.nome||'—'}\nCargo: ${f.cargo||f.funcao||'—'} · Setor: ${f.departamento||'—'}\nCPF: ${(d=>d.length===11?d.slice(0,3)+'.***.***-'+d.slice(9):(d?'***':'—'))(String(f.cpf||'').replace(/\D/g,''))} · Matrícula/PIN: ${f.matricula||f.pin||'—'}\nAdmissão: ${S.brOf(f.admissao)||'—'} · Escala: ${f.escala||'—'}`]];
}
function horarioTrabalhoFolha(){
  const e=S.get('empregador',{})||{},horas=[e.hEntrada??'08:00',e.hSaiInt??'12:00',e.hEntInt??'14:00',e.hSaida??'18:00'].filter(Boolean).join('  ')||'Não informado';
  const sabado=[e.hSabEntrada??'08:00',e.hSabSaida??'12:00'].filter(Boolean).join('  ')||'Não informado';
  return ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map((dia,i)=>[dia,i===0?(e.dsr==='Não'?horas:'DSR'):i===6?sabado:horas]);
}
function totaisCartaoFolha(d){
  return {dias:d.linhas.filter(l=>l.trabalhado>0).length,faltas:d.tot.faltas,dsrs:d.linhas.filter(l=>/DSR/.test(l.ocorrencia)).length,folgas:d.linhas.filter(l=>/FOLGA/.test(l.ocorrencia)&&!/DSR/.test(l.ocorrencia)).length,
    row:['Totais','—','—','—','—',S.toHHMM(d.linhas.reduce((n,l)=>n+l.previsto,0)),S.toHHMM(d.tot.trabalhado),S.toHHMM(d.tot.extras),S.toHHMM(d.tot.faltantes),S.toSaldo(d.linhas.reduce((n,l)=>n+(l.saldo||0),0)),'—']};
}
function corCelulaFolha(col,value){if(col===7)return 'sheet-credit';if(col===8)return 'sheet-debit';if(col===9)return /^-/.test(value)?'sheet-debit':/^\+/.test(value)?'sheet-credit':'';if(col===10){if(/AFASTADO|AFASTAMENTO|MATERNIDADE/.test(value))return 'sheet-away';if(/FALTA/.test(value)&&!/JUSTIFICADA|ABONADA/.test(value)||/SUSPENSÃO/.test(value))return 'sheet-debit';if(/DSR|FOLGA/.test(value))return 'sheet-rest';if(/ATESTADO|AFASTAMENTO/.test(value))return 'sheet-credit';}return '';}
function bancoCartaoFolha(d){return [['Crédito',S.toHHMM(d.banco.creditos),'sheet-credit'],['Débito',S.toHHMM(d.banco.debitos),'sheet-debit'],['Saldo do Mês',S.toSaldo(d.banco.creditos-d.banco.debitos),d.banco.creditos-d.banco.debitos<0?'sheet-debit':'sheet-credit'],['Saldo Acumulado',S.toSaldo(d.banco.atual),d.banco.atual<0?'sheet-debit':'sheet-credit']];}
const gerarFolhaMTE=(pin,ini,fim)=>S.dadosFolha(pin,ini,fim); // consulta S.buscaNaEscala() em cada dia

const LEGENDA='FALTA = dia sem batida e sem folga/feriado | FOLGA = folga prevista em escala | FERIADO = feriado cadastrado | _ = batida tratada/movida com motivo obrigatório | *N = hora noturna reduzida 22h-05h (Art. 73 CLT)';
const preLegenda=f=>f&&f.intervalo&&f.intervalo.preAssinalado?`Intervalo pré-assinalado ${f.intervalo.inicio||'12:00'}-${f.intervalo.fim||'13:00'} - Art. 71`:'';

function cabecalhoFolhaHTML(f,ini,fim){
  const e=S.get('empregador',{})||{};
  return `<header class="sheet-top"><img src="${S.esc(e.logo||S.logoApp())}" alt="Logo da empresa"><div><h3 class="sheet-title">Espelho de Ponto</h3><div class="sheet-issued">Emissão: ${S.esc(S.getHoraOficial().toLocaleString('pt-BR'))} · Período: ${S.brOf(ini)} a ${S.brOf(fim)}</div></div></header>
  <div class="sheet-identification"><div class="sheet-people">${S.dadosCabecalhoFolha(f,ini,fim)[0].map(t=>`<div>${S.esc(t).replace(/\n/g,'<br>')}</div>`).join('')}</div><section class="sheet-box"><div class="sheet-box-title">Horário de Trabalho</div><table class="sheet-work-hours" aria-label="Horário de trabalho padrão da empresa"><tbody>${S.horarioTrabalhoFolha().map(([dia,horas])=>`<tr><th scope="row">${dia}</th><td>${S.esc(horas)}</td></tr>`).join('')}</tbody></table></section></div>`;
}
function htmlFolha(pin,ini,fim){
  if(!pin||!ini||!fim)return '<div class="alert err">Selecione funcionário e período.</div>';
  const d=S.dadosFolha(pin,ini,fim),m=S.modeloEspelho(d),t=S.totaisCartaoFolha(d),e=S.get('empregador',{})||{};
  const cells=r=>r.map((c,i)=>`<td class="${S.corCelulaFolha(i,c)}">${S.esc(c)}</td>`).join('');
  return `<div class="folha sheet-a4" data-doc-completo="1">${cabecalhoFolhaHTML(d.f,ini,fim)}
    <div class="tbl-wrap"><table class="sheet-daily"><thead><tr>${m.head.map((x,i)=>`<th class="${S.corCelulaFolha(i,x)}">${S.esc(x)}</th>`).join('')}</tr></thead><tbody>${m.body.map(r=>`<tr>${cells(r)}</tr>`).join('')}</tbody><tfoot><tr>${cells(t.row)}</tr></tfoot></table></div>
    <p class="sheet-day-counts">Dias Trabalhados: <b>${t.dias}</b> · Dias de Falta: <b class="sheet-debit">${t.faltas}</b> · DSRs: <b class="sheet-rest">${t.dsrs}</b> · Folgas: <b class="sheet-rest">${t.folgas}</b></p>
    <div class="sheet-summary" aria-label="Resumo mensal da folha">${m.resumo.flat().map(([t,v])=>`<div><span>${S.esc(t)}: <strong>${S.esc(v)}</strong></span></div>`).join('')}</div>
    <div class="sheet-bottom"><section class="sheet-box"><div class="sheet-box-title">Banco de Horas</div><div class="sheet-bank">${S.bancoCartaoFolha(d).map(([t,v,c])=>`<div><span>${t}</span><strong class="${c}">${v}</strong></div>`).join('')}</div></section><section class="sheet-box"><div class="sheet-box-title">Observações</div><div class="sheet-notes">${m.notas.map(t=>`<p>${S.esc(t)}</p>`).join('')}</div></section></div>
    <p class="sheet-awareness">${S.FOLHA_CIENCIA}</p><p class="sheet-place">Local: ${S.esc([e.cidade,e.uf].filter(Boolean).join('/')||'________________')} · Data: ____/____/________</p><div class="assin"><div>Colaborador</div><div>Empregador</div></div>
    <footer class="sheet-footer">${S.FOLHA_RODAPE}</footer></div>`;
}
/* Official sheet renderer shared by individual, batch, portal, link and ZIP. */
async function gerarPDFComLogo(dados){
  await S.garantirLib('pdf');
  const lista=dados.folhas||(dados.pins||[dados.pin]).map(p=>S.dadosFolha(p,dados.ini,dados.fim));
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),e=S.get('empregador',{})||{};
  const rgb=token=>{const ctx=document.createElement('canvas').getContext('2d');if(!ctx)return [35,50,75];ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue(token).trim();ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);};
  const palette={ink:rgb('--sheet-ink'),navy:rgb('--sheet-navy'),rule:rgb('--sheet-rule'),paper:rgb('--sheet-paper'),heading:rgb('--sheet-heading'),zebra:rgb('--sheet-zebra'),credit:rgb('--sheet-credit'),debit:rgb('--sheet-debit'),rest:rgb('--sheet-rest'),away:rgb('--sheet-away')};
  let image=null;try{image=await new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=e.logo||S.logoApp();});}catch(_){}
  const footer=()=>{doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(...palette.ink);doc.setDrawColor(...palette.rule);doc.line(10,281,200,281);doc.text(S.FOLHA_RODAPE,105,285,{align:'center'});};
  const frame=(x,y,w,h,title)=>{doc.setDrawColor(...palette.rule);doc.setLineWidth(.18);doc.rect(x,y,w,h);doc.setFillColor(...palette.heading);doc.rect(x,y,w,5,'F');doc.setTextColor(...palette.navy);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(title,x+2,y+3.5);};
  let first=true;
  for(const d of lista){
    const m=S.modeloEspelho(d),t=S.totaisCartaoFolha(d),chunks=[];for(let i=0;i<m.body.length;i+=31)chunks.push(m.body.slice(i,i+31));if(!chunks.length)chunks.push([]);
    for(let idx=0;idx<chunks.length;idx++){
      if(!first)doc.addPage();first=false;
      if(image){const ratio=Math.min(25/image.width,13/image.height);try{doc.addImage(image,10,8,image.width*ratio,image.height*ratio);}catch(_){}}
      doc.setTextColor(...palette.navy);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('Espelho de Ponto',40,14);
      doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...palette.ink);doc.text(`Emissão: ${S.getHoraOficial().toLocaleString('pt-BR')} · Período: ${S.brOf(d.ini)} a ${S.brOf(d.fim)}`,40,20);
      doc.setDrawColor(...palette.navy);doc.setLineWidth(.5);doc.line(10,24,200,24);
      const common={palette,compact:true,cellPadding:.7,fontSize:6.5};
      const peopleEnd=S.pdfTabelaPadrao(doc,{...common,y:27,head:null,body:S.dadosCabecalhoFolha(d.f,d.ini,d.fim)[0].map(x=>[x]),widths:[99],tableWidth:99,left:10});
      const hoursEnd=S.pdfTabelaPadrao(doc,{...common,y:27,left:113,tableWidth:87,head:[{content:'Horário de Trabalho',colSpan:2}],body:S.horarioTrabalhoFolha(),widths:[13,74],fontSize:6.5,cellPadding:.7});
      let y=Math.max(peopleEnd,hoursEnd)+3;
      const longStatuses=chunks[idx].filter(r=>String(r[10]).length>22).length;
      y=S.pdfTabelaPadrao(doc,{...common,y,head:m.head,body:chunks[idx],foot:idx===chunks.length-1?[t.row]:[],widths:[12,13,13,13,13,16,17,15,25,15,38],fontSize:longStatuses>10?5.5:6.3,cellPadding:longStatuses>10?.3:.43,cellStyle:c=>{const role=S.corCelulaFolha(c.column.index,String(c.cell.raw));return role==='sheet-away'?palette.away:role==='sheet-credit'?palette.credit:role==='sheet-debit'?palette.debit:role==='sheet-rest'?palette.rest:null;}})+3;
      if(idx===chunks.length-1){
        doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...palette.ink);doc.text(`Dias Trabalhados: ${t.dias} · Dias de Falta: ${t.faltas} · DSRs: ${t.dsrs} · Folgas: ${t.folgas}`,10,y);y+=3;
        y=S.pdfTabelaPadrao(doc,{...common,y,head:null,body:m.resumo.map(r=>r.map(([t,v])=>`${t}: ${v}`)),widths:[63,64,63],fontSize:6.5})+3;
        doc.setFontSize(6);const lines=m.notas.flatMap(t=>doc.splitTextToSize(t,105)),capacity=Math.max(1,Math.floor((249-y-8)/2.7));
        const appendix=lines.length>capacity,visible=appendix?doc.splitTextToSize('* Marcações manuais/tratadas. Justificativas completas no anexo. Banco conforme fator da empresa.',105):lines;
        const h=Math.max(24,8+visible.length*2.7);frame(10,y,77,h,'Banco de Horas');frame(90,y,110,h,'Observações');
        S.bancoCartaoFolha(d).forEach(([title,v,c],i)=>{const x=12+(i%2)*37,yy=y+9+Math.floor(i/2)*8;doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(...palette.ink);doc.text(title,x,yy);doc.setFont('helvetica','bold');doc.setTextColor(...(c==='sheet-debit'?palette.debit:palette.credit));doc.text(v,x,yy+3);});
        doc.setTextColor(...palette.ink);doc.setFont('helvetica','normal');doc.setFontSize(6);visible.forEach((l,i)=>doc.text(l,92,y+8+i*2.7));
        doc.setFontSize(6.5);doc.text(S.FOLHA_CIENCIA,10,255);doc.text(`Local: ${[e.cidade,e.uf].filter(Boolean).join('/')||'________________'} · Data: ____/____/________`,10,260);
        doc.setDrawColor(...palette.rule);doc.setLineWidth(.2);doc.line(10,270,95,270);doc.line(115,270,200,270);doc.text('Colaborador',52.5,274,{align:'center'});doc.text('Empregador',157.5,274,{align:'center'});footer();
        if(appendix){doc.addPage();let ay=15;doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('ANEXO — OBSERVAÇÕES E JUSTIFICATIVAS',10,ay);ay+=7;doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`${d.f.nome} · ${S.brOf(d.ini)} a ${S.brOf(d.fim)}`,10,ay);ay+=8;
          m.notas.flatMap(t=>doc.splitTextToSize(t,190)).forEach(l=>{if(ay>273){footer();doc.addPage();ay=14;}doc.text(l,10,ay);ay+=3.3;});footer();}
      }else footer();
    }
  }
  return {doc,base64:doc.output('datauristring').split(',')[1],blob:doc.output('blob')};
}
async function pdfFolhas(pins,ini,fim,nomeArq){
  const {doc}=await S.gerarPDFComLogo({pins,ini,fim});
  doc.save(nomeArq||`Folha_MTE_${pins.length>1?'Lote':(S.funcPorPin(pins[0])||{}).nome.replace(/\s+/g,'_')}_${ini}_${fim}.pdf`);
  S.log(`Exportou PDF de folha (${pins.length} funcionário(s)) ${S.brOf(ini)}–${S.brOf(fim)}`);
}


  return {miniResumoFolha,FOLHA_RODAPE,FOLHA_CIENCIA,LEGENDA,preLegenda,modeloEspelho,dadosCabecalhoFolha,horarioTrabalhoFolha,totaisCartaoFolha,corCelulaFolha,bancoCartaoFolha,gerarFolhaMTE,cabecalhoFolhaHTML,htmlFolha,gerarPDFComLogo,pdfFolhas};
  }

  namespace.definir('reports.folha', Object.freeze({ criar }));
})(window.PontoProOperacional);
