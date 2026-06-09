import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, X, Loader2, Tag } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface ProductResult {
  id: number; name: string; slug: string; category: string;
  price: number; discountPrice: number | null; image: string | null; averageRating: number;
}
interface CategoryResult { name: string; slug: string; }
interface SearchResults { products: ProductResult[]; categories: CategoryResult[]; }

export function SearchAutocomplete({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" })
      .then(r => r.json())
      .then((data: SearchResults) => { setResults(data); setOpen(true); })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close on outside tap/click
  useEffect(() => {
    function handler(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  function go(path: string) {
    navigate(path);
    setQuery("");
    setResults(null);
    setOpen(false);
    onClose?.();
  }

  const hasResults = results && (results.products.length > 0 || results.categories.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={e => { e.preventDefault(); if (query.trim()) go(`/products?q=${encodeURIComponent(query.trim())}`); }}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, ingredients…"
            autoComplete="off"
            className="w-full h-10 pl-10 pr-10 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
          {loading && <Loader2 className="absolute right-3.5 h-4 w-4 text-muted-foreground animate-spin" />}
          {!loading && query && (
            <button type="button" onClick={() => { setQuery(""); setResults(null); setOpen(false); }} className="absolute right-3.5 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
          {!hasResults ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">No results for "<strong>{query}</strong>"</div>
          ) : (
            <div className="py-2 max-h-[420px] overflow-y-auto">
              {results.categories.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categories</p>
                  {results.categories.map(cat => (
                    <div key={cat.slug} onClick={() => go(`/products?category=${cat.slug}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Tag className="h-3.5 w-3.5 text-accent" />
                      </div>
                      <span className="text-sm">{cat.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">Category →</span>
                    </div>
                  ))}
                </div>
              )}
              {results.products.length > 0 && (
                <div>
                  {results.categories.length > 0 && <div className="mx-4 my-1 border-t" />}
                  <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Products</p>
                  {results.products.map(product => {
                    const displayPrice = product.discountPrice ?? product.price;
                    return (
                      <div key={product.id} onClick={() => go(`/products/${product.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden shrink-0">
                          {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">৳{displayPrice.toLocaleString()}</p>
                          {product.discountPrice && <p className="text-xs text-muted-foreground line-through">৳{product.price.toLocaleString()}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t mt-1">
                <div onClick={() => go(`/products?q=${encodeURIComponent(query.trim())}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-accent hover:bg-accent/5 transition-colors font-medium cursor-pointer">
                  <Search className="h-3.5 w-3.5" />
                  See all results for "{query}"
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
