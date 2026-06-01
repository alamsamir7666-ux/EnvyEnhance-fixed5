import { logAudit } from "../lib/audit";
import { Router } from "express";
import { db } from "@workspace/db";
import { returnsTable, ordersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

const VALID_RETURN_STATUSES = ["requested","approved","rejected","completed"];

function fmt(r: typeof returnsTable.$inferSelect) {
  return {
    id: r.id,
    orderId: r.orderId,
    userId: r.userId,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote ?? null,
    refundAmount: r.refundAmount != null ? Number(r.refundAmount) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// User: Request a return
router.post("/returns", requireAuth, async (req: any, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId || isNaN(Number(orderId))) {
      res.status(400).json({ error: "Valid order ID is required" });
      return;
    }
    if (!reason || reason.trim().length < 10) {
      res.status(400).json({ error: "Please provide a detailed reason (min 10 characters)" });
      return;
    }

    // Verify the order belongs to this user and is delivered
    const [order] = await db
      .select({ id: ordersTable.id, orderStatus: ordersTable.orderStatus, userId: ordersTable.userId })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, Number(orderId)), eq(ordersTable.userId, req.userId)))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (order.orderStatus !== "delivered") {
      res.status(400).json({ error: "Returns can only be requested for delivered orders" });
      return;
    }

    // Check no existing return request for this order
    const [existing] = await db
      .select({ id: returnsTable.id })
      .from(returnsTable)
      .where(eq(returnsTable.orderId, Number(orderId)))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "A return request already exists for this order" });
      return;
    }

    const [returnReq] = await db
      .insert(returnsTable)
      .values({ orderId: Number(orderId), userId: req.userId, reason: reason.trim() })
      .returning();

    res.status(201).json(fmt(returnReq));
  } catch {
    res.status(500).json({ error: "Failed to create return request" });
  }
});

// User: Get own returns
router.get("/returns/me", requireAuth, async (req: any, res) => {
  try {
    const returns = await db
      .select()
      .from(returnsTable)
      .where(eq(returnsTable.userId, req.userId))
      .orderBy(desc(returnsTable.createdAt));
    res.json(returns.map(fmt));
  } catch {
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

// Admin: Get all returns
router.get("/admin/returns", requireAdmin, async (_req, res) => {
  try {
    const returns = await db
      .select()
      .from(returnsTable)
      .orderBy(desc(returnsTable.createdAt));
    res.json(returns.map(fmt));
  } catch {
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

// Admin: Update return status
router.put("/admin/returns/:id", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid return ID" });
      return;
    }
    const { status, adminNote, refundAmount } = req.body;
    if (!status || !VALID_RETURN_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid return status" });
      return;
    }

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (adminNote !== undefined) updates.adminNote = adminNote?.trim() || null;
    if (refundAmount !== undefined && refundAmount !== null) {
      const amt = Number(refundAmount);
      if (!isNaN(amt) && amt >= 0) updates.refundAmount = String(amt);
    }

    const [updated] = await db
      .update(returnsTable)
      .set(updates)
      .where(eq(returnsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Return not found" });
      return;
    }
    await logAudit({ adminId: req.userId, action: "return.updated", targetType: "return", targetId: String(id) });
    res.json(fmt(updated));
  } catch {
    res.status(500).json({ error: "Failed to update return" });
  }
});

export default router;
