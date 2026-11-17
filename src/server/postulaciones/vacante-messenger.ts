type VacanteActiva = { codigo: string; nombre: string };

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function resolverVacanteMessenger(
  mensajesRecientes: string[],
  vacantes: VacanteActiva[]
): string | null {
  for (const texto of mensajesRecientes) {
    const entrada = normalizar(texto);
    const interes = /^(?:(?:hola|buen dia) )?(?:me interesa|me postulo (?:a|para)|quiero postularme (?:a|para)|adjunto mi cv para)\s+/.exec(entrada);
    const puesto = interes
      ? entrada.slice(interes[0].length).replace(/^(?:la vacante de|la vacante|el puesto de|el puesto)\s+/, "")
      : entrada;
    const coincidencias = vacantes.filter(({ codigo, nombre }) => [
      normalizar(codigo),
      normalizar(nombre),
      normalizar(nombre.replace(/\(a\)/gi, "").replace(/\s*\([^)]*\)\s*$/, "")),
    ].includes(puesto));

    if (coincidencias.length === 1) return coincidencias[0]!.codigo;
    if (interes || coincidencias.length > 1) return null;
  }
  return null;
}
