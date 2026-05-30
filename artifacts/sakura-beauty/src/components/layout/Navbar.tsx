import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import {
  ShoppingBag, User as UserIcon, Heart, Menu, LogOut,
  Settings, Package, X, Home, Sparkles, Droplets, Wind, Flower2, Sun, Moon, Eye, Star, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetCart, getGetCartQueryKey, useListCategories, getListCategoriesQueryKey, useGetMe } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useGuestCart } from "@/hooks/useGuestCart";
import { SearchAutocomplete } from "@/components/ui/SearchAutocomplete";
import { useTheme } from "next-themes";

const defaultCategoryIcons: Record<string, React.ElementType> = {
  moisturizers: Droplets,
  serums: Sparkles,
  sunscreen: Sun,
  masks: Flower2,
  cleansers: Wind,
  toners: Droplets,
  "eye-care": Eye,
  "lip-care": Heart,
};

function getCategoryIcon(slug: string): React.ElementType {
  return defaultCategoryIcons[slug] ?? Sparkles;
}

export function Navbar() {
  const [location, navigate] = useLocation();
  const searchStr = useSearch();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const { theme, setTheme } = useTheme();
  const guestCart = useGuestCart();

  const { data: cart } = useGetCart({
    query: { enabled: !!user, retry: false, queryKey: getGetCartQueryKey() },
  });

  const { data: dbUser } = useGetMe({
    query: { enabled: !!user, retry: false, queryKey: ["me"] },
  });

  const { data: dbCategories } = useListCategories({
    query: { staleTime: 60_000, queryKey: getListCategoriesQueryKey() },
  });

  const serverCartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartItemCount = user ? serverCartCount : guestCart.totalCount;

  // Admin if DB role is admin (covers both Clerk metadata and DB-only admin)
  const isAdmin = dbUser?.role === "admin" || user?.publicMetadata?.role === "admin";

  const categories = dbCategories ?? [];

  const activeCategory = new URLSearchParams(searchStr).get("category") ?? "";

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location, searchStr]);

  function handleMobileCategory(slug: string) {
    navigate(`/products?category=${slug}`);
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dcfbtdp6r/image/upload/w_300,f_webp,q_auto/v1779847777/IMG_20260527_075552_pu9gio.jpg" alt="EnvyEnhance" className="h-9 w-9 object-cover rounded-full dark:hidden" /><img src="https://res.cloudinary.com/dcfbtdp6r/image/upload/w_300,f_webp,q_auto/v1779847835/IMG_20260527_075602_fwmh3f.jpg" alt="EnvyEnhance" className="h-9 w-9 object-cover rounded-full hidden dark:block" /><span className="font-serif text-xl font-medium tracking-wide">EnvyEnhance</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/products"
                className={`transition-colors hover:text-primary ${location === "/products" && !activeCategory ? "text-primary" : "text-muted-foreground"}`}
              >
                All Products
              </Link>
              {categories.slice(0, 3).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  className={`transition-colors hover:text-primary ${activeCategory === cat.slug ? "text-primary" : "text-muted-foreground"}`}
                >
                  {cat.name}
                </Link>
              ))}
              <Link href="/track" className="transition-colors hover:text-primary text-muted-foreground">
                Track Order
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:block w-56 lg:w-72">
              <SearchAutocomplete />
            </div>

            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block"
              >
                Sign In
              </Link>
            </Show>

            <Show when="signed-in">
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Heart className="h-5 w-5" />
                  <span className="sr-only">Wishlist</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt="Profile" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <UserIcon className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex flex-col space-y-1 leading-none px-2 py-2">
                    <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses[0]?.emailAddress}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/loyalty" className="cursor-pointer flex items-center">
                      <Star className="mr-2 h-4 w-4" />
                      Loyalty Points
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/referral" className="cursor-pointer flex items-center">
                      <Share2 className="mr-2 h-4 w-4" />
                      Refer a Friend
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Show>

            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
              className="hidden sm:flex"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-accent text-accent-foreground text-xs">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </Badge>
                )}
                <span className="sr-only">Cart</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => { setMobileOpen((v) => !v); setAccountExpanded(false); }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-[300px] bg-background shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b shrink-0">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <img src="https://res.cloudinary.com/dcfbtdp6r/image/upload/w_300,f_webp,q_auto/v1779847777/IMG_20260527_075552_pu9gio.jpg" alt="EnvyEnhance" className="h-8 w-auto max-w-[130px] object-contain dark:hidden" />
            <img src="https://res.cloudinary.com/dcfbtdp6r/image/upload/w_300,f_webp,q_auto/v1779847835/IMG_20260527_075602_fwmh3f.jpg" alt="EnvyEnhance" className="h-8 w-auto max-w-[130px] object-contain hidden dark:block" />
          </Link>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle dark mode">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          <div className="py-1">
          <Link href="/" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors ${location === "/" ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}><Home className="h-[21px] w-[21px] shrink-0" />Home</Link>

          <Link href="/products" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors ${location === "/products" && !activeCategory ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}><Sparkles className="h-[21px] w-[21px] shrink-0" />Shop All</Link>

          <Link href="/quiz" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors ${location === "/quiz" ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}><Sparkles className="h-[21px] w-[21px] shrink-0" />Skin Quiz</Link>

          <Link href="/blog" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors ${location === "/blog" ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}><Sparkles className="h-[21px] w-[21px] shrink-0" />Skincare Blog</Link>
          </div>

          <div className="h-px bg-border mx-4 my-1.5" />

          <div className="py-1"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground px-5 py-2.5">Categories</p>

          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                onClick={() => handleMobileCategory(cat.slug)}
                className={`w-full flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors text-left ${isActive ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}
              >
                <Icon className="h-[21px] w-[21px] shrink-0" />
                {cat.name}
              </button>
            );
          })}

          </div>

          <div className="h-px bg-border mx-4 my-1.5" />

          <div className="py-1"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground px-5 py-2.5">More</p>

          <Link href="/track" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium transition-colors ${location === "/track" ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/50"}`}><Package className="h-[21px] w-[21px] shrink-0" />Track Order</Link>
          </div>
        </nav>

        <div className="border-t shrink-0 bg-background">
          <Show when="signed-out">
            <div className="px-4 py-4">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                <Button className="w-full rounded-full" size="sm">Sign In</Button>
              </Link>
            </div>
          </Show>
          <Show when="signed-in">
            {/* User info row with expand toggle */}
            <button
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              onClick={() => setAccountExpanded(v => !v)}
            >
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <UserIcon className="h-5 w-5 text-accent" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="font-semibold text-sm truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.emailAddresses[0]?.emailAddress}</p>
              </div>
              {accountExpanded
                ? <X className="h-4 w-4 text-muted-foreground shrink-0" />
                : <Menu className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </button>

            {/* Always visible: Profile */}
            <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><UserIcon className="h-[21px] w-[21px] shrink-0" />Profile</Link>

            {/* Collapsible items */}
            {accountExpanded && (
              <>
                <Link href="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><Package className="h-[21px] w-[21px] shrink-0" />My Orders</Link>
                <Link href="/loyalty" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><Star className="h-[21px] w-[21px] shrink-0" />Loyalty Points</Link>
                <Link href="/referral" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><Share2 className="h-[21px] w-[21px] shrink-0" />Refer a Friend</Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><Heart className="h-[21px] w-[21px] shrink-0" />Wishlist</Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors"><Settings className="h-[21px] w-[21px] shrink-0" />Admin Dashboard</Link>
                )}
              </>
            )}

            <div className="h-px bg-border mx-4 my-1" />
            <button onClick={() => { signOut(); setMobileOpen(false); }} className="w-full flex items-center gap-3.5 px-5 py-2.5 text-[15px] font-medium text-destructive hover:bg-destructive/5 transition-colors">
              <LogOut className="h-[21px] w-[21px] shrink-0" />Log out
            </button>
          </Show>
        </div>
      </div>
    </>
  );
}
