import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  cartItemsTable,
  productsTable,
  couponsTable,
  usersTable,
  addressesTable,
  affiliatesTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendOrderConfirmation } from "../lib/email";
import crypto from "crypto";
import { awardPoints, redeemPoints, TAKA_PER_POINT } from "./loyalty";

const router = Router();

function formatOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    trackingId: o.trackingId,
    userId: o.userId,
    items: o.items as any[],
    totalAmount: Number(o.totalAmount),
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    transactionId: o.transactionId,
    shippingAddress: o.shippingAddress as any,
    couponCode: o.couponCode,
    discountAmount: Number(o.discountAmount),
    cancellationReason: o.cancellationReason ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

router.get("/orders", requireAuth, async (req: any, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.userId))
      .orderBy(desc(ordersTable.createdAt));
    res.json(orders.map(formatOrder));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/orders", requireAuth, async (req: any, res) => {
  try {
    const { paymentMethod, transactionId, shippingAddress, couponCode, loyaltyPointsToRedeem, giftWrap, giftMessage } = req.body;

    // Validate required fields
    if (!paymentMethod) {
      res.status(400).json({ error: "Payment method is required" });
      return;
    }
    if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.street || !shippingAddress?.city) {
      res.status(400).json({ error: "Incomplete shipping address" });
      return;
    }

    // Validate bkash/nagad payment requires transactionId
    if (
      (paymentMethod === "bkash" || paymentMethod === "nagad") &&
      (!transactionId || transactionId.trim() === "")
    ) {
      res.status(400).json({ error: "Transaction ID is required for this payment method" });
      return;
    }

    const cartItems = await db
      .select({ cart: cartItemsTable, product: productsTable })
      .from(cartItemsTable)
      .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.userId, req.userId));

    if (cartItems.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }

    // FIX: Validate stock availability before placing order
    for (const { cart, product } of cartItems) {
      if (product.stock < cart.quantity) {
        res.status(400).json({
          error: `Insufficient stock for "${product.name}". Only ${product.stock} left.`,
        });
        return;
      }
    }

    let subtotal = 0;
    const items = cartItems.map(({ cart, product }) => {
      const price =
        product.discountPrice != null
          ? Number(product.discountPrice)
          : Number(product.price);
      subtotal += price * cart.quantity;
      return {
        productId: product.id,
        productName: product.name,
        productImage: ((product.images as string[])[0]) ?? "",
        quantity: cart.quantity,
        price,
      };
    });

    let discountAmount = 0;
    if (couponCode) {
      const [coupon] = await db
        .select()
        .from(couponsTable)
        .where(eq(couponsTable.code, couponCode.toUpperCase()))
        .limit(1);
      if (coupon && coupon.isActive) {
        if (coupon.discountType === "percentage") {
          discountAmount = Math.floor((subtotal * Number(coupon.discountValue)) / 100);
        } else {
          discountAmount = Math.min(Number(coupon.discountValue), subtotal);
        }
      }
    }

    // Loyalty points redemption
    let loyaltyDiscount = 0;
    const pointsToRedeem = Math.max(0, Math.floor(Number(loyaltyPointsToRedeem) || 0));
    if (pointsToRedeem > 0) {
      const maxLoyaltyDiscount = Math.floor(subtotal * 0.2); // max 20% of order
      loyaltyDiscount = Math.min(pointsToRedeem * TAKA_PER_POINT, maxLoyaltyDiscount);
    }

    const totalAmount = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
    const trackingId =
      "EE" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const paymentStatus =
      paymentMethod === "cod" ? "pending" : "pending_verification";

    const [order] = await db
      .insert(ordersTable)
      .values({
        trackingId,
        userId: req.userId,
        items,
        totalAmount: String(totalAmount),
        paymentMethod,
        paymentStatus,
        orderStatus: "pending",
        transactionId: transactionId?.trim() ?? null,
        shippingAddress,
        couponCode: couponCode ?? null,
        discountAmount: String(discountAmount),
		giftWrap: giftWrap ? "true" : "false",
		giftMessage: giftMessage ?? null,
      })
      .returning();

    // Clear cart after successful order creation
    await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.userId, req.userId));

    // ── Decrement product stock for each ordered item ──────────────────────
    // This must be done after order is created to prevent overselling
    await Promise.all(
      cartItems.map(({ cart, product }) =>
        db
          .update(productsTable)
          .set({ stock: Math.max(0, product.stock - cart.quantity) })
          .where(eq(productsTable.id, product.id))
      )
    );
    // ──────────────────────────────────────────────────────────────────────

    // ── Affiliate / influencer commission tracking ─────────────────────────
    // If a coupon code was used, check if it belongs to an affiliate and update stats
    if (couponCode) {
      try {
        const [affiliate] = await db
          .select()
          .from(affiliatesTable)
          .where(eq(affiliatesTable.code, couponCode.toUpperCase()))
          .limit(1);

        if (affiliate && affiliate.isActive) {
          const commissionEarned = (totalAmount * Number(affiliate.commissionRate)) / 100;
          await db
            .update(affiliatesTable)
            .set({
              totalOrders: affiliate.totalOrders + 1,
              totalSales: String(Number(affiliate.totalSales) + totalAmount),
              totalCommission: String(Number(affiliate.totalCommission) + commissionEarned),
            })
            .where(eq(affiliatesTable.id, affiliate.id));
        }
      } catch (_) {
        // Non-blocking: affiliate tracking failure should not fail the order
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Redeem loyalty points if requested (non-blocking, best-effort)
    if (pointsToRedeem > 0) {
      const actualPointsToRedeem = Math.ceil(loyaltyDiscount / TAKA_PER_POINT);
      redeemPoints(req.userId, actualPointsToRedeem, order.id).catch(() => {});
    }

    // Award loyalty points for this order (non-blocking)
    awardPoints(req.userId, order.id, totalAmount).catch(() => {});

    // Auto-save shipping address (non-blocking)
    const addr = shippingAddress as {
      fullName?: string;
      phone?: string;
      street?: string;
      city?: string;
      district?: string;
      postalCode?: string;
    } | null;
    if (addr?.fullName && addr?.street && addr?.city) {
      try {
        const existing = await db
          .select()
          .from(addressesTable)
          .where(eq(addressesTable.userId, req.userId));
        const alreadySaved = existing.some(
          (a) => a.street === addr.street && a.city === addr.city,
        );
        if (!alreadySaved) {
          await db.insert(addressesTable).values({
            userId: req.userId,
            fullName: addr.fullName ?? "",
            phone: addr.phone ?? "",
            street: addr.street ?? "",
            city: addr.city ?? "",
            district: addr.district ?? "",
            postalCode: addr.postalCode ?? null,
            isDefault: existing.length === 0,
          });
        }
      } catch (_) {
        // Non-blocking: address saving failure should not fail the order
      }
    }

    // Send confirmation email (non-blocking)
    const [userRow] = await db
      .select({
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
      })
      .from(usersTable)
      .where(eq(usersTable.clerkId, req.userId))
      .limit(1);

    if (userRow?.email && !userRow.email.endsWith("@clerk.user")) {
      const name =
        [userRow.firstName, userRow.lastName].filter(Boolean).join(" ") ||
        "Customer";
      sendOrderConfirmation({
        to: userRow.email,
        name,
        orderId: order.id,
        trackingId: order.trackingId,
        items,
        total: totalAmount,
        shippingAddress,
        paymentMethod,
      }).catch(() => {});
    }

    res.status(201).json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/track/:trackingId", async (req, res) => {
  try {
    // Sanitize trackingId: only allow alphanumeric
    const rawId = req.params.trackingId;
    if (!/^[A-Z0-9]{2,20}$/i.test(rawId)) {
      res.status(400).json({ error: "Invalid tracking ID format" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.trackingId, rawId.toUpperCase()))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const statuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
    ];
    const labels: Record<string, string> = {
      pending: "Order Placed",
      confirmed: "Order Confirmed",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
    };

    const currentIdx = statuses.indexOf(order.orderStatus);
    const timeline = statuses.map((s, i) => ({
      status: s,
      label: labels[s] ?? s,
      timestamp: i <= currentIdx ? order.updatedAt.toISOString() : null,
      completed: i <= currentIdx,
    }));

    res.json({
      trackingId: order.trackingId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      timeline,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to track order" });
  }
});

router.get("/orders/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, req.userId)))
      .limit(1);
    if (!order) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.post("/orders/:id/cancel", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      res.status(400).json({ error: "Cancellation reason is required" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, req.userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    // Only allow cancellation of pending orders
    if (!["pending"].includes(order.orderStatus)) {
      res.status(400).json({
        error: `Cannot cancel an order that is already "${order.orderStatus}". Please contact support.`,
      });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({
        orderStatus: "cancelled",
        cancellationReason: reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, id))
      .returning();

    res.json(formatOrder(updated));
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

export default router;
