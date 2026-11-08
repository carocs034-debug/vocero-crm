import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import type { z } from "zod";
import type { editarVacante } from "@/lib/vacantes";

const tabla = schema.vacanteReclutamiento;

export async function listarVacantes(org: string, soloActivas = false) {
  return getDb().select().from(tabla)
    .where(scoped(tabla.organizationId, org, soloActivas ? eq(tabla.activa, true) : undefined))
    .orderBy(tabla.nombre);
}

export async function guardarVacante(org: string, datos: z.infer<typeof editarVacante>) {
  const { codigo, nombre, descripcion, activa, rubrica, version } = datos;
  if (version === 0) {
    return (await getDb().insert(tabla).values({
      organizationId: org, codigo, nombre, descripcion, activa, rubricas: [rubrica],
    }).onConflictDoNothing().returning({ codigo: tabla.codigo })).length > 0;
  }
  return (await getDb().update(tabla).set({
    nombre, descripcion, activa,
    rubricas: sql`${tabla.rubricas} || ${JSON.stringify([rubrica])}::jsonb`,
  }).where(scoped(tabla.organizationId, org, eq(tabla.codigo, codigo),
    sql`jsonb_array_length(${tabla.rubricas}) = ${version}`))
    .returning({ codigo: tabla.codigo })).length > 0;
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "")
  .toLowerCase().trim().replace(/\s+/g, " ");

export async function consultarVacantes(org: string, req: Request, incluirRubrica: boolean) {
  const consulta = normalizar(new URL(req.url).searchParams.get("q") ?? "");
  if (consulta.length > 120) return Response.json({ error: "Consulta demasiado larga" }, { status: 422 });
  const activas = await listarVacantes(org, true);
  const porCodigo = activas.find(v => normalizar(v.codigo) === consulta);
  const resultados = porCodigo ? [porCodigo] : activas.filter(v =>
    !consulta || normalizar(v.nombre).includes(consulta));
  const exactas = resultados.filter(v => normalizar(v.nombre) === consulta);
  const coincidencias = !porCodigo && exactas.length ? exactas : resultados;
  const confirmada = Boolean(porCodigo) || exactas.length === 1;
  return Response.json({
    estado: !consulta ? "listado" : confirmada ? "confirmada"
      : coincidencias.length ? "requiere_aclaracion" : "sin_coincidencia",
    vacantes: coincidencias.map(({ codigo, nombre, descripcion, rubricas }) => ({
      codigo, nombre, descripcion,
      ...(incluirRubrica ? { version: rubricas.length, rubrica: rubricas.at(-1) } : {}),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
