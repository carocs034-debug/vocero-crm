const body=$input.first().json.body;
if(!body||typeof body!=='object'||Array.isArray(body)) throw new Error('Evento JSON invalido');
const eventId=String(body.id||''); const event=String(body.event||'');
if(!eventId||eventId.length>200) throw new Error('Falta identificador de evento');
if(event==='webhook.test') return [{json:{prueba:true,evento_id:eventId,evento:event,estado:'conexion_recibida',sin_acciones_externas:true}}];
const account=String(body.account?.accountId||body.account?.id||'');
const message=body.message; const conversation=String(body.conversation?.id||message?.conversationId||'');
const allowed=event==='message.received'&&account==='000000000000000000000001'&&conversation==='000000000000000000000002'&&message?.platform==='whatsapp'&&message?.direction==='incoming';
if(!allowed) return [{json:{prueba:true,evento_id:eventId,estado:'ignorado_fuera_de_conversacion_de_prueba',sin_acciones_externas:true}}];
if(!message.id||!Array.isArray(message.attachments)) throw new Error('Mensaje incompleto');
const files=message.attachments.map(a=>{
 if(typeof a.url!=='string'||!/^https:\/\/[^\s]+$/.test(a.url)) throw new Error('Adjunto requiere HTTPS');
 return {tipo:String(a.type||''),nombre:a.fileName||a.filename||a.name||null,mime:a.mimeType||null,url:a.url};
});
return [{json:{prueba:true,evento_id:eventId,mensaje_id:message.id,conversacion_id:conversation,cuenta_id:account,evento:event,texto:message.text===null?null:String(message.text||'').slice(0,20000),adjuntos:files,numero_adjuntos:files.length,fecha:body.timestamp||null,estado:files.length?'adjunto_detectado_pendiente_descarga':'texto_recibido',sin_acciones_externas:true,nota:'Solo pruebas. Sin mensajes salientes ni IA. Produccion requiere HMAC, persistencia e idempotencia.'}}];
