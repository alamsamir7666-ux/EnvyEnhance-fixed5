import { Router } from "express";
import { db } from "@workspace/db";
import { wishlistTable, productsTable, reviewsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/wishlist", requireAuth, async (req: any, res) => {
  const items = await db
    .select({ wishlist: wishlistTable, product: productsTable })
    .from(wishlistTable)
    .innerJoin(productsTable, eq(wishlistTable.productId, productsTable.id))
    .where(eq(wishlistTable.userId, req.userId));

  // FIX: Batch review stats in one query (was N+1)
  const productIds = items.map(i => i.product.id);
  const statsRows = productIds.length > 0
    ? await db.select({
        productId: reviewsTable.productId,
        avg: sql<string>`COALESCE(AVG(${reviewsTable.rating}), 0)`,
        count: sql<string>`COUNT(*)`,
      }).from(reviewsTable)
        .where(inArray(reviewsTable.productId, productIds))
        .groupBy(reviewsTable.productId)
    : [];
  const statsMap = new Map(statsRows.map(r => [r.productId, { avg: Number(Number(r.avg).toFixed(1)), count: Number(r.count) }]));

  const result = items.map(({ wishlist, product }) => {
      const stats = statsMap.get(product.id) ?? { avg: 0, count: 0 };
      return {
        id: wishlist.id,
        productId: wishlist.productId,
        addedAt: wishlist.addedAt.toISOString(),
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          discountPrice: product.discountPrice != null ? Number(product.discountPrice) : null,
          category: product.category,
          stock: product.stock,
          description: product.description,
          ingredients: product.ingredients,
          images: product.images as string[],
          averageRating: stats.avg,
          reviewCount: Number(stats.count),
          isFeatured: product.isFeatured,
          createdAt: product.createdAt.toISOString(),
        },
      };
    });
  res.json(result);
});

router.post("/wishlist/:productId", requireAuth, async (req: any, res) => {
  const productId = parseInt(req.params.productId);
  try {
    await db.insert(wishlistTable).values({ userId: req.userId, productId });
  } catch {}
  res.json({ message: "Added to wishlist" });
});

router.delete("/wishlist/:productId", requireAuth, async (req: any, res) => {
  const productId = parseInt(req.params.productId);
  await db
    .delete(wishlistTable)
    .where(and(eq(wishlistTable.userId, req.userId), eq(wishlistTable.productId, productId)));
  res.json({ message: "Removed from wishlist" });
});

export default router;
