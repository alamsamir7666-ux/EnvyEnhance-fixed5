import { Router } from "express";
import { db } from "@workspace/db";
import { preOrdersTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function generateTrackingId() {
  return "PRE-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

router.post("/pre-orders", async (req, res) => {
  try {
    const { productId, quantity = 1, shippingAddress, paymentMethod, senderNumber, transactionId, whatsappPhone } = req.body;
    if (!productId || !shippingAddress) { res.status(400).json({ error: "Product and shipping address are required" }); return; }
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    if ((product as any).productStatus !== "pre_order") { res.status(400).json({ error: "Not available for pre-order" }); return; }
    const basePrice = Number(product.discountPrice ?? product.price);
    const discountedPrice = Math.round(basePrice * 0.95 * 100) / 100;
    const city = (shippingAddress.city ?? "").toLowerCase();
    const isDhaka = ["dhaka", "\u09a2\u09be\u0995\u09be"].some((k: string) => city.includes(k));
    const deliveryCharge = isDhaka ? 80 : 120;
    const trackingId = generateTrackingId();
    await db.insert(preOrdersTable).values({
      trackingId,
      userId: (req as any).auth?.userId ?? "guest",
      productId: Number(productId),
      productName: product.name,
      productImage: ((product.images as string[]) ?? [])[0] ?? "",
      quantity: Number(quantity),
      productPrice: String(basePrice),
      discountedPrice: String(discountedPrice),
      deliveryCharge: String(deliveryCharge),
      whatsappPhone: whatsappPhone ?? null,
      shippingAddress,
      paymentMethod: paymentMethod ?? "bkash",
      senderNumber: senderNumber ?? null,
      transactionId: transactionId ?? null,
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending_verification",
      status: "pending",
    });
    res.status(201).json({ message: "Pre-order placed!", trackingId, deliveryCharge, discountedPrice });
  } catch (err) {
    console.error("[pre-order] Failed:", err);
    res.status(500).json({ error: "Failed to place pre-order" });
  }
});

router.get("/pre-orders", async (req, res) => {
  try {
    const orders = await db.select().from(preOrdersTable).orderBy(preOrdersTable.createdAt);
    res.json(orders);
  } catch { res.status(500).json({ error: "Failed to fetch pre-orders" }); }
});

router.get("/pre-orders/my", async (req, res) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const orders = await db.select().from(preOrdersTable).where(eq(preOrdersTable.userId, userId));
    res.json(orders);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/pre-orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const [order] = await db.update(preOrdersTable).set({ status, updatedAt: new Date() }).where(eq(preOrdersTable.id, Number(req.params.id))).returning();
    res.json(order);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export async function notifyPreOrderCustomers(productId: number, productName: string) {
  try {
    const orders = await db.select().from(preOrdersTable).where(and(eq(preOrdersTable.productId, productId), eq(preOrdersTable.status, "pending")));
    console.log(`[pre-order] Notifying ${orders.length} customers`);
    for (const order of orders) {
      if (order.whatsappPhone) {
        const phone = order.whatsappPhone.replace(/[^+\d]/g, "");
        const to = phone.startsWith("+") ? phone : `+88${phone}`;
        const siteUrl = process.env.VITE_SITE_URL ?? "https://fixed5.vercel.app";
        try {
          const twilio = await import("twilio");
          const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886",
            to: `whatsapp:${to}`,
            body: `\uD83C\uDF38 *EnvyEnhance*\n\nGreat news! Your pre-ordered *${productName}* has arrived in Bangladesh and is now being shipped to you! \uD83D\uDE9A\n\nExpected delivery: 2-3 days.\n\nTrack: ${siteUrl}/track\n\nThank you for your patience! \uD83D\uDC95`,
          });
        } catch (err: any) { console.error(`[pre-order] WhatsApp failed:`, err?.message); }
      }
      await db.update(preOrdersTable).set({ status: "shipped", notifiedAt: new Date(), updatedAt: new Date() }).where(eq(preOrdersTable.id, order.id));
    }
  } catch (err) { console.error("[pre-order] notify failed:", err); }
}

export default router;
