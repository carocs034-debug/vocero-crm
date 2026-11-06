const source=$('Preparar CV y rubrica').first().json;
const norm=s=>String(s).normalize('NFC').replace(/\s+/g,' ').trim();
const raw=$input.first().json.text;
if(typeof raw!=='string') throw new Error('Respuesta sin campo text');
let result; try{result=JSON.parse(raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i,'$1'));}catch{throw new Error('Respuesta IA no es JSON valido: requiere revision');}
if(!result||typeof result!=='object'||Array.isArray(result)||typeof result.resumen_profesional!=='string'||!result.resumen_profesional.trim()) throw new Error('Falta resumen valido');
for(const k of ['alertas_documentales','preguntas_aclaratorias']) if(!Array.isArray(result[k])||result[k].some(x=>typeof x!=='string')) throw new Error('Campo invalido: '+k);
if(!Array.isArray(result.criterios)||result.criterios.length!==source.rubrica.length) throw new Error('Criterios incompletos');
const allowed=new Set(source.rubrica.map(r=>r.id)),seen=new Set(),cv=norm(source.texto_analisis);
for(const c of result.criterios){
 if(!allowed.has(c.id)||seen.has(c.id)) throw new Error('Criterio desconocido o repetido'); seen.add(c.id);
 const quotes=Array.isArray(c.evidencia)?c.evidencia:(typeof c.evidencia==='string'?(c.evidencia.trim()?[c.evidencia]:[]):null);
 if(!quotes||quotes.length>4||quotes.some(q=>typeof q!=='string')||typeof c.explicacion!=='string') throw new Error('Evidencia invalida'); c.evidencia=quotes;
 if(c.estado==='desconocido'){if(c.cumplimiento!==null||quotes.length) throw new Error('Desconocido debe tener valor null y sin cita');}
 else{const valid=(c.estado==='cumple'&&c.cumplimiento===1)||(c.estado==='no_cumple'&&c.cumplimiento===0)||(c.estado==='parcial'&&[0.25,0.5,0.75].includes(c.cumplimiento));
 if(!valid||!quotes.length||quotes.some(q=>!norm(q)||norm(q).length>350||!cv.includes(norm(q)))) throw new Error('Valor o cita no sustentada: '+c.id);}
}
const criterion=id=>result.criterios.find(c=>c.id===id);
const coverage=Number(source.rubrica.reduce((s,r)=>s+(criterion(r.id).cumplimiento===null?0:r.peso),0).toFixed(6));
const numerator=source.rubrica.reduce((s,r)=>s+r.peso*(criterion(r.id).cumplimiento??0),0);
const score=coverage>=0.70?Number((1+9*numerator/coverage).toFixed(1)):null;
const pending=source.rubrica.filter(r=>r.esencial&&criterion(r.id).estado==='desconocido').map(r=>r.id);
const gaps=source.rubrica.filter(r=>r.esencial&&criterion(r.id).estado==='no_cumple').map(r=>r.id);
return [{json:{prueba:true,vacante_id:source.vacante_id,rubrica_version:source.rubrica_version,resumen_profesional:result.resumen_profesional,criterios:source.rubrica.map(r=>({...criterion(r.id),...r})),cobertura:coverage,score,estado:gaps.length?'revision_humana_de_brechas':(score===null||pending.length?'completar_datos':'revision_humana'),requisitos_pendientes:pending,brechas_esenciales:gaps,alertas_documentales:result.alertas_documentales,preguntas_aclaratorias:result.preguntas_aclaratorias,decision_humana:'pendiente',limite:'Citas verificadas contra el texto. Interpretacion pendiente de revision humana.'}}];
