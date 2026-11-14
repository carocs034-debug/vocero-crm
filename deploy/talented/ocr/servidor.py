import json
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

MAX_BYTES = 10 * 1024 * 1024
MAX_PAGINAS = 5
FORMATOS = {
    "application/pdf": b"%PDF-",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
}


def ejecutar(argumentos, segundos):
    return subprocess.run(
        argumentos, check=True, stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL, timeout=segundos,
    ).stdout


def extraer(archivo, formato):
    with TemporaryDirectory() as nombre:
        carpeta = Path(nombre)
        entrada = carpeta / "entrada"
        entrada.write_bytes(archivo)
        paginas = [entrada]
        if formato == "application/pdf":
            info = ejecutar(["pdfinfo", str(entrada)], 5).decode("utf-8", errors="replace")
            total = next(int(linea.split()[1]) for linea in info.splitlines()
                         if linea.startswith("Pages:"))
            if not 1 <= total <= MAX_PAGINAS:
                raise ValueError("Cantidad de páginas fuera del límite")
            ejecutar(["pdftoppm", "-f", "1", "-l", str(total), "-scale-to", "1900",
                      "-png", str(entrada), str(carpeta / "pagina")], 15)
            paginas = sorted(carpeta.glob("pagina-*.png"))
            if len(paginas) != total:
                raise ValueError("No se pudieron abrir todas las páginas")

        textos = [
            ejecutar(["tesseract", str(pagina), "stdout", "-l", "spa+eng", "--psm", "3"], 8)
            .decode("utf-8", errors="replace").strip()
            for pagina in paginas
        ]
        return "\n\n".join(textos)[:30000]


class OCR(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_):
        pass

    def responder(self, codigo, resultado):
        cuerpo = json.dumps(resultado, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_POST(self):
        if self.path != "/ocr":
            self.responder(404, {"error": "ruta_no_disponible"})
            return
        formato = self.headers.get_content_type()
        firma = FORMATOS.get(formato)
        if firma is None:
            self.responder(415, {"error": "formato_no_admitido"})
            return
        longitud = self.headers.get("Content-Length", "")
        if not longitud.isascii() or not longitud.isdecimal() or len(longitud) > 8:
            self.responder(411, {"error": "longitud_requerida"})
            return
        total = int(longitud)
        if not 0 < total <= MAX_BYTES:
            self.responder(413, {"error": "archivo_fuera_de_limite"})
            return
        try:
            archivo = self.rfile.read(total)
        except TimeoutError:
            self.responder(408, {"error": "lectura_interrumpida"})
            return
        if len(archivo) != total or not archivo.startswith(firma):
            self.responder(422, {"error": "archivo_invalido"})
            return
        try:
            texto = extraer(archivo, formato)
        except (OSError, subprocess.SubprocessError, StopIteration, ValueError):
            self.responder(422, {"error": "requiere_revision_documental"})
            return
        self.responder(200, {"text": texto})


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), OCR).serve_forever()
