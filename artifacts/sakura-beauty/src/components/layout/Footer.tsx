import { Link } from "wouter";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

const socials = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61583932632838",
    icon: FacebookIcon,
    color: "hover:bg-blue-600",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/envyenhance?igsh=YzhiemswcWE3a3li",
    icon: InstagramIcon,
    color: "hover:bg-gradient-to-br hover:from-purple-500 hover:to-pink-500",
  },
  {
    label: "TikTok",
    href: "https://vm.tiktok.com/ZS9NEJSpfe1kL-PqAvs/",
    icon: TikTokIcon,
    color: "hover:bg-black",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/01636575741",
    icon: WhatsAppIcon,
    color: "hover:bg-green-500",
  },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="EnvyEnhance" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-serif text-xl font-medium tracking-wide">EnvyEnhance</span>
          </div>
          <p className="text-sm text-background/80 leading-relaxed">
            EnvyEnhance brings you premium Japanese and other countries skincare, haircare, and body essentials. Get authentic products, best quality, and a smooth beauty experience — made to elevate your everyday glow. Discover beauty with us!
          </p>
        </div>

        {/* Support */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Support</h4>
          <ul className="space-y-2 text-sm text-background/80">
            <li><Link href="/track" className="hover:text-accent transition-colors">Track Order</Link></li>
            <li><Link href="/orders" className="hover:text-accent transition-colors">My Orders</Link></li>
            <li><Link href="/wishlist" className="hover:text-accent transition-colors">Wishlist</Link></li>
            <li><Link href="/profile" className="hover:text-accent transition-colors">Account</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Stay Updated</h4>
          <p className="text-sm text-background/80">Subscribe for exclusive deals and new arrivals.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email address"
              className="bg-transparent border border-background/30 rounded-lg px-4 py-2 text-sm w-full focus:outline-none focus:border-accent transition-colors"
              aria-label="Email address for newsletter"
            />
            <button
              type="button"
              onClick={async (e) => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                if (!input?.value || !input.checkValidity()) return;
                const email = input.value.trim();
                try {
                  const r = await fetch("/api/newsletter/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  });
                  if (r.ok) {
                    input.value = "";
                    alert("Thank you for subscribing! 🌸");
                  }
                } catch {}
              }}
              className="bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors rounded-lg whitespace-nowrap"
            >
              Join
            </button>
          </div>
        </div>

        {/* Connect With Us */}
        <div className="space-y-4">
          <h4 className="font-medium text-lg">Connect With Us</h4>
          <p className="text-sm text-background/80">Follow us on social media for daily beauty inspo.</p>
          <div className="flex flex-wrap gap-3">
            {socials.map(({ label, href, icon: Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`h-10 w-10 rounded-full border border-background/25 bg-background/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-transparent text-background/80 hover:text-white ${color}`}
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-background/60">
        <p>&copy; {new Date().getFullYear()} EnvyEnhance. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-background transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-background transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
