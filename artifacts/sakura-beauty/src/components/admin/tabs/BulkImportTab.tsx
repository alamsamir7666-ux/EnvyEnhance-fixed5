import { useState } from "react";
import { useAuth } from "@clerk/react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export function BulkImportTab() {
  const { getToken } = useAuth();
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TEMPLATE = `name,price,discountPrice,category,stock,description,images,keyBenefits,mainIngredients,bestFor,texture,ingredients
"Skin Aqua Super Moisture Gel SPF50+",1450,,Sunscreens,50,"A Japanese water gel sunscreen with SPF50+ PA++++. Triple Hyaluronic Acid complex for intense moisture while protecting from UV rays.","https://example.com/img1.jpg|https://example.com/img2.jpg","Maximum SPF50+ PA++++ protection|Triple Hyaluronic Acid for deep hydration|Lightweight no white cast|Sweat and water resistant","? Sodium Hyaluronate (Hyaluronic Acid)|? Hydrolyzed Collagen|? Arginine|?? Ethylhexyl Methoxycinnamate","Dry skin|Oily skin|All skin types","Ultra-light watery gel that melts into skin instantly"`;

  const FORMAT_NOTES = [
    { field: "name", note: "Product name (required)" },
    { field: "price", note: "Price in BDT, numbers only (required)" },
    { field: "discountPrice", note: "Sale price - leave empty if no discount" },
    { field: "category", note: "Category name (required)" },
    { field: "stock", note: "Stock quantity" },
    { field: "description", note: "Full product description" },
    { field: "images", note: "Image URLs separated by |" },
    { field: "keyBenefits", note: "Benefits separated by | (e.g. Deep hydration|Brightening)" },
    { field: "mainIngredients", note: "Ingredients with emoji separated by | (e.g. ? Hyaluronic Acid|? Niacinamide)" },
    { field: "bestFor", note: "Skin types separated by | (e.g. Dry skin|Oily skin)" },
    { field: "texture", note: "Texture description (single line)" },
    { field: "ingredients", note: "Full INCI ingredients list (single line)" },
  ];

  async function handleImport() {
    if (!csvText.trim()) { setError("Please paste CSV content first."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(API+"/api/admin/products/bulk-import", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Import failed"); return; }
      setResult(data);
    } finally { setLoading(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Bulk Product Import</h2>
        <p className="text-sm text-muted-foreground mt-1">Upload a CSV file or paste CSV content to import multiple products at once.</p>
      </div>

      {/* Template download */}
      <div className="bg-muted/40 border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required CSV Format</p>
        <pre className="text-xs text-foreground/80 font-mono overflow-x-auto whitespace-pre-wrap">{TEMPLATE}</pre>
        <button
          onClick={() => { const blob = new Blob([TEMPLATE], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "product_import_template.csv"; a.click(); }}
          className="mt-3 text-xs text-accent hover:underline"
        >
          Download Template CSV
        </button>
      </div>

      {/* File upload */}
      <div>
        <Label className="text-sm">Upload CSV File</Label>
        <input type="file" accept=".csv" onChange={handleFile} className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:bg-accent file:text-white hover:file:bg-accent/90 file:cursor-pointer" />
      </div>

      {/* Or paste */}
      <div>
        <Label className="text-sm">Or Paste CSV Content</Label>
        <Textarea
          className="mt-1 font-mono text-xs resize-none"
          rows={8}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder="Paste your CSV content here?"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className={`rounded-xl p-4 ${result.errors > 0 ? "bg-yellow-50 border-yellow-200 border" : "bg-green-50 border-green-200 border"}`}>
          <p className="font-medium text-sm">{result.message}</p>
          {result.errorDetails?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errorDetails.map((e: string, i: number) => (
                <li key={i} className="text-xs text-red-600">• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button onClick={handleImport} disabled={loading || !csvText.trim()} className="rounded-full gap-2">
        <Upload className="h-4 w-4" />
        {loading ? "Importing?" : "Import Products"}
      </Button>
    </div>
  );
}
