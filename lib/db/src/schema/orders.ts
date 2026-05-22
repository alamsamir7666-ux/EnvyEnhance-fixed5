import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type OrderItem = {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  postalCode?: string | null;
};

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  trackingId: text("tracking_id").notNull().unique(),
  userId: text("user_id").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  orderStatus: text("order_status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
  couponCode: text("coupon_code"),
  discountAmount: numeric("discount_amount", {
    precision: 10,
    scale: 2,
  })
    .notNull()
    .default("0"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
