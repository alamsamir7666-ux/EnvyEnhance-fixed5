import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const stockAlertsTable = pgTable("stock_alerts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  email: text("email").notNull(),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
