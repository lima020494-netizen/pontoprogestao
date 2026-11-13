/* Matriz visual: códigos de apresentação, sem novos cálculos ou horários presumidos. */
(function(namespace){
  'use strict';
  const TURNOS=Object.freeze([{codigo:'M',nome:'Manhã'},{codigo:'T',nome:'Tarde'},{codigo:'N',nome:'Noite'},{codigo:'F',nome:'Folga'},{codigo:'D',nome:'DSR'}]);
  function criar(S){
    function turnoPorHorario(horario){const hora=Number(String(horario||'08:00').slice(0,2));return hora>=18||hora<6?'N':hora>=12?'T':'M';}
    function codigo(f,d){
      const it=S.buscaNaEscala(f.pin,d);
      if(it&&it.tipo!=='Trabalhado')return it.tipo==='DSR'?'D':'F';
      if(it&&['M','T','N'].includes(it.turno))return it.turno;
      if(!it&&S.previstoDia(f,d)===0)return new Date(d+'T12:00:00Z').getUTCDay()===0?'D':'F';
      return turnoPorHorario(it?.horarioEntrada||S.get('empregador',{}).hEntrada||'08:00');
    }
    function proximo(atual){return TURNOS[(TURNOS.findIndex(t=>t.codigo===atual)+1)%TURNOS.length].codigo;}
    function item(c,pin,dia,anterior={}){
      if(!TURNOS.some(t=>t.codigo===c))throw new Error('Turno inválido');
      return {...anterior,pin,dia,tipo:c==='D'?'DSR':c==='F'?'Folga Compensada':'Trabalhado',turno:c,horarioEntrada:c==='F'||c==='D'?'':anterior.horarioEntrada||'',horarioSaida:c==='F'||c==='D'?'':anterior.horarioSaida||''};
    }
    function semanas(dias){const grupos=[];for(const d of dias){const ini=S.inicioSemana(d);let g=grupos.find(x=>x.ini===ini);if(!g){g={ini,dias:[]};grupos.push(g);}g.dias.push(d);}return grupos;}
    function carga(f,dias){return dias.reduce((n,d)=>n+S.previstoDia(f,d),0);}
    async function pdf(ini,fim){
      await S.garantirLib('pdf');
      const fs=S.get('funcionarios',[]).filter(f=>f.status!=='Desligado');
      if(!fs.length){S.toast('Nenhum colaborador cadastrado.',2000);return;}
      const doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'}),grupos=semanas(S.diasPeriodo(ini,fim));
      grupos.forEach((g,i)=>{
        if(i)doc.addPage();
        const sub=S.brOf(g.dias[0])+' a '+S.brOf(g.dias.at(-1));
        let y=S.pdfCabecalhoPadrao(doc,'Escala da equipe',sub);
        doc.setFontSize(8);doc.text('M Manhã · T Tarde · N Noite · F Folga · D DSR',10,y);y+=6;
        const body=fs.map(f=>[f.nome,f.departamento||'—',...g.dias.map(d=>codigo(f,d)),S.toHHMM(carga(f,g.dias))]);
        S.pdfTabelaPadrao(doc,{y,titulo:'Escala da equipe',sub,head:['Colaborador','Setor',...g.dias.map(d=>S.brOf(d).slice(0,5)),'Carga'],body,widths:[46,26,...g.dias.map(()=>((190-46-26-20)/g.dias.length)),20],fontSize:8,cellPadding:2});
      });
      S.pdfRodapesPadrao(doc);doc.save('Escala_Equipe_'+ini+'_'+fim+'.pdf');
    }
    /* Fase 2: cobertura mínima por setor e turno (apenas visual; não altera cálculos). */
    function minimos(){return (S.get('empregador',{})||{}).coberturaMinima||{};}
    function cobertura(fs,dias,mins=minimos()){
      const setores=[...new Set(fs.map(f=>f.departamento||'Sem setor'))].sort();
      return setores.flatMap(setor=>['M','T','N'].map(turno=>{
        const lista=fs.filter(f=>(f.departamento||'Sem setor')===setor),min=Number(mins[setor]?.[turno])||0;
        return {setor,turno,min,dias:dias.map(d=>{const qtd=lista.filter(f=>codigo(f,d)===turno).length;return {dia:d,qtd,status:!min?'neutro':qtd>=min?'ok':'falta'};})};
      }));
    }
    return {TURNOS,codigo,proximo,item,semanas,carga,pdf,minimos,cobertura};
  }
  namespace.definir('gestor.matrizEscala',Object.freeze({criar}));
})(window.PontoProOperacional);