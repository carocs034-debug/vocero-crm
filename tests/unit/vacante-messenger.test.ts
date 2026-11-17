import { describe, expect, it } from "vitest";
import { resolverVacanteMessenger } from "@/server/postulaciones/vacante-messenger";

const vacantes = [
  { codigo: "EJEC-ATEN-CLI", nombre: "Ejecutivo(a) de Atención al Cliente (Cajero/a)" },
  { codigo: "ALMACENISTA", nombre: "Almacenista" },
  { codigo: "COORD-ALMACEN", nombre: "Coordinador de almacén" },
];

describe("vacante elegida en Messenger", () => {
  it("reconoce el nombre usado en la conversación de Talented", () => {
    expect(resolverVacanteMessenger([
      "Sí. Adjunto mi CV.",
      "Me interesa ejecutivo de atención al cliente.",
    ], vacantes)).toBe("EJEC-ATEN-CLI");
  });

  it("no reutiliza una elección anterior después de una selección ambigua", () => {
    expect(resolverVacanteMessenger([
      "Me interesa almacén",
      "Me interesa Almacenista",
    ], vacantes)).toBeNull();
  });

  it("usa el código exacto y requiere una vacante del catálogo", () => {
    expect(resolverVacanteMessenger(["Me postulo a COORD-ALMACEN"], vacantes)).toBe("COORD-ALMACEN");
    expect(resolverVacanteMessenger(["Me postulo a Cajero nocturno"], vacantes)).toBeNull();
  });
});
