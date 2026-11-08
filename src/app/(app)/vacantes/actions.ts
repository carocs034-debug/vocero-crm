"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { editarVacante } from "@/lib/vacantes";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { guardarVacante } from "@/server/vacantes/servicio";
import piloto from "@/server/vacantes/piloto.json";

async function administrador() {
  const session = await requireSession();
  if (!reclutamientoEnabled() || !["owner", "admin"].includes(session.role)) {
    throw new Error("Se requiere acceso de administración");
  }
  return session.organizationId;
}

export async function guardar(form: FormData) {
  const org = await administrador();
  let rubrica: unknown;
  try { rubrica = JSON.parse(String(form.get("rubrica"))); }
  catch { return "La rúbrica debe contener JSON válido."; }

  const datos = editarVacante.safeParse({
    codigo: form.get("codigo"), nombre: form.get("nombre"), descripcion: form.get("descripcion"),
    activa: form.has("activa"), version: Number(form.get("version")), rubrica,
  });
  if (!datos.success) return datos.error.issues.map(i => i.message).join(" ");
  if (!await guardarVacante(org, datos.data)) return "El código ya existe o la vacante cambió. Recarga la página.";
  revalidatePath("/vacantes");
  return "Vacante guardada.";
}

export async function cargarPiloto() {
  const org = await administrador();
  for (const datos of piloto) await guardarVacante(org, editarVacante.parse(datos));
  revalidatePath("/vacantes");
}
