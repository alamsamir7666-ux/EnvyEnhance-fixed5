// artifacts/api-server/src/routes/search.ts
// Fast autocomplete endpoint — add this to routes/index.ts
import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { ilike, or, eq, sql } from "drizzle-orm";

const router = Router();

// GET /search/autocomplete?q=vitamin
// Returns up to 5 product suggestions + 3 category matches
router.get("/search/autocomplete", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ products: [], categories: [] });
      return;
    }

    const pattern = `%${q}%`;

    const [products, categories] = await Promise.all([
      db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          slug: productsTable.slug,
          category: productsTable.category,
          price: productsTable.price,
          discountPrice: productsTable.discountPrice,
          images: productsTable.images,
          averageRating: sql<number>`COALESCE(
            (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.product_id = ${productsTable.id}), 0
          )`,
        })
        .from(productsTable)
        .where(
          or(
            ilike(productsTable.name, pattern),
            ilike(productsTable.description, pattern),
            ilike(productsTable.ingredients, pattern),
          ),
        )
        .limit(6),

      db
        .select({ name: categoriesTable.name, slug: categoriesTable.slug })
        .from(categoriesTable)
        .where(ilike(categoriesTable.name, pattern))
        .limit(3),
    ]);

    res.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: Number(p.price),
        discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
        image: (p.images as string[])?.[0] ?? null,
        averageRating: Number(p.averageRating),
      })),
      categories,
    });
  } catch {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;

// ─── Add this to artifacts/api-server/src/routes/index.ts ───────────────────
// import searchRouter from "./search";
// router.use(searchRouter);
