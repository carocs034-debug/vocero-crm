const items=$input.all();
const output=[];
for(let i=0;i<items.length;i++) {
  if(!items[i].binary?.data) throw new Error('Descarga sin archivo binario');
  const buffer=await this.helpers.getBinaryDataBuffer(i,'data');
  if(buffer.length===0 || buffer.length>10*1024*1024) throw new Error('Archivo vacio o mayor de 10 MB');
  if(buffer.subarray(0,5).toString('ascii')!=='%PDF-') throw new Error('La descarga no contiene un PDF');
  if(!buffer.subarray(Math.max(0,buffer.length-2048)).toString('latin1').includes('%%EOF')) throw new Error('PDF incompleto o formato no admitido por el piloto');
  output.push({json:{prueba:true,bytes:buffer.length,estado:'pdf_descargado_validado'},binary:{data:{...items[i].binary.data,fileName:'Curriculum_Vitae_-_Almacenista.pdf',mimeType:'application/pdf'}}});
}
return output;
