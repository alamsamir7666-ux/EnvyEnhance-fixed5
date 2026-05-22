// lib/db/src/schema/skinProfiles.ts
// Persists quiz results per user + derived recommendation tags
import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skinProfilesTable = pgTable("skin_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Clerk user ID
  skinType: text("skin_type").notNull(),      // "dry" | "oily" | "combination" | "normal"
  sensitivity: text("sensitivity").notNull(), // "sensitive" | "normal" | "acne"
  concern: text("concern").notNull(),         // "brightening" | "antiaging" | "acne" | "hydration"
  routinePreference: text("routine_preference").notNull(), // "minimal" | "standard" | "full" | "any"
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  // Derived tags used to filter products (matches products.bestFor JSONB array)
  recommendedTags: jsonb("recommended_tags").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSkinProfileSchema = createInsertSchema(skinProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSkinProfile = z.infer<typeof insertSkinProfileSchema>;
export type SkinProfile = typeof skinProfilesTable.$inferSelect;
