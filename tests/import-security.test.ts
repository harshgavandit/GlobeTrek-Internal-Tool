import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {validateZip} from '../src/lib/import-service';
test('valid XLSX archive passes; malformed archives are rejected',async()=>{
 const w=new ExcelJS.Workbook();w.addWorksheet('Prices').addRow(['SKU','Product Name']);
 const data=Buffer.from(await w.xlsx.writeBuffer());assert.doesNotThrow(()=>validateZip(data));
 assert.throws(()=>validateZip(Buffer.from('not an XLSX file')),/Invalid/);
 assert.throws(()=>validateZip(data.subarray(0,data.length-10)),/Invalid/);
});
test('forged uncompressed sizes cannot bypass the decompression bound',async()=>{
 const w=new ExcelJS.Workbook();w.addWorksheet('Prices').addRow(['A'.repeat(2000)]);
 const data=Buffer.from(await w.xlsx.writeBuffer());
 for(let i=0;i<data.length-46;i++)if(data.readUInt32LE(i)===0x02014b50&&data.readUInt32LE(i+24)>0){data.writeUInt32LE(0,i+24);break;}
 assert.throws(()=>validateZip(data),/Invalid/);
});
