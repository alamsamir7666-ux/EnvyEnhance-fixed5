import { Router } from "express";
import { db } from "@workspace/db";
import { affiliatesTable, ordersTable, couponsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import crypto from "crypto";

const router = Router();

function fmt(a: typeof affiliatesTable.$inferSelect) {
  return {
    id: a.id, name: a.name, email: a.email, code: a.code,
    commissionRate: Number(a.commissionRate),
    totalSales: Number(a.totalSales), totalOrders: a.totalOrders,
    totalCommission: Number(a.totalCommission), isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/affiliate/me", async (req: any, res) => {
  try {
    const email = req.auth?.email;
    if (!email) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [affiliate] = await db.select().from(affiliatesTable)
      .where(eq(affiliatesTable.email, email)).limit(1);
    if (!affiliate) { res.status(404).json({ error: "Not an affiliate" }); return; }
    res.json(fmt(affiliate));
  } catch { res.status(500).json({ error: "Failed to fetch affiliate" }); }
});

router.get("/admin/affiliates", requireAdmin, async (_req, res) => {
  try {
    const affiliates = await db.select().from(affiliatesTable).orderBy(desc(affiliatesTable.createdAt));
    res.json(affiliates.map(fmt));
  } catch { res.status(500).json({ error: "Failed to fetch affiliates" }); }
});

router.post("/admin/affiliates", requireAdmin, async (req: any, res) => {
  try {
    const { name, email, commissionRate } = req.body;
    if (!name?.trim() || !email?.includes("@")) {
      res.status(400).json({ error: "Name and valid email are required" }); return;
    }
    const rate = Number(commissionRate ?? 10);
    if (isNaN(rate) || rate < 1 || rate > 50) {
      res.status(400).json({ error: "Commission rate must be between 1% and 50%" }); return;
    }

    const code = (req.body.code ?? "").toUpperCase().trim().replace(/\s+/g, "");
    if (!code || code.length < 3) {
      res.status(400).json({ error: "Affiliate code is required (min 3 characters)" }); return;
    }

    // Also create a coupon for this affiliate code
    await db.insert(couponsTable).values({
      code, discountType: "percentage", discountValue: String(rate), isActive: true,
    }).onConflictDoNothing();

    const [a] = await db.insert(affiliatesTable).values({
      name: name.trim(), email: email.trim(), code,
      commissionRate: String(rate),
    }).returning();

    res.status(201).json(fmt(a));
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "Affiliate with this code already exists" }); return; }
    res.status(500).json({ error: "Failed to create affiliate" });
  }
});

router.patch("/admin/affiliates/:id", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { name, email, commissionRate } = req.body;
    const updates: Record<string, any> = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.includes("@")) updates.email = email.trim();
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (isNaN(rate) || rate < 1 || rate > 50) {
        res.status(400).json({ error: "Commission rate must be between 1% and 50%" }); return;
      }
      updates.commissionRate = String(rate);
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" }); return;
    }
    const [updated] = await db.update(affiliatesTable).set(updates).where(eq(affiliatesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Affiliate not found" }); return; }
    res.json(fmt(updated));
  } catch { res.status(500).json({ error: "Failed to update affiliate" }); }
});

router.patch("/admin/affiliates/:id/toggle", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [existing] = await db.select().from(affiliatesTable).where(eq(affiliatesTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Affiliate not found" }); return; }
    const [updated] = await db.update(affiliatesTable)
      .set({ isActive: !existing.isActive }).where(eq(affiliatesTable.id, id)).returning();
    res.json(fmt(updated));
  } catch { res.status(500).json({ error: "Failed to toggle affiliate" }); }
});

router.delete("/admin/affiliates/:id", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(affiliatesTable).where(eq(affiliatesTable.id, id));
    res.json({ message: "Affiliate deleted" });
  } catch { res.status(500).json({ error: "Failed to delete affiliate" }); }
});

export default router;
