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
