ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_sub_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_items" DROP CONSTRAINT "inventory_items_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_sub_tenant_id_sub_tenants_id_fk" FOREIGN KEY ("sub_tenant_id") REFERENCES "public"."sub_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_sub_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sub_tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sub_tenant_sub_tenants_id_fk" FOREIGN KEY ("sub_tenant") REFERENCES "public"."sub_tenants"("id") ON DELETE no action ON UPDATE no action;