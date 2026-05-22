import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

function toCategory(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    displayOrder: c.displayOrder,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/categories", async (_req, res) => {
  const cats = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.name));
  res.json(cats.map(toCategory));
});

router.post("/categories", requireAdmin, async (req: any, res) => {
  const { name, slug, icon, displayOrder } = req.body;
  const generatedSlug = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [c] = await db
    .insert(categoriesTable)
    .values({ name, slug: generatedSlug, icon: icon || null, displayOrder: displayOrder ?? 0 })
    .returning();
  res.status(201).json(toCategory(c));
});

router.put("/categories/:id", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const { name, slug, icon, displayOrder } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (icon !== undefined) updates.icon = icon;
  if (displayOrder !== undefined) updates.displayOrder = displayOrder;

  const [c] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!c) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toCategory(c));
});

router.delete("/categories/:id", requireAdmin, async (req: any, res) => {
  const id = parseInt(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ message: "Category deleted" });
});

router.post("/categories/seed", requireAdmin, async (_req, res) => {
  const defaults = [
    { name: "Moisturizers", slug: "moisturizers", icon: "💧", displayOrder: 1 },
    { name: "Serums",       slug: "serums",       icon: "✨", displayOrder: 2 },
    { name: "Sunscreen",    slug: "sunscreen",    icon: "☀️", displayOrder: 3 },
    { name: "Face Masks",   slug: "face-masks",   icon: "🌸", displayOrder: 4 },
    { name: "Cleansers",    slug: "cleansers",    icon: "🫧", displayOrder: 5 },
    { name: "Toners",       slug: "toners",       icon: "💦", displayOrder: 6 },
    { name: "Eye Care",     slug: "eye-care",     icon: "👁️", displayOrder: 7 },
    { name: "Lip Care",     slug: "lip-care",     icon: "💋", displayOrder: 8 },
    { name: "Hair Care",    slug: "hair-care",    icon: "💇", displayOrder: 9 },
  ];
  const inserted: ReturnType<typeof toCategory>[] = [];
  for (const cat of defaults) {
    try {
      const [c] = await db
        .insert(categoriesTable)
        .values(cat)
        .onConflictDoNothing()
        .returning();
      if (c) inserted.push(toCategory(c));
    } catch (_) {}
  }
  res.json({ inserted: inserted.length, categories: inserted });
});

export default router;
