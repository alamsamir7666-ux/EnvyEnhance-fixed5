import { useState } from "react";
import { Bell, Check, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/react";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

interface Props {
  productId: number;
  productName: string;
  sheetMode?: boolean;
}

interface FormProps {
  method: "email" | "phone";
  setMethod: (m: "email" | "phone") => void;
  status: "idle" | "loading" | "success" | "error";
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  errorMsg: string;
}

function FormContent({ method, setMethod, status, phone, setPhone, email, setEmail, handleSubmit, errorMsg }: FormProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button type="button" onClick={() => setMethod("phone")}
          style={{ background: method === "phone" ? "var(--accent, #e05c9a)" : "transparent", color: method === "phone" ? "#fff" : "inherit" }}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${method === "phone" ? "border-transparent" : "border-border"}`}>
          <Phone className="h-4 w-4" /> Phone
        </button>
        <button type="button" onClick={() => setMethod("email")}
          style={{ background: method === "email" ? "var(--accent, #e05c9a)" : "transparent", color: method === "email" ? "#fff" : "inherit" }}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${method === "email" ? "border-transparent" : "border-border"}`}>
          <Mail className="h-4 w-4" /> Email
        </button>
      </div>
      {status === "success" ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground">We'll notify you when back in stock!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          {method === "phone" ? (
            <Input type="tel" placeholder="01XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} required className="rounded-full flex-1" />
          ) : (
            <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-full flex-1" />
          )}
          <Button type="submit" disabled={status === "loading"} className="rounded-full shrink-0" style={{ background: "var(--accent, #e05c9a)", color: "#fff" }}>
            {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify Me"}
          </Button>
        </form>
      )}
      {status === "error" && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

export function StockAlertButton({ productId, productName, sheetMode }: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress ?? "");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (method === "email" && !email.includes("@")) return;
    if (method === "phone" && phone.length < 8) return;
    setStatus("loading");
    try {
      const r = await fetch(API + "/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, email: method === "email" ? email : `${phone}@phone.notify` }),
      });
      const data = await r.json();
      if (!r.ok) { setErrorMsg(data.error ?? "Failed"); setStatus("error"); return; }
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  const fp: FormProps = { method, setMethod, status, phone, setPhone, email, setEmail, handleSubmit, errorMsg };

  if (sheetMode) return <FormContent {...fp} />;

  return (
    <>
      <Button variant="outline" size="sm" className="w-full rounded-full gap-2" onClick={() => setOpen(true)}>
        <Bell className="h-4 w-4" /> Notify Me When Available
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Get Notified</DialogTitle>
            <DialogDescription>We'll notify you when <strong>{productName}</strong> is back in stock.</DialogDescription>
          </DialogHeader>
          <FormContent {...fp} />
        </DialogContent>
      </Dialog>
    </>
  );
}
