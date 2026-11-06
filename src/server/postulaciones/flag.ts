export function reclutamientoEnabled(): boolean {
  return (process.env.RECLUTAMIENTO ?? "").trim().toLowerCase() === "on";
}
