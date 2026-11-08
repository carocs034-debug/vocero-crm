import { z } from "zod";

const criterio = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
  peso: z.number().positive().max(1),
  esencial: z.boolean(),
  requisito: z.string().trim().min(1).max(1000),
});

export const rubricaVacante = z.array(criterio).min(1).max(20).refine(
  criterios => new Set(criterios.map(c => c.id)).size === criterios.length &&
    Math.abs(criterios.reduce((total, c) => total + c.peso, 0) - 1) < 0.000001,
  "Los criterios deben tener identificadores únicos y los pesos deben sumar 1.",
);
export const editarVacante = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,24}$/),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().min(2).max(3000),
  activa: z.boolean(),
  rubrica: rubricaVacante,
  version: z.number().int().nonnegative(),
});
export type CriterioVacante = z.infer<typeof criterio>;
export const requisitosVacante = z.array(criterio.omit({ peso: true })).min(1).max(20)
  .refine(requisitos => new Set(requisitos.map(r => r.id)).size === requisitos.length);
export type RequisitoVacante = z.infer<typeof requisitosVacante>[number];

export function calcularPesos(requisitos: RequisitoVacante[], anterior?: CriterioVacante[]): CriterioVacante[] {
  if (anterior?.length === requisitos.length && requisitos.every((r, i) =>
    r.id === anterior[i]?.id && r.esencial === anterior[i]?.esencial && r.requisito === anterior[i]?.requisito)) {
    return anterior;
  }
  const unidades = requisitos.map(r => r.esencial ? 2 : 1);
  const total = unidades.reduce<number>((suma, valor) => suma + valor, 0);
  const puntos = unidades.map(valor => Math.floor(100 * valor / total));
  const sobrantes = 100 - puntos.reduce((suma, valor) => suma + valor, 0);
  const orden = unidades.map((valor, indice) => ({ indice, resto: (100 * valor) % total }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
  for (const { indice } of orden.slice(0, sobrantes)) puntos[indice] = puntos[indice]! + 1;
  return requisitos.map((r, indice) => ({ ...r, peso: puntos[indice]! / 100 }));
}
