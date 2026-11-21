/* Search and chronological manual input, without persistence or cloud access. */
(function(ns){
'use strict';
const normalizar=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function buscar(fs,termo){const q=normalizar(termo),dig=q.replace(/\D/g,'');return fs.filter(f=>[f.nome,f.matricula,f.pin].some(v=>normalizar(v).includes(q))||(dig.length>0&&String(f.cpf||'').replace(/\D/g,'').includes(dig))).slice(0,8);}
function sequencia(data,itens,existentes=[]){let anterior=-1,dias=0;const novos=new Map(itens.map(x=>[x.tipo,x]));return ['Entrada','Saída Intervalo','Entrada Intervalo','Saída'].flatMap(tipo=>{const x=novos.get(tipo)||existentes.find(b=>b.tipo===tipo);if(!x?.hora)return [];const m=Number(x.hora.slice(0,2))*60+Number(x.hora.slice(3));if(m<anterior)dias++;anterior=m;const civil=new Date(Date.parse(data+'T12:00:00Z')+dias*86400000).toISOString().slice(0,10);return novos.has(tipo)?[{...x,data:civil,jornada:data,dias}]:[];});}
function montar(select,fs){
 if(!select||select.tagName!=='SELECT')return;
 const id=select.id,valor=select.value,fixo=select.disabled,todos=Array.from(select.options).some(o=>o.value==='');
 const wrap=document.createElement('div');wrap.className='employee-search';
 const hidden=document.createElement('input');hidden.type='hidden';hidden.id=id;hidden.value=valor;
 const input=document.createElement('input');input.type='search';input.id=id+'-busca';input.placeholder=todos?'Todos — buscar nome, matrícula ou CPF':'Buscar nome, matrícula ou CPF';input.autocomplete='off';input.setAttribute('role','combobox');input.setAttribute('aria-label','Buscar colaborador');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',id+'-sugestoes');input.disabled=fixo;input.value=fs.find(f=>String(f.pin)===valor)?.nome||'';
 const list=document.createElement('div');list.id=id+'-sugestoes';list.className='employee-suggestions';list.setAttribute('role','listbox');list.hidden=true;
 let index=-1,opcoes=[];
 const escolher=f=>{hidden.value=f?String(f.pin):'';input.value=f?.nome||'';list.hidden=true;input.setAttribute('aria-expanded','false');hidden.dispatchEvent(new Event('change',{bubbles:true}));};
 const render=()=>{opcoes=[...(todos?[null]:[]),...buscar(fs,input.value)];index=-1;list.replaceChildren();for(const f of opcoes){const b=document.createElement('button');b.type='button';b.className='btn ghost employee-option';b.setAttribute('role','option');b.textContent=f?f.nome+' · '+(f.matricula||f.pin):'Todos os colaboradores';b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>escolher(f));list.append(b);}if(!opcoes.length)list.textContent='Nenhum colaborador encontrado.';list.hidden=false;input.setAttribute('aria-expanded','true');};
 input.addEventListener('input',()=>{hidden.value='';render();});input.addEventListener('focus',render);input.addEventListener('blur',()=>{list.hidden=true;input.setAttribute('aria-expanded','false');});input.addEventListener('keydown',e=>{if(e.key==='Escape'){list.hidden=true;input.setAttribute('aria-expanded','false');}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(list.hidden)render();index=Math.max(0,Math.min(opcoes.length-1,index+(e.key==='ArrowDown'?1:-1)));Array.from(list.children).forEach((b,i)=>b.setAttribute('aria-selected',String(i===index)));}if(e.key==='Enter'&&!list.hidden&&opcoes.length){e.preventDefault();escolher(opcoes[Math.max(0,index)]);}});
 wrap.append(hidden,input,list);select.replaceWith(wrap);
}
function iniciar(getFs){const scan=()=>['fl-pin','bh-pin','ib-pin','oc-pin','rel-pin'].forEach(id=>montar(document.getElementById(id),getFs()));new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();}
ns.definir('gestor.colaboradores',Object.freeze({buscar,sequencia,iniciar}));
})(window.PontoProOperacional);
