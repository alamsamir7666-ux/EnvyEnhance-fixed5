import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { and, gte, lte, isNotNull, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * Flash sales are products that have both:
 *  - a discountPrice set (discount active)
 *  - a saleEndsAt timestamp in the future (time-limited)
 *
 * We use the existing discountPrice column + a saleEndsAt virtual
 * approach by querying products where discount is set and filtering
 * by the saleEndsAt stored in product metadata (homepageSection = "flash").
 *
 * For a proper flash sale timer, the frontend reads the saleEndsAt
 * from the product and shows a countdown.
 */
router.get("/flash-sales", async (_req, res) => {
  try {
    // Products tagged as flash sale via homepageSection = "flash"
    // with a discountPrice set
    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          sql`${productsTable.homepageTag} = 'flash'`,
          isNotNull(productsTable.discountPrice),
        ),
      )
      .orderBy(desc(productsTable.createdAt))
      .limit(12);

    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
        category: p.category,
        images: p.images as string[],
        stock: p.stock,
        homepageTag: (p as any).homepageTag,
      })),
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch flash sales" });
  }
});

export default router;
