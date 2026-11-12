import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDomainContext } from './operational-domain-harness.ts';

const files=['documentos','folha','fiscal','exportacoes','nucleo'].map(n=>'operacional/reports/'+n+'-v20261110-etapa4.js');
const html=readFileSync('public/vip-ponto.html','utf8');
test('stage 4 document modules never write operational storage or punches or query Supabase',()=>{
  for(const f of files){const s=readFileSync('public/'+f,'utf8');assert.doesNotMatch(s,/\bfilaPonto\s*\(|\bnuvemPush\s*\(|\blocalStorage\b|\bindexedDB\b|\bsetInterval\s*\(|\bS\.set\s*\(|\.from\s*\(/,f);}
});
test('stage 4 static modules are available offline and boot remains singular',()=>{
  const sw=readFileSync('public/ponto-offline-sw.js','utf8');for(const f of files){assert.ok(html.includes('src="/'+f+'"'));assert.ok(sw.includes("'/"+f+"'"));}
  assert.equal((html.match(/\(async function boot\(\)\{/g)||[]).length,1);
  assert.equal((html.match(/async function iniciarApp\(\)\{/g)||[]).length,1);
});
test('stage 4 all previous document entry points are composed without missing aliases',()=>{
  const {RELATORIOS_NUCLEO:r}=createDomainContext();
  for(const name of ['htmlFolha','gerarPDFComLogo','pdfFolhas','xmlConteudo','gerarAFD','gerarAEJ','conteudoAFDOficial','pdfExtratoBanco','pdfResumoBanco','csvResumoBanco','pacoteContador','lotePDFZip','loteXML','manualPDF','pdfPins','comprovantePDF','baixarFolhaPortal','baixarFolhaLink','enviarBackupPorEmail'])assert.equal(typeof r[name],'function',name);
});