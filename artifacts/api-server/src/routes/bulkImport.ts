import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
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

/**
 * POST /api/admin/products/bulk-import
 * Body: { csv: string } — raw CSV text
 * Expected headers: name,price,discountPrice,category,stock,description,images
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
        const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + crypto.randomBytes(3).toString("hex");
        const discountPrice = discountPriceIdx >= 0 && cols[discountPriceIdx] ? parseFloat(cols[discountPriceIdx]) : null;
        const stock = stockIdx >= 0 ? parseInt(cols[stockIdx] ?? "0") : 0;
        const description = descIdx >= 0 ? (cols[descIdx] ?? "") : "";
        const images = imagesIdx >= 0 && cols[imagesIdx]
          ? cols[imagesIdx].split("|").map((u: string) => u.trim()).filter(Boolean)
          : [];

        const [p] = await db.insert(productsTable).values({
          name,
          slug,
          price: String(price),
          discountPrice: discountPrice != null && !isNaN(discountPrice) ? String(discountPrice) : null,
          category: cols[categoryIdx]?.trim() ?? "Uncategorized",
          stock: isNaN(stock) ? 0 : stock,
          description,
          images,
          keyBenefits: [],
          mainIngredients: [],
          bestFor: [],
        }).returning({ id: productsTable.id });
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
