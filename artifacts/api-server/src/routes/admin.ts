import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, usersTable, productsTable, affiliatesTable } from "@workspace/db";
import { eq, desc, sql, and, lt, or } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { sendOrderStatusUpdate } from "../lib/email";
import { logAudit } from "../lib/audit";

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
    giftWrap: o.giftWrap ?? "false",
    giftMessage: o.giftMessage ?? null,
    senderNumber: o.senderNumber ?? null,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

type OrderWithUser = typeof ordersTable.$inferSelect & {
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userPhone: string | null;
};

function formatOrderWithUser(o: OrderWithUser) {
  return {
    ...formatOrder(o),
    userEmail: o.userEmail ?? null,
    userName:
      [o.userFirstName, o.userLastName].filter(Boolean).join(" ") || null,
    userPhone: o.userPhone ?? null,
  };
}

const VALID_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const VALID_PAYMENT_STATUSES = [
  "pending",
  "pending_verification",
  "paid",
  "failed",
  "refunded",
];

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      [{ totalOrders }],
      [{ totalUsers }],
      [{ totalSales }],
      [{ pendingOrders }],
    ] = await Promise.all([
      db
        .select({ totalOrders: sql<string>`COUNT(*)` })
        .from(ordersTable)
        .where(sql`created_at >= ${startOfMonth.toISOString()}`),
      db.select({ totalUsers: sql<string>`COUNT(*)` }).from(usersTable),
      db
        .select({
          totalSales: sql<string>`COALESCE(SUM(total_amount), 0)`,
        })
        .from(ordersTable)
        .where(
          sql`order_status = 'delivered' AND created_at >= ${startOfMonth.toISOString()}`,
        ),
      db
        .select({ pendingOrders: sql<string>`COUNT(*)` })
        .from(ordersTable)
        .where(eq(ordersTable.orderStatus, "pending")),
    ]);

    const recentOrders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);

    const monthlySalesRaw = await db.execute(sql`
      SELECT
        TO_CHAR(created_at, 'Mon ''YY') AS month,
        COALESCE(SUM(CASE WHEN order_status = 'delivered' THEN total_amount ELSE 0 END), 0) AS total,
        COUNT(*) AS orders
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon ''YY'), DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

    const monthlySales = (monthlySalesRaw.rows as any[]).map((r) => ({
      month: r.month as string,
      total: Number(r.total),
      orders: Number(r.orders),
    }));

    // FIX: The ILIKE pattern on JSON is fragile. Use a safer approach.
    // This query uses proper JSONB array traversal instead of text pattern matching.
    const salesByCategoryRaw = await db.execute(sql`
      SELECT
        p.category,
        COUNT(DISTINCT o.id) AS count,
        COALESCE(SUM(o.total_amount), 0) AS total
      FROM products p
      LEFT JOIN orders o ON o.order_status = 'delivered'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(o.items) AS item
          WHERE (item->>'productId')::int = p.id
        )
      GROUP BY p.category
      ORDER BY total DESC
      LIMIT 10
    `);

    const salesByCategory = (salesByCategoryRaw.rows as any[]).map((r) => ({
      category: r.category as string,
      total: Number(r.total),
      count: Number(r.count),
    }));

    res.json({
      totalSales: Number(totalSales),
      totalOrders: Number(totalOrders),
      totalUsers: Number(totalUsers),
      pendingOrders: Number(pendingOrders),
      recentOrders: recentOrders.map(formatOrder),
      salesByCategory,
      monthlySales,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});


router.get("/admin/orders/archived", requireAdmin, async (req: any, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limit = 15;
    const offset = (pageNum - 1) * limit;
    const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const baseSelect = {
      id: ordersTable.id,
      trackingId: ordersTable.trackingId,
      userId: ordersTable.userId,
      items: ordersTable.items,
      totalAmount: ordersTable.totalAmount,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      orderStatus: ordersTable.orderStatus,
      transactionId: ordersTable.transactionId,
      shippingAddress: ordersTable.shippingAddress,
      couponCode: ordersTable.couponCode,
      discountAmount: ordersTable.discountAmount,
      cancellationReason: ordersTable.cancellationReason,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      userPhone: usersTable.phone,
      giftWrap: ordersTable.giftWrap,
      giftMessage: ordersTable.giftMessage,
      senderNumber: ordersTable.senderNumber,
      paidAt: ordersTable.paidAt,
    };

    const [orders, [{ total }]] = await Promise.all([
      db.select(baseSelect)
        .from(ordersTable)
        .leftJoin(usersTable, eq(ordersTable.userId, usersTable.clerkId))
        .where(and(
          or(
            eq(ordersTable.orderStatus, "delivered"),
            eq(ordersTable.orderStatus, "cancelled")
          ),
          lt(ordersTable.updatedAt, TWO_DAYS_AGO)
        ))
        .orderBy(desc(ordersTable.updatedAt))
        .limit(limit)
        .offset(offset) as Promise<OrderWithUser[]>,
      db.select({ total: sql<string>`COUNT(*)` })
        .from(ordersTable)
        .where(and(
          or(
            eq(ordersTable.orderStatus, "delivered"),
            eq(ordersTable.orderStatus, "cancelled")
          ),
          lt(ordersTable.updatedAt, TWO_DAYS_AGO)
        )),
    ]);

    res.json({
      orders: orders.map(formatOrderWithUser),
      total: Number(total),
      page: pageNum,
      hasMore: offset + limit < Number(total),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch archived orders" });
  }
});

router.get("/admin/orders", requireAdmin, async (req: any, res) => {
  try {
    const { status, page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = 20;
    const offset = (pageNum - 1) * limitNum;

    // FIX: Validate status param to prevent SQL injection via ORM
    if (status && !VALID_ORDER_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid order status filter" });
      return;
    }

    const baseSelect = {
      id: ordersTable.id,
      trackingId: ordersTable.trackingId,
      userId: ordersTable.userId,
      items: ordersTable.items,
      totalAmount: ordersTable.totalAmount,
      paymentMethod: ordersTable.paymentMethod,
      paymentStatus: ordersTable.paymentStatus,
      orderStatus: ordersTable.orderStatus,
      transactionId: ordersTable.transactionId,
      shippingAddress: ordersTable.shippingAddress,
      couponCode: ordersTable.couponCode,
      discountAmount: ordersTable.discountAmount,
      cancellationReason: ordersTable.cancellationReason,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      userEmail: usersTable.email,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      userPhone: usersTable.phone,
      giftWrap: ordersTable.giftWrap,
      giftMessage: ordersTable.giftMessage,
      senderNumber: ordersTable.senderNumber,
      paidAt: ordersTable.paidAt,
    };

    let query = db
      .select(baseSelect)
      .from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.clerkId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const orders = status
      ? ((await query.where(
          eq(ordersTable.orderStatus, status),
        )) as OrderWithUser[])
      : ((await query) as OrderWithUser[]);

    res.json(orders.map(formatOrderWithUser));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.put("/admin/orders/:id/status", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { orderStatus, cancellationReason } = req.body;

    // FIX: Validate incoming status against allowed values
    if (!orderStatus || !VALID_ORDER_STATUSES.includes(orderStatus)) {
      res.status(400).json({ error: "Invalid order status" });
      return;
    }

    const [existing] = await db
      .select({ orderStatus: ordersTable.orderStatus, items: ordersTable.items })
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (existing.orderStatus === "delivered") {
      res.status(400).json({ error: "Cannot change status of a delivered order" });
      return;
    }
    if (existing.orderStatus === "cancelled") {
      res.status(400).json({ error: "Cannot change status of a cancelled order" });
      return;
    }

    // FIX: Validate cancellation reason when cancelling
    if (orderStatus === "cancelled") {
      const reason = cancellationReason?.trim();
      if (!reason) {
        res.status(400).json({ error: "Cancellation reason is required" });
        return;
      }
    }

    const updateFields: Record<string, unknown> = {
      orderStatus,
      updatedAt: new Date(),
    };
    if (orderStatus === "cancelled") {
      updateFields.cancellationReason = cancellationReason?.trim() || null;
    }

    const [order] = await db
      .update(ordersTable)
      .set(updateFields)
      .where(eq(ordersTable.id, id))
      .returning();

    // Auto-deduct stock when order is marked as delivered
    if (
      orderStatus === "delivered" &&
      existing.orderStatus !== "delivered"
    ) {
      const items = (existing?.items ?? []) as Array<{
        productId: number;
        quantity: number;
      }>;
      for (const item of items) {
        try {
          await db
            .update(productsTable)
            .set({
              stock: sql`GREATEST(0, stock - ${item.quantity})`,
            })
            .where(eq(productsTable.id, item.productId));
        } catch {
          // Non-blocking
        }
      }
    }

    // ── Affiliate commission on delivery ───────────────────────────────────
    if (orderStatus === "delivered" && existing.orderStatus !== "delivered") {
      try {
        const orderRow = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1).then(r => r[0]);
        const couponCode = orderRow?.couponCode;
        const totalAmount = Number(orderRow?.totalAmount ?? 0);
        if (couponCode) {
          const [affiliate] = await db.select().from(affiliatesTable)
            .where(eq(affiliatesTable.code, couponCode.toUpperCase())).limit(1);
          if (affiliate && affiliate.isActive) {
            const commissionEarned = (totalAmount * Number(affiliate.commissionRate)) / 100;
            await db.update(affiliatesTable).set({
              totalOrders: affiliate.totalOrders + 1,
              totalSales: String(Number(affiliate.totalSales) + totalAmount),
              totalCommission: String(Number(affiliate.totalCommission) + commissionEarned),
            }).where(eq(affiliatesTable.id, affiliate.id));
          }
        }
      } catch { /* Non-blocking */ }
    }

    // Send status update email (non-blocking)
    if (order) {
      const [userRow] = await db
        .select({
          email: usersTable.email,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
        })
        .from(usersTable)
        .where(eq(usersTable.clerkId, order.userId))
        .limit(1);

      if (userRow?.email && !userRow.email.endsWith("@clerk.user")) {
        const name =
          [userRow.firstName, userRow.lastName].filter(Boolean).join(" ") ||
          "Customer";
        sendOrderStatusUpdate({
          to: userRow.email,
          name,
          orderId: order.id,
          trackingId: order.trackingId,
          newStatus: orderStatus,
        }).catch(() => {});
      }
    }

    await logAudit({ adminId: req.userId, adminEmail: req.dbUser?.email, action: "order.status_changed", targetType: "order", targetId: String(id), after: { status: orderStatus } });
    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

router.put("/admin/orders/:id/payment", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const { paymentStatus } = req.body;

    // FIX: Validate payment status
    if (!paymentStatus || !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
      res.status(400).json({ error: "Invalid payment status" });
      return;
    }

    const [order] = await db
      .update(ordersTable)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await logAudit({ adminId: req.userId, adminEmail: req.dbUser?.email, action: "order.payment_updated", targetType: "order", targetId: String(id), after: { paymentStatus } });
    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

router.get("/admin/users", requireAdmin, async (_req, res) => {
  try {
    const usersRaw = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    // FIX: Batch query for order counts (was fine, keeping as-is)
    const orderCountsRaw = await db.execute(sql`
      SELECT user_id, COUNT(*) AS order_count
      FROM orders
      GROUP BY user_id
    `);
    const orderCountMap: Record<string, number> = {};
    for (const row of orderCountsRaw.rows as any[]) {
      orderCountMap[row.user_id] = Number(row.order_count);
    }

    res.json(
      usersRaw.map((u) => ({
        id: u.id,
        clerkId: u.clerkId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role,
        isBlocked: u.isBlocked,
        orderCount: orderCountMap[u.clerkId] ?? 0,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/admin/users/:id/block", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    const { isBlocked } = req.body;
    if (typeof isBlocked !== "boolean") {
      res.status(400).json({ error: "isBlocked must be a boolean" });
      return;
    }

    // FIX: Prevent admin from blocking themselves
    const [targetUser] = await db
      .select({ clerkId: usersTable.clerkId })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (targetUser?.clerkId === req.userId) {
      res.status(400).json({ error: "You cannot block your own account" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({ isBlocked, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

export default router;
