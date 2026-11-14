const formatoCv = {
  "application/pdf": /\.pdf$/i,
  "image/jpeg": /\.jpe?g$/i,
  "image/png": /\.png$/i,
};

function normalizar(texto) {
  return String(texto ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function clasificarCorreo({ asunto, cuerpo, adjuntos = [] }) {
  const mensaje = normalizar(asunto) + "\n" + normalizar(cuerpo).split(/\r?\n/)
    .slice(0, 40)
    .join("\n")
    .split(/^\s*(?:>|el .+ escribio:|on .+ wrote:|[- ]+mensaje original)/m)[0];
  const mencionaCv = /\b(?:curriculum|hoja de vida|(?:adjunto|envio|comparto|mando|remito)\s+(?:(?:mi|el|un)\s+)?cv)\b/.test(mensaje) ||
    /^\s*(?:cv|curriculum)\s*(?:$|[-:])/m.test(normalizar(asunto));
  const postulacion = mencionaCv ||
    /\b(?:me postulo|postulacion|solicitud de empleo|me interesa (?:la|el) (?:vacante|puesto))\b/.test(mensaje);

  const compatibles = adjuntos.filter(a => Object.hasOwn(formatoCv, a.mime) && formatoCv[a.mime].test(a.nombre));
  const explicitos = compatibles.filter(a =>
    /(?:^|[^a-z0-9])(?:cv|curriculum|hoja[ _-]+de[ _-]+vida)(?:$|[^a-z0-9])/.test(normalizar(a.nombre)));
  const candidatos = compatibles.filter(a => explicitos.includes(a) ||
    !/(?:^|[^a-z0-9])(?:logo|firma|signature|banner|icono)(?:$|[^a-z0-9])/.test(normalizar(a.nombre)));

  if (!postulacion && !explicitos.length) return { estado: "ignorar" };
  if (!candidatos.length) return { estado: "por_completar", motivo: "falta_cv" };
  if (candidatos.length > 1) return { estado: "por_completar", motivo: "varios_adjuntos" };
  return { estado: "procesar", adjunto: candidatos[0].clave };
}

module.exports = { clasificarCorreo };
