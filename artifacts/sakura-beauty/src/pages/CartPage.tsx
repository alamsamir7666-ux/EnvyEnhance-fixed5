import { Link, useLocation } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveFromCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, LogIn } from "lucide-react";
import { useUser } from "@clerk/react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

function EmptyCart() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <ShoppingBag className="h-9 w-9 text-muted-foreground" />
      </div>
      <h2 className="font-serif text-2xl font-medium mb-2">Your bag is empty</h2>
      <p className="text-muted-foreground mb-6 text-sm">Discover our rituals and find your favourites.</p>
      <Link href="/products">
        <Button className="rounded-full px-8">Start Shopping</Button>
      </Link>
    </div>
  );
}

function GuestCartPage() {
  const guestCart = useGuestCart();
  const [, setLocation] = useLocation();

  const items = guestCart.items;
  const subtotal = items.reduce((sum, item) => {
    const price = item.discountPrice ?? item.price;
    return sum + price * item.quantity;
  }, 0);
  const shipping = subtotal > 2000 ? 0 : 120;
  const total = subtotal + shipping;

  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-serif text-4xl font-medium">Your Bag</h1>
          <p className="text-muted-foreground mt-1 text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const price = item.discountPrice ?? item.price;
              const img = item.image || "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80&fm=webp";
              return (
                <div key={item.productId} className="flex gap-4 bg-card border rounded-xl p-4">
                  <Link href={`/products/${item.productId}`}>
                    <img src={img} alt={item.name} className="w-24 h-24 object-cover rounded-lg shrink-0 cursor-pointer" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <Link href={`/products/${item.productId}`}>
                          <h3 className="font-medium text-sm leading-snug truncate hover:text-accent cursor-pointer">{item.name}</h3>
                        </Link>
                      </div>
                      <button
                        onClick={() => guestCart.removeItem(item.productId)}
                        className="text-muted-foreground hover:text-destructive p-1 ml-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-full overflow-hidden">
                        <button
                          onClick={() => guestCart.updateQuantity(item.productId, item.quantity - 1)}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => guestCart.updateQuantity(item.productId, item.quantity + 1)}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Tk{(price * item.quantity).toLocaleString()}</p>
                        {item.discountPrice && (
                          <p className="text-xs text-muted-foreground line-through">Tk{(item.price * item.quantity).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div>
            <div className="bg-card border rounded-xl p-6 sticky top-24">
              <h2 className="font-medium text-lg mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Tk{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `Tk${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-muted-foreground">Free delivery on orders over Tk2,000</p>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>Tk{total.toLocaleString()}</span>
                </div>
              </div>
              <Button className="w-full rounded-full" size="lg" onClick={() => setLocation("/checkout")}>
                Checkout
              </Button>
              <Button variant="outline" className="w-full rounded-full mt-2" size="lg" onClick={() => setLocation("/sign-in")}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">Sign in to save your bag and earn rewards</p>
              <Link href="/products">
                <Button variant="ghost" className="w-full mt-2 text-sm text-muted-foreground">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedCartPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: cart, isLoading } = useGetCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shipping = subtotal > 2000 ? 0 : 120;
  const total = subtotal + shipping;

  function handleUpdate(productId: number, quantity: number) {
    if (quantity < 1) return;
    updateItem.mutate({ productId, data: { quantity } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() }),
    });
  }

  function handleRemove(productId: number) {
    removeItem.mutate({ productId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetCartQueryKey() }),
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (items.length === 0) return <EmptyCart />;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b py-10">
        <div className="container mx-auto px-4">
          <PageBreadcrumb crumbs={[{ label: "Your Bag", icon: <ShoppingBag className="h-3 w-3" /> }]} className="mb-3" />
          <h1 className="font-serif text-4xl font-medium">Your Bag</h1>
          <p className="text-muted-foreground mt-1 text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item: any) => {
              const product = item.product;
              const price = product.discountPrice ?? product.price;
              const img = product.images?.[0] ?? "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80&fm=webp";
              return (
                <div key={item.productId} className="flex gap-4 bg-card border rounded-xl p-4">
                  <Link href={`/products/${item.productId}`}>
                    <img src={img} alt={product.name} className="w-24 h-24 object-cover rounded-lg shrink-0 cursor-pointer" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{product.category}</p>
                        <Link href={`/products/${item.productId}`}>
                          <h3 className="font-medium text-sm leading-snug truncate hover:text-accent cursor-pointer">{product.name}</h3>
                        </Link>
                      </div>
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="text-muted-foreground hover:text-destructive p-1 ml-2 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-full overflow-hidden">
                        <button
                          onClick={() => handleUpdate(item.productId, item.quantity - 1)}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdate(item.productId, item.quantity + 1)}
                          className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Tk{(price * item.quantity).toLocaleString()}</p>
                        {product.discountPrice && (
                          <p className="text-xs text-muted-foreground line-through">Tk{(product.price * item.quantity).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div>
            <div className="bg-card border rounded-xl p-6 sticky top-24">
              <h2 className="font-medium text-lg mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>Tk{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `Tk${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-muted-foreground">Free delivery on orders over Tk2,000</p>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>Tk{total.toLocaleString()}</span>
                </div>
              </div>
              <Button className="w-full rounded-full" size="lg" onClick={() => setLocation("/checkout")}>
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Link href="/products">
                <Button variant="ghost" className="w-full mt-2 text-sm text-muted-foreground">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return user ? <AuthenticatedCartPage /> : <GuestCartPage />;
}
