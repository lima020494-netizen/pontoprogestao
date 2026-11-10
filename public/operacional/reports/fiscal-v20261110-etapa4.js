/* Etapa 4: documentos e exportações compartilhadas; regras permanecem no domínio. */
(function (namespace) {
  'use strict';

  function criar(S) {
/* XML AFD/ACJEF bem-formado */
function xmlConteudo(pin,ini,fim){
  const d=S.dadosFolha(pin,ini,fim),f=d.f,e=S.get('empregador',{})||{},dt=S.getHoraOficial();
  const t=(tag,v)=>`    <${tag}>${S.esc(v??'')}</${tag}>\n`;
  let x=`<?xml version="1.0" encoding="UTF-8"?>\n<folhaPonto portaria="671/2021">\n  <empregador>\n`;
  x+=t('razaoSocial',e.razao)+t('nomeFantasia',e.fantasia)+t('tipoInscricao',e.tipo)+t('inscricao',e.doc)+t('ceiCaepfCno',e.cei)
   +t('endereco',`${e.logradouro}, ${e.numero} ${e.complemento||''} - ${e.bairro} - ${e.cidade}/${e.uf} - CEP ${e.cep}`)+t('email',e.email);
  x+=`  </empregador>\n  <trabalhador>\n`+t('nome',f.nome)+t('cpf',f.cpf)+t('funcao',f.funcao)+t('departamento',f.departamento)+t('admissao',f.admissao)+t('escala',f.escala)+`  </trabalhador>\n`;
  x+=`  <relatorio>\n`+t('emissao',`${S.brOf(S.isoOf(dt))} ${S.hhmm(dt)}`)+t('periodoInicio',ini)+t('periodoFim',fim)
   +t('fonteHorario',S.getNtpOk()?'SERVIDOR NTP':'LOCAL')+t('geradoPor',S.assinaGerenciador())+`  </relatorio>\n  <marcacoes>\n`;
  d.linhas.forEach(l=>{
    x+=`    <dia data="${l.data}" semana="${S.esc(l.dia)}">\n`;
    [['entrada',l.e1],['saidaIntervalo',l.e2],['entradaIntervalo',l.e3],['saida',l.e4]]
      .forEach(([k,v])=>{ if(v) x+=`      <${k}>${v}</${k}>\n`; });
    x+=(l.noturno?`      <horaNoturna>${S.toHHMM(l.noturno)}</horaNoturna>\n`:'')+`      <horasTrabalhadas>${S.toHHMM(l.trabalhado)}</horasTrabalhadas>\n      <saldoDia>${S.toSaldo(l.saldo)}</saldoDia>\n`;
    x+=`      <ocorrencia>${S.esc(l.ocorrencia)}</ocorrencia>\n      <fonte>${S.esc(l.fonte)}</fonte>\n`;
    if(l.mov) x+=`      <tratamento>${S.esc(l.mov)}</tratamento>\n`;
    if(l.nsr) x+=`      <nsr>${S.esc(l.nsr)}</nsr>\n`;
    x+=`    </dia>\n`;
  });
  x+=`  </marcacoes>\n  <resumo>\n`;
  x+=`    <totalFaltas>${d.tot.faltas}</totalFaltas>\n    <faltasJustificadas>${d.tot.faltasJust}</faltasJustificadas>\n    <faltasInjustificadas>${d.tot.faltasInj}</faltasInjustificadas>\n`;
  x+=`    <totalFolgas>${d.tot.folgas}</totalFolgas>\n    <totalFeriados>${d.tot.feriados}</totalFeriados>\n`;
  x+=`    <totalHorasExtras>${S.toHHMM(d.tot.extras)}</totalHorasExtras>\n    <totalHorasFaltantes>${S.toHHMM(d.tot.faltantes)}</totalHorasFaltantes>\n`;
  x+=`    <saldoAnterior>${S.toSaldo(d.banco.anterior)}</saldoAnterior>\n    <creditos>${S.toHHMM(d.banco.creditos)}</creditos>\n    <debitos>${S.toHHMM(d.banco.debitos)}</debitos>\n    <saldoAtual>${S.toSaldo(d.banco.atual)}</saldoAtual>\n`;
  d.just.forEach(j=>x+=`    <justificativa>${S.esc(j)}</justificativa>\n`);
  x+=`    <legenda>${S.esc(S.LEGENDA)}</legenda>\n  </resumo>\n`;
  if(S.preLegenda(f)) x+=`  <intervaloPreAssinalado>${S.esc(S.preLegenda(f))}</intervaloPreAssinalado>\n`;
  x+=`  <rodape>${S.esc(S.rodapeLegal())}</rodape>\n</folhaPonto>\n`;
  return x;
}
const nomeXML((f,ini)=>`${(f.nome||'FUNC').toUpperCase().replace(/[^A-Z]+/g,'_')}_${ini.slice(5,7)}_${ini.slice(0,4)}.xml`;
function xmlFolha(pin,ini,fim){
  const f=S.funcPorPin(pin); S.baixar(S.nomeXML(f,ini),S.xmlConteudo(pin,ini,fim),'application/xml;charset=utf-8');
  S.log(`Exportou XML de ${f.nome} ${S.brOf(ini)}–${S.brOf(fim)}`);
}

/* ===================== UTILITÁRIOS AFD ===================== */
const soNum(v=>String(v||'').replace(/\D/g,'');
const padL((v,n,c='0')=>String(v??'').slice(-n).padStart(n,c);
const padR((v,n)=>{let t=String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return t.slice(0,n).padEnd(n,' ');};
function dtTZ(iso,hm){return `${iso}T${(hm||'00:00').slice(0,5)}:00-0300`;}
function crc16(str){let crc=0;for(const ch of str){crc^=ch.charCodeAt(0)&0xff;for(let i=0;i<8;i++)crc=(crc&1)?(crc>>>1)^0x8408:crc>>>1;}return crc.toString(16).toUpperCase().padStart(4,'0');} // CRC-16/KERMIT
async function sha256(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}

/* ===================== AFD — Anexo V Portaria 671 (REP-P, leiaute 003) ===================== */
async function gerarAFD(ini,fim){
  if(!ini||!fim)return alert('Selecione o período.');
  const e=S.get('empregador',{})||{},d=S.devCfg(),agora=S.getHoraOficial();
  const tpE=e.tipo==='CPF'?'2':'1';
  const regs=[];
  // Tipo 1 — cabeçalho
  let h='000000000'+'1'+tpE+S.padL(S.soNum(e.doc),14)+S.padL(S.soNum(e.cei),14)+S.padR(e.razao,150)+S.padL(S.soNum(d.registroINPI),17)
    +ini+fim+S.dtTZ(S.isoOf(agora),S.hhmm(agora))+'003'+(d.tipoDoc==='CNPJ'?'1':'2')+S.padL(S.soNum(d.doc),14)+S.padR(d.programa,30);
  regs.push(h+S.crc16(h));
  // Tipo 7 — marcações REP-P
  const bs=S.get('batidas',[]).filter(b=>!b.excluida&&b.data>=ini&&b.data<=fim).sort((a,b)=>a.nsr.localeCompare(b.nsr));
  let prevHash='';
  for(const b of bs){
    let r=S.padL(b.nsr,9)+'7'+S.dtTZ(b.data,b.hora)+S.padL(S.soNum(b.cpf),12)+S.dtTZ(b.data,b.hora)+'01'+(b.fonte&&/SERVIDOR/.test(b.fonte)?'0':'1');
    const hsh=await S.sha256(r+prevHash); prevHash=hsh; regs.push(r+hsh);
  }
  // Tipo 9 — trailer
  regs.push('999999999'+S.padL(0,9)+S.padL(0,9)+S.padL(0,9)+S.padL(0,9)+S.padL(0,9)+S.padL(bs.length,9)+'9');
  const nome=`AFD${S.padL(S.soNum(d.registroINPI)||'0',17)}${S.padL(S.soNum(e.doc),14)}REP_P.txt`;
  S.baixar(nome,regs.join('\r\n')+'\r\n','text/plain;charset=iso-8859-1');
  S.log(`Gerou AFD oficial ${S.brOf(ini)}–${S.brOf(fim)} (${bs.length} marcações)`);
}

/* ===================== AEJ — Anexo VI Portaria 671 (leiaute 001) ===================== */
function gerarAEJ(ini,fim){
  if(!ini||!fim)return alert('Selecione o período.');
  const e=S.get('empregador',{})||{},d=S.devCfg(),fs=S.get('funcionarios',[]);
  const L=[],cnt={};const add=(t,arr)=>{L.push([t,...arr].join('|'));cnt[t]=(cnt[t]||0)+1;};
  add('01',[e.tipo==='CPF'?'2':'1',S.soNum(e.doc),'',S.soNum(e.cei),e.razao||'',ini,fim,'001']);
  add('02',['1','3',S.soNum(d.registroINPI)||'00000000000000000']);
  fs.forEach((f,i)=>add('03',[i+1,S.soNum(f.cpf),f.nome]));
  const hc=`${e.hEntrada||'08:00'}`.replace(':','');
  add('04',['1',S.padL(S.cargaEscala('5x2'),4),(e.hEntrada||'08:00').replace(':',''),(e.hSaiInt||'12:00').replace(':',''),(e.hEntInt||'14:00').replace(':',''),(e.hSaida||'18:00').replace(':','')]);
  fs.forEach((f,i)=>{
    const bs=S.get('batidas',[]).filter(b=>!b.excluida&&b.pin===f.pin&&b.data>=ini&&b.data<=fim).sort(ordemJornada);
    const seq={};bs.forEach(b=>{const jd=S.jornadaDe(b);seq[jd]=(seq[jd]||0)+1;const n=seq[jd];
      add('05',[i+1,S.dtTZ(b.data,b.hora),'1',/Entrada/.test(b.tipo)?'E':'S',Math.ceil(n/2),b.manual?'I':'O','1',b.movimento||b.motivo||'']);});
    S.get('ocorrencias',[]).filter(o=>o.pin===f.pin&&o.data>=ini&&o.data<=fim).forEach(o=>add('06',[i+1,o.data,o.tipo==='Falta'?'2':'1',S.padL(S.cargaEscala(f.escala),4),o.motivo||o.tipo]));
  });
  add('07',[d.programa,d.versao,d.tipoDoc==='CNPJ'?'1':'2',S.soNum(d.doc),d.nome]);
  L.push(['99',...['01','02','03','04','05','06','07'].map(t=>cnt[t]||0)].join('|'));
  S.baixar(`AEJ_${S.soNum(e.doc)}_${ini}_${fim}.txt`,L.join('\r\n')+'\r\n');
  S.log(`Gerou AEJ oficial ${S.brOf(ini)}–${S.brOf(fim)}`);
}


/* ===================== ATESTADO TÉCNICO E TERMO DE RESPONSABILIDADE (art. 89) ===================== */
async function atestadoTecnico(){
  await S.sincronizarDevGlobal();
  const e=S.get('empregador',{})||{},d=S.devCfg(),dt=S.getHoraOficial();
  const html=`<div class="folha" data-doc-completo="1" style="font-size:13px;line-height:1.55">
  ${S.cabecalhoDocumentoHTML('Atestado Técnico e Termo de Responsabilidade','Portaria MTP nº 671/2021 • Art. 89 a 91')}
  <table><thead><tr><th>Identificação</th><th>Dados</th></tr></thead><tbody>
  <tr><td>Fabricante/Desenvolvedor</td><td>${S.esc(d.nome)} ${d.empresa?'— '+S.esc(d.empresa):''} • ${S.esc(d.tipoDoc)}: ${S.esc(d.doc||'________________')} • ${S.esc(d.email||'')} ${S.esc(d.telefone||'')}</td></tr>
  <tr><td>Programa</td><td>${S.esc(d.programa)} — versão ${S.esc(d.versao)} — Tipo: ${S.esc(d.tipoRep)} — Registro INPI nº ${S.esc(d.registroINPI||'________________')}</td></tr>
  <tr><td>Empregador usuário</td><td>${S.esc(e.razao||'')} — ${S.esc(e.fantasia||'')} — ${S.esc(e.tipo||'CNPJ')}: ${S.esc(e.doc||'')}</td></tr></tbody></table>
  <p>Minuta para análise e assinatura do responsável técnico: o programa foi <b>desenhado em conformidade com as diretrizes da Portaria MTE 671/2021</b>, contemplando: (I) não permite alteração ou exclusão das marcações originais (data, hora e NSR); (II) não possui funcionalidade de restrição de horário à marcação; (III) não permite marcação automática ou pré-assinalada; (IV) não exige autorização prévia para marcação; (V) emite comprovante de registro de ponto a cada marcação; (VI) gera o Arquivo Fonte de Dados (AFD) e o Arquivo Eletrônico de Jornada (AEJ) nos leiautes oficiais; (VII) registra a identificação de quem efetuou tratamentos, com motivo obrigatório; (VIII) utiliza hora oficial sincronizada com servidor de tempo.</p>
  <p>A emissão deste documento não constitui homologação oficial. A validade das declarações depende da revisão e assinatura do responsável técnico, que assume a responsabilidade pela veracidade das informações e pela configuração utilizada.</p>
  <p>${S.esc(d.cidade)}, ${S.brOf(S.isoOf(dt))}.</p>
  <div class="assin"><div>${S.esc(d.nome)}<br>Desenvolvedor / Responsável técnico</div><div>${S.esc(e.razao||'Empregador')}<br>Ciente do empregador</div></div>${S.rodapeDocumentoHTML(S.getConta()||'Responsável técnico')}</div>`;
  S.abrirModal(`<div class="row"><h3>Atestado Técnico</h3><button class="btn sm right" onclick="pdfAtestadoTecnico()">📄 Baixar PDF</button><button class="btn sm ghost" onclick="fecharModal()">✕</button></div><div id="at-body">${html}</div>`);
  S.log('Emitiu Atestado Técnico e Termo de Responsabilidade');
}
async function pdfAtestadoTecnico(){
  await S.garantirLib('pdf');
  const out=S.$('at-body');if(!out)return;
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),titulo='Atestado Técnico',sub='Termo de Responsabilidade • Portaria MTP nº 671/2021 • Art. 89 a 91';
  let y=S.pdfCabecalhoPadrao(doc,titulo,sub);
  const body=[...out.querySelectorAll('tbody tr')].map(tr=>[...tr.cells].map(td=>td.textContent.trim()));
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Identificação','Dados'],body,widths:[48,142]})+4;
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Declarações e responsabilidade'],body:[...out.querySelectorAll('p')].map(p=>[p.textContent.trim()]),widths:[190],fontSize:8})+16;
  if(y+16>275){doc.addPage();y=S.pdfCabecalhoPadrao(doc,titulo,sub)+16;}
  const d=S.devCfg(),e=S.get('empregador',{})||{};doc.setDrawColor(120,135,151);doc.line(10,y,95,y);doc.line(115,y,200,y);doc.setFontSize(8);
  doc.text(doc.splitTextToSize(`${d.nome}\nDesenvolvedor / Responsável técnico`,85),52.5,y+5,{align:'center'});doc.text(doc.splitTextToSize(`${e.razao||'Empregador'}\nCiente do empregador`,85),157.5,y+5,{align:'center'});
  S.pdfRodapesPadrao(doc,S.getConta()||'Responsável técnico');doc.save('Atestado_Tecnico.pdf');S.log('Exportou PDF do Atestado Técnico');
}


function conteudoAFDOficial(ini,fim){
  const e=S.get('empregador',{})||{},dmy=iso=>iso.slice(8,10)+iso.slice(5,7)+iso.slice(0,4),ag=S.getHoraOficial();
  const bs=S.get('batidas',[]).filter(b=>!b.excluida&&b.data>=ini&&b.data<=fim).sort((a,b)=>a.nsr.localeCompare(b.nsr));
  const cnpj=S.padL(S.soNum(e.doc),14);
  const L=['000000000'+'1'+(e.tipo==='CPF'?'2':'1')+cnpj+S.padL(S.soNum(e.cei),12)+S.padR(e.razao,150)+dmy(ini)+dmy(fim)+dmy(S.isoOf(ag))+S.hhmm(ag).replace(':','')];
  bs.forEach(b=>L.push(S.padL(b.nsr,9)+'3'+dmy(b.data)+b.hora.replace(':','')+cnpj+S.padL(S.soNum(b.cpf),11)));
  L.push('999999999'+S.padL(bs.length,9)+'Ponto Pro Gestão');
  return L.join('\r\n')+'\r\n';
}
function gerarAFDOficial(ini,fim){
  if(!ini||!fim||ini>fim)return alert('Selecione um período válido.');
  const e=S.get('empregador',{})||{};
  S.baixar(`AFD_${S.soNum(e.doc)}_${ini}_${fim}.txt`,S.conteudoAFDOficial(ini,fim));
  S.log(`Gerou AFD oficial ${S.brOf(ini)}–${S.brOf(fim)}`);
}


  return {xmlConteudo,nomeXML,xmlFolha,soNum,padL,padR,dtTZ,crc16,sha256,gerarAFD,gerarAEJ,atestadoTecnico,pdfAtestadoTecnico,conteudoAFDOficial,gerarAFDOficial};
  }

  namespace.definir('reports.fiscal', Object.freeze({ criar }));
})(window.PontoProOperacional);
