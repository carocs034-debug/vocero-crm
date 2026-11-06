import { afterEach, beforeEach, expect, it, vi } from "vitest";
const sesion = vi.hoisted(() => ({ require: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireSession: sesion.require, UnauthorizedError: class UnauthorizedError extends Error {} }));
import { UnauthorizedError } from "@/lib/auth/session";
import { crear, rutaPostulaciones } from "@/server/postulaciones/http";
beforeEach(() => { vi.clearAllMocks(); sesion.require.mockResolvedValue({ organizationId: "org_test", userId: "usuario", role: "owner" }); });
afterEach(() => vi.unstubAllEnvs());
it("apagado responde 404 antes de consultar la sesion", async () => {
  vi.stubEnv("RECLUTAMIENTO", "");
  const handler = vi.fn(); const r = await rutaPostulaciones(handler)(new Request("http://localhost/"));
  expect(r.status).toBe(404); expect(sesion.require).not.toHaveBeenCalled(); expect(handler).not.toHaveBeenCalled();
});
it("encendido sin sesion responde 401", async () => {
  vi.stubEnv("RECLUTAMIENTO", "on"); sesion.require.mockRejectedValue(new UnauthorizedError());
  expect((await rutaPostulaciones(async (_s, _req: Request) => Response.json({ ok: true }))(new Request("http://localhost/"))).status).toBe(401);
});
it("entrada JSON invalida y tamano excesivo fallan antes de persistir", async () => {
  vi.stubEnv("RECLUTAMIENTO", "on");
  expect((await crear(new Request("http://localhost/", { method: "POST", body: "{}" }))).status).toBe(422);
  expect((await crear(new Request("http://localhost/", { method: "POST", body: "{}", headers: { "content-length": "999999" } }))).status).toBe(413);
});
