import { useState, memo } from "react";
import { Link } from "wouter";
import { Heart, ShoppingBag, Star, Check, PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAddToCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useComparison } from "@/components/ui/ProductComparison";
import { useWishlist } from "@/contexts/WishlistContext";
import { BarChart2 } from "lucide-react";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  category: string;
  images: string[];
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  stock?: number;
};

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80&fm=webp";

function ProductCardInner({
  product,
  backContext,
  priority = false,
}: {
  product: Product;
  backContext?: string;
  priority?: boolean;
}) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const addToCart = useAddToCart();
  const { isWishlisted: isWishlistedFn, toggle: toggleWishlist } = useWishlist();
  const guestCart = useGuestCart();
  const { addToCompare, removeFromCompare, isInCompare } = useComparison();
  const inCompare = isInCompare(product.id);
  const [justAdded, setJustAdded] = useState(false);
  const isWishlisted = isWishlistedFn(product.id);
  const displayPrice = product.discountPrice ?? product.price;
  const discountPct = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : null;
  const outOfStock = product.stock !== undefined && product.stock <= 0;
  const isPreOrder = (product as any).productStatus === "pre_order";

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    if (!user) {
      guestCart.addItem({
        productId: product.id,
        quantity: 1,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        image: product.images[0] || "",
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      return;
    }
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 2000);
        },
      },
    );
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    toggleWishlist({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      image: product.images?.[0] || "",
    });
  }

  function handlePreOrder(e: React.MouseEvent) {
    e.preventDefault();
    const image = encodeURIComponent(product.images[0] || "");
    const name = encodeURIComponent(product.name);
    const price = product.discountPrice || product.price;
    setLocation("/pre-order-checkout?productId=" + product.id + "&name=" + name + "&image=" + image + "&price=" + price);
  }

  const rawImg = product.images[0] || FALLBACK_IMG;
  const img = rawImg.includes("res.cloudinary.com")
    ? rawImg.replace("/upload/", "/upload/w_400,h_400,c_fill,f_webp,q_75/")
    : rawImg;
  const href = backContext
    ? "/products/" + product.id + "?from=" + encodeURIComponent(backContext)
    : "/products/" + product.id;

  return (
    <Link href={href}>
      <article
        className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex flex-col h-full"
        aria-label={product.name + " - Tk" + displayPrice.toLocaleString()}
      >
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          <img
            src={img}
            alt={product.name}
            className={"w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 " + (outOfStock ? "opacity-60 grayscale" : "")}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            width="400"
            height="400"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {outOfStock ? (
              <Badge className="bg-gray-500 text-white text-xs font-medium shadow-sm">
                Out of Stock
              </Badge>
            ) : isPreOrder ? (
              <Badge className="bg-blue-500 text-white text-xs font-medium shadow-sm">
                Pre-Order
              </Badge>
            ) : discountPct ? (
              <Badge className="bg-accent text-accent-foreground text-xs font-medium shadow-sm">
                -{discountPct}%
              </Badge>
            ) : null}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); inCompare ? removeFromCompare(product.id) : addToCompare(product.id); }}
            className={"absolute bottom-3 left-3 p-2 rounded-full bg-background/85 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 " + (inCompare ? "text-accent opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
            aria-label={inCompare ? "Remove from comparison" : "Add to comparison"}
          >
            <BarChart2 className={"h-4 w-4 " + (inCompare ? "fill-current" : "")} />
          </button>
          <button
            onClick={handleWishlist}
            className={"absolute top-3 right-3 p-2 rounded-full bg-background/85 backdrop-blur-sm shadow-sm transition-all duration-200 hover:scale-110 " + (isWishlisted ? "text-rose-500 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-500")}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={"h-4 w-4 " + (isWishlisted ? "fill-current" : "")} />
          </button>
        </div>
        <div className="p-4 flex flex-col flex-1 gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {product.category}
          </p>
          <h3 className="font-medium text-sm leading-snug line-clamp-2 flex-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={"h-3 w-3 " + (i < Math.round(product.averageRating) ? "fill-accent text-accent" : "text-muted")}
                aria-hidden="true"
              />
            ))}
            {product.reviewCount > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({product.reviewCount})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              Tk{displayPrice.toLocaleString()}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-muted-foreground line-through">
                Tk{product.price.toLocaleString()}
              </span>
            )}
          </div>
          {isPreOrder ? (
            <Button
              size="sm"
              className="w-full mt-1 rounded-xl text-xs font-medium"
              style={{ background: "#3b82f6", color: "#fff" }}
              onClick={handlePreOrder}
            >
              Pre-Order Now
            </Button>
          ) : (
            <Button
              size="sm"
              className={"w-full mt-1 rounded-xl text-xs font-medium transition-all duration-200 " + (justAdded ? "bg-green-600 hover:bg-green-600 text-white" : "")}
              onClick={handleAddToCart}
              disabled={addToCart.isPending || outOfStock}
              aria-label={outOfStock ? "Out of stock" : justAdded ? "Added to bag" : "Add " + product.name + " to bag"}
            >
              {outOfStock ? (
                <>
                  <PackageX className="h-3.5 w-3.5 mr-1.5" />
                  Out of Stock
                </>
              ) : justAdded ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Added to Bag
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                  Add to Bag
                </>
              )}
            </Button>
          )}
        </div>
      </article>
    </Link>
  );
}

export const ProductCard = memo(ProductCardInner);
