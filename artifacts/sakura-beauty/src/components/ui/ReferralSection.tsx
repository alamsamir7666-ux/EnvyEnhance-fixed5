import { useState, useEffect } from "react";
import { Copy, Check, Users, Gift, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferral } from "@/hooks/useReferral";
import { useApiClient } from "@workspace/api-client-react";

export function ReferralSection() {
  const { data, loading } = useReferral();
  const [copied, setCopied] = useState(false);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(true);
  const apiClient = useApiClient();

  useEffect(() => {
    apiClient.get("/affiliate/me")
      .then(res => setAffiliate(res.data))
      .catch(() => setAffiliate(null))
      .finally(() => setAffiliateLoading(false));
  }, []);

  function handleCopy() {
    if (!data?.shareUrl) return;
    navigator.clipboard.writeText(data.shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (loading || affiliateLoading) {
    return <div className="space-y-4"><div className="h-32 rounded-2xl bg-muted animate-pulse" /><div className="h-32 rounded-2xl bg-muted animate-pulse" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Affiliate Stats — only shown if user is an affiliate */}
      {affiliate && (
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50/50 to-background p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold text-base">Your Affiliate Stats</h3>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${affiliate.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {affiliate.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Your affiliate code: <strong className="font-mono tracking-wider text-foreground">{affiliate.code}</strong>
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <ShoppingBag className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">{affiliate.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Orders</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <DollarSign className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">৳{affiliate.totalSales.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Sales</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <TrendingUp className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-600">৳{affiliate.totalCommission.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Commission</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Commission rate: {affiliate.commissionRate}% per sale
          </p>
        </div>
      )}

      {/* Referral Section */}
      {data && (
        <div className="rounded-2xl border bg-gradient-to-br from-accent/5 to-background p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-base">Refer & Earn</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Share your code. Your friend gets <strong>৳100 off</strong> their first order, and you earn <strong>100 loyalty points</strong>.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-accent">{data.successfulReferrals}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Successful Referrals</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-accent">{data.earnedPoints}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Points Earned</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-xl px-4 py-2.5 font-mono text-sm font-semibold tracking-widest text-center select-all">
              {data.code}
            </div>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 shrink-0" onClick={handleCopy} aria-label="Copy referral link">
              {copied ? <><Check className="h-4 w-4 text-green-500" />Copied!</> : <><Copy className="h-4 w-4" />Copy Link</>}
            </Button>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hey! Use my code ${data.code} for ৳100 off your first order at EnvyEnhance — authentic Japanese skincare! ${data.shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            <Gift className="h-4 w-4" />
            Share on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
