/** Arnes UI aislado. pnpm build primero; node scripts/e2e-pipeline-reclutamiento.mjs.
 * Solo localhost, datos sinteticos en memoria, sin credenciales ni Postgres.
 * Abrir con el navegador y seguir tests/e2e/us-pipeline-reclutamiento.md.
 */
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const raiz = fileURLToPath(new URL("../", import.meta.url));
const { outputFiles } = await build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PipelinePostulaciones} from './src/components/postulaciones/pipeline-postulaciones'; import {PostulacionesClient} from './src/components/postulaciones/postulaciones-client'; createRoot(document.getElementById('app')).render(location.pathname==='/postulaciones' ? <PostulacionesClient initialId={new URLSearchParams(location.search).get('id') ?? undefined}/> : <PipelinePostulaciones/>);`, resolveDir: raiz, loader: "tsx" }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic", alias: { "@": path.join(raiz, "src") }, define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' } });
const cssDir = path.join(raiz, ".next/static/css");
const css = (await Promise.all((await readdir(cssDir)).filter(n => n.endsWith(".css")).map(n => readFile(path.join(cssDir, n), "utf8")))).join("\n");
const etapas = ["nueva", "por_completar", "en_revision", "entrevista", "cerrada"];
const fichas = Array.from({ length: 33 }, (_, i) => ({ id: `post_${String(i + 1).padStart(20, "0")}`, nombre: i === 0 ? "Persona Demo" : i === 1 ? "Conflicto Demo" : `Candidato ficticio ${i + 1}`, vacante: "Almacenista demo", correo: null, telefono: null, canal: "manual", etapa: "nueva", notas: "Nota conservada de prueba", analisis: null, revisionHumana: "pendiente", revisadaEn: null, creadaEn: "2026-11-06T18:00:00.000Z", actualizadaEn: "2026-11-06T18:00:00.000Z", version: 1, cv: null }));
let conflictoPendiente = true;
let falloPendiente = false;
createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3199");
  const enviar = (status, datos) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(datos)); };
  if (url.pathname === "/app.js") { res.writeHead(200, { "Content-Type": "text/javascript" }); res.end(outputFiles[0].contents); return; }
  if (url.pathname === "/app.css") { res.writeHead(200, { "Content-Type": "text/css" }); res.end(css); return; }
  if (url.pathname === "/fallar-lista") { falloPendiente = true; res.writeHead(302, { Location: "/pipeline" }); res.end(); return; }
  if (url.pathname.startsWith("/api/postulaciones")) {
    const id = url.pathname.split("/")[3];
    if (!id && falloPendiente) { falloPendiente = false; enviar(503, { error: { message: "Error simulado de carga. Vuelve a intentar." } }); return; }
    const p = fichas.find(p => p.id === id);
    if (id && !p) { enviar(404, { error: { message: "No se encontró la postulación" } }); return; }
    if (req.method === "PATCH") {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const data = JSON.parse(Buffer.concat(chunks).toString());
      if (p.nombre === "Conflicto Demo" && conflictoPendiente) { conflictoPendiente = false; p.version++; p.notas = "Nota nueva de otro revisor"; }
      if (data.version !== p.version) { enviar(409, { error: { message: "La ficha cambió. Recárgala antes de guardar tu revisión" } }); return; }
      if (!etapas.includes(data.etapa)) { enviar(422, { error: { message: "Etapa inválida" } }); return; }
      Object.assign(p, { etapa: data.etapa, notas: data.notas, version: p.version + 1, revisionHumana: "revisada", revisadaEn: new Date().toISOString() });
      enviar(200, { postulacion: p }); return;
    }
    if (id) { enviar(200, { postulacion: p }); return; }
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const etapa = url.searchParams.get("etapa");
    const pagina = Number(url.searchParams.get("pagina") ?? 1);
    const filtradas = fichas.filter(p => (!etapa || etapa === p.etapa) && `${p.nombre} ${p.vacante}`.toLowerCase().includes(q));
    enviar(200, { postulaciones: filtradas.slice((pagina - 1) * 30, pagina * 30), total: filtradas.length, pagina, conteo: Object.fromEntries(etapas.map(e => [e, fichas.filter(p => p.etapa === e).length])) }); return;
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prueba sintetica de reclutamiento</title><link rel="stylesheet" href="/app.css"></head><body><div id="app" style="height:100dvh"></div><script src="/app.js"></script></body></html>');
}).listen(3199, "127.0.0.1", () => console.log("Arnes sintetico: http://127.0.0.1:3199/pipeline · /fallar-lista simula error de carga. Ctrl+C termina y descarta fixtures en memoria."));
