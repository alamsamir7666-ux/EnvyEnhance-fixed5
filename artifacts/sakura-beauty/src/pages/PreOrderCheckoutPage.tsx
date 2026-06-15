import { useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Package, Truck, CheckCircle2, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function PreOrderCheckoutPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const productId = Number(params.get("productId") ?? "0");
  const productName = decodeURIComponent(params.get("name") ?? "");
  const productImage = decodeURIComponent(params.get("image") ?? "");
  const originalPrice = Number(params.get("price") ?? "0");
  const discountedPrice = Math.round(originalPrice * 0.95 * 100) / 100;
  const shipmentDate = params.get("shipmentDate") ?? "";
  const savings = Math.round((originalPrice - discountedPrice) * 100) / 100;

  const [address, setAddress] = useState({ fullName: "", phone: "", street: "", city: "", district: "", postalCode: "" });
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ trackingId: string; deliveryCharge: number } | null>(null);

  const city = address.city.toLowerCase();
  const isDhaka = ["dhaka", "ঢাকা"].some(k => city.includes(k));
  const deliveryCharge = address.city ? (isDhaka ? 80 : 120) : 80;

  function getDaysUntilShipment() {
    if (!shipmentDate) return "20-23 days";
    const today = new Date();
    const shipment = new Date(shipmentDate);
    const diff = Math.ceil((shipment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "2-5 days";
    return `${diff + 2}-${diff + 5} days`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!address.fullName || !address.phone || !address.street || !address.city) {
      setError("Please fill in all required address fields."); return;
    }
    if (!senderNumber.trim()) {
      setError("Please enter your bKash/Nagad sending number."); return;
    }
    setLoading(true);
    try {
      const res = await fetch(API + "/api/pre-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId, quantity: 1,
          shippingAddress: { fullName: address.fullName, phone: address.phone, street: address.street, city: address.city, district: address.district, postalCode: address.postalCode || null },
          paymentMethod, senderNumber, transactionId: transactionId || null, whatsappPhone: whatsappPhone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to place pre-order"); return; }
      setSuccess({ trackingId: data.trackingId, deliveryCharge: data.deliveryCharge });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-medium mb-2">Pre-Order Confirmed! 🎉</h1>
            <p className="text-muted-foreground">Your pre-order for <strong>{productName}</strong> has been placed.</p>
          </div>
          <div className="bg-muted/30 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tracking ID</span>
              <span className="font-mono font-semibold">{success.trackingId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery paid</span>
              <span className="font-semibold">৳{success.deliveryCharge}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product payment</span>
              <span className="font-semibold">Cash on delivery</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected delivery</span>
              <span className="font-semibold">{getDaysUntilShipment()}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">You will receive a WhatsApp notification when your product arrives in Bangladesh.</p>
          <div className="flex gap-3">
            <Link href="/orders" className="flex-1"><Button className="w-full rounded-full">View My Orders</Button></Link>
            <Link href="/products" className="flex-1"><Button variant="outline" className="w-full rounded-full">Continue Shopping</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <PageBreadcrumb crumbs={[{ label: "Products", href: "/products", icon: <ShoppingBag className="h-3 w-3" /> }, { label: "Pre-Order" }]} className="mb-4" />
        <Link href={`/products/${productId}`}>
          <Button variant="ghost" size="sm" className="mb-6 gap-1 text-muted-foreground"><ChevronLeft className="h-4 w-4" /> Back</Button>
        </Link>
        <h1 className="font-serif text-2xl font-medium mb-6">Pre-Order Checkout</h1>

        <div className="bg-muted/30 rounded-2xl p-4 mb-6 flex gap-4">
          {productImage && <img src={productImage} alt={productName} className="w-16 h-16 rounded-xl object-cover shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight mb-1">{productName}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold">৳{discountedPrice.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground line-through">৳{originalPrice.toLocaleString()}</span>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">5% off</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">You save ৳{savings.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <Truck className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium">Estimated delivery: {getDaysUntilShipment()}</p>
            <p className="text-xs text-muted-foreground">Product price paid on delivery (COD)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="font-medium mb-3 flex items-center gap-2"><Package className="h-4 w-4" /> Shipping Address</h2>
            <div className="space-y-3">
              <Input placeholder="Full name *" value={address.fullName} onChange={e => setAddress(a => ({ ...a, fullName: e.target.value }))} required className="rounded-xl" />
              <Input placeholder="Phone number *" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} required className="rounded-xl" />
              <Input placeholder="Street address *" value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} required className="rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="City *" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} required className="rounded-xl" />
                <Input placeholder="District" value={address.district} onChange={e => setAddress(a => ({ ...a, district: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-medium mb-2">WhatsApp for Shipment Notification</h2>
            <Input placeholder="01XXXXXXXXX (optional)" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className="rounded-xl" />
            <p className="text-xs text-muted-foreground mt-1">We will notify you on WhatsApp when your order ships</p>
          </div>

          <div>
            <h2 className="font-medium mb-3">Pay Delivery Charge Only</h2>
            <div className="bg-muted/30 rounded-xl p-4 mb-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery ({address.city ? (isDhaka ? "Dhaka" : "Outside Dhaka") : "Dhaka"})</span>
                <span className="font-semibold">৳{deliveryCharge}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product price (৳{discountedPrice.toLocaleString()})</span>
                <span className="text-muted-foreground">Cash on delivery</span>
              </div>
            </div>
            <div className="flex gap-3 mb-3">
              {(["bkash", "nagad"] as const).map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  style={{ background: paymentMethod === m ? "#e05c9a" : "transparent", color: paymentMethod === m ? "#fff" : "inherit", border: `2px solid ${paymentMethod === m ? "#e05c9a" : "#d1d5db"}`, borderRadius: 999, padding: "8px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  {m === "bkash" ? "bKash" : "Nagad"}
                </button>
              ))}
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 mb-3">
              <p className="text-sm font-medium text-pink-800">Send ৳{deliveryCharge} to:</p>
              <p className="text-lg font-bold text-pink-900">{paymentMethod === "bkash" ? "01XXXXXXXXX" : "01XXXXXXXXX"}</p>
              <p className="text-xs text-pink-600">{paymentMethod === "bkash" ? "bKash" : "Nagad"} merchant number</p>
            </div>
            <div className="space-y-3">
              <Input placeholder={`Your ${paymentMethod === "bkash" ? "bKash" : "Nagad"} number *`} value={senderNumber} onChange={e => setSenderNumber(e.target.value)} required className="rounded-xl" />
              <Input placeholder="Transaction ID (optional)" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full rounded-full h-12 text-base font-semibold" style={{ background: "#e05c9a", color: "#fff" }}>
            {loading ? "Placing Pre-Order..." : `Confirm Pre-Order — Pay ৳${deliveryCharge}`}
          </Button>
        </form>
      </div>
    </div>
  );
}
