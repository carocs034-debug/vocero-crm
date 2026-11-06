const ACCOUNT='000000000000000000000001';
const CONVERSATION='000000000000000000000002';
const output=[];
for(const {json:item} of $input.all()){
 if(item.estado!=='adjunto_detectado_pendiente_descarga') continue;
 if(item.cuenta_id!==ACCOUNT||item.conversacion_id!==CONVERSATION) throw new Error('Adjunto fuera del alcance de prueba');
 const files=item.adjuntos;
 if(!Array.isArray(files)||files.length!==1) throw new Error('El piloto acepta exactamente un PDF');
 const file=files[0];
 if(!['file','document'].includes(file.tipo)) throw new Error('Tipo de adjunto no admitido');
 if(file.nombre&&file.nombre!=='Curriculum_Vitae_-_Almacenista.pdf') throw new Error('Usar solo el CV ficticio acordado');
 const match=/^https:\/\/zernio\.com\/api\/v1\/whatsapp\/media\/(\d+)\?accountId=([a-z0-9]+)$/.exec(String(file.url||''));
 if(!match) throw new Error('Origen, ruta o parametros de descarga no autorizados');
 if(match[2]!==ACCOUNT) throw new Error('Cuenta de descarga invalida');
 output.push({json:{prueba:true,evento_id:item.evento_id,mensaje_id:item.mensaje_id,conversacion_id:CONVERSATION,cuenta_id:ACCOUNT,url_descarga:'https://zernio.com/api/v1/whatsapp/media/'+match[1]+'?accountId='+ACCOUNT,nombre_esperado:'Curriculum_Vitae_-_Almacenista.pdf'}});
}
return output;
