import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { lte } from "drizzle-orm";
import { Resend } from "resend";

const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD ?? "5");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";

export async function runLowStockAlert() {
  if (!ADMIN_EMAIL) return;
  try {
    const lowStockProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, stock: productsTable.stock })
      .from(productsTable)
      .where(lte(productsTable.stock, LOW_STOCK_THRESHOLD));

    if (lowStockProducts.length === 0) return;

    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    if (!resend) return;

    const rows = lowStockProducts
      .map((p) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;">${p.name}</td><td style="padding:6px 12px;text-align:center;font-weight:600;color:${p.stock === 0 ? "#dc2626" : "#d97706"};">${p.stock === 0 ? "Out of Stock" : `${p.stock} left`}</td></tr>`)
      .join("");

    await resend.emails.send({
      from: "EnvyEnhance Alerts <noreply@envyenhance.com>",
      to: [ADMIN_EMAIL],
      subject: `⚠️ Low Stock Alert — ${lowStockProducts.length} product(s) need restocking`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;"><h2>Low Stock Alert</h2><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#fdf2f8;"><th style="padding:8px 12px;text-align:left;">Product</th><th style="padding:8px 12px;text-align:center;">Stock</th></tr></thead><tbody>${rows}</tbody></table><p><a href="${process.env.APP_URL ?? ""}/admin" style="color:#f43f5e;">Go to Admin Dashboard →</a></p></div>`,
    });

    console.log(`[low-stock] Alert sent for ${lowStockProducts.length} products`);
  } catch (err) {
    console.error("[low-stock] Job failed:", err);
  }
}
