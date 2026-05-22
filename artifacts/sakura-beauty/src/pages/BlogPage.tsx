import { useState, useEffect } from "react";
import { updateSEO } from "@/lib/seo";
import { Link } from "wouter";
import { ArrowRight, Clock, Tag, BookOpen, Loader2 } from "lucide-react";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

updateSEO({
  title: "Skincare Tips & Guides",
  description: "Expert skincare tips, Japanese beauty guides, ingredient breakdowns, and routine advice for Bangladesh.",
});

// Fallback static posts used when API has no posts yet
const FALLBACK_POSTS = [
  {
    slug: "japanese-skincare-routine-beginners",
    title: "The Complete Japanese Skincare Routine for Beginners",
    excerpt: "Learn the foundational steps of a Japanese skincare routine — from double cleansing to layering essences — and why it works so well for all skin types.",
    category: "Routine Guide", readTime: "7 min read", publishedAt: "May 2025", featured: true,
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80&fm=webp",
  },
  {
    slug: "vitamin-c-serum-guide",
    title: "Vitamin C Serums: Everything You Need to Know",
    excerpt: "Not all Vitamin C serums are created equal. We break down L-ascorbic acid vs derivatives, concentrations, and how to get the best results without irritation.",
    category: "Ingredients", readTime: "5 min read", publishedAt: "April 2025", featured: false,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&fm=webp",
  },
  {
    slug: "sunscreen-guide-bangladesh",
    title: "Why SPF Is Non-Negotiable in Bangladesh",
    excerpt: "Living in a tropical climate means UV exposure is intense year-round. Here's how to choose the right sunscreen for your skin type and lifestyle.",
    category: "Sun Protection", readTime: "4 min read", publishedAt: "March 2025", featured: false,
    image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=800&q=80&fm=webp",
  },
  {
    slug: "niacinamide-skincare-benefits",
    title: "Niacinamide: The Multi-Tasking Ingredient You Need",
    excerpt: "Niacinamide (Vitamin B3) tackles pores, oil control, hyperpigmentation, and barrier repair — all in one. Here's how to add it to your routine.",
    category: "Ingredients", readTime: "5 min read", publishedAt: "February 2025", featured: false,
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80&fm=webp",
  },
  {
    slug: "hyaluronic-acid-guide",
    title: "Hyaluronic Acid: Hydration Done Right",
    excerpt: "It holds 1000× its weight in water — but are you using it correctly? Learn when, how, and why to apply hyaluronic acid for maximum plumping effect.",
    category: "Ingredients", readTime: "4 min read", publishedAt: "January 2025", featured: false,
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80&fm=webp",
  },
  {
    slug: "retinol-beginners-guide",
    title: "Starting Retinol Without the Purge",
    excerpt: "Retinol is the gold standard for anti-ageing — but used wrong, it causes irritation and purging. This guide walks you through introducing it safely.",
    category: "Anti-Ageing", readTime: "6 min read", publishedAt: "December 2024", featured: false,
    image: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=800&q=80&fm=webp",
  },
];

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  featured: boolean;
  image: string;
}

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog-posts")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
        } else {
          // Fallback to static posts if no admin-created posts exist yet
          setPosts(FALLBACK_POSTS);
        }
      })
      .catch(() => setPosts(FALLBACK_POSTS))
      .finally(() => setLoading(false));
  }, []);

  const featured = posts.find(p => p.featured) ?? posts[0];
  const rest = posts.filter(p => p !== featured);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <PageBreadcrumb crumbs={[{ label: "Blog", icon: <BookOpen className="h-3 w-3" /> }]} className="mb-6" />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <PageBreadcrumb crumbs={[{ label: "Blog", icon: <BookOpen className="h-3 w-3" /> }]} className="mb-6" />
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-widest text-accent mb-2">Knowledge Base</p>
        <h1 className="font-serif text-3xl md:text-4xl font-medium">Skincare Tips & Guides</h1>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Expert advice on Japanese skincare ingredients, routines, and everything in between — written for the Bangladesh climate.
        </p>
      </div>

      {/* Featured post */}
      {featured && (
        <Link href={`/blog/${featured.slug}`}>
          <div className="group relative rounded-3xl overflow-hidden mb-10 cursor-pointer">
            {featured.image && (
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-72 md:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                loading="eager"
              />
            )}
            {!featured.image && (
              <div className="w-full h-72 md:h-96 bg-muted flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-accent text-white text-xs px-3 py-1 rounded-full">{featured.category}</span>
                <span className="text-white/70 text-xs flex items-center gap-1"><Clock className="h-3 w-3" />{featured.readTime}</span>
              </div>
              <h2 className="font-serif text-xl md:text-2xl font-medium mb-2">{featured.title}</h2>
              <p className="text-white/80 text-sm line-clamp-2 max-w-xl">{featured.excerpt}</p>
              <div className="mt-4 flex items-center gap-1.5 text-accent text-sm font-medium">
                Read Article <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="group bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
                {post.image ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xs text-accent flex items-center gap-1">
                      <Tag className="h-3 w-3" />{post.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{post.readTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-2 flex-1">{post.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                  <div className="flex items-center gap-1 text-xs text-accent font-medium">
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 && !loading && (
        <div className="py-24 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
