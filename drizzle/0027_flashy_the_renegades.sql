CREATE TABLE "postulacion" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"nombre" text NOT NULL,
	"vacante" text NOT NULL,
	"correo" text,
	"telefono" text,
	"canal" text DEFAULT 'manual' NOT NULL,
	"etapa" text DEFAULT 'nueva' NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"analisis" jsonb,
	"clave_externa" text,
	"cv_storage_id" text,
	"cv_nombre" text,
	"cv_bytes" integer,
	"revision_humana" text DEFAULT 'pendiente' NOT NULL,
	"revisada_por" text,
	"revisada_en" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"creada_en" timestamp DEFAULT now() NOT NULL,
	"actualizada_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "postulacion_etapa_chk" CHECK ("postulacion"."etapa" in ('nueva','por_completar','en_revision','entrevista','cerrada')),
	CONSTRAINT "postulacion_canal_chk" CHECK ("postulacion"."canal" in ('manual','whatsapp','messenger','instagram','correo')),
	CONSTRAINT "postulacion_revision_chk" CHECK ("postulacion"."revision_humana" in ('pendiente','revisada'))
);
--> statement-breakpoint
ALTER TABLE "postulacion" ADD CONSTRAINT "postulacion_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postulacion" ADD CONSTRAINT "postulacion_revisada_por_user_id_fk" FOREIGN KEY ("revisada_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "postulacion_org_etapa_idx" ON "postulacion" USING btree ("organization_id","etapa","creada_en");--> statement-breakpoint
CREATE UNIQUE INDEX "postulacion_org_externa_uq" ON "postulacion" USING btree ("organization_id","clave_externa");