import { test } from "node:test";
import assert from "node:assert/strict";
import { runWithDomain } from './operational-domain-harness.ts';

process.env["TZ"] = "America/Sao_Paulo";

function jornada(rows: [string, string, string, string][], dia: string, explicit=false, early=false) {
  const batidas = rows.map(([data, hora, nsr, criadoEm]) => ({ pin: "1", data, hora, nsr, criadoEm, jornada:explicit?data:undefined }));
  return runWithDomain(`;batidasJornada('1', '${dia}').map(b=>b.hora)`, {
    get: () => batidas,
    horarioEscala: () => early ? '00:00' : null,
  }) as string[];
}

test("legacy after-midnight exit stored with the shift date stays last, in punch order", () => {
  const rows: [string, string, string, string][] = [
    ["2026-10-09", "00:23", "000000142", "2026-10-10T03:23:18Z"],
    ["2026-10-09", "16:26", "000000133", "2026-10-09T19:26:08Z"],
    ["2026-10-09", "22:15", "000000139", "2026-10-10T01:15:28Z"],
    ["2026-10-09", "22:59", "000000140", "2026-10-10T01:59:45Z"],
  ];
  assert.deepEqual(jornada(rows, "2026-10-09"), ["16:26", "22:15", "22:59", "00:23"]);
});

test('00:21 exit follows previous-day 16:00 even when cached jornada equals civil date',()=>{
  const rows:[string,string,string,string][]=[['2026-10-30','16:00','1','2026-10-30T19:00:00Z'],['2026-10-31','00:21','2','2026-10-31T03:21:00Z']];
  assert.deepEqual(jornada(rows,'2026-10-30',true),['16:00','00:21']);assert.deepEqual(jornada(rows,'2026-10-31',true),[]);
});
test('scheduled midnight start stays on its civil day',()=>{
  const rows:[string,string,string,string][]=[['2026-10-30','16:00','1','2026-10-30T19:00:00Z'],['2026-10-31','00:21','2','2026-10-31T03:21:00Z']];
  assert.deepEqual(jornada(rows,'2026-10-31',false,true),['00:21']);
});
test('legacy overnight timestamp order uses Belem even on a UTC device',()=>{
  const previous=process.env['TZ'];process.env['TZ']='UTC';
  try {assert.deepEqual(jornada([['2026-10-30','00:21','2','2026-10-31T03:21:00Z'],['2026-10-30','16:00','1','2026-10-30T19:00:00Z']],'2026-10-30'),['16:00','00:21']);}
  finally{process.env['TZ']=previous;}
});

test("16:00 entry with 00:27 exit on the next civil day closes the previous shift", () => {
  const rows: [string, string, string, string][] = [
    ["2026-10-13", "16:00", "000000300", "2026-10-13T19:00:00Z"],
    ["2026-10-14", "00:27", "000000301", "2026-10-14T03:27:00Z"],
  ];
  assert.deepEqual(jornada(rows, "2026-10-13"), ["16:00", "00:27"]);
  assert.deepEqual(jornada(rows, "2026-10-14"), []);
});
