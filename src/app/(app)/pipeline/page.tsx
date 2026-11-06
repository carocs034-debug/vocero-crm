import { PipelineClient } from "@/components/pipeline/pipeline-client";
import { PipelinePostulaciones } from "@/components/postulaciones/pipeline-postulaciones";
import { reclutamientoEnabled } from "@/server/postulaciones/flag";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  return reclutamientoEnabled() ? <PipelinePostulaciones /> : <PipelineClient />;
}
