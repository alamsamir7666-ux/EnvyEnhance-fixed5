import { useParams, Link } from "wouter";
import { ArrowLeft, Clock, Tag, Share2, Check, BookOpen, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { updateSEO } from "@/lib/seo";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

const ARTICLES: Record<string, {
  title: string; category: string; readTime: string; date: string;
  image: string; excerpt: string;
  content: Array<{ type: "h2" | "h3" | "p" | "ul" | "tip"; text?: string; items?: string[] }>;
}> = {
  "japanese-skincare-routine-beginners": {
    title: "The Complete Japanese Skincare Routine for Beginners",
    category: "Routine Guide", readTime: "7 min read", date: "May 2025",
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1200&q=80&fm=webp",
    excerpt: "Learn the foundational steps of a Japanese skincare routine and why it works so well for all skin types.",
    content: [
      { type: "p", text: "Japanese skincare is built around one core philosophy: prevention over correction. Rather than treating problems after they appear, the Japanese approach focuses on maintaining healthy skin through consistent, gentle care. The result? Skin that ages gracefully and stays hydrated, clear, and even-toned for decades." },
      { type: "h2", text: "Step 1: Oil Cleanser" },
      { type: "p", text: "Every Japanese routine begins with an oil-based cleanser. Oil dissolves oil - meaning it lifts away sunscreen, makeup, and sebum without stripping your skin's natural moisture barrier. Apply to dry skin, massage for 60 seconds, then emulsify with water and rinse." },
      { type: "h2", text: "Step 2: Foam or Gel Cleanser" },
      { type: "p", text: "The second cleanse removes any remaining water-based impurities - sweat, pollution, and skincare residue. A gentle foaming cleanser or gel cleanser that doesn't leave your skin feeling tight is ideal. Your skin should feel clean, not squeaky." },
      { type: "h2", text: "Step 3: Softening Toner (Lotion)" },
      { type: "p", text: "Unlike Western astringent toners, Japanese lotions (???, kesh?sui) are hydrating essences that prepare skin to absorb subsequent products. Pat a generous amount into skin with your palms - don't wipe. This step dramatically improves how your serums perform." },
      { type: "h2", text: "Step 4: Serum or Essence" },
      { type: "p", text: "Target your specific concerns here - brightening, firming, hydration, or acne control. Layer from thinnest to thickest consistency. Wait 30 seconds between layers for each product to absorb." },
      { type: "h2", text: "Step 5: Moisturiser" },
      { type: "p", text: "Lock everything in with a moisturiser suited to your skin type. Gel creams work brilliantly in Bangladesh's humid climate - they provide hydration without heaviness." },
      { type: "h2", text: "Step 6: SPF (Morning Only)" },
      { type: "p", text: "Sunscreen is the single most important anti-ageing product you can use. Japanese SPF formulas are famously elegant - light, non-greasy, and often with beautiful skin-finish effects. Apply every morning, rain or shine." },
      { type: "tip", text: "? Beginner tip: Start with just steps 2, 4, and 6. Add more steps gradually as your skin adjusts." },
    ],
  },
  "vitamin-c-serum-guide": {
    title: "Vitamin C Serums: Everything You Need to Know",
    category: "Ingredients", readTime: "5 min read", date: "April 2025",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&q=80&fm=webp",
    excerpt: "Not all Vitamin C serums are created equal. We break down forms, concentrations, and how to get the best results.",
    content: [
      { type: "p", text: "Vitamin C is one of the most researched skincare ingredients in existence. It brightens, protects against free radicals, boosts collagen production, and fades hyperpigmentation. But walk into any store and you'll find dozens of forms at wildly different price points - so which one works?" },
      { type: "h2", text: "The Different Forms of Vitamin C" },
      { type: "ul", items: ["L-Ascorbic Acid (LAA) - the most potent and best-studied form. Effective at 10-20%. Unstable and can oxidise (turns orange). Look for dark glass packaging.", "Ascorbyl Glucoside - gentler and more stable. Converts to L-AA on skin. Great for sensitive skin.", "Sodium Ascorbyl Phosphate - stable, excellent for acne-prone skin, also brightening.", "Tetrahexyldecyl Ascorbate - oil-soluble, very stable, penetrates deeply. Often found in luxury formulas."] },
      { type: "h2", text: "What Concentration Should You Use?" },
      { type: "p", text: "For beginners: start at 10%. For experienced users with no sensitivity: 15-20% LAA gives the strongest results. Higher than 20% doesn't increase efficacy and dramatically increases irritation risk." },
      { type: "h2", text: "How to Use It Correctly" },
      { type: "p", text: "Apply Vitamin C serum in the morning after cleansing and toning, before moisturiser and SPF. SPF is essential when using Vitamin C - it makes your sun protection more effective. Do not mix with niacinamide in the same step (apply separately or use a formula designed for both)." },
      { type: "tip", text: "? Store your Vitamin C serum in the fridge and use it within 3 months of opening to prevent oxidation." },
    ],
  },
  "sunscreen-guide-bangladesh": {
    title: "Why SPF Is Non-Negotiable in Bangladesh",
    category: "Sun Protection", readTime: "4 min read", date: "March 2025",
    image: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=1200&q=80&fm=webp",
    excerpt: "Living in a tropical climate means UV exposure is intense year-round. Here's how to choose the right sunscreen.",
    content: [
      { type: "p", text: "Bangladesh sits between the Tropic of Cancer and the equator - one of the highest UV-index zones on the planet. UV radiation damages skin year-round, even on cloudy days (up to 80% of UV rays penetrate clouds). Skipping SPF isn't just an anti-ageing mistake - it significantly raises skin cancer risk." },
      { type: "h2", text: "Chemical vs Physical Sunscreen" },
      { type: "p", text: "Chemical sunscreens (avobenzone, octinoxate) absorb UV rays and convert them to heat. They're lightweight and invisible on skin. Physical sunscreens (zinc oxide, titanium dioxide) sit on top of skin and reflect UV. They're better for sensitive skin but can leave a white cast - though modern formulas minimise this significantly." },
      { type: "h2", text: "What SPF Number Do You Need?" },
      { type: "ul", items: ["SPF 30: blocks ~97% of UVB rays - minimum for daily use indoors/commuting", "SPF 50: blocks ~98% of UVB rays - recommended for Bangladesh's climate", "SPF 50+: maximum protection - use if outdoors for extended periods"] },
      { type: "h2", text: "How Much to Apply" },
      { type: "p", text: "The standard is a teaspoon (2mg/cm?) for your face and neck. Most people apply 20-50% of the required amount, which dramatically reduces protection. A good rule: if your sunscreen lasts more than 2 months, you're probably not applying enough." },
      { type: "tip", text: "? Reapply every 2 hours when outdoors, and always after swimming or sweating - even 'water resistant' formulas need reapplication." },
    ],
  },
  "niacinamide-skincare-benefits": {
    title: "Niacinamide: The Multi-Tasking Ingredient You Need",
    category: "Ingredients", readTime: "5 min read", date: "February 2025",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80&fm=webp",
    excerpt: "Niacinamide (Vitamin B3) tackles pores, oil control, hyperpigmentation, and barrier repair all at once.",
    content: [
      { type: "p", text: "Niacinamide - also called Vitamin B3 or nicotinamide - is arguably the most versatile skincare ingredient available. Unlike many actives that target one concern, niacinamide addresses multiple issues simultaneously, making it suitable for almost every skin type." },
      { type: "h2", text: "What Niacinamide Actually Does" },
      { type: "ul", items: ["Minimises the appearance of enlarged pores", "Controls excess sebum production", "Fades dark spots and hyperpigmentation", "Strengthens the skin barrier (reduces water loss)", "Reduces redness and blotchiness", "Has mild anti-inflammatory properties helpful for acne"] },
      { type: "h2", text: "The Right Concentration" },
      { type: "p", text: "2-5% is effective for most skin concerns. 10% addresses more stubborn hyperpigmentation. Above 10% can occasionally cause flushing in sensitive individuals - not harmful but uncomfortable." },
      { type: "h2", text: "Can You Mix Niacinamide with Other Actives?" },
      { type: "p", text: "Yes, with most. Niacinamide pairs brilliantly with hyaluronic acid, retinol (it reduces retinol irritation), zinc, and SPF. The old advice about not mixing with Vitamin C is largely debunked - modern formulas combine them effectively." },
      { type: "tip", text: "? Niacinamide is gentle enough to use morning and evening. It's an excellent entry-point active for skincare beginners." },
    ],
  },
  "hyaluronic-acid-guide": {
    title: "Hyaluronic Acid: Hydration Done Right",
    category: "Ingredients", readTime: "4 min read", date: "January 2025",
    image: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80&fm=webp",
    excerpt: "It holds 1000? its weight in water - but are you using it correctly?",
    content: [
      { type: "p", text: "Hyaluronic acid (HA) is a molecule naturally found in your skin that holds water and keeps it plump. As we age, HA levels decline - which is why skin loses volume and elasticity. Topical HA can help restore surface hydration, but only if applied correctly." },
      { type: "h2", text: "The Molecular Weight Problem" },
      { type: "p", text: "Different molecular weights of HA do different things. High molecular weight HA sits on the surface and creates a moisture-locking film - great for dry climates. Low molecular weight HA penetrates deeper and plumps from within. The best formulas include multiple molecular weights." },
      { type: "h2", text: "The Critical Mistake Most People Make" },
      { type: "p", text: "Hyaluronic acid is a humectant - it draws moisture FROM somewhere. In a dry environment, with nothing to seal it in, it can actually pull moisture out of your deeper skin layers. Always apply HA to damp skin (splash your face first) and immediately follow with a moisturiser to seal it in." },
      { type: "h2", text: "How to Layer It Correctly" },
      { type: "ul", items: ["Cleanse ? apply toner ? apply HA serum while skin is still slightly damp ? apply moisturiser within 60 seconds", "In very humid conditions (like Bangladesh's monsoon season), HA works particularly well because ambient moisture is available", "At night, layer HA under a richer cream for maximum overnight repair"] },
      { type: "tip", text: "? Look for serums that list both sodium hyaluronate (smaller molecule, penetrates better) and hyaluronic acid for full-spectrum hydration." },
    ],
  },
  "retinol-beginners-guide": {
    title: "Starting Retinol Without the Purge",
    category: "Anti-Ageing", readTime: "6 min read", date: "December 2024",
    image: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=1200&q=80&fm=webp",
    excerpt: "Retinol is the gold standard for anti-ageing - but used wrong, it causes irritation and purging.",
    content: [
      { type: "p", text: "Retinol - a derivative of Vitamin A - has more clinical evidence behind it than almost any other skincare ingredient. It accelerates cell turnover, stimulates collagen, fades dark spots, unclogs pores, and reduces fine lines. But it's also the most commonly misused active in skincare." },
      { type: "h2", text: "Start Low and Slow" },
      { type: "p", text: "Begin with 0.025% or 0.05%. Do not start at 1%. Use it once a week for two weeks, then twice a week, then every other night. Your skin needs time to build tolerance - rushing causes unnecessary irritation that puts people off retinol forever." },
      { type: "h2", text: "The Sandwich Method for Beginners" },
      { type: "ul", items: ["Cleanse and pat dry", "Apply a light moisturiser", "Wait 10 minutes for skin to absorb", "Apply a small amount of retinol (pea-size for full face)", "Apply moisturiser again on top", "This buffers the retinol and dramatically reduces irritation"] },
      { type: "h2", text: "What's Normal vs What's Not" },
      { type: "p", text: "Normal: mild dryness and peeling in weeks 1-4, slight sensitivity, initial breakouts (purging - clears within 6-8 weeks). Not normal: burning that lasts hours, severe redness, oozing, or rash. If the latter occur, stop and consult a dermatologist." },
      { type: "h2", text: "The Golden Rules" },
      { type: "ul", items: ["Only use at night - retinol degrades in sunlight", "Always wear SPF the next morning - retinol increases photosensitivity", "Do not use with AHAs/BHAs in the same step", "Keep away from eye area and corners of nose and mouth"] },
      { type: "tip", text: "? Results take 12 weeks minimum. Most people quit too early. The skin transformation happens gradually - take a monthly photo to track progress." },
    ],
  },
};

export function BlogArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [copied, setCopied] = useState(false);
  const [article, setArticle] = useState<any | null>(undefined as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    // Try API first, fallback to static ARTICLES
    fetch(`/api/blog-posts/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(data => {
        // Normalise API response to match static article shape
        setArticle({
          title: data.title,
          excerpt: data.excerpt,
          category: data.category,
          readTime: data.readTime,
          date: data.publishedAt,
          image: data.image,
          content: Array.isArray(data.content) ? data.content : [],
        });
      })
      .catch(() => {
        // Fall back to static articles
        setArticle(ARTICLES[slug] ?? null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-2xl mb-4">?</p>
        <h2 className="font-serif text-xl font-medium mb-2">Article not found</h2>
        <Link href="/blog"><a className="text-accent hover:underline text-sm">? Back to Blog</a></Link>
      </div>
    );
  }

  updateSEO({
    title: article.title,
    description: article.excerpt,
    image: article.image,
  });

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <article className="min-h-screen">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-5 max-w-3xl">
        <PageBreadcrumb
          crumbs={[
            { label: "Blog", href: "/blog", icon: <BookOpen className="h-3 w-3" /> },
            { label: article.title.length > 40 ? article.title.slice(0, 40) + "?" : article.title, icon: <FileText className="h-3 w-3" /> },
          ]}
        />
      </div>
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden mt-4">
        {article.image ? (
          <img src={article.image} alt={article.title} className="w-full h-full object-cover" loading="eager" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <BookOpen className="h-20 w-20 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-accent text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Tag className="h-3 w-3" />{article.category}
              </span>
              <span className="text-white/70 text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />{article.readTime}
              </span>
              {article.date && <span className="text-white/70 text-xs">{article.date}</span>}
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-white leading-snug">
              {article.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back + Share */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/blog">
            <a className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />Back to Blog
            </a>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <><Check className="h-4 w-4 text-green-500" />Link copied!</> : <><Share2 className="h-4 w-4" />Share</>}
          </button>
        </div>

        {/* Article body */}
        <div className="prose prose-sm max-w-none space-y-5">
          {(article.content ?? []).map((block: any, i: number) => {
            if (block.type === "h2") return <h2 key={i} className="font-serif text-xl font-medium mt-8 mb-3 text-foreground">{block.text}</h2>;
            if (block.type === "h3") return <h3 key={i} className="font-semibold text-base mt-6 mb-2 text-foreground">{block.text}</h3>;
            if (block.type === "p") return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>;
            if (block.type === "ul") return (
              <ul key={i} className="space-y-2 ml-4">
                {(block.items ?? []).map((item: string, j: number) => (
                  <li key={j} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-accent mt-1 flex-shrink-0">?</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
            if (block.type === "tip") return (
              <div key={i} className="bg-accent/8 border border-accent/20 rounded-xl p-4">
                <p className="text-sm text-foreground leading-relaxed">{block.text}</p>
              </div>
            );
            return null;
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-card border rounded-2xl text-center">
          <p className="text-sm text-muted-foreground mb-4">Ready to start your skincare journey?</p>
        </div>
      </div>
    </article>
  );
}
