import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";
import { useState } from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package2, ArrowRight, Copy, Check } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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
  const { data: orders, isLoading } = useListOrders();

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
          {orders.map((order, index) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium">Order #{orders.length - index}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.orderStatus] ?? "bg-muted"}`}>
                        {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                      </span>
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
          ))}
        </div>
      </div>
    </div>
  );
}
