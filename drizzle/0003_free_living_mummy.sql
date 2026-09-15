CREATE TYPE "public"."icd_chapter" AS ENUM('I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII');--> statement-breakpoint
CREATE TYPE "public"."medicine_category" AS ENUM('A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V');--> statement-breakpoint
CREATE TABLE "diagnoses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icd_code" varchar(10) NOT NULL,
	"description" varchar(255) NOT NULL,
	"chapter" "icd_chapter" NOT NULL,
	CONSTRAINT "diagnoses_icd_code_unique" UNIQUE("icd_code")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"sub_tenant_id" uuid NOT NULL,
	"operation" varchar(3) NOT NULL,
	"quantity" integer NOT NULL,
	"reason" varchar(500),
	"diagnosis_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_diagnoses" (
	"medicine_id" uuid NOT NULL,
	"diagnosis_id" uuid NOT NULL,
	CONSTRAINT "medicine_diagnoses_medicine_id_diagnosis_id_pk" PRIMARY KEY("medicine_id","diagnosis_id")
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "medicine_category" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "medicine_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "expiry_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_sub_tenant_id_tenants_id_fk" FOREIGN KEY ("sub_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_diagnoses" ADD CONSTRAINT "medicine_diagnoses_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicine_diagnoses" ADD CONSTRAINT "medicine_diagnoses_diagnosis_id_diagnoses_id_fk" FOREIGN KEY ("diagnosis_id") REFERENCES "public"."diagnoses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "name";