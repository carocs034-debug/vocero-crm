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
export function formatoCv(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "image/png";
  if (bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))) return "image/jpeg";
  return "application/pdf";
}
export function validarCvCorreo(bytes: Buffer, mime: string) {
  if (mime === "application/pdf") return validarPdf(bytes, mime);
  if (!bytes.length || bytes.length > MAX_CV_BYTES) throw new ErrorPostulacion(413, "archivo_grande", "El CV debe pesar entre 1 byte y 10 MB");
  if ((mime !== "image/png" && mime !== "image/jpeg") || formatoCv(bytes) !== mime) {
    throw new ErrorPostulacion(422, "imagen_invalida", "Adjunta un PDF, JPG o PNG válido");
  }
}
export function nombreCvSeguro(nombre: string, mime = "application/pdf") {
  const extension = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "pdf";
  const limpio = nombre.normalize("NFC").replace(/[^\p{L}\p{N} ._()-]/gu, "_").replace(/^\.+/, "").replace(/\.(pdf|png|jpe?g)$/i, "").slice(0, 100);
  return `${limpio || "curriculum"}.${extension}`;
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
