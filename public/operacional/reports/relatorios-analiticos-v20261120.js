/* Etapa 7: relatórios gerenciais derivados da mesma folha e do mesmo fechamento contábil. */
(function (namespace) {
  'use strict';

  function criar(S) {
    const setorDe = f => String(f.departamento || '').trim() || 'Sem setor';
    const soma = (linhas, campo) => linhas.reduce((total, linha) => total + (Number(linha[campo]) || 0), 0);
    const pct = (parte, total) => total ? Math.round(parte / total * 100) : 0;
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    function ocorrenciasIntervalo(f, linhas) {
      if (f.intervalo?.preAssinalado) return [];
      const ocorrencias = [];
      for (const linha of linhas) {
        const bs = S.batidasDia(f.pin, linha.data);
        const trabalhado = S.minutosTrabalhados(bs, f);
        if (trabalhado <= 360) continue;
        const saida = bs.find(b => b.tipo === 'Saída Intervalo');
        const retorno = bs.find(b => b.tipo === 'Entrada Intervalo');
        const pausa = saida && retorno ? S.difMin(saida.hora, retorno.hora) : 0;
        const semIntervalo = !saida && !retorno;
        const pausaCurta = !!(saida && retorno && pausa < 60);
        if (!semIntervalo && !pausaCurta) continue;
        ocorrencias.push({
          pin: f.pin, nome: f.nome, setor: setorDe(f), data: linha.data,
          trabalhado, pausa, previsto: 60, suprimido: Math.max(0, 60-pausa), tipo: semIntervalo ? 'Sem intervalo registrado' : 'Pausa inferior a 1h',
        });
      }
      return ocorrencias;
    }

    function montarColaborador(f, inicio, fim, hoje) {
      const folha = S.dadosFechamentoContador(S.dadosFolha(f.pin, inicio, fim), hoje);
      const empregador = S.get('empregador', {}) || {};
      const tolerancia = 10; // Mesma tolerância legal/operacional aplicada por atrasoDia e pelo Dashboard.
      const entradas = folha.linhas.filter(l => l.previsto > 0 && l.e1);
      const atrasos = entradas.filter(l => l.atrasoMin > 0).map(l => ({
        data: l.data, dia: diasSemana[S.dow(l.data)], previsto: S.horarioEscala(f.pin, l.data) || empregador.hEntrada || '08:00',
        realizado: l.e1, tolerancia, minutos: Math.max(0, l.atrasoMin - tolerancia),
      }));
      const recorrenciaMap = new Map();
      atrasos.forEach(a => {
        const item = recorrenciaMap.get(a.dia) || { dia: a.dia, quantidade: 0, minutos: 0 };
        item.quantidade++; item.minutos += a.minutos; recorrenciaMap.set(a.dia, item);
      });
      const intervalos = ocorrenciasIntervalo(f, folha.linhas);
      const abonos = folha.linhas.filter(l => {
        const oc = S.ocorrenciaDia(f.pin, l.data);
        return S.regraOcorrencia(oc?.tipo).abonado || /FÉRIAS|AFASTAMENTO|ATESTADO|LICENÇA|ABONAD|JUSTIFICADA/.test(l.ocorrencia || '');
      }).length;
      const consolidado = {
        pin: f.pin, nome: f.nome, setor: setorDe(f), cargo: f.cargo || f.funcao || '—',
        diasTrabalhados: folha.linhas.filter(l => l.trabalhado > 0).length,
        faltas: folha.tot.faltas || 0,
        dsrs: folha.linhas.filter(l => {
          const escala = S.buscaNaEscala(f.pin, l.data);
          return /DSR|DOMINGO/i.test(escala?.tipo || '') || (!escala && S.dow(l.data) === 0 && (empregador.dsr === 'Sim' || f.escala === '6x1'));
        }).length,
        normais: Math.max(0, (folha.tot.trabalhado || 0) - (folha.tot.extras || 0)),
        extras50: folha.tot.extras50 || 0, extras100: folha.tot.extras100 || 0,
        atrasos: atrasos.length, atrasoMin: soma(atrasos, 'minutos'), abonos,
        saldoAnterior: folha.banco.anterior || 0, creditos: folha.banco.creditos || 0,
        debitos: folha.banco.debitos || 0, saldoBanco: folha.banco.atual || 0,
        movimentoBanco: (folha.banco.creditos || 0) - (folha.banco.debitos || 0),
      };
      return {
        f, folha, intervalos, consolidado,
        pontualidade: {
          entradas: entradas.length, pontuais: entradas.filter(l => !l.atrasoMin).length,
          taxa: pct(entradas.filter(l => !l.atrasoMin).length, entradas.length),
          atrasos, minutos: soma(atrasos, 'minutos'),
          recorrencia: [...recorrenciaMap.values()].sort((a, b) => b.quantidade - a.quantidade || b.minutos - a.minutos),
        },
      };
    }

    function rankingSetores(colaboradores) {
      const grupos = new Map();
      for (const c of colaboradores) {
        const setor = setorDe(c.f), p = c.pontualidade, x = c.consolidado;
        const g = grupos.get(setor) || { setor, entradas: 0, pontuais: 0, atrasos: 0, atrasoMin: 0, intervalos: 0, reincidentes: 0, extras50: 0, extras100: 0, movimentoBanco: 0 };
        g.entradas += p.entradas; g.pontuais += p.pontuais; g.atrasos += p.atrasos.length; g.atrasoMin += p.minutos;
        g.intervalos += c.intervalos.length; if (c.intervalos.length > 1) g.reincidentes++;
        g.extras50 += x.extras50; g.extras100 += x.extras100; g.movimentoBanco += x.movimentoBanco;
        grupos.set(setor, g);
      }
      return [...grupos.values()].map(g => ({ ...g, taxa: pct(g.pontuais, g.entradas) })).sort((a, b) => a.setor.localeCompare(b.setor, 'pt-BR'));
    }

    function calcularRelatoriosAnaliticos({ inicio, fim, setor = '', pin = '', hoje = S.hojeISO() }) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '') || inicio > fim) throw new Error('Informe um período válido.');
      const funcionarios = (S.get('funcionarios', []) || []).filter(f => (!pin || f.pin === pin) && (!setor || setorDe(f) === setor));
      const colaboradores = funcionarios.map(f => montarColaborador(f, inicio, fim, hoje));
      const setores = rankingSetores(colaboradores);
      const entradas = soma(colaboradores.map(c => c.pontualidade), 'entradas');
      const pontuais = soma(colaboradores.map(c => c.pontualidade), 'pontuais');
      const recorrenciaMap = new Map();
      colaboradores.forEach(c => c.pontualidade.recorrencia.forEach(r => {
        const item = recorrenciaMap.get(r.dia) || { dia: r.dia, quantidade: 0, minutos: 0 };
        item.quantidade += r.quantidade; item.minutos += r.minutos; recorrenciaMap.set(r.dia, item);
      }));
      const intervalos = colaboradores.flatMap(c => c.intervalos).sort((a, b) => b.data.localeCompare(a.data) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      const consolidado = colaboradores.map(c => c.consolidado).sort((a, b) => a.setor.localeCompare(b.setor, 'pt-BR') || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      return {
        periodo: { inicio, fim }, colaboradores, setores, consolidado,
        pontualidade: {
          entradas, pontuais, taxa: pct(pontuais, entradas),
          atrasos: colaboradores.reduce((n, c) => n + c.pontualidade.atrasos.length, 0),
          minutos: colaboradores.reduce((n, c) => n + c.pontualidade.minutos, 0),
          recorrencia: [...recorrenciaMap.values()].sort((a, b) => b.quantidade - a.quantidade || b.minutos - a.minutos),
          ranking: [...colaboradores].sort((a, b) => b.pontualidade.minutos - a.pontualidade.minutos || String(a.f.nome).localeCompare(String(b.f.nome), 'pt-BR')),
        },
        intervalos: {
          ocorrencias: intervalos, total: intervalos.length,
          colaboradores: colaboradores.filter(c => c.intervalos.length).length,
          reincidentes: colaboradores.filter(c => c.intervalos.length > 1).length,
          suprimido: soma(intervalos, 'suprimido'),
        },
        extras: {
          extras50: soma(consolidado, 'extras50'), extras100: soma(consolidado, 'extras100'),
          total: soma(consolidado, 'extras50') + soma(consolidado, 'extras100'),
          creditos: soma(consolidado, 'creditos'), debitos: soma(consolidado, 'debitos'), movimentoBanco: soma(consolidado, 'movimentoBanco'),
        },
      };
    }

    function modeloFichaPontualidade(colaborador, periodo) {
      const f = colaborador.f, p = colaborador.pontualidade;
      return {
        identificacao: [[f.nome || '—', setorDe(f), f.cargo || f.funcao || '—', f.matricula || f.pin || '—']],
        resumo: [[`${p.taxa}%`, String(p.atrasos.length), S.toHHMM(p.minutos), '10 min']],
        head: ['Data', 'Dia', 'Previsto', 'Realizado', 'Tolerância', 'Atraso'],
        body: p.atrasos.map(a => [S.brOf(a.data), a.dia, a.previsto, a.realizado, `${a.tolerancia} min`, S.toHHMM(a.minutos)]),
        subtitulo: `${f.nome} • ${S.brOf(periodo.inicio)} a ${S.brOf(periodo.fim)}`,
      };
    }

    async function pdfFichaPontualidade({ dados, pin, anotacoes = '', intervalo = false }) {
      const colaborador = dados?.colaboradores?.find(c => c.f.pin === pin);
      if (!colaborador) throw new Error('Colaborador não encontrado no relatório atual.');
      await S.garantirLib('pdf');
      const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const titulo = 'Ficha 1-on-1 — '+(intervalo?'Intervalos / Art. 71 CLT':'Pontualidade'), modelo = intervalo?modeloFichaIntervalos(colaborador,dados.periodo):modeloFichaPontualidade(colaborador, dados.periodo);
      let y = S.pdfCabecalhoPadrao(doc, titulo, modelo.subtitulo);
      y = S.pdfTabelaPadrao(doc, { y, titulo, sub: modelo.subtitulo, head: ['Colaborador', 'Setor', 'Cargo', 'Matrícula/PIN'], body: modelo.identificacao, widths: [76, 42, 46, 26] }) + 5;
      y = S.pdfTabelaPadrao(doc, { y, titulo, sub: modelo.subtitulo, head: intervalo?['Ocorrências','Tempo suprimido','Intervalo previsto','Referência']:['Pontualidade', 'Dias com atraso', 'Atraso líquido', 'Tolerância'], body: modelo.resumo, widths: [45, 50, 50, 45], fontSize: 9 }) + 6;
      y = S.pdfTabelaPadrao(doc, { y, titulo, sub: modelo.subtitulo, head: modelo.head, body: modelo.body, widths: [25, 40, 30, 30, 30, 35], fontSize: 8 }) + 8;
      if (y > 185) { doc.addPage(); y = S.pdfCabecalhoPadrao(doc, titulo, modelo.subtitulo); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(3, 68, 108); doc.text('Anotações do alinhamento', 10, y + 4);
      doc.setDrawColor(226, 232, 240); doc.setFillColor(248, 250, 252); doc.roundedRect(10, y + 8, 190, 35, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(11, 33, 48);
      const notas = doc.splitTextToSize(String(anotacoes || 'Sem anotações complementares.'), 180);
      for(let i=0;i<notas.length;i+=9){if(i){doc.addPage();y=S.pdfCabecalhoPadrao(doc,titulo,modelo.subtitulo);}doc.text(notas.slice(i,i+9),15,y+16);}
      const sy = y + 58; doc.setDrawColor(82, 101, 122); doc.line(15, sy, 90, sy); doc.line(120, sy, 195, sy);
      doc.setFontSize(8); doc.text('Colaborador', 52.5, sy + 5, { align: 'center' }); doc.text('Gestor responsável', 157.5, sy + 5, { align: 'center' });
      doc.text('Local/data: ____________________________________', 15, sy + 16);
      S.pdfRodapesPadrao(doc, S.getConta() || 'Gestor');
      const nome = String(colaborador.f.nome || pin).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
      doc.save(`Ficha_1on1_${intervalo?'Intervalos_':''}${nome}_${dados.periodo.inicio}_${dados.periodo.fim}.pdf`);
      S.log(`Exportou ficha 1-on-1 de pontualidade: ${colaborador.f.nome} ${S.brOf(dados.periodo.inicio)}–${S.brOf(dados.periodo.fim)}`);
    }


    function modeloFichaIntervalos(c,periodo){return {
      identificacao:[[c.f.nome,setorDe(c.f),c.f.cargo||c.f.funcao||'—',c.f.matricula||c.f.pin]],
      resumo:[[String(c.intervalos.length),S.toHHMM(soma(c.intervalos,'suprimido')),'01:00','Art. 71 CLT']],
      head:['Data','Dia','Jornada','Previsto','Realizado','Suprimido'],
      body:c.intervalos.map(o=>[S.brOf(o.data),diasSemana[S.dow(o.data)],S.toHHMM(o.trabalhado),'01:00',S.toHHMM(o.pausa),S.toHHMM(o.suprimido)]),
      subtitulo:c.f.nome+' • '+S.brOf(periodo.inicio)+' a '+S.brOf(periodo.fim)
    };}
    function modeloRelatorio(dados,tipo){
      const hh=S.toHHMM, saldo=S.toSaldo, c=dados.consolidado;
      const modelos={
        pontualidade:{titulo:'Pontualidade & Atrasos',head:['Colaborador / Setor','Entradas','Pontuais','Taxa','Atrasos','Atraso líquido'],body:dados.pontualidade.ranking.map(c=>[c.f.nome+' / '+setorDe(c.f),c.pontualidade.entradas,c.pontualidade.pontuais,c.pontualidade.taxa+'%',c.pontualidade.atrasos.length,hh(c.pontualidade.minutos)]),resumo:[[dados.pontualidade.taxa+'% pontual',hh(dados.pontualidade.minutos)+' atraso líquido','Tolerância abatida: 10 min']]},
        intervalos:{titulo:'Intervalos Não Usufruídos / Art. 71 CLT',head:['Data','Colaborador / Setor','Jornada','Previsto','Realizado','Suprimido'],body:dados.intervalos.ocorrencias.map(o=>[S.brOf(o.data),o.nome+' / '+o.setor,hh(o.trabalhado),'01:00',hh(o.pausa),hh(o.suprimido)]),resumo:[[dados.intervalos.total+' ocorrências',dados.intervalos.reincidentes+' reincidentes',hh(dados.intervalos.suprimido)+' suprimido']]},
        extras:{titulo:'Horas Extras, DSR e Feriados',head:['Colaborador / Setor','Extras 50%','Extras 100%','Total','Movimento banco'],body:c.map(x=>[x.nome+' / '+x.setor,hh(x.extras50),hh(x.extras100),hh(x.extras50+x.extras100),saldo(x.movimentoBanco)]),resumo:[[hh(dados.extras.extras50)+' extras 50%',hh(dados.extras.extras100)+' extras 100%',saldo(dados.extras.movimentoBanco)+' banco']]},
        consolidado:{titulo:'Consolidado Pré-Folha',head:['Colaborador / Setor','Dias','Faltas','DSRs','Normais','50%','100%','Atraso','Abonos','Mov. BH','Saldo BH'],body:c.map(x=>[x.nome+' / '+x.setor,x.diasTrabalhados,x.faltas,x.dsrs,hh(x.normais),hh(x.extras50),hh(x.extras100),hh(x.atrasoMin),x.abonos,saldo(x.movimentoBanco),saldo(x.saldoBanco)]),resumo:[[soma(c,'diasTrabalhados')+' dias',soma(c,'faltas')+' faltas concluídas',saldo(soma(c,'saldoBanco'))+' saldo banco']]}
      };const m=modelos[tipo];if(!m)throw new Error('Relatório inválido.');return m;
    }
    async function pdfRelatorioAnalitico({dados,tipo}){
      if(!dados)throw new Error('Aplique os filtros antes de exportar.');const m=modeloRelatorio(dados,tipo);await S.garantirLib('pdf');
      const hh=S.toHHMM,saldo=S.toSaldo;const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),sub=S.brOf(dados.periodo.inicio)+' a '+S.brOf(dados.periodo.fim);
      let y=S.pdfCabecalhoPadrao(doc,m.titulo,sub);
      y=S.pdfTabelaPadrao(doc,{y,titulo:m.titulo,sub,head:tipo==='pontualidade'?['Pontualidade global','Atraso líquido acumulado','Tolerância']:tipo==='intervalos'?['Ocorrências','Reincidentes','Tempo suprimido']:tipo==='extras'?['Extras 50%','DSR/Feriados 100%','Movimento banco']:['Dias trabalhados','Faltas concluídas','Saldo banco'],body:m.resumo,fontSize:9})+6;
      S.pdfTabelaPadrao(doc,{y,titulo:m.titulo,sub,head:m.head,body:m.body,fontSize:tipo==='consolidado'?6.5:8,cellPadding:1.5});
      if(tipo==='pontualidade')S.pdfTabelaPadrao(doc,{y:doc.lastAutoTable.finalY+6,titulo:m.titulo,sub,head:['Setor','Pontualidade','Atrasos','Atraso líquido'],body:dados.setores.map(s=>[s.setor,s.taxa+'%',s.atrasos,S.toHHMM(s.atrasoMin)])});
      if(tipo==='extras'){y=doc.lastAutoTable.finalY+6;S.pdfTabelaPadrao(doc,{y,titulo:m.titulo,sub,head:['Setor','50%','100%','Movimento BH'],body:dados.setores.map(s=>[s.setor,hh(s.extras50),hh(s.extras100),saldo(s.movimentoBanco)])});}
      if(tipo==='extras')S.pdfTabelaPadrao(doc,{y:doc.lastAutoTable.finalY+6,titulo:m.titulo,sub,head:['Critério gerencial'],body:[['50%/100% são classificações analíticas, não cálculo salarial. O banco mantém o fator configurado pela empresa.']]});
      S.pdfRodapesPadrao(doc,S.getConta()||'Gestor');doc.save('Relatorio_'+tipo+'_'+dados.periodo.inicio+'_'+dados.periodo.fim+'.pdf');S.log('Exportou relatório analítico: '+tipo+' '+sub);
    }
    return { calcularRelatoriosAnaliticos, modeloFichaPontualidade, modeloFichaIntervalos, modeloRelatorio, pdfRelatorioAnalitico, pdfFichaPontualidade, pdfFichaIntervalos:args=>pdfFichaPontualidade({...args,intervalo:true}) };
  }

  namespace.definir('reports.analiticos', Object.freeze({ criar }));
})(window.PontoProOperacional);
