/* Etapa 4: documentos e exportações compartilhadas; regras permanecem no domínio. */
(function (namespace) {
  'use strict';

  function criar(S) {
function identidadeDocumentousuario='Conta '+(S.getConta()||'—')){
  const d=S.getHoraOficial(),g=S.getGerenciador()||{nome:'Portal do Empregado',funcao:'Autoatendimento'},dev=typeof devCfg==='function'?S.devCfg():{nome:'Ponto Pro Gestão'};
  return {quando:`${S.brOf(S.isoOf(d))} às ${S.hhmm(d)}`,usuario:String(usuario||S.getConta()||'—'),gestor:`${g.nome} — ${g.funcao}`,app:'Ponto Pro Gestão • Desenhado em conformidade com as diretrizes da Portaria MTE 671/2021'};
}
function cabecalhoDocumentoHTMLtitulo,subtitulo=''){
  const e=S.get('empregador',{})||{},end=[e.logradouro,e.numero,e.complemento,e.bairro,`${e.cidade||''}/${e.uf||''}`,e.cep&&`CEP ${e.cep}`].filter(Boolean).join(', ');
  return `<header class="doc-header"><img src="${e.logo||S.logoApp()}" alt="Logo da empresa"><div><div class="doc-brand">${S.esc(e.fantasia||e.razao||'Ponto Pro Gestão')}</div><div class="doc-company">${S.esc(e.razao||'Empregador não informado')}</div><div>${S.esc(e.tipo||'CNPJ')}: ${S.esc(e.doc||'—')} • CEI/CAEPF/CNO: ${S.esc(e.cei||'—')}</div><div>${S.esc(end||'Endereço não informado')}</div><div>${S.esc(e.email||'')}</div></div></header><div class="doc-title">${S.esc(titulo||'Documento')}</div>${subtitulo?`<div class="doc-subtitle">${S.esc(subtitulo)}</div>`:''}`;
}
function rodapeDocumentoHTMLusuario){const m=S.identidadeDocumento(usuario);return `<footer class="doc-footer"><div><strong>${S.esc(m.app)}</strong><br>Emitido em ${S.esc(m.quando)} • Usuário: ${S.esc(m.usuario)}<br>Gestor responsável: ${S.esc(m.gestor)}</div><div>Documento gerado pelo Ponto Pro Gestão</div></footer>`;}
function rodapeLegalusuario){const m=S.identidadeDocumento(usuario);return `Gerado em ${m.quando} • Usuário: ${m.usuario} • Gestor: ${m.gestor} • ${m.app}`;}
function pdfCabecalhoPadraodoc,titulo,subtitulo=''){
  const e=S.get('empregador',{})||{},end=[e.logradouro,e.numero,e.complemento,e.bairro,`${e.cidade||''}/${e.uf||''}`,e.cep&&`CEP ${e.cep}`].filter(Boolean).join(', ');
  if(e.logo){try{doc.addImage(e.logo,(e.logo.match(/image\/(png|jpe?g)/i)||[,'PNG'])[1].toUpperCase().replace('JPG','JPEG'),10,7,27,18);}catch(_){}}
  doc.setTextColor(12,34,70);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(String(e.fantasia||e.razao||'Ponto Pro Gestão').slice(0,64),41,11);
  doc.setTextColor(35,50,75);doc.setFontSize(9);doc.text(String(e.razao||'Empregador não informado').slice(0,92),41,16);
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text(`${e.tipo||'CNPJ'}: ${e.doc||'—'} • CEI/CAEPF/CNO: ${e.cei||'—'}`,41,21);doc.text(String(end||'Endereço não informado').slice(0,112),41,25);
  doc.setDrawColor(18,58,115);doc.setLineWidth(.7);doc.line(10,30,200,30);doc.setTextColor(12,34,70);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(String(titulo||'Documento').toUpperCase(),105,37,{align:'center'});
  if(subtitulo){doc.setTextColor(82,98,122);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(String(subtitulo).slice(0,135),105,42,{align:'center'});return 47;}return 43;
}
/* Shared A4 table layout: real cells, wrapped text and repeated headers. */
function pdfTabelaPadraodoc,{y,titulo,sub='',head,body,widths,fontSize=8,cellPadding=2,monochrome=false,compact=false,palette=null,tableWidth=190,left=10,foot=[],cellStyle=null}){
  doc.autoTable({startY:y,head:head?[head]:[],body:body.length?body:[['Nenhum registro no período.']],
    theme:'grid',foot,margin:{left,right:210-left-tableWidth,top:compact?14:47,bottom:compact?22:21},tableWidth,
    styles:{font:'helvetica',fontSize,cellPadding,lineWidth:.15,lineColor:palette?.rule||[211,222,232],textColor:palette?.ink||[35,50,75],overflow:'linebreak',valign:'middle'},
    headStyles:{fillColor:palette?.heading||(monochrome?[255,255,255]:[227,239,244]),textColor:palette?.navy||[18,58,83],fontStyle:'bold'},
    footStyles:{fillColor:palette?.heading||[227,239,244],textColor:palette?.ink||[35,50,75],fontStyle:'bold'},
    alternateRowStyles:{fillColor:palette?.zebra||(monochrome?[255,255,255]:[247,250,252])},
    didParseCell:c=>{const color=cellStyle?.(c);if(color)c.cell.styles.textColor=color;},
    columnStyles:Object.fromEntries((widths||[]).map((w,i)=>[i,{cellWidth:w}])),
    rowPageBreak:'avoid',showHead:'everyPage',
    willDrawPage:()=>{if(!compact&&doc.getCurrentPageInfo().pageNumber>1)S.pdfCabecalhoPadrao(doc,titulo,sub);}
  });return doc.lastAutoTable.finalY;
}
function pdfRodapesPadraodoc,usuario){
  const m=S.identidadeDocumento(usuario),n=doc.getNumberOfPages();
  for(let i=1;i<=n;i++){
    doc.setPage(i);doc.setDrawColor(156,173,195);doc.setLineWidth(.25);doc.line(10,280,200,280);
    doc.setTextColor(64,80,106);doc.setFont('helvetica','normal');doc.setFontSize(6.5);
    doc.text(m.app,10,284);
    doc.text(doc.splitTextToSize(`Emitido em ${m.quando} • Usuário: ${m.usuario}`,160),10,288);
    doc.text(doc.splitTextToSize(`Gestor responsável: ${m.gestor}`,160),10,292);
    doc.text(`Página ${i}/${n}`,200,292,{align:'right'});
  }
}

  return {identidadeDocumento,cabecalhoDocumentoHTML,rodapeDocumentoHTML,rodapeLegal,pdfCabecalhoPadrao,pdfTabelaPadrao,pdfRodapesPadrao};
  }

  namespace.definir('reports.documentos', Object.freeze({ criar }));
})(window.PontoProOperacional);
