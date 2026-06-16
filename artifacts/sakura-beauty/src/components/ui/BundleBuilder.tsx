// artifacts/sakura-beauty/src/components/ui/BundleBuilder.tsx
// Self-contained bundle builder - show on ProductDetailPage or a dedicated /bundles route.
// Lets users pick 2-4 products, see the 15% bundle discount, and add all to cart at once.
// Usage: <BundleBuilder initialProductId={product.id} />
import { useState } from "react";
import { useLocation } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Plus, X, Package, Search, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { apiClient } from "@/lib/apiClient";
import { useDebounce } from "@/hooks/useDebounce";

const BUNDLE_DISCOUNT = 0.15; // 15% off when 3+ items
const MIN_BUNDLE = 2;
const MAX_BUNDLE = 4;

interface BundleProduct {
  id: number;
  name: string;
  price: number;
  discountPrice: number | null;
  images: string[];
  category: string;
  slug: string;
  stock: number;
}

interface BundleBuilderProps {
  initialProductId?: number;
}

export function BundleBuilder({ initialProductId }: BundleBuilderProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [bundleItems, setBundleItems] = useState<BundleProduct[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: productData, isLoading: searchLoading } = useListProducts({
    search: debouncedSearch || undefined,
    limit: 8,
  });

  const searchResults = productData?.products ?? [];

  function addToBundle(product: BundleProduct) {
    if (bundleItems.find((p) => p.id === product.id)) {
      toast({ title: "Already in bundle" });
      return;
    }
    if (bundleItems.length >= MAX_BUNDLE) {
      toast({ title: `Max ${MAX_BUNDLE} products per bundle` });
      return;
    }
    setBundleItems((prev) => [...prev, product]);
    if (bundleItems.length + 1 >= 2) setAddOpen(false);
  }

  function removeFromBundle(id: number) {
    setBundleItems((prev) => prev.filter((p) => p.id !== id));
  }

  const subtotal = bundleItems.reduce((sum, p) => sum + (p.discountPrice ?? p.price), 0);
  const applyDiscount = bundleItems.length >= 3;
  const discountAmount = applyDiscount ? subtotal * BUNDLE_DISCOUNT : 0;
  const total = subtotal - discountAmount;

  async function addBundleToCart() {
    if (bundleItems.length < MIN_BUNDLE) {
      toast({ title: `Add at least ${MIN_BUNDLE} products to create a bundle` });
      return;
    }
    setAddingToCart(true);
    try {
      // Add each product to cart sequentially
      for (const product of bundleItems) {
        try {
          await apiClient.post("/api/cart/items", { productId: product.id, quantity: 1 });
        } catch (err: any) {
          toast({ title: err?.message ?? `Failed to add ${product.name}`, variant: "destructive" });
          return;
        }
      }
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: `${bundleItems.length} products added to cart${applyDiscount ? " - 15% bundle discount applied!" : ""}` });
      setBundleItems([]);
    } catch {
      toast({ title: "Failed to add bundle to cart", variant: "destructive" });
    } finally {
      setAddingToCart(false);
    }
  }

  return (
    <div className="border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-accent/5 to-transparent border-b flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">Build Your Routine Bundle</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Pick 2-4 products ? <span className="text-green-600 font-medium">15% off when you add 3+</span>
          </p>
        </div>
        {bundleItems.length >= 3 && (
          <Badge className="bg-green-100 text-green-800 text-xs">15% Off Applied</Badge>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Bundle slots */}
        <div className="grid grid-cols-2 gap-3">
          {bundleItems.map((product) => (
            <div key={product.id} className="relative border rounded-xl p-3 flex items-start gap-3">
              <img
                src={product.images[0] ?? "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=80&q=70&fm=webp"}
                alt={product.name}
                className="h-12 w-12 object-cover rounded-lg bg-muted shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug line-clamp-2">{product.name}</p>
                <p className="text-xs text-accent font-semibold mt-1">
                  Tk{(product.discountPrice ?? product.price).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => removeFromBundle(product.id)}
                className="absolute top-2 right-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add slot(s) */}
          {Array.from({ length: Math.max(0, MIN_BUNDLE - bundleItems.length) }).map((_, i) => (
            <button
              key={`empty-${i}`}
              onClick={() => setAddOpen(true)}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-accent hover:text-accent transition-colors min-h-[88px]"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Add product</span>
            </button>
          ))}

          {bundleItems.length >= MIN_BUNDLE && bundleItems.length < MAX_BUNDLE && (
            <button
              onClick={() => setAddOpen(true)}
              className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-accent hover:text-accent transition-colors min-h-[88px]"
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Add more</span>
            </button>
          )}
        </div>

        {/* Pricing summary */}
        {bundleItems.length > 0 && (
          <div className="bg-muted/30 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({bundleItems.length} items)</span>
              <span>Tk{subtotal.toLocaleString()}</span>
            </div>
            {applyDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Bundle discount (15%)</span>
                <span>-Tk{discountAmount.toFixed(0)}</span>
              </div>
            )}
            {!applyDiscount && bundleItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Add {3 - bundleItems.length} more product{3 - bundleItems.length > 1 ? "s" : ""} to unlock 15% off
              </p>
            )}
            <div className="flex justify-between font-semibold pt-1 border-t">
              <span>Total</span>
              <span>Tk{total.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full rounded-full"
          onClick={addBundleToCart}
          disabled={bundleItems.length < MIN_BUNDLE || addingToCart}
        >
          {addingToCart ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding to Cart?</>
          ) : (
            <><ShoppingBag className="h-4 w-4 mr-2" /> Add Bundle to Cart</>
          )}
        </Button>
      </div>

      {/* Product picker dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Bundle</DialogTitle>
            <DialogDescription>
              Search and pick a product to add to your routine bundle.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products?"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 -mr-1 mt-1">
            {searchLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No products found</p>
            ) : (
              searchResults.map((product) => {
                const alreadyAdded = bundleItems.find((p) => p.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => !alreadyAdded && addToBundle(product as BundleProduct)}
                    disabled={!!alreadyAdded || bundleItems.length >= MAX_BUNDLE}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left ${
                      alreadyAdded
                        ? "bg-muted/50 opacity-50 cursor-default"
                        : "hover:bg-muted/50 hover:border-accent/50"
                    }`}
                  >
                    <img
                      src={(product.images as string[])[0] ?? "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=60&q=70&fm=webp"}
                      alt={product.name}
                      className="h-10 w-10 object-cover rounded-lg bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">
                        Tk{((product.discountPrice ?? product.price) as number).toLocaleString()}
                      </p>
                      {alreadyAdded && <p className="text-xs text-green-600">Added</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
