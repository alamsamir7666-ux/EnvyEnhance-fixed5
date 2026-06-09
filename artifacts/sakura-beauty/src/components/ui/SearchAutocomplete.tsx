import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" })
      .then(r => r.json())
      .then((data: SearchResults) => {
        setResults(data);
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          setDropdownPos({ top: rect.bottom + window.scrollY + 8, left: rect.left, width: rect.width });
        }
        setOpen(true);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    function handler(e: Event) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-search-dropdown]')) {
          setOpen(false);
        }
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
    setOpen(false);
    setQuery("");
    setResults(null);
    onClose?.();
    setTimeout(() => navigate(path), 50);
  }

  const hasResults = results && (results.products.length > 0 || results.categories.length > 0);

  const dropdown = open ? createPortal(
    <div
      data-search-dropdown
      style={{
        position: 'absolute',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 99999,
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {!hasResults ? (
        <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
          No results for "<strong>{query}</strong>"
        </div>
      ) : (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.categories.length > 0 && (
            <div>
              <p style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>Categories</p>
              {results.categories.map(cat => (
                <div key={cat.slug}
                  onTouchEnd={e => { e.preventDefault(); go(`/products?category=${cat.slug}`); }}
                  onClick={() => go(`/products?category=${cat.slug}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
                >
                  <div style={{ height: 28, width: 28, borderRadius: '50%', backgroundColor: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Tag size={14} color="#e05c9a" />
                  </div>
                  <span style={{ fontSize: 14, color: '#111827' }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>Category →</span>
                </div>
              ))}
            </div>
          )}
          {results.products.length > 0 && (
            <div>
              {results.categories.length > 0 && <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '4px 16px' }} />}
              <p style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>Products</p>
              {results.products.map(product => {
                const displayPrice = product.discountPrice ?? product.price;
                return (
                  <div key={product.id}
                    onTouchEnd={e => { e.preventDefault(); go(`/products/${product.id}`); }}
                    onClick={() => go(`/products/${product.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ height: 44, width: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                      {product.image
                        ? <img src={product.image} alt={product.name} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                        : <div style={{ height: '100%', width: '100%', backgroundColor: '#f3f4f6' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }}>{product.category}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>৳{displayPrice.toLocaleString()}</p>
                      {product.discountPrice && <p style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>৳{product.price.toLocaleString()}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            <div
              onTouchEnd={e => { e.preventDefault(); go(`/products?q=${encodeURIComponent(query.trim())}`); }}
              onClick={() => go(`/products?q=${encodeURIComponent(query.trim())}`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', fontSize: 14, color: '#e05c9a', cursor: 'pointer', fontWeight: 500 }}
            >
              <Search size={14} />
              See all results for "{query}"
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={e => { e.preventDefault(); if (query.trim()) go(`/products?q=${encodeURIComponent(query.trim())}`); }}>
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
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
      {dropdown}
    </div>
  );
}
