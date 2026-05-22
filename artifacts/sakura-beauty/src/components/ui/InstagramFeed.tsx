import { useState } from "react";
import { Instagram, ExternalLink } from "lucide-react";

/**
 * Instagram Feed Component
 *
 * PRODUCTION SETUP:
 * 1. Go to developers.facebook.com → Create App → Add Instagram Basic Display product
 * 2. Get a long-lived access token for your Instagram account
 * 3. Add VITE_INSTAGRAM_TOKEN=... to .env
 * 4. Use the Instagram Basic Display API to fetch real posts:
 *    GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token={token}
 *
 * The component below shows curated placeholder posts that match the EnvyEnhance aesthetic.
 * Replace PLACEHOLDER_POSTS with real API data when the token is available.
 */

const INSTAGRAM_HANDLE = "@envyenhance";
const INSTAGRAM_URL = "https://instagram.com/envyenhance";

// Curated placeholder images — replace with real Instagram API data
const PLACEHOLDER_POSTS = [
  {
    id: "1", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "Morning skincare ritual 🌸 Our Vitamin C Serum brightens and protects all day. #JapaneseSkincare",
  },
  {
    id: "2", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "Hydration is everything ✨ New Hyaluronic Acid Moisturiser now in stock. #SkincareRoutine",
  },
  {
    id: "3", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "Clean ingredients, visible results. Our niacinamide serum is a bestseller for a reason. #CleanBeauty",
  },
  {
    id: "4", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "SPF every single day ☀️ Your future self will thank you. #SunscreenEveryDay #EnvyEnhance",
  },
  {
    id: "5", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "Unboxing day 📦 So excited to share our newest Japanese imports. Link in bio! #Haul",
  },
  {
    id: "6", type: "IMAGE",
    url: "https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=400&q=80&fm=webp",
    permalink: INSTAGRAM_URL,
    caption: "Night routine essentials 🌙 Retinol + rich moisturiser = waking up with better skin. #NightRoutine",
  },
];

export function InstagramFeed() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
              <Instagram className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium">Follow Our Journey</h2>
              <p className="text-xs text-muted-foreground">{INSTAGRAM_HANDLE} on Instagram</p>
            </div>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-accent hover:underline font-medium"
            aria-label="Follow EnvyEnhance on Instagram"
          >
            Follow <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-2">
          {PLACEHOLDER_POSTS.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-xl overflow-hidden group block"
              onMouseEnter={() => setHoveredId(post.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={`Instagram post: ${post.caption.slice(0, 50)}`}
            >
              <img
                src={post.url}
                alt={post.caption.slice(0, 80)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
              {/* Overlay on hover */}
              <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${hoveredId === post.id ? "opacity-100" : "opacity-0"}`}>
                <div className="text-center px-2">
                  <Instagram className="h-5 w-5 text-white mx-auto mb-1" />
                  <p className="text-white text-xs leading-tight line-clamp-3">{post.caption}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-5">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Instagram className="h-4 w-4" />
            View all posts on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
