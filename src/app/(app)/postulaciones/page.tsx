import { notFound } from "next/navigation";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";
import { PostulacionesClient } from "@/components/postulaciones/postulaciones-client";
export const dynamic = "force-dynamic";
export default async function PostulacionesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!reclutamientoEnabled()) notFound();
  const { id } = await searchParams;
  return <PostulacionesClient initialId={typeof id === "string" && /^post_[a-z0-9]{20}$/.test(id) ? id : undefined} />;
}
