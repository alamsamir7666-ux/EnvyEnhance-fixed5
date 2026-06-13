import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { useAuth, useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package2, ArrowRight, Copy, Check } from "lucide-react";

const statusColors: Record<string, string> = {
  pending:          "bg-yellow-100 text-yellow-800",
  confirmed:        "bg-blue-100 text-blue-800",
  processing:       "bg-purple-100 text-purple-800",
  shipped:          "bg-indigo-100 text-indigo-800",
  delivered:        "bg-green-100 text-green-800",
  cancelled:        "bg-red-100 text-red-800",
  return_completed: "bg-teal-100 text-teal-800",
};

const returnBadgeColors: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved:  "bg-blue-100 text-blue-700",
  rejected:  "bg-red-100 text-red-700",
  completed: "bg-teal-100 text-teal-700",
};

const returnBadgeLabels: Record<string, string> = {
  requested: "↩ Return Requested",
  approved:  "↩ Return Approved",
  rejected:  "↩ Return Rejected",
  completed: "↩ Refund Completed",
};

function CopyTrackingButton({ trackingId }: { trackingId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(trackingId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy tracking ID"
      className="inline-flex items-center gap-1 ml-1 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied
        ? <Check className="h-3 w-3 text-green-500" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  );
}

export function OrdersPage() {
  const { user, isLoaded } = useUser();
  const isGuest = isLoaded && !user;
  const { data: orders, isLoading: ordersLoading } = useListOrders({ query: { enabled: !isGuest } } as any);
  const isLoading = !isLoaded || (!isGuest && ordersLoading);
  const { getToken } = useAuth();
  const [guestTrackingIds, setGuestTrackingIds] = useState<any[]>([]);

  useEffect(() => {
    if (!isGuest) return;
    try {
      const raw = JSON.parse(localStorage.getItem("sakura_guest_orders") ?? "[]");
      setGuestTrackingIds(raw.map((o: any) => typeof o === "string" ? { trackingId: o } : o));
    } catch { setGuestTrackingIds([]); }
  }, [isGuest]);
  const [returnsMap, setReturnsMap] = useState<Record<number, any>>({});

  useEffect(() => {
    if (isGuest) return;
    getToken().then(token =>
      fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/returns/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            const map: Record<number, any> = {};
            data.forEach(r => { map[r.orderId] = r; });
            setReturnsMap(map);
          }
        })
        .catch(() => {})
    );
  }, []);

  if (isGuest) {
    if (isLoading) {
      return (
        <div className="container mx-auto px-4 py-10">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      );
    }
    if (guestTrackingIds.length === 0) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Package2 className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl font-medium mb-2">No orders yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Orders you place as a guest will appear here on this device.</p>
          <Link href="/products"><Button className="rounded-full px-8">Start Shopping</Button></Link>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-muted/30 border-b py-10">
          <div className="container mx-auto px-4">
            <PageBreadcrumb crumbs={[{ label: "My Orders", icon: <Package2 className="h-3 w-3" /> }]} className="mb-3" />
            <h1 className="font-serif text-4xl font-medium">My Orders</h1>
            <p className="text-muted-foreground mt-1 text-sm">{guestTrackingIds.length} order{guestTrackingIds.length !== 1 ? "s" : ""} on this device</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-3">
          {guestTrackingIds.map((o) => (
            <Link key={o.trackingId} href={`/orders/${o.trackingId}`}>
              <div className="border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-mono font-semibold text-sm">{o.trackingId}</p>
                    {o.createdAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                {o.items && o.items.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {o.items.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        {item.productImage && (
                          <img src={item.productImage} alt={item.productName} className="h-8 w-8 rounded-md object-cover border shrink-0" />
                        )}
                        <p className="text-xs text-muted-foreground truncate flex-1">{item.productName} × {item.quantity}</p>
                        <p className="text-xs font-medium shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                    {o.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{o.items.length - 3} more item{o.items.length - 3 !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                )}
                {o.total != null && (
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>৳{Number(o.total).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
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

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Package2 className="h-9 w-9 text-muted-foreground" />
        </div>
        <h2 className="font-serif text-2xl font-medium mb-2">No orders yet</h2>
        <p className="text-muted-foreground text-sm mb-6">Your orders will appear here once you've shopped with us.</p>
        <Link href="/products"><Button className="rounded-full px-8">Start Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-muted/30 border-b py-10">
        <div className="container mx-auto px-4">
          <PageBreadcrumb crumbs={[{ label: "My Orders", icon: <Package2 className="h-3 w-3" /> }]} className="mb-3" />
          <h1 className="font-serif text-4xl font-medium">My Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-4">
          {orders.map((order, index) => { const rank = orders.length - index; return (
            <Link key={order.id} href={`/orders/${order.id}?rank=${rank}`}>
              <div className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">Order #{rank}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.orderStatus] ?? "bg-muted"}`}>
                        {order.orderStatus === "return_completed" ? "Refund Completed" : order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
                      {returnsMap[order.id] && order.orderStatus !== "return_completed" && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${returnBadgeColors[returnsMap[order.id].status] ?? "bg-muted"}`}>
                          {returnBadgeLabels[returnsMap[order.id].status] ?? "↩ Return"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" })}</p>
                    {(order as any).trackingId && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-muted-foreground font-mono">{(order as any).trackingId}</span>
                        <CopyTrackingButton trackingId={(order as any).trackingId} />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">৳{order.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground capitalize">{order.paymentMethod}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                    View details <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          )}
          )}
        </div>
      </div>
    </div>
  );
}
