import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";
import { useState } from "react";
import { useLocation } from "wouter";
import { useLoyalty } from "@/hooks/useLoyalty";
import { useGetCart, useCreateOrder, useValidateCoupon, useListAddresses, getGetCartQueryKey, getListAddressesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Tag, MapPin, ChevronDown, ShoppingBag, CreditCard } from "lucide-react";
import { Link } from "wouter";

type PaymentMethod = "bkash" | "nagad" | "cod";

export function CheckoutPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: cart, isLoading } = useGetCart();
  const { data: savedAddresses = [] } = useListAddresses({ query: { retry: false, queryKey: getListAddressesQueryKey() } });
  const createOrder = useCreateOrder();
  const validateCoupon = useValidateCoupon();

  const [address, setAddress] = useState({
    fullName: "", phone: "", street: "", city: "", district: "", postalCode: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bkash");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const { data: loyaltyData } = useLoyalty();
  const [transactionId, setTransactionId] = useState("");

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const maxPointsDiscount = Math.min(loyaltyData?.takaValue ?? 0, subtotal * 0.2); // max 20% of order
  const shipping = subtotal > 2000 ? 0 : 120;
  const giftWrapCost = giftWrap ? 50 : 0;
  const loyaltyDiscount = usePoints ? maxPointsDiscount : 0;
  const total = Math.max(0, subtotal + shipping + giftWrapCost - discount - loyaltyDiscount);

  function applyAddress(addr: any) {
    setAddress({
      fullName: addr.fullName ?? "",
      phone: addr.phone ?? "",
      street: addr.street ?? "",
      city: addr.city ?? "",
      district: addr.district ?? "",
      postalCode: addr.postalCode ?? "",
    });
    setSelectedAddressId(addr.id);
    setShowAddressPicker(false);
  }

  function handleApplyCoupon() {
    setCouponError("");
    validateCoupon.mutate({ data: { code: couponCode, orderAmount: subtotal } }, {
      onSuccess: (coupon) => {
        const computed = coupon.discountType === "percentage"
          ? Math.floor(subtotal * (coupon.discountValue / 100))
          : coupon.discountValue;
        setDiscount(computed);
        setCouponApplied(true);
      },
      onError: () => {
        setCouponError("Invalid or expired coupon code.");
      },
    });
  }

  const [submitError, setSubmitError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!address.fullName || !address.phone || !address.street || !address.city) {
      setSubmitError("Please fill in all required address fields.");
      return;
    }
    // Require transaction ID for digital payments
    if ((paymentMethod === "bkash" || paymentMethod === "nagad") && !bkashNumber.trim()) {
      setSubmitError("Please enter your sending number.");
      return;
    }
    createOrder.mutate({
      data: {
        shippingAddress: {
          fullName: address.fullName,
          phone: address.phone,
          street: address.street,
          city: address.city,
          district: address.district,
          postalCode: address.postalCode || null,
        },
        paymentMethod,
        transactionId: transactionId || null,
        couponCode: couponApplied ? couponCode : null,
        loyaltyPointsToRedeem: usePoints && maxPointsDiscount > 0 ? Math.ceil(maxPointsDiscount / 1) : 0,
        giftWrap,
        giftMessage: giftWrap ? giftMessage : null,
      },
    }, {
      onSuccess: (order) => {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        setLocation(`/orders/${order.id}`);
      },
    });
  }

  if (isLoading) {
    return <div className="container mx-auto px-4 py-10"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-4">No items in cart.</p>
        <Link href="/products"><Button>Shop Now</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b py-10">
        <div className="container mx-auto px-4">
          <PageBreadcrumb
            crumbs={[
              { label: "Cart", href: "/cart", icon: <ShoppingBag className="h-3 w-3" /> },
              { label: "Checkout", icon: <CreditCard className="h-3 w-3" /> },
            ]}
            className="mb-3"
          />
          <h1 className="font-serif text-4xl font-medium">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Delivery address */}
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-medium text-lg">Delivery Address</h2>
                  {(savedAddresses as any[]).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddressPicker(!showAddressPicker)}
                      className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      Saved addresses
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAddressPicker ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>

                {showAddressPicker && (savedAddresses as any[]).length > 0 && (
                  <div className="mb-5 space-y-2">
                    {(savedAddresses as any[]).map((addr: any) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => applyAddress(addr)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                          selectedAddressId === addr.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <p className="font-medium">{addr.fullName}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {addr.street}, {addr.city}{addr.district ? `, ${addr.district}` : ""}
                          {addr.phone ? ` · ${addr.phone}` : ""}
                        </p>
                        {addr.isDefault && (
                          <span className="inline-block mt-1 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">Default</span>
                        )}
                      </button>
                    ))}
                    <p className="text-xs text-muted-foreground pl-1">Or enter a new address below</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" value={address.fullName} onChange={e => setAddress(a => ({ ...a, fullName: e.target.value }))} required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} required className="mt-1.5" placeholder="01636575741X" />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input id="postalCode" value={address.postalCode} onChange={e => setAddress(a => ({ ...a, postalCode: e.target.value }))} className="mt-1.5" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">Street Address *</Label>
                    <Input id="street" value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} required className="mt-1.5" placeholder="House, Road, Area" />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} required className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Input id="district" value={address.district} onChange={e => setAddress(a => ({ ...a, district: e.target.value }))} className="mt-1.5" />
                  </div>
                </div>
              </div>

              {/* Loyalty Points Redemption */}
              {loyaltyData && loyaltyData.points > 0 && (
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="usePoints"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      className="mt-1 accent-pink-500"
                    />
                    <div>
                      <label htmlFor="usePoints" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                        ⭐ Use {loyaltyData.points} Loyalty Points
                        <span className="text-muted-foreground font-normal">= ৳{maxPointsDiscount} off</span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">Up to 20% of your order value</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Gift Wrapping */}
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="giftWrap"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="mt-1 accent-pink-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="giftWrap" className="font-medium cursor-pointer flex items-center gap-2">
                      🎁 Gift Wrapping
                      <span className="text-sm text-muted-foreground font-normal">+৳50</span>
                    </label>
                    <p className="text-sm text-muted-foreground mt-0.5">Beautiful gift packaging with a handwritten card</p>
                    {giftWrap && (
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="Add a personal message (optional)…"
                        maxLength={200}
                        rows={3}
                        className="mt-3 w-full text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 bg-muted/30"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-card border rounded-xl p-6">
                <h2 className="font-medium text-lg mb-5">Payment Method</h2>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {(["bkash", "nagad", "cod"] as PaymentMethod[]).map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`border rounded-xl py-3 px-4 text-sm font-medium transition-all ${paymentMethod === method ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/50"}`}
                    >
                      <div className="text-lg mb-1">
                        {method === "bkash" ? "📱" : method === "nagad" ? "📲" : "💵"}
                      </div>
                      {method === "bkash" ? "bKash" : method === "nagad" ? "Nagad" : "Cash on Delivery"}
                    </button>
                  ))}
                </div>

                {(paymentMethod === "bkash" || paymentMethod === "nagad") && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                    <p className="font-medium">
                      {paymentMethod === "bkash" ? "bKash" : "Nagad"} Payment Instructions
                    </p>
                    <p className="text-muted-foreground">
                      1. Send ৳{total.toLocaleString()} to our {paymentMethod === "bkash" ? "bKash" : "Nagad"} number: <strong>01636575741</strong><br />
                      2. Use "Send Money" option
                      3. Your order will be confirmed automatically after payment
                    </p>
                    <div>
                      <Label>{paymentMethod === "bkash" ? "bKash" : "Nagad"} Number</Label>
                      <Input className="mt-1.5" value={bkashNumber} onChange={e => setBkashNumber(e.target.value)} placeholder="Your sending number" />
                    </div>
                    <div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div>
              <div className="bg-card border rounded-xl p-6 sticky top-24 space-y-5">
                <h2 className="font-medium text-lg">Order Summary</h2>

                {/* Coupon */}
                {!couponApplied ? (
                  <div>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="Coupon code"
                        className="flex-1 text-sm"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleApplyCoupon} disabled={!couponCode || validateCoupon.isPending}>
                        <Tag className="h-4 w-4 mr-1" /> Apply
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-destructive mt-1.5">{couponError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Coupon applied: -৳{discount.toLocaleString()}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground line-clamp-1 flex-1 pr-2">{item.product.name} × {item.quantity}</span>
                      <span>৳{((item.product.discountPrice ?? item.product.price) * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>৳{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `৳${shipping}`}</span>
                  </div>
                  {giftWrap && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🎁 Gift Wrapping</span>
                      <span>৳50</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount</span>
                      <span>-৳{discount.toLocaleString()}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>⭐ Loyalty Points</span>
                      <span>-৳{loyaltyDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-base pt-2 border-t">
                    <span>Total</span>
                    <span>৳{total.toLocaleString()}</span>
                  </div>
                </div>

                {submitError && (
                  <p className="text-sm text-destructive text-center">{submitError}</p>
                )}
                {createOrder.isError && (
                  <p className="text-sm text-destructive text-center">Failed to place order. Please try again.</p>
                )}
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  size="lg"
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? "Placing order..." : "Place Order"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
