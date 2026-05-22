import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/react";

export function StockAlertButton({ productId, productName }: { productId: number; productName: string }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("loading");
    try {
      const r = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErrorMsg(data.error ?? "Failed to register alert");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-full gap-2"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        Notify Me When Available
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Get Notified</DialogTitle>
            <DialogDescription>
              We'll email you when <strong>{productName}</strong> is back in stock.
            </DialogDescription>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                We'll notify you at <strong>{email}</strong> when this product is back.
              </p>
              <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address for stock alert"
              />
              {status === "error" && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}
              <Button type="submit" disabled={status === "loading"} className="rounded-full">
                {status === "loading" ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up alert...</>
                ) : "Notify Me"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
