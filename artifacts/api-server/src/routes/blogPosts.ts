import { Router } from "express";
import { db } from "@workspace/db";
import { blogPostsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

function fmtPost(p: typeof blogPostsTable.$inferSelect) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: (() => { try { return JSON.parse(p.content); } catch { return []; } })(),
    category: p.category,
    readTime: p.readTime,
    image: p.image,
    featured: p.featured,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// GET /blog-posts — public list
router.get("/blog-posts", async (_req, res) => {
  try {
    const posts = await db.select().from(blogPostsTable).orderBy(desc(blogPostsTable.createdAt));
    res.json(posts.map(fmtPost));
  } catch { res.status(500).json({ error: "Failed to fetch blog posts" }); }
});

// GET /blog-posts/:slug — public single post
router.get("/blog-posts/:slug", async (req, res) => {
  try {
    const [post] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, req.params.slug)).limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    res.json(fmtPost(post));
  } catch { res.status(500).json({ error: "Failed to fetch blog post" }); }
});

// POST /admin/blog-posts — create
router.post("/admin/blog-posts", requireAdmin, async (req: any, res) => {
  try {
    const { slug, title, excerpt, content, category, readTime, image, featured, publishedAt } = req.body;
    if (!slug?.trim() || !title?.trim() || !excerpt?.trim() || !category?.trim()) {
      res.status(400).json({ error: "slug, title, excerpt and category are required" }); return;
    }
    const [post] = await db.insert(blogPostsTable).values({
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: JSON.stringify(content ?? []),
      category: category.trim(),
      readTime: readTime?.trim() || "5 min read",
      image: image?.trim() || "",
      featured: featured ?? false,
      publishedAt: publishedAt?.trim() || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    }).returning();
    res.status(201).json(fmtPost(post));
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "A post with this slug already exists" }); return; }
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

// PATCH /admin/blog-posts/:id — update
router.patch("/admin/blog-posts/:id", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { slug, title, excerpt, content, category, readTime, image, featured, publishedAt } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (slug !== undefined) updates.slug = slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (title !== undefined) updates.title = title.trim();
    if (excerpt !== undefined) updates.excerpt = excerpt.trim();
    if (content !== undefined) updates.content = JSON.stringify(content);
    if (category !== undefined) updates.category = category.trim();
    if (readTime !== undefined) updates.readTime = readTime.trim();
    if (image !== undefined) updates.image = image.trim();
    if (featured !== undefined) updates.featured = featured;
    if (publishedAt !== undefined) updates.publishedAt = publishedAt.trim();
    const [updated] = await db.update(blogPostsTable).set(updates).where(eq(blogPostsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Post not found" }); return; }
    res.json(fmtPost(updated));
  } catch { res.status(500).json({ error: "Failed to update blog post" }); }
});

// DELETE /admin/blog-posts/:id — delete
router.delete("/admin/blog-posts/:id", requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id));
    res.json({ message: "Blog post deleted" });
  } catch { res.status(500).json({ error: "Failed to delete blog post" }); }
});

export default router;
