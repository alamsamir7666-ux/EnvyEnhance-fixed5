import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function buildCart(userId: string) {
  const items = await db
    .select({ cart: cartItemsTable, product: productsTable })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.userId, userId));

  let subtotal = 0;
  let discount = 0;

  const mapped = items.map(({ cart, product }) => {
    const originalPrice = Number(product.price);
    const discountedPrice =
      product.discountPrice != null
        ? Number(product.discountPrice)
        : originalPrice;

    subtotal += discountedPrice * cart.quantity;
    if (product.discountPrice != null) {
      discount += (originalPrice - discountedPrice) * cart.quantity;
    }

    return {
      id: cart.id,
      productId: cart.productId,
      quantity: cart.quantity,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: originalPrice,
        discountPrice:
          product.discountPrice != null
            ? Number(product.discountPrice)
            : null,
        category: product.category,
        stock: product.stock,
        description: product.description,
        ingredients: product.ingredients,
        images: product.images as string[],
        averageRating: 0,
        reviewCount: 0,
        isFeatured: product.isFeatured,
        createdAt: product.createdAt.toISOString(),
      },
    };
  });

  return { items: mapped, subtotal, discount, total: subtotal };
}

router.get("/cart", requireAuth, async (req: any, res) => {
  try {
    const cart = await buildCart(req.userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/cart/items", requireAuth, async (req: any, res) => {
  try {
    const { productId, quantity } = req.body;

    // Validate input
    if (!productId || isNaN(Number(productId))) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty < 1 || qty > 99) {
      res.status(400).json({ error: "Quantity must be between 1 and 99" });
      return;
    }

    // Check product exists and has stock
    const [product] = await db
      .select({ id: productsTable.id, stock: productsTable.stock })
      .from(productsTable)
      .where(eq(productsTable.id, Number(productId)))
      .limit(1);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const existing = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.userId, req.userId),
          eq(cartItemsTable.productId, Number(productId)),
        ),
      )
      .limit(1);

    const newQty =
      existing.length > 0 ? existing[0].quantity + qty : qty;

    // FIX: Check stock before adding to cart
    if (product.stock < newQty) {
      res.status(400).json({
        error: `Only ${product.stock} items available in stock`,
      });
      return;
    }

    if (existing.length > 0) {
      await db
        .update(cartItemsTable)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, existing[0].id));
    } else {
      await db
        .insert(cartItemsTable)
        .values({ userId: req.userId, productId: Number(productId), quantity: qty });
    }

    const cart = await buildCart(req.userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.put("/cart/items/:productId", requireAuth, async (req: any, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const { quantity } = req.body;
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1 || qty > 99) {
      res.status(400).json({ error: "Quantity must be between 1 and 99" });
      return;
    }

    // Check stock
    const [product] = await db
      .select({ stock: productsTable.stock })
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (product && product.stock < qty) {
      res.status(400).json({
        error: `Only ${product.stock} items available in stock`,
      });
      return;
    }

    await db
      .update(cartItemsTable)
      .set({ quantity: qty, updatedAt: new Date() })
      .where(
        and(
          eq(cartItemsTable.userId, req.userId),
          eq(cartItemsTable.productId, productId),
        ),
      );
    const cart = await buildCart(req.userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Failed to update cart" });
  }
});

router.delete("/cart/items/:productId", requireAuth, async (req: any, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId) || productId <= 0) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }
    await db
      .delete(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.userId, req.userId),
          eq(cartItemsTable.productId, productId),
        ),
      );
    const cart = await buildCart(req.userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

router.delete("/cart", requireAuth, async (req: any, res) => {
  try {
    await db
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.userId, req.userId));
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;
