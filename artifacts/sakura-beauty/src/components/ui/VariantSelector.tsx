import { useState, useEffect } from "react";

interface Variant {
  id: number;
  name: string;
  variantType: string;
  price: number;
  discountPrice: number | null;
  stock: number;
}

interface VariantSelectorProps {
  productId: number;
  basePrice: number;
  onVariantChange?: (variant: Variant | null) => void;
}

export function VariantSelector({ productId, basePrice, onVariantChange }: VariantSelectorProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}/variants`)
      .then((r) => r.json())
      .then((data: Variant[]) => {
        setVariants(data);
        if (data.length > 0) {
          setSelected(data[0]);
          onVariantChange?.(data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || variants.length === 0) return null;

  const types = [...new Set(variants.map((v) => v.variantType))];

  function handleSelect(variant: Variant) {
    setSelected(variant);
    onVariantChange?.(variant);
  }

  return (
    <div className="space-y-3">
      {types.map((type) => {
        const group = variants.filter((v) => v.variantType === type);
        return (
          <div key={type}>
            <p className="text-sm font-medium capitalize mb-2">
              {type}:{" "}
              <span className="text-muted-foreground font-normal">
                {selected?.variantType === type ? selected.name : ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {group.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelect(v)}
                  disabled={v.stock === 0}
                  className={`px-3 py-1.5 text-sm rounded-xl border transition-all ${
                    selected?.id === v.id
                      ? "border-accent bg-accent/10 text-accent font-medium"
                      : v.stock === 0
                        ? "border-border text-muted-foreground/40 line-through cursor-not-allowed"
                        : "border-border hover:border-accent/60 hover:bg-muted/40"
                  }`}
                  aria-pressed={selected?.id === v.id}
                  aria-label={`${type} ${v.name}${v.stock === 0 ? " — out of stock" : ""}`}
                >
                  {v.name}
                  {v.stock > 0 && v.stock <= 5 && (
                    <span className="ml-1.5 text-xs text-amber-500">({v.stock} left)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {selected && (
        <p className="text-sm text-muted-foreground">
          Price for {selected.name}:{" "}
          <span className="font-semibold text-foreground">
            ৳{(selected.discountPrice ?? selected.price).toLocaleString()}
          </span>
          {selected.discountPrice && (
            <span className="line-through text-muted-foreground ml-2">
              ৳{selected.price.toLocaleString()}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
