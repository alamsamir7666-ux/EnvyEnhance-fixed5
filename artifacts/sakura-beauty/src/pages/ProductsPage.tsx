import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useListProducts, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X, ShoppingBag, Loader2, Package, Star } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { updateSEO } from "@/lib/seo";
import { ComparisonBar, ComparisonDrawer, useComparison } from "@/components/ui/ProductComparison";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

// ── Constants ──────────────────────────────────────────────────────────────
const INITIAL_LOAD = 10;
const LOAD_MORE_BATCH = 4;
const FETCH_LIMIT = 50;

const SORT_OPTIONS = [
  { value: "default",       label: "Default" },
  { value: "price-asc",     label: "Price: Low to High" },
  { value: "price-desc",    label: "Price: High to Low" },
  { value: "rating-desc",   label: "Top Rated" },
  { value: "newest",        label: "Newest First" },
];

const PER_PAGE_OPTIONS = ["12", "24", "36", "48"];

// ── Lazy card ──────────────────────────────────────────────────────────────
function LazyProductCard({ product, backContext }: { product: any; backContext?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="animate-in fade-in duration-300">
      {visible ? (
        <ProductCard product={product} backContext={backContext} />
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
          <Skeleton className="aspect-square w-full" />
          <div className="p-4 flex flex-col gap-2">
            <Skeleton className="h-2.5 w-14 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-3 w-3 rounded-sm" />)}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-8 w-full rounded-xl mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sort helper ────────────────────────────────────────────────────────────
function sortProducts(products: any[], sort: string) {
  const arr = [...products];
  switch (sort) {
    case "price-asc":   return arr.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    case "price-desc":  return arr.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    case "rating-desc": return arr.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    case "newest":      return arr.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    default:            return arr;
  }
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("default");
  const [perPage, setPerPage] = useState(24);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [apiPage, setApiPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(perPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allProducts, setAllProducts] = useState<Record<string, unknown>[]>([]);
  const [totalFromAPI, setTotalFromAPI] = useState(0);

  const debouncedSearch = useDebounce(search, 350);
  const [compareOpen, setCompareOpen] = useState(false);
  const { compareIds } = useComparison();

  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const activeCategory = params.get("category") ?? "";
  const urlSearch = params.get("q") ?? "";

  // Pre-fill search from URL ?q= only once on mount — prevents infinite re-render loop
  // when urlSearch in deps would keep re-triggering as the user types
  const urlSearchApplied = useRef(false);
  useEffect(() => {
    if (urlSearch && !urlSearchApplied.current) {
      urlSearchApplied.current = true;
      setSearch(urlSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run once on mount

  const { data: dbCategories } = useListCategories({
    query: { staleTime: 60_000, queryKey: getListCategoriesQueryKey() },
  });

  // Reset pagination when category changes — do NOT reset search text so
  // users can search across a newly selected category without losing their query
  useEffect(() => {
    setApiPage(1); setVisibleCount(perPage); setAllProducts([]);
  }, [activeCategory]);

  useEffect(() => {
    setApiPage(1); setVisibleCount(perPage); setAllProducts([]);
  }, [debouncedSearch, minRating, perPage]);

  useEffect(() => {
    const catTitle = activeCategory
      ? activeCategory.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
    updateSEO({
      title: activeCategory ? `${catTitle} – Skincare Products` : "Shop All Skincare Products",
      description: "Browse authentic Japanese skincare products in Bangladesh.",
    });
  }, [activeCategory]);

  const { data, isLoading, isFetching } = useListProducts({
    category: activeCategory || undefined,
    search: debouncedSearch || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    page: apiPage,
    limit: FETCH_LIMIT,
  });

  useEffect(() => {
    if (!data?.products) return;
    if (apiPage === 1) {
      setAllProducts(data.products);
      setTotalFromAPI(data.total ?? 0);
    } else {
      setAllProducts(prev => {
        const seen = new Set(prev.map((p: any) => p.id));
        return [...prev, ...data.products.filter((p: any) => !seen.has(p.id))];
      });
      setTotalFromAPI(data.total ?? 0);
    }
    setIsLoadingMore(false);
  }, [data, apiPage]);

  // Sort + slice for display
  const sortedProducts = useMemo(() => sortProducts(allProducts, sort), [allProducts, sort]);
  const visibleProducts = useMemo(() => sortedProducts.slice(0, visibleCount), [sortedProducts, visibleCount]);

  const hasMoreVisible = visibleCount < sortedProducts.length;
  const hasMoreFromAPI = allProducts.length < totalFromAPI;
  const canLoadMore = hasMoreVisible || hasMoreFromAPI;

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    // Load a full "page" worth of products each time for consistent UX
    const batch = perPage;
    if (hasMoreVisible) { setVisibleCount(v => v + batch); }
    else if (hasMoreFromAPI) { setIsLoadingMore(true); setApiPage(p => p + 1); setVisibleCount(v => v + batch); }
  }, [isLoadingMore, hasMoreVisible, hasMoreFromAPI, perPage]);

  const activeCategoryObj = dbCategories?.find(c => c.slug === activeCategory);
  const displayTitle = activeCategoryObj?.name
    ?? (activeCategory ? activeCategory.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Shop All");

  const breadcrumbs = [
    { label: "Products", href: "/products", icon: <ShoppingBag className="h-3 w-3" /> },
    ...(activeCategory ? [{ label: activeCategoryObj?.name ?? displayTitle, icon: <Package className="h-3 w-3" /> }] : []),
  ];

  const activeFiltersCount = (minRating > 0 ? 1 : 0) + (activeCategory ? 1 : 0) + (search.trim() ? 1 : 0);

  return (
    <>
    <div className="min-h-screen bg-background">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="bg-muted/30 border-b py-8">
        <div className="container mx-auto px-4">
          <PageBreadcrumb crumbs={breadcrumbs} className="mb-3" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-accent mb-1 font-medium">
                {activeCategory ? (activeCategoryObj?.name ?? activeCategory) : "All products"}
              </p>
              <h1 className="font-serif text-3xl font-medium">{displayTitle}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">

        {/* ── Screenshot-style filter bar ────────────────────── */}
        <div className="bg-[#fdf0f2]/60 border border-pink-100 rounded-2xl px-4 py-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for product"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl border-border bg-white text-sm shadow-none"
                aria-label="Search products"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilterPanel(v => !v)}
              className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-colors ${
                showFilterPanel || activeFiltersCount > 0
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white text-foreground hover:border-accent/60"
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="bg-white text-accent text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="min-w-[160px]">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Per page */}
            <div className="min-w-[80px]">
              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); }}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result count */}
            {totalFromAPI > 0 && (
              <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
                {visibleProducts.length} / {totalFromAPI} products
              </p>
            )}
          </div>

          {/* Expandable filter panel */}
          {showFilterPanel && (
            <div className="mt-4 pt-4 border-t border-pink-100 grid grid-cols-1 sm:grid-cols-3 gap-6">

              {/* Category */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => navigate("/products")}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      activeCategory === ""
                        ? "bg-accent text-white border-accent"
                        : "border-border text-muted-foreground bg-white hover:border-accent/60 hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  {(dbCategories ?? []).map(cat => (
                    <button
                      key={cat.slug}
                      onClick={() => navigate(cat.slug ? `/products?category=${cat.slug}` : "/products")}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        activeCategory === cat.slug
                          ? "bg-accent text-white border-accent"
                          : "border-border text-muted-foreground bg-white hover:border-accent/60 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min rating */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Min Rating</p>
                <div className="flex gap-2">
                  {[0, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        minRating === r
                          ? "bg-accent text-white border-accent"
                          : "border-border text-muted-foreground bg-white hover:border-accent/60"
                      }`}
                    >
                      {r > 0 && <Star className="h-3 w-3" />}
                      {r === 0 ? "Any" : `${r}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              <div className="flex items-end">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setMinRating(0); navigate("/products"); }}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Active filter chips ────────────────────────────── */}
        {(activeCategory || minRating > 0) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {activeCategory && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
                {activeCategoryObj?.name ?? activeCategory}
                <button onClick={() => navigate("/products")} aria-label="Remove"><X className="h-3 w-3" /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
                <Star className="h-3 w-3" />{minRating}+ stars
                <button onClick={() => setMinRating(0)} aria-label="Remove"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* ── Product grid ───────────────────────────────────── */}
        {isLoading && allProducts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: Math.min(perPage, 12) }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 flex flex-col gap-2">
                  <Skeleton className="h-2.5 w-14 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-3 w-3 rounded-sm" />)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-xl mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : allProducts.length === 0 && !isLoading ? (
          <div className="py-24 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No products found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search term</p>
            <button
              onClick={() => { setSearch(""); setMinRating(0); navigate("/products"); }}
              className="mt-4 text-sm text-accent hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {visibleProducts.map(product => (
                <LazyProductCard key={product.id} product={product} backContext={activeCategory || undefined} />
              ))}
              {isLoadingMore && Array.from({ length: Math.min(perPage, 8) }).map((_, i) => (
                <div key={`sk-${i}`} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col animate-pulse">
                  <div className="aspect-square w-full bg-muted" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-2.5 w-14 rounded-full bg-muted" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-4/5 bg-muted rounded" />
                    <div className="h-8 w-full bg-muted rounded-xl mt-1" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 mt-10">
              {canLoadMore ? (
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || isFetching}
                  variant="outline"
                  className="rounded-full px-8 min-w-[160px]"
                >
                  {isLoadingMore
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</>
                    : "Load More Products"}
                </Button>
              ) : allProducts.length > INITIAL_LOAD ? (
                <p className="text-sm text-muted-foreground py-4">✓ All {totalFromAPI} products shown</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>

    <ComparisonBar onOpen={() => setCompareOpen(true)} />
    <ComparisonDrawer
      open={compareOpen}
      onClose={() => setCompareOpen(false)}
      products={allProducts.filter((p: any) => compareIds.includes(p.id))}
    />
    </>
  );
}
