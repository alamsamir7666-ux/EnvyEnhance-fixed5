import { Router } from "express";
import { db } from "@workspace/db";
import { stockAlertsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sendStockAlertEmail } from "../lib/email";

const router = Router();

router.post("/stock-alerts", async (req, res) => {
  try {
    const { productId, email } = req.body;
    if (!productId || isNaN(Number(productId))) {
      res.status(400).json({ error: "Valid product ID is required" });
      return;
    }
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }

    const [product] = await db
      .select({ id: productsTable.id, stock: productsTable.stock, name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, Number(productId)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.stock > 0) {
      res.status(400).json({ error: "Product is already in stock" });
      return;
    }

    // Prevent duplicate alerts
    const existing = await db
      .select({ id: stockAlertsTable.id })
      .from(stockAlertsTable)
      .where(
        and(
          eq(stockAlertsTable.productId, Number(productId)),
          eq(stockAlertsTable.email, email.toLowerCase().trim()),
          eq(stockAlertsTable.notified, false),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      res.json({ message: "You are already on the waitlist for this product" });
      return;
    }

    await db.insert(stockAlertsTable).values({
      productId: Number(productId),
      email: email.toLowerCase().trim(),
    });

    res.status(201).json({ message: "You will be notified when this product is back in stock" });
  } catch {
    res.status(500).json({ error: "Failed to register stock alert" });
  }
});

/**
 * Called whenever admin updates a product's stock to > 0.
 * Notifies all waiting subscribers.
 */
export async function notifyStockAlerts(productId: number, productName: string) {
  try {
    const alerts = await db
      .select()
      .from(stockAlertsTable)
      .where(
        and(
          eq(stockAlertsTable.productId, productId),
          eq(stockAlertsTable.notified, false),
        ),
      );

    for (const alert of alerts) {
      await sendStockAlertEmail({ to: alert.email, productName });
      await db
        .update(stockAlertsTable)
        .set({ notified: true })
        .where(eq(stockAlertsTable.id, alert.id));
    }
  } catch (err) {
    console.error("[stock-alert] notifyStockAlerts failed:", err);
  }
}

export default router;
