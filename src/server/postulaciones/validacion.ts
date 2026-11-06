export class ErrorPostulacion extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const MAX_CV_BYTES = 10 * 1024 * 1024;
export function validarPdf(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > MAX_CV_BYTES) throw new ErrorPostulacion(413, "archivo_grande", "El PDF debe pesar entre 1 byte y 10 MB");
  if (mime !== "application/pdf" || bytes.subarray(0, 5).toString("ascii") !== "%PDF-" || !bytes.subarray(-2048).toString("latin1").includes("%%EOF")) {
    throw new ErrorPostulacion(422, "pdf_invalido", "Adjunta un PDF completo y válido");
  }
}
export function nombreCvSeguro(nombre: string) {
  const limpio = nombre.normalize("NFC").replace(/[^\p{L}\p{N} ._()-]/gu, "_").replace(/^\.+/, "").slice(0, 100).replace(/\.pdf$/i, "");
  return `${limpio || "curriculum"}.pdf`;
}
export async function leerCuerpoLimitado(req: Request, max: number): Promise<Buffer> {
  if (Number(req.headers.get("content-length")) > max) throw new ErrorPostulacion(413, "cuerpo_grande", "La solicitud excede el tamaño permitido");
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const partes: Buffer[] = [];
  let tamano = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      tamano += value.byteLength;
      if (tamano > max) { await reader.cancel(); throw new ErrorPostulacion(413, "cuerpo_grande", "La solicitud excede el tamaño permitido"); }
      partes.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(partes);
}
