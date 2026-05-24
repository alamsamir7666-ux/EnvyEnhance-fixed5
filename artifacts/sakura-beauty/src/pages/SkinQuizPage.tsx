import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Sparkles, RefreshCw, Loader2, CheckCircle2, FlaskConical } from "lucide-react";
import { updateSEO } from "@/lib/seo";
import { ProductCard } from "@/components/ui/ProductCard";
import { useUser } from "@clerk/react";
import { apiClient } from "@/lib/apiClient";
import { useListProducts } from "@workspace/api-client-react";
import { PageBreadcrumb } from "@/components/ui/PageBreadcrumb";

updateSEO({
  title: "Skin Type Quiz — Find Your Perfect Routine",
  description: "Take our 2-minute skin type quiz and get personalised Japanese skincare recommendations for your skin.",
});

interface Question {
  id: string;
  text: string;
  options: { label: string; value: string; emoji: string }[];
}

interface SkinProfile {
  skinType: string;
  concern: string;
  sensitivity: string;
  routinePreference: string;
  answers: Record<string, string>;
  recommendedTags: string[];
  updatedAt: string;
}

const QUESTIONS: Question[] = [
  {
    id: "feel",
    text: "How does your skin feel by midday?",
    options: [
      { label: "Tight and dry", value: "dry", emoji: "🌵" },
      { label: "Balanced and comfortable", value: "normal", emoji: "✨" },
      { label: "Oily all over", value: "oily", emoji: "💧" },
      { label: "Oily T-zone, dry cheeks", value: "combination", emoji: "☯️" },
    ],
  },
  {
    id: "sensitivity",
    text: "How does your skin react to new products?",
    options: [
      { label: "Often gets red or irritated", value: "sensitive", emoji: "🌹" },
      { label: "Rarely reacts badly", value: "normal", emoji: "👍" },
      { label: "Sometimes breaks out", value: "acne", emoji: "😮" },
      { label: "Usually fine", value: "normal", emoji: "😊" },
    ],
  },
  {
    id: "concern",
    text: "What's your biggest skin concern?",
    options: [
      { label: "Dullness & uneven tone", value: "brightening", emoji: "🌟" },
      { label: "Wrinkles & fine lines", value: "antiaging", emoji: "⏰" },
      { label: "Acne & pores", value: "acne", emoji: "🎯" },
      { label: "Dryness & hydration", value: "hydration", emoji: "💦" },
    ],
  },
  {
    id: "routine",
    text: "How many steps do you want in your routine?",
    options: [
      { label: "Minimal (2–3 steps)", value: "minimal", emoji: "⚡" },
      { label: "Standard (4–5 steps)", value: "standard", emoji: "🌸" },
      { label: "Full routine (6+ steps)", value: "full", emoji: "💆" },
      { label: "Whatever works best", value: "any", emoji: "🙌" },
    ],
  },
];

const CATEGORY_MAP: Record<string, string> = {
  dry: "moisturizer",
  oily: "cleanser",
  combination: "toner",
  normal: "serum",
  brightening: "serum",
  antiaging: "serum",
  acne: "cleanser",
  hydration: "moisturizer",
};

// ─── Results view ─────────────────────────────────────────────────────────────
function QuizResults({ profile, onRetake }: { profile: SkinProfile; onRetake: () => void }) {
  const [, setLocation] = useLocation();

  const skinTypeLabel: Record<string, string> = {
    dry: "Dry", oily: "Oily", combination: "Combination", normal: "Normal",
  };
  const concernLabel: Record<string, string> = {
    brightening: "serums", antiaging: "serums",
    acne: "cleansers", hydration: "moisturizers",
  };

  const category = CATEGORY_MAP[profile.concern] ?? CATEGORY_MAP[profile.skinType] ?? "serum";

  // Load products by category first (primary concern)
  const { data: primaryData, isLoading } = useListProducts({ category, limit: 4 });

  // Also load with search term for wider coverage
  const { data: secondaryData } = useListProducts({
    search: profile.concern === "brightening" ? "vitamin" :
            profile.concern === "antiaging" ? "retinol" :
            profile.concern === "acne" ? "salicylic" :
            profile.concern === "hydration" ? "hyaluronic" : category,
    limit: 8,
  });

  // Merge and deduplicate — primary products first, supplement with secondary
  const recommendedProducts = (() => {
    const seen = new Set<number>();
    const out: any[] = [];
    for (const p of (primaryData?.products ?? [])) {
      if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
    }
    for (const p of (secondaryData?.products ?? [])) {
      if (!seen.has(p.id) && out.length < 4) { seen.add(p.id); out.push(p); }
    }
    return out.slice(0, 4);
  })();

  const tips: string[] = [];
  const { sensitivity, concern, skinType } = profile;
  if (sensitivity === "sensitive") tips.push("Choose fragrance-free, gentle formulas");
  if (concern === "brightening") tips.push("Look for Vitamin C, Niacinamide, and Alpha Arbutin");
  if (concern === "antiaging") tips.push("Retinol at night + SPF every morning is essential");
  if (concern === "acne") tips.push("Salicylic acid cleanser + Niacinamide serum work best together");
  if (concern === "hydration") tips.push("Layer a hydrating toner before your moisturizer");
  if (skinType === "oily") tips.push("Use a lightweight gel moisturizer — skipping it makes oiliness worse");
  if (skinType === "dry") tips.push("Apply moisturizer while skin is still slightly damp");
  if (tips.length === 0) tips.push("Build your routine gradually — cleanser, moisturizer, SPF");

  return (
    <div className="min-h-screen px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <PageBreadcrumb
          crumbs={[
            { label: "Skin Quiz", href: "/quiz", icon: <FlaskConical className="h-3 w-3" /> },
            { label: "Your Results" },
          ]}
        />

        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <Sparkles className="h-8 w-8 text-accent" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-accent mb-1 font-medium">Your Profile</p>
            <h1 className="font-serif text-3xl font-medium">Your Skin Profile</h1>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Skin Type", value: skinTypeLabel[skinType] ?? skinType },
            { label: "Main Concern", value: concernLabel[concern] ?? concern },
            { label: "Sensitivity", value: sensitivity === "sensitive" ? "Sensitive" : sensitivity === "acne" ? "Acne-Prone" : "Normal" },
            { label: "Routine", value: profile.routinePreference.charAt(0).toUpperCase() + profile.routinePreference.slice(1) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="font-semibold text-sm">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 border rounded-2xl p-6 space-y-3">
          <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Personalised Tips</h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-accent mt-0.5 shrink-0">✦</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-accent mb-1 font-medium">Curated For You</p>
              <h2 className="font-serif text-2xl font-medium">Your Recommended Routine</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {skinTypeLabel[skinType] ?? skinType} skin · {concernLabel[concern] ?? concern}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setLocation(`/products?category=${category}`)}>
              See all →
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recommendedProducts.length === 0 ? (
            <div className="py-10 text-center border rounded-2xl">
              <p className="text-muted-foreground text-sm">No products found for your profile yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon as we add more products!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 pt-4">
          <Button className="rounded-full px-8" onClick={() => setLocation(`/products?category=${category}`)}>
            Shop All {category.charAt(0).toUpperCase() + category.slice(1)}s
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <button onClick={onRetake} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main quiz ────────────────────────────────────────────────────────────────
export function SkinQuizPage() {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedProfile, setSavedProfile] = useState<SkinProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    apiClient.get<SkinProfile>("/api/skin-profile")
      .then(({ data }) => { if (data) setSavedProfile(data); })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const question = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;

  async function handleAnswer(value: string) {
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      if (user) {
        setSaving(true);
        try {
          const { data: profile } = await apiClient.post<SkinProfile>("/api/skin-profile", newAnswers);
          setSavedProfile(profile);
          setShowQuiz(false);
          return;
        } catch {}
        setSaving(false);
      }
      setSavedProfile({
        skinType: newAnswers.feel,
        concern: newAnswers.concern,
        sensitivity: newAnswers.sensitivity,
        routinePreference: newAnswers.routine,
        answers: newAnswers,
        recommendedTags: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleRetake() {
    if (user) await apiClient.delete("/api/skin-profile").catch(() => {});
    setSavedProfile(null);
    setAnswers({});
    setStep(0);
    setShowQuiz(true);
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (savedProfile && !showQuiz) {
    return <QuizResults profile={savedProfile} onRetake={handleRetake} />;
  }

  if (saving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground text-sm">Saving your skin profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full space-y-6">
        <PageBreadcrumb crumbs={[{ label: "Skin Quiz", icon: <FlaskConical className="h-3 w-3" /> }]} />

        {user && savedProfile && showQuiz && (
          <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            You already have a saved profile. Retaking will replace it.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Question {step + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Skin Quiz</p>
          <h2 className="font-serif text-xl font-medium">{question.text}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => (
            <button
              key={`${opt.value}-${opt.label}`}
              onClick={() => handleAnswer(opt.value)}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-border hover:border-accent hover:bg-accent/5 transition-all duration-200 text-center"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{opt.emoji}</span>
              <span className="text-sm font-medium leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>

        {step > 0 && (
          <div className="flex justify-center">
            <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
