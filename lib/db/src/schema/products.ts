import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  description: text("description").notNull(),
  ingredients: text("ingredients"),
  keyBenefits: jsonb("key_benefits").$type<string[]>().notNull().default([]),
  mainIngredients: jsonb("main_ingredients").$type<{ name: string; icon: string }[]>().notNull().default([]),
  bestFor: jsonb("best_for").$type<string[]>().notNull().default([]),
  texture: text("texture"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  homepageSection: text("homepage_section"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
