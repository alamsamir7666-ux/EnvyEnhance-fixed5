import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),           // e.g. "30ml", "50ml", "Light", "Medium"
  variantType: text("variant_type").notNull(), // "size" | "shade" | "pack"
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
