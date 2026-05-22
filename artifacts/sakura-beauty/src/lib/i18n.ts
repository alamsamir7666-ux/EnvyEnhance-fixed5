/**
 * Simple i18n for Bengali/English toggle.
 * Keys are English; Bengali translations override them.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { createElement as h } from "react";

type Lang = "en" | "bn";

const bn: Record<string, string> = {
  // Navigation
  "Home": "হোম",
  "Products": "পণ্য",
  "Cart": "কার্ট",
  "Wishlist": "উইশলিস্ট",
  "Orders": "অর্ডার",
  "Profile": "প্রোফাইল",
  "Sign In": "সাইন ইন",
  "Sign Up": "নিবন্ধন",
  // Product page
  "Add to Bag": "ব্যাগে যোগ করুন",
  "Out of Stock": "স্টক নেই",
  "Added to Bag": "ব্যাগে যোগ হয়েছে",
  "Add to Wishlist": "উইশলিস্টে যোগ করুন",
  "Remove from Wishlist": "উইশলিস্ট থেকে সরান",
  // Checkout
  "Place Order": "অর্ডার দিন",
  "Order Summary": "অর্ডার সারসংক্ষেপ",
  "Shipping Address": "শিপিং ঠিকানা",
  "Payment Method": "পেমেন্ট পদ্ধতি",
  "Cash on Delivery": "ক্যাশ অন ডেলিভারি",
  "Subtotal": "সাবটোটাল",
  "Delivery": "ডেলিভারি",
  "Free": "বিনামূল্যে",
  "Total": "মোট",
  // Order status
  "pending": "অপেক্ষমান",
  "confirmed": "নিশ্চিত",
  "processing": "প্রক্রিয়াধীন",
  "shipped": "শিপড",
  "delivered": "ডেলিভার হয়েছে",
  "cancelled": "বাতিল",
  // General
  "Search": "অনুসন্ধান",
  "Filter": "ফিল্টার",
  "Sort": "সাজান",
  "Category": "ক্যাটাগরি",
  "Price": "মূল্য",
  "Rating": "রেটিং",
  "Reviews": "রিভিউ",
  "Track Order": "অর্ডার ট্র্যাক করুন",
  "View All": "সব দেখুন",
  "Back": "ফিরে যান",
  "Save": "সংরক্ষণ করুন",
  "Cancel": "বাতিল করুন",
  "Delete": "মুছুন",
  "Edit": "সম্পাদনা করুন",
  "Submit": "জমা দিন",
  "Loading...": "লোড হচ্ছে...",
  "Error": "ত্রুটি",
  "Success": "সফল",
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const stored = (typeof localStorage !== "undefined" ? localStorage.getItem("ee_lang") : null) as Lang | null;
  const [lang, setLangState] = useState<Lang>(stored ?? "en");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("ee_lang", l);
  }, []);

  const t = useCallback((key: string) => {
    if (lang === "bn") return bn[key] ?? key;
    return key;
  }, [lang]);

  return h(I18nContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}
