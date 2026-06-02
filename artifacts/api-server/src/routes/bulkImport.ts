import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import crypto from "crypto";

const router = Router();

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseList(val: string): string[] {
  if (!val) return [];
  return val.split("|").map(s => s.trim()).filter(Boolean);
}

function parseIngredients(val: string): { name: string; icon: string }[] {
  if (!val) return [];
  return val.split("|").map(s => {
    const trimmed = s.trim();
    // Extract emoji icon if present at start
    const emojiMatch = trimmed.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F300}-\u{1FFFF}]|[\u2600-\u27FF])/u);
    if (emojiMatch) {
      const icon = emojiMatch[0];
      const name = trimmed.slice(icon.length).trim();
      return { icon, name };
    }
    return { icon: "🌿", name: trimmed };
  }).filter(i => i.name);
}

/**
 * POST /api/admin/products/bulk-import
 * Body: { csv: string } — raw CSV text
 * Headers: name,price,discountPrice,category,stock,description,images,keyBenefits,mainIngredients,bestFor,texture
 * 
 * Multi-value fields use | as separator:
 *   keyBenefits: "Benefit 1|Benefit 2|Benefit 3"
 *   mainIngredients: "💧 Hyaluronic Acid|🌿 Arginine"
 *   bestFor: "Dry skin|Oily skin"
 *   images: "https://url1.jpg|https://url2.jpg"
 */
router.post("/admin/products/bulk-import", requireAdmin, async (req: any, res) => {
  try {
    const { csv } = req.body;
    if (!csv || typeof csv !== "string") {
      res.status(400).json({ error: "CSV content is required" });
      return;
    }

    const lines = csv.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      res.status(400).json({ error: "CSV must have a header row and at least one data row" });
      return;
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const nameIdx = headers.indexOf("name");
    const priceIdx = headers.indexOf("price");
    const categoryIdx = headers.indexOf("category");

    if (nameIdx === -1 || priceIdx === -1 || categoryIdx === -1) {
      res.status(400).json({ error: "CSV must have columns: name, price, category (minimum)" });
      return;
    }

    const discountPriceIdx = headers.indexOf("discountprice");
    const stockIdx = headers.indexOf("stock");
    const descIdx = headers.indexOf("description");
    const imagesIdx = headers.indexOf("images");
    const keyBenefitsIdx = headers.indexOf("keybenefits");
    const mainIngredientsIdx = headers.indexOf("mainingredients");
    const bestForIdx = headers.indexOf("bestfor");
    const textureIdx = headers.indexOf("texture");

    const created: number[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const name = cols[nameIdx]?.trim();
      const price = parseFloat(cols[priceIdx]);

      if (!name || isNaN(price) || price <= 0) {
        errors.push(`Row ${i + 1}: invalid name or price`);
        continue;
      }

      try {
        const slug = name.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          + "-" + crypto.randomBytes(3).toString("hex");

        const discountPrice = discountPriceIdx >= 0 && cols[discountPriceIdx]
          ? parseFloat(cols[discountPriceIdx]) : null;
        const stock = stockIdx >= 0 ? parseInt(cols[stockIdx] ?? "0") : 0;
        const description = descIdx >= 0 ? (cols[descIdx] ?? "") : "";
        const images = imagesIdx >= 0 ? parseList(cols[imagesIdx] ?? "") : [];
        const keyBenefits = keyBenefitsIdx >= 0 ? parseList(cols[keyBenefitsIdx] ?? "") : [];
        const mainIngredients = mainIngredientsIdx >= 0 ? parseIngredients(cols[mainIngredientsIdx] ?? "") : [];
        const bestFor = bestForIdx >= 0 ? parseList(cols[bestForIdx] ?? "") : [];
        const texture = textureIdx >= 0 ? (cols[textureIdx] ?? "") : "";

        const [p] = await db.insert(productsTable).values({
          name,
          slug,
          price: String(price),
          discountPrice: discountPrice != null && !isNaN(discountPrice) ? String(discountPrice) : null,
          category: cols[categoryIdx]?.trim() ?? "Uncategorized",
          stock: isNaN(stock) ? 0 : stock,
          description,
          images,
          keyBenefits,
          mainIngredients,
          bestFor,
          texture: texture || null,
        }).returning({ id: productsTable.id });

        await logAudit({ adminId: req.userId, action: "product.created", targetType: "product", targetId: String(p.id), after: { name } });
        created.push(p.id);
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message ?? "Failed to insert"}`);
      }
    }

    res.json({
      created: created.length,
      errors: errors.length,
      errorDetails: errors,
      message: `Successfully imported ${created.length} products${errors.length > 0 ? `, ${errors.length} rows failed` : ""}`,
    });
  } catch {
    res.status(500).json({ error: "Failed to process CSV import" });
  }
});

export default router;
