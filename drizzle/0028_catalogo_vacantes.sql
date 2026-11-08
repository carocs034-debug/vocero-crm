CREATE TABLE "vacante_reclutamiento" (
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "codigo" text NOT NULL,
  "nombre" text NOT NULL,
  "descripcion" text NOT NULL,
  "activa" boolean NOT NULL DEFAULT true,
  "rubricas" jsonb NOT NULL,
  PRIMARY KEY ("organization_id", "codigo")
);
