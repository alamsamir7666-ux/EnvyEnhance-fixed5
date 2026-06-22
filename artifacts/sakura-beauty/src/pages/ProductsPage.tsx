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

// ?? Constants ??????????????????????????????????????????????????????????????
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

// ?? Lazy card ??????????????????????????????????????????????????????????????
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

// ?? Sort helper ????????????????????????????????????????????????????????????
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

// ?? Main page ??????????????????????????????????????????????????????????????
export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("default");
  const [perPage, setPerPage] = useState(24);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
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

  // Pre-fill search from URL ?q= only once on mount - prevents infinite re-render loop
  // when urlSearch in deps would keep re-triggering as the user types
  const urlSearchApplied = useRef(false);
  useEffect(() => {
    if (urlSearch && !urlSearchApplied.current) {
      urlSearchApplied.current = true;
      setSearch(urlSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty - only run once on mount

  const { data: dbCategories } = useListCategories({
    query: { staleTime: 60_000, queryKey: getListCategoriesQueryKey() },
  });

  // Reset pagination when category changes - do NOT reset search text so
  // users can search across a newly selected category without losing their query
  useEffect(() => {
    setCurrentPage(1); setAllProducts([]);
  }, [activeCategory]);

  useEffect(() => {
    setCurrentPage(1); setAllProducts([]);
  }, [debouncedSearch, minRating, perPage]);

  useEffect(() => {
    const catTitle = activeCategory
      ? activeCategory.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "";
    updateSEO({
      title: activeCategory ? `${catTitle} - Skincare Products` : "Shop All Skincare Products",
      description: "Browse authentic Japanese skincare products in Bangladesh.",
    });
  }, [activeCategory]);

  const { data, isLoading, isFetching } = useListProducts({
    category: activeCategory || undefined,
    search: debouncedSearch || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    page: currentPage,
    limit: perPage,
  });

  useEffect(() => {
    if (!data?.products) return;
    setAllProducts(data.products);
    setTotalFromAPI(data.total ?? 0);
  }, [data]);

  const sortedProducts = useMemo(() => sortProducts(allProducts, sort), [allProducts, sort]);
  const totalPages = Math.ceil(totalFromAPI / perPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

      {/* ?? Page header ?? breadcrumb only */}
      <div className="bg-muted/30 border-b py-3">
        <div className="container mx-auto px-4">
          <PageBreadcrumb crumbs={breadcrumbs} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">

        {/* ?? Screenshot-style filter bar ?????????????????????? */}
        <div className="bg-[#fdf0f2]/60 border border-pink-100 rounded-2xl px-4 py-3 mb-6">

          {/* Row 1: Full-width search */}
          <div className="relative w-full mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for product"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border bg-white text-sm shadow-none w-full"
              aria-label="Search products"
            />
          </div>

          {/* Row 2: Sort, Per page, Filter toggle */}
          <div className="flex items-center gap-3">

            {/* Sort */}
            <div className="flex-1">
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

            {/* Result count */}
            {totalFromAPI > 0 && (
              <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
                {totalFromAPI} products
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

        {/* ?? Active filter chips ?????????????????????????????? */}
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

        {/* ?? Product grid ????????????????????????????????????? */}
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
              {sortedProducts.map(product => (
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
                {/* Prev */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-10 w-10 rounded-xl border border-border bg-white flex items-center justify-center text-sm font-medium disabled:opacity-40 hover:border-accent/60 transition-colors"
                >{"<"}</button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="h-10 w-10 flex items-center justify-center text-muted-foreground text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p as number)}
                        className={`h-10 w-10 rounded-xl border text-sm font-medium transition-colors ${
                          currentPage === p
                            ? "bg-foreground text-background border-foreground"
                            : "bg-white border-border hover:border-accent/60"
                        }`}
                      >{p}</button>
                    )
                  )}

                {/* Next */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-10 w-10 rounded-xl border border-border bg-white flex items-center justify-center text-sm font-medium disabled:opacity-40 hover:border-accent/60 transition-colors"
                >{">"}</button>
              </div>
            )}
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
