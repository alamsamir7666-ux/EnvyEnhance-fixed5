import { useRef, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ShieldCheck, BadgeCheck, HandHeart, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductCardSkeleton, ProductGridSkeleton } from "@/components/ui/ProductCardSkeleton";
import { useGetFeaturedProducts, useListCategories, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageContext } from "@/contexts/PageContext";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { updateSEO } from "@/lib/seo";
import { InstagramFeed } from "@/components/ui/InstagramFeed";

const categoryImages: Record<string, string> = {
  moisturizers: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=600&q=80&fm=webp",
  serums: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80&fm=webp",
  sunscreen: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80&fm=webp",
  "face-masks": "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600&q=80&fm=webp",
  cleansers: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80&fm=webp",
  toners: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80&fm=webp",
  "eye-care": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80&fm=webp",
  "lip-care": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80&fm=webp",
  "hair-care": "https://images.unsplash.com/photo-1522337913084-8c96cca08af9?w=600&q=80&fm=webp",
};

const categoryBgs: Record<string, string> = {
  moisturizers: "#f8e8e8",
  serums: "#e6f2ef",
  sunscreen: "#fff8e1",
  "face-masks": "#f8e8f5",
  cleansers: "#e8f0fe",
  toners: "#f0eef8",
  "eye-care": "#e8f2f8",
  "lip-care": "#fce4ec",
  "hair-care": "#f0f4e8",
};

function CollectionSliderSkeleton() {
  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-36 rounded-full" />
            <Skeleton className="h-8 w-52" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-[220px] h-[300px] rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePageSkeleton() {
  return (
    <div className="min-h-screen">

      <CollectionSliderSkeleton />
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-10 w-56" />
            </div>
          </div>
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}

function CollectionSlider() {
  const sliderRef = useRef<HTMLDivElement>(null);
  const { data: dbCategories, isLoading: categoriesLoading } = useListCategories({
    query: { staleTime: 60_000, queryKey: getListCategoriesQueryKey() },
  });

  const categories = dbCategories ?? [];

  if (categoriesLoading) return <CollectionSliderSkeleton />;
  if (!categories.length) return null;

  return (
    <section className="py-16 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-accent mb-2 font-medium">Browse by Collection</p>
            <h2 className="font-serif text-3xl font-medium">Our Collections</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => sliderRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => sliderRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={sliderRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat) => {
            const img = categoryImages[cat.slug] ?? categoryImages.moisturizers;
            const bg = categoryBgs[cat.slug] ?? "#f8e8e8";
            return (
              <Link key={cat.slug} href={`/products?category=${cat.slug}`}>
                <div
                  className="group relative shrink-0 w-[220px] h-[300px] rounded-2xl overflow-hidden cursor-pointer snap-start"
                  style={{ background: bg }}
                >
                  <img
                    src={img}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-80 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 text-white">
                    {(cat as { icon?: string }).icon && <span className="text-2xl mb-1 block">{(cat as { icon?: string }).icon}</span>}
                    <p className="text-xs uppercase tracking-[0.12em] mb-1 opacity-80">Collection</p>
                    <h3 className="font-serif text-xl font-medium mb-2">{cat.name}</h3>
                    <span className="text-xs opacity-90 flex items-center gap-1.5 group-hover:gap-3 transition-all">
                      Shop now <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const PAGE_SIZE = 4;

export function HomePage() {
  const { data: featured, isLoading: featuredLoading } = useGetFeaturedProducts();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { setPageReady } = usePageContext();
  const recentlyViewed = useRecentlyViewed();
  const [heroSearch, setHeroSearch] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    updateSEO(); // Reset to default homepage SEO
  }, []);

  useEffect(() => {
    setPageReady(!featuredLoading);
  }, [featuredLoading, setPageReady]);

  if (featuredLoading) return <HomePageSkeleton />;

  type FeaturedProduct = typeof featured extends (infer T)[] | undefined ? T : never;
  const sorted = [...(featured ?? [])].sort((a, b) => {
    const aTop = (a as FeaturedProduct & { homepageSection?: string }).homepageSection === "top" ? 0 : 1;
    const bTop = (b as FeaturedProduct & { homepageSection?: string }).homepageSection === "top" ? 0 : 1;
    return aTop - bTop;
  });
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex items-center overflow-hidden pt-8 pb-0 bg-gradient-to-br [#f9f8f6]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #f8e8e8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #e6f2ef 0%, transparent 50%), radial-gradient(circle at 60% 80%, #f8e8d8 0%, transparent 40%)",
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl pb-8">
            <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-medium leading-[0.95] mb-0 text-foreground">
              Glow with
              <br />
              <em className="text-accent not-italic">purpose.</em>
            </h1>

          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=75&fm=webp"
            alt="Skincare ritual"
            className="h-full w-full object-cover opacity-70 mix-blend-multiply"
            fetchPriority="high"
            loading="eager"
            decoding="sync"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#fdf6f0]" />
        </div>
      </section>

      {/* Collection Cards Slider */}
      <CollectionSlider />

      {/* Featured Rituals */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-accent mb-2 font-medium">Curated for you</p>
              <h2 className="font-serif text-4xl font-medium">Featured Rituals</h2>
            </div>
            <Link href="/products">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No featured products yet. Check back soon!</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} backContext="featured" />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-10">
                  <Button
                    variant="outline"
                    className="rounded-full px-8 border-accent text-accent hover:bg-accent hover:text-white transition-colors"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    Show More <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section className="py-16 border-t bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-accent mb-2 font-medium">Continue your ritual</p>
                <h2 className="font-serif text-4xl font-medium">Recently Viewed</h2>
              </div>
              <Link href="/products">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {recentlyViewed.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.15em] text-accent mb-2 font-medium">Why Choose Us</p>
            <h2 className="font-serif text-3xl font-medium">Our Promise to You</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto text-center">
            {[
              { icon: BadgeCheck, title: "Genuine Japanese Brands", desc: "Every product is sourced directly from trusted Japanese brands. What you see is exactly what you get — real, verified, authentic." },
              { icon: ShieldCheck, title: "Fair & Honest Pricing", desc: "No markup gimmicks. We keep prices fair and affordable for Bangladesh without compromising on authenticity." },
              { icon: HandHeart, title: "Delivered with Responsibility", desc: "We take full responsibility for delivering authenticity to your doorstep. Your trust is our most important product." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-serif text-xl font-medium">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed />

      {/* Skin Quiz CTA Section */}
      <section className="py-16 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-accent mb-3 font-medium">Personalised For You</p>
          <h2 className="font-serif text-3xl font-medium mb-4">Not sure where to start?</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Take our 2-minute skin quiz and get a personalised Japanese skincare routine built around your skin type, concerns, and lifestyle.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/quiz"
              className="inline-flex items-center justify-center gap-2 bg-accent text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-accent/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              ✨ Take the Skin Quiz
            </a>
            <a
              href="/blog"
              className="inline-flex items-center justify-center gap-2 border border-border bg-background px-8 py-3 rounded-full text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              📖 Read Skincare Tips
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
