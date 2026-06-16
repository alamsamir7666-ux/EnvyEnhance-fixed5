import { useEffect, useState } from "react";
import { X, Star, ShoppingBag, Scale } from "lucide-react";
import { updateSEO } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/ProductCard";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Product = {
  id: number;
  name: string;
  price: number;
  discountPrice: number | null;
  category: string;
  images: string[];
  averageRating: number;
  reviewCount: number;
  stock: number;
  description: string;
  ingredients: string | null;
  keyBenefits: string[];
  bestFor: string[];
  texture: string | null;
};

// Rows to compare
const COMPARE_ROWS = [
  { key: "category", label: "Category" },
  { key: "price", label: "Price" },
  { key: "averageRating", label: "Rating" },
  { key: "stock", label: "Availability" },
  { key: "texture", label: "Texture" },
  { key: "bestFor", label: "Best For" },
  { key: "keyBenefits", label: "Key Benefits" },
];

function renderCell(key: string, product: Product) {
  switch (key) {
    case "price":
      return (
        <div>
          <span className="font-semibold">
            Tk{(product.discountPrice ?? product.price).toLocaleString()}
          </span>
          {product.discountPrice && (
            <span className="text-xs text-muted-foreground line-through ml-1">
              Tk{product.price.toLocaleString()}
            </span>
          )}
        </div>
      );
    case "averageRating":
      return (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          <span className="text-sm">{product.averageRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>
      );
    case "stock":
      return product.stock > 0 ? (
        <span className="text-green-600 text-sm font-medium">In Stock</span>
      ) : (
        <span className="text-destructive text-sm font-medium">Out of Stock</span>
      );
    case "bestFor":
    case "keyBenefits":
      return (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {((product[key as keyof Product] as string[]) ?? []).slice(0, 4).map((v) => (
            <li key={v} className="flex items-start gap-1">
              <span className="text-accent mt-0.5">✓</span> {v}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <span className="text-sm text-muted-foreground">
          {(product[key as keyof Product] as string) ?? "-"}
        </span>
      );
  }
}

export default function ComparePage() {
  const [compareIds, setCompareIds] = useLocalStorage<number[]>("compare-ids", []);

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["products-for-compare"],
    queryFn: () =>
      apiClient
        .get("/api/products", { params: { limit: 50 } })
        .then((r) => r.data.products),
    staleTime: 1000 * 60 * 5,
  });

  const compareProducts = allProducts.filter((p) => compareIds.includes(p.id));

  function removeProduct(id: number) {
    setCompareIds((prev) => prev.filter((x) => x !== id));
  }

  useEffect(() => {
    updateSEO({ title: "Compare Products" });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Scale className="h-6 w-6 text-accent" />
        <h1 className="font-serif text-3xl">Compare Products</h1>
      </div>

      {compareProducts.length === 0 ? (
        <div className="text-center py-16">
          <Scale className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-2">No products selected for comparison.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Use the compare button on product cards to add items here.
          </p>
          <Link href="/products">
            <Button className="rounded-full">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 w-36 text-sm text-muted-foreground font-medium">
                  Attribute
                </th>
                {compareProducts.map((p) => (
                  <th key={p.id} className="p-4 min-w-[200px] align-top">
                    <div className="relative">
                      <button
                        onClick={() => removeProduct(p.id)}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-muted hover:bg-destructive hover:text-white transition-colors"
                        aria-label={`Remove ${p.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full aspect-square object-cover rounded-xl mb-2"
                        loading="lazy"
                      />
                      <Link href={`/products/${p.id}`}>
                        <p className="font-medium text-sm hover:text-accent transition-colors leading-snug">
                          {p.name}
                        </p>
                      </Link>
                    </div>
                  </th>
                ))}
                {compareProducts.length < 3 && (
                  <th className="p-4 min-w-[200px]">
                    <Link href="/products">
                      <div className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer">
                        <div className="text-center">
                          <span className="text-3xl">+</span>
                          <p className="text-xs mt-1">Add product</p>
                        </div>
                      </div>
                    </Link>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-t border-border">
                  <td className="p-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {label}
                  </td>
                  {compareProducts.map((p) => (
                    <td key={p.id} className="p-4 align-top">
                      {renderCell(key, p)}
                    </td>
                  ))}
                  {compareProducts.length < 3 && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
