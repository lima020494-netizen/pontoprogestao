/* Etapa 4: documentos e exportações compartilhadas; regras permanecem no domínio. */
(function (namespace) {
  'use strict';

  function criar(S) {
function baixarnome,conteudo,tipo){const b=new Blob([conteudo],{type:tipo||'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}

async function comprovantePDF(b){
  await S.garantirLib('pdf');
  const {jsPDF}=window.jspdf,{linhas}=await S.comprovanteTexto(b),medida=new jsPDF({unit:'mm',format:[58,100]});
  const rows=linhas.map((l,i)=>{const d=S.cpDestaque(l),size=d?8:6.5;medida.setFont('courier',S.cpNegrito(l,i)?'bold':'normal');medida.setFontSize(size);return {text:medida.splitTextToSize(String(l),54),size,bold:S.cpNegrito(l,i),step:d?3.1:2.3};});
  const altura=Math.max(50,rows.reduce((n,r)=>n+r.text.length*r.step,7)),doc=new jsPDF({unit:'mm',format:[58,altura]});
  let y=2.5;rows.forEach(r=>{doc.setFont('courier',r.bold?'bold':'normal');doc.setFontSize(r.size);r.text.forEach(t=>{doc.text(t,29,y,{align:'center'});y+=r.step;});});
  doc.save(`Comprovante_${b.nsr}.pdf`);
}

function gradeEscala(ini,fim){
  const dias=S.diasPeriodo(ini,fim||addDias(ini,6)), fs=S.get('funcionarios',[]).filter(f=>f.status!=='Desligado');
  return [['ID (PIN)','Nome',...dias.map(d=>S.brOf(d))],...fs.map(f=>[f.pin,f.nome,...dias.map(d=>S.celulaEscala(S.buscaNaEscala(f.pin,d)))])];
}
async function planilhaEscalaini,fim,fmt){
  if(fmt==='xlsx') await S.garantirLib('xlsx');
  const g=gradeEscala(ini,fim), nome=`Escala_${ini}_${fim}`;
  if(fmt==='xlsx'&&window.XLSX){const ws=XLSX.utils.aoa_to_sheet(g);ws['!cols']=[{wch:10},{wch:28},...g[0].slice(2).map(()=>({wch:13}))];
    const leg=XLSX.utils.aoa_to_sheet([['Como preencher'],['Horário de trabalho: 08:00-17:00 (ou só a entrada, 08:00)'],['DSR = descanso semanal remunerado'],['FOLGA = folga compensada'],['FOLGA DOMINGO = folga de domingo'],['Célula vazia = trabalhado no horário padrão'],['Não altere a coluna ID (PIN) nem a linha de datas.']]);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Escala');XLSX.utils.book_append_sheet(wb,leg,'Instruções');XLSX.writeFile(wb,nome+'.xlsx');return;}
  S.baixar(nome+'.csv','\uFEFF'+g.map(r=>r.join(';')).join('\n'),'text/csv;charset=utf-8');
}
const csvEscala=(i,f)=>S.planilhaEscala(i,f,'csv'), modeloCSVEscala=csvEscala;

async function pdfResumoBanco(){
  const p=S.dadosResumoBanco();if(!p.ini||!p.fim||p.ini>p.fim)return S.toast('Informe um período válido.');
  try{await S.garantirHistorico(p.ini);}catch(e){return S.toast('Histórico indisponível. Tente novamente antes de exportar.');}
  const r=S.dadosResumoBanco();
  await S.garantirLib('pdf');
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),titulo='Fechamento do Banco de Horas',sub=`Período ${S.brOf(r.ini)} a ${S.brOf(r.fim)} • Status: ${r.st}`;
  const totais=r.linhas.reduce((a,{b})=>({anterior:a.anterior+b.anterior,creditos:a.creditos+b.creditos,debitos:a.debitos+b.debitos,atual:a.atual+b.atual}),{anterior:0,creditos:0,debitos:0,atual:0});
  const body=r.linhas.map(({f,b})=>[`${f.nome}\n${f.funcao||'—'}`,f.status||'Ativo',S.toSaldo(b.anterior),'+'+S.toHHMM(b.creditos),'-'+S.toHHMM(b.debitos),S.toSaldo(b.atual)]);
  if(body.length)body.push([`Total (${r.linhas.length})`,'',S.toSaldo(totais.anterior),'+'+S.toHHMM(totais.creditos),'-'+S.toHHMM(totais.debitos),S.toSaldo(totais.atual)]);
  S.pdfTabelaPadrao(doc,{y:S.pdfCabecalhoPadrao(doc,titulo,sub),titulo,sub,head:['Colaborador / Cargo','Status','Saldo anterior','Créditos','Débitos','Saldo atual'],body,widths:[58,28,26,26,26,26]});
  S.pdfRodapesPadrao(doc,S.getConta()||'Gestor');doc.save(`Banco_Horas_${r.ini}_${r.fim}.pdf`);S.log('Exportou PDF consolidado do banco de horas');
}

async function csvResumoBanco(){
  const p=S.dadosResumoBanco();if(!p.ini||!p.fim||p.ini>p.fim)return S.toast('Informe um período válido.');
  try{await S.garantirHistorico(p.ini);}catch(e){return S.toast('Histórico indisponível. Tente novamente antes de exportar.');}
  const r=S.dadosResumoBanco(),q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv='\ufeff'+[['Colaborador','Cargo','Status','Saldo Anterior','Créditos','Débitos','Saldo Atual'].map(q).join(';'),
    ...r.linhas.map(({f,b})=>[f.nome,f.funcao||'',f.status||'Ativo',S.toSaldo(b.anterior),S.toHHMM(b.creditos),S.toHHMM(b.debitos),S.toSaldo(b.atual)].map(q).join(';'))].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`Banco_Horas_Consolidado_${r.ini}_${r.fim}.csv`;a.click();
}

function textoMovBancod){return !d.vigente?'Fora da vigência':d.saldo>0?'Crédito - Hora Extra':d.saldo<0?S.regraOcorrencia(d.ocorrencia).compensacao?'Débito - Folga Compensatória':'Débito - Carga incompleta':d.ocorrencia||'Sem movimentação';}
function linhasExtratoBancob){let acc=b.anterior;return b.dias.map(d=>{acc+=d.saldo;const oc=d.ocorrencia&&!S.textoMovBanco(d).includes(d.ocorrencia)?` (${d.ocorrencia})`:'';return [S.brOf(d.data),S.toHHMM(d.previsto),S.toHHMM(d.trabalhado),S.textoMovBanco(d)+oc,d.saldo?S.toSaldo(d.saldo):'00:00',S.toSaldo(acc)];});}
async function pdfExtratoBanco(){
  const pin=S.$('bh-pin').value,ini=S.$('bh-ini').value,fim=S.$('bh-fim').value;
  if(!pin||!ini||!fim||ini>fim)return S.toast('Informe um colaborador e período válidos.');
  try{await S.garantirHistorico(ini);}catch(e){return S.toast('Histórico indisponível. Tente novamente antes de exportar.');}
  await S.garantirLib('pdf');
  const f=S.funcPorPin(pin)||{},b=calcBanco(pin,ini,fim),{jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'});
  const titulo='Extrato Individual do Banco de Horas',sub=`Período ${S.brOf(ini)} a ${S.brOf(fim)} • Vigência do banco: ${S.brOf(b.vigencia)}`;
  let y=S.pdfCabecalhoPadrao(doc,titulo,sub);
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Colaborador','CPF','PIN','Cargo'],body:[[f.nome||'—',S.cpfMascarado(f.cpf),pin,f.funcao||'—']],widths:[80,40,20,50]})+4;
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Saldo anterior','Créditos','Débitos','Saldo atual'],body:[[S.toSaldo(b.anterior),'+'+S.toHHMM(b.creditos),'-'+S.toHHMM(b.debitos),S.toSaldo(b.atual)]],widths:[47.5,47.5,47.5,47.5],fontSize:10})+4;
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Data','Previsto','Realizado','Movimentação / Ocorrência','Movimento','Saldo acumulado'],body:S.linhasExtratoBanco(b),widths:[22,20,20,72,26,30],fontSize:7.5,cellPadding:1.4,
    cellStyle:c=>c.section==='body'&&c.column.index>=4?(String(c.cell.raw).startsWith('-')?[185,28,28]:String(c.cell.raw).startsWith('+')?[21,128,61]:null):null});
  if(y>235){doc.addPage();y=20;}else y+=22;
  doc.setDrawColor(60,70,90);doc.setLineWidth(.3);doc.line(15,y,95,y);doc.line(115,y,195,y);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(35,50,75);
  doc.text('Gestor responsável',55,y+4,{align:'center'});doc.text(`${f.nome||'Colaborador'} — ciente`,155,y+4,{align:'center'});
  doc.setFontSize(7);doc.text('Declaro ciência dos lançamentos e do saldo apurado neste extrato.',105,y+11,{align:'center'});
  S.pdfRodapesPadrao(doc,S.getConta()||'Gestor');doc.save(`Extrato_Banco_${String(f.nome||pin).replace(/[^\w]+/g,'_')}_${ini}_${fim}.pdf`);S.log(`Exportou extrato do banco de horas PIN ${pin}`);
}

async function pdfDash(){
  await S.garantirLib('pdf');
  const {jsPDF}=window.jspdf,[ini,fim]=S.periodoDash(),doc=new jsPDF({unit:'mm',format:'a4'});
  const filtro=S.$('d-func').value,usuario=filtro?(S.funcPorPin(filtro)||{}).nome:'Todos os colaboradores';
  const titulo='Dashboard de Frequência',sub=`Período ${S.brOf(ini)} a ${S.brOf(fim)} • Filtro: ${usuario}`;
  let y=S.pdfCabecalhoPadrao(doc,titulo,sub);const out=S.$('dash-out');
  const limpa=s=>(s||'').replace(/[^\x20-\x7EÀ-ÿ—•]/g,'').trim();
  const indicadores=[...out.querySelectorAll('.ind')].map(el=>[limpa(el.querySelector('.ind-lbl')?.innerText),limpa(el.querySelector('.ind-val')?.innerText),limpa(el.querySelector('.ind-sub')?.innerText)]);
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Indicador','Valor','Detalhamento'],body:indicadores,widths:[65,30,95]})+5;
  const rows=[...out.querySelectorAll('table tbody tr')].map(tr=>[...tr.children].map(td=>limpa(td.innerText))).filter(r=>r.length>=4).map(r=>r.slice(0,4));
  y=S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Colaborador','Faltas','Atrasos','Carga incompleta'],body:rows,widths:[85,30,30,45]})+6;
  [['dash-canvas','Ranking de Presença'],['dash-canvas-f','Índice de Faltas']].forEach(([id,tit])=>{
    const c=S.$(id);if(!c||!c.width||!c.height)return;let img='';try{img=c.toDataURL('image/png');}catch(_){return;}
    const w=190,h=Math.min(160,w*c.height/c.width);
    if(y+h+10>276){doc.addPage();y=S.pdfCabecalhoPadrao(doc,titulo,sub);}
    doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(tit,10,y+4);y+=8;
    doc.addImage(img,'PNG',10,y,w,h);y+=h+6;
  });
  S.pdfRodapesPadrao(doc,usuario);doc.save('Dashboard_Frequencia.pdf');
}

async function baixarPDFFolha(){const p=S.periodoFolhaValido();if(!p||!S.$('fl-pin').value)return;try{await S.garantirHistorico(p.ini);}catch(e){}try{await S.garantirLib('pdf');}catch(e){return S.toast('PDF indisponível. Verifique a conexão e tente novamente.',5000);}try{await pdfFolhas([S.$('fl-pin').value],p.ini,p.fim);}catch(e){S.toast('Não foi possível gerar o PDF. Tente novamente.',5000);}}

function dadosFechamentoContadord,hoje=S.hojeISO()){
  const tot={...d.tot};
  const linhas=d.linhas.map(l=>{
    if(l.ocorrencia!=='FALTA')return {...l};
    const bs=S.batidasDia(d.f.pin,l.data),oc=S.ocorrenciaDia(d.f.pin,l.data);
    const faltaConcluida=l.data<hoje&&l.previsto>0&&!bs.length&&(!oc||S.regraOcorrencia(oc.tipo).falta);
    if(faltaConcluida)return {...l};
    tot.faltas=Math.max(0,tot.faltas-1);tot.faltasInj=Math.max(0,tot.faltasInj-1);
    if(!bs.length)tot.faltantes=Math.max(0,tot.faltantes-l.previsto);
    return {...l,ocorrencia:'',cls:'',descontoDia:0,descontoDsr:0};
  });
  return {...d,tot,linhas};
}
async function pacoteContador(){
  const mes=S.$('fl-mes')?.value;if(!/^\d{4}-\d{2}$/.test(mes||''))return S.toast('Selecione o mês do pacote.',4000);
  const [ano,m]=mes.split('-').map(Number),p={ini:mes+'-01',fim:mes+'-'+String(new Date(Date.UTC(ano,m,0)).getUTCDate()).padStart(2,'0')},fs=S.get('funcionarios',[]);
  try{await S.garantirHistorico(p.ini);await S.garantirLib('pdf');await S.garantirLib('zip');await S.garantirLib('xlsx');}catch(e){return S.toast('Exportação indisponível. Verifique a conexão e tente novamente.',5000);}
  if(!fs.length)return S.toast('Nenhum colaborador cadastrado para exportar.',4000);
  if(typeof JSZip==='undefined'||typeof window.jspdf?.jsPDF!=='function')return S.toast('Exportação indisponível. Verifique a conexão e tente novamente.',5000);
  const btn=S.$('fl-pacote'),status=S.$('fl-export-status');if(!btn||btn.disabled)return;
  btn.disabled=true;btn.setAttribute('aria-busy','true');
  try{
    const zip=new JSZip(),folhas=[];
    for(let i=0;i<fs.length;i++){
      status.textContent=`Preparando folha ${i+1} de ${fs.length}…`;
      const f=fs[i],d=S.dadosFolha(f.pin,p.ini,p.fim),pdf=await S.gerarPDFComLogo({folhas:[d]});folhas.push(S.dadosFechamentoContador(d));
      const nome=(f.nome||'Colaborador').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,80);
      zip.file(`folhas/${String(i+1).padStart(3,'0')}_${nome}.pdf`,pdf.blob);
    }
    zip.file(`AFD_${S.soNum(S.get('empregador',{}).doc)}_${p.ini}_${p.fim}.txt`,S.conteudoAFDOficial(p.ini,p.fim));
    const cel=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
    const cab=['Colaborador','Cargo','Data inicial','Data final','Horas trabalhadas (HH:MM)','Horas extras (HH:MM)','Faltas (dias)','Horas faltantes (HH:MM)','Saldo anterior (HH:MM)','Créditos (HH:MM)','Débitos (HH:MM)','Saldo atual (HH:MM)'];
    const linhas=folhas.map(d=>[d.f.nome,d.f.funcao||d.f.cargo||'',p.ini,p.fim,S.toHHMM(d.tot.trabalhado),S.toHHMM(d.tot.extras),d.tot.faltas,S.toHHMM(d.tot.faltantes),S.toSaldo(d.banco.anterior),S.toHHMM(d.banco.creditos),S.toHHMM(d.banco.debitos),S.toSaldo(d.banco.atual)]);
    zip.file('resumo_fechamento.csv','\ufeff'+[cab,...linhas].map(r=>r.map(cel).join(';')).join('\r\n')+'\r\n');
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cab,...linhas]),'Resumo mensal');
    const analitico=[['Colaborador','CPF','Data','Ocorrência','Código solicitado (não transmissão eSocial)','Previstas min','Trabalhadas min','Saldo banco min','Desconto dia min','Desconto DSR min','Responsável','Quem autorizou','Pagador / tratamento']];
    folhas.forEach(d=>d.linhas.forEach(l=>{const o=S.ocorrenciaDia(d.f.pin,l.data)||{},r=S.regraOcorrencia(o.tipo);analitico.push([d.f.nome,d.f.cpf,l.data,l.ocorrencia,r.codigo||'',l.previsto,l.trabalhado,l.saldo,l.descontoDia||0,l.descontoDsr||0,o.por||'',o.autorizadoPor||'',r.pagador||'']);}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(analitico),'Analítico diário');
    zip.file('analitico_fechamento.xls',XLSX.write(wb,{bookType:'biff8',type:'array'}));
    status.textContent='Compactando pacote…';const blob=await zip.generateAsync({type:'blob'});
    S.baixar(`Pacote_Contador_${p.ini}_${p.fim}.zip`,blob,'application/zip');
    status.textContent=`Pacote concluído: ${fs.length} folha(s), AFD, XLS analítico e resumo do fechamento.`;
    S.log(`Exportou Pacote do Contador (${fs.length} colaboradores) ${S.brOf(p.ini)}–${S.brOf(p.fim)}`);
  }catch(e){status.textContent='Não foi possível gerar o pacote. Tente novamente.';}
  finally{btn.disabled=false;btn.removeAttribute('aria-busy');}
}

async function lotePDF(){const p=S.loteValida();if(!p)return;const ini=S.$('lt-ini').value;
  try{await S.garantirHistorico(ini);}catch(e){}
  const mes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][Number(ini.slice(5,7))-1];
  pdfFolhas(p,ini,S.$('lt-fim').value,`Folhas_MTE_${mes}_${ini.slice(0,4)}.pdf`);}
async function lotePDFZip(){
  const p=S.loteValida();if(!p)return;const ini=S.$('lt-ini').value,fim=S.$('lt-fim').value;
  try{await S.garantirHistorico(ini);await S.garantirLib('pdf');await S.garantirLib('zip');await S.garantirLib('xlsx');}catch(e){return S.toast('Exportação indisponível. Verifique a conexão e tente novamente.',5000);}
  const zip=new JSZip();
  for(const pin of p){
    const f=S.funcPorPin(pin), pdf=await S.gerarPDFComLogo({pins:[pin],ini,fim}); // mesmo PDF oficial com logo
    zip.file(`${(f.nome||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]+/g,'_')}.pdf`,pdf.blob);
  }
  const b=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`Folhas_MTE_${ini}_${fim}.zip`;a.click();
  S.log(`Exportou ZIP de PDFs em lote (${p.length})`);
}
async function loteXML(){
  const p=S.loteValida();if(!p)return;const ini=S.$('lt-ini').value,fim=S.$('lt-fim').value;
  try{await S.garantirHistorico(ini);await S.garantirLib('zip');}catch(e){return S.toast('Exportação indisponível. Verifique a conexão e tente novamente.',5000);}
  const zip=new JSZip();
  p.forEach(pin=>zip.file(S.nomeXML(S.funcPorPin(pin),ini),S.xmlConteudo(pin,ini,fim)));
  const b=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`XML_Folhas_${ini}_${fim}.zip`;a.click();
  S.log(`Exportou ZIP de XMLs em lote (${p.length})`);
}


const MANUAL[
 ['1. Primeiro acesso','Crie sua conta. Os limites são definidos pelo plano ativo. A senha precisa de 8 caracteres com maiúscula, minúscula, número e símbolo (!@#$%&_). Depois preencha o cadastro do Empregador: CNPJ/CPF, razão social, nome fantasia, endereço, horário padrão e logo. Cadastre gerenciadores até o limite contratado, cada um com PIN próprio.'],
 ['2. Bater o ponto','Na tela inicial o empregado digita o PIN de 4 números. Cada número aparece por 1 segundo e vira bolinha. O nome e as batidas do dia aparecem; toque em ✓ REGISTRAR. O sistema usa a hora oficial do servidor (🟢 NTP OK), gera o NSR e imprime o comprovante. Depois de 2 segundos a confirmação desaparece e a tela fica livre.'],
 ['3. Comprovante','A cada batida o comprovante fica disponível. A impressão depende da impressora integrada do terminal (POS), do serviço de impressão direta, de uma impressora Bluetooth BLE compatível ou da opção do navegador. O envio não comprova a saída física do papel. Se não imprimir, toque na batida no histórico para reimprimir ou enviar por e-mail.'],
 ['4. Portal do Empregado (👤)','O empregado digita o PIN e vê a própria folha de ponto, podendo enviá-la para o seu e-mail.'],
 ['5. Gestor de ponto','Abra /gestor, faça login com e-mail e senha e digite o PIN de gerenciador. Bloquear retorna ao PIN; Sair da conta encerra a sessão. Suporte e chamados ficam na gaveta do gestor. A primeira aba é o Dashboard de Frequência, com presença, faltas, absenteísmo, atrasos e carga incompleta, com filtros por período e funcionário.'],
 ['6. Empregados','O limite de colaboradores por empresa é definido no plano ativo. Informe nome, CPF, função, departamento, admissão, escala e, opcionalmente, o início da vigência do banco de horas. O PIN é criado automaticamente. Na aba "Funções, Cargos e Departamentos" você cadastra as listas. Status: Ativo, Desligado, Afastamento (com motivo) ou Férias.'],
 ['7. Escala semanal','Escolha a semana (pode começar no domingo ou na segunda). Em cada dia marque Trabalhado (com hora de entrada), DSR ou Folga Compensada — até 3 folgas por semana. A escala manda na folha: se o DSR foi para terça, o domingo vira dia de trabalho. A hora de entrada da escala é usada para calcular atraso (tolerância de 10 min). Após 30 dias a escala trava 🔒. Baixe o CSV para Excel/Google Sheets.'],
 ['8. Batidas e ajustes','Data, hora e NSR originais nunca podem ser alterados. Tratamentos são separados das marcações originais. Você pode incluir batida manual ou lançar ocorrência (Falta Justificada, Férias, Folga compensatória, Falta) — sempre com motivo de pelo menos 5 letras. Tudo fica registrado com o nome de quem alterou.'],
 ['9. Banco de horas','Faltas injustificadas destinam-se ao desconto salarial e ficam neutras no banco. Débitos no banco são restritos à folga compensatória autorizada ou carga incompleta não abonada; atrasos de entrada aparecem apenas no Dashboard. Atestados, faltas abonadas, férias e afastamentos neutralizam o banco. Trabalho em domingos/feriados usa o fator configurado pelo empregador, sem presumir adicional salarial. Saldo Anterior + Créditos − Débitos = Saldo Atual.'],
 ['10. Folha de ponto MTE','Escolha o funcionário e o período e toque em Gerar. A folha traz logo, cabeçalho do empregador e do trabalhador, batidas, ocorrências coloridas, totais, banco de horas, legenda e assinaturas. Baixe o PDF para salvar, enviar ou imprimir; os arquivos fiscais ficam em Fiscal MTE. Na Exportação em Lote, marque vários funcionários de uma vez.'],
 ['11. Arquivos oficiais para fiscalização','Na Folha de Ponto use "AFD oficial" (Arquivo Fonte de Dados) e "AEJ oficial" (Arquivo Eletrônico de Jornada) — são os arquivos exigidos pelo auditor fiscal do trabalho. O "Atestado Técnico" é o documento do desenvolvedor que acompanha o programa.'],
 ['12. Dicas e segurança','O PIN nunca aparece em folhas, PDFs ou comprovantes. Os dados ficam na nuvem e também no aparelho (funciona sem internet e sobe sozinho quando a conexão volta). Para sair da conta, use o botão vermelho ⏻ na tela de ponto.']
];

async function manualPDF(){
  await S.garantirLib('pdf');
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),d=S.devCfg(),titulo='Manual do Usuário',sub='Registro Eletrônico de Ponto • versão '+d.versao;
  const y=S.pdfCabecalhoPadrao(doc,titulo,sub);
  S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Seção','Orientações'],body:S.MANUAL,widths:[47,143],fontSize:9});
  S.pdfRodapesPadrao(doc,S.getConta()||'Manual público');doc.save('Manual_Ponto_Pro_Gestao.pdf');
}

const MESES['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];


const EMAIL_SERVICO_ATIVOfalse;
async function enviarArquivoPorEmail{para,assunto,nome,blob,mime,base64}){
  if(S.EMAIL_SERVICO_ATIVO&&S.getSb()){
    try{const {error}=await S.getSb().functions.invoke('send-pdf',{body:{to:para,subject:assunto,filename:nome,pdf_base64:base64}});
      if(!error){S.toast(`Enviado para ${para}`,4000);return true;}}catch(e){}
  }
  const file=new File([blob],nome,{type:mime||'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:assunto});return true;}catch(e){if(e.name==='AbortError')return false;}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;a.click();
  setTimeout(()=>{location.href=`mailto:${para||''}?subject=${encodeURIComponent(assunto)}`;},600);
  S.toast(`Arquivo ${nome} baixado — anexe-o no e-mail que abriu.`,7000);
  return true;
}

async function baixarFolhaPortal(pin){
  const f=S.funcPorPin(pin); if(!f) return S.toast('Funcionário não encontrado.',3000);
  const ini=S.$('pe-ini').value,fim=S.$('pe-fim').value; if(!ini||!fim) return S.toast('Selecione o período.',3000);
  const pdf=await S.gerarPDFComLogo({folhas:[S.gerarFolhaMTE(pin,ini,fim)]});
  pdf.doc.save(`Folha_${f.nome.replace(/\s+/g,'_')}_${S.MESES[Number(ini.slice(5,7))-1]}.pdf`);
  S.log(`Portal: ${f.nome} baixou a folha em PDF (${S.brOf(ini)}–${S.brOf(fim)})`);
}

async function baixarFolhaLink(){const d=window.__folhaLink;if(!d)return;const pdf=await S.gerarPDFComLogo({folhas:[S.gerarFolhaMTE(d.pin,d.ini,d.fim)]});pdf.doc.save(`Folha_${String(d.nome||'Funcionario').replace(/\s+/g,'_')}_${d.ini.slice(0,7)}.pdf`);}

function linhasPins){return S.get('funcionarios',[]).map(f=>[f.nome,f.cpf||'',f.cargo||f.funcao||'',f.departamento||'',f.pin,S.statusTexto(f)]);}

async function pdfPins(){
  await S.garantirLib('pdf');
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),titulo='Relatório de PINs',sub='DOCUMENTO CONFIDENCIAL • Uso interno do RH';
  const y=S.pdfCabecalhoPadrao(doc,titulo,sub);
  S.pdfTabelaPadrao(doc,{y,titulo,sub,head:['Nome','CPF','Cargo','Departamento','PIN','Status'],body:S.linhasPins(),widths:[44,29,32,32,16,37],fontSize:8});
  S.pdfRodapesPadrao(doc,S.getConta()||'RH');doc.save('Relatorio_PINs_CONFIDENCIAL.pdf');S.log('Gerou PDF confidencial de PINs');
}


const csvDe(lista,cols)=>'\uFEFF'+cols.join(';')+'\n'+lista.map(o=>cols.map(c=>String(o[c]??'').replace(/[;\r\n]/g,' ')).join(';')).join('\n');
async function enviarBackupPorEmail(para){
  await S.garantirLib('zip');
  const zip=new JSZip();
  zip.file('funcionarios.csv',S.csvDe(S.get('funcionarios',[]),['nome','cpf','cargo','funcao','departamento','admissao','escala','status','inicioVigenciaBancoHoras','email']));
  zip.file('pontos.csv',S.csvDe(S.get('batidas',[]),['nsr','nome','cpf','data','hora','tipo','fonte','movimento']));
  zip.file('escala.csv',S.csvDe(Object.values(S.get('escalas',{})||{}).flatMap(e=>(e.folgas||[]).map(x=>({periodo:`${e.semanaInicio} a ${e.semanaFim}`,funcionario:(S.funcPorPin(x.pin)||{}).nome||'',dia:x.dia,tipo:x.tipo,horario:x.horarioEntrada||''}))),['periodo','funcionario','dia','tipo','horario']));
  zip.file('logs.csv',S.csvDe(await logsParaBackup(),['quando','por','acao']));
  const blob=await zip.generateAsync({type:'blob'});
  return S.enviarArquivoPorEmail({para,assunto:'Backup Ponto Pro Gestão',nome:`Backup_Ponto_Pro_Gestao_${S.hojeISO()}.zip`,blob,mime:'application/zip'});
}

  return {baixar,comprovantePDF,gradeEscala,planilhaEscala,csvEscala,modeloCSVEscala,pdfResumoBanco,csvResumoBanco,textoMovBanco,linhasExtratoBanco,pdfExtratoBanco,pdfDash,baixarPDFFolha,dadosFechamentoContador,pacoteContador,lotePDF,lotePDFZip,loteXML,MANUAL,manualPDF,MESES,EMAIL_SERVICO_ATIVO,enviarArquivoPorEmail,baixarFolhaPortal,baixarFolhaLink,linhasPins,pdfPins,csvDe,enviarBackupPorEmail};
  }

  namespace.definir('reports.exportacoes', Object.freeze({ criar }));
})(window.PontoProOperacional);
