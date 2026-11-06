import { notFound } from "next/navigation";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { PostulacionesClient } from "@/components/postulaciones/postulaciones-client";
export const dynamic = "force-dynamic";
export default function PostulacionesPage() {
  if (!reclutamientoEnabled()) notFound();
  return <PostulacionesClient />;
}
