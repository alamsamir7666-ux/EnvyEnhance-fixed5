// artifacts/api-server/src/routes/skinProfile.ts
import { Router } from "express";
import { db } from "@workspace/db";
import { skinProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// Derive recommendation tags from quiz answers
function deriveRecommendedTags(answers: Record<string, string>): string[] {
  const tags = new Set<string>();
  const { feel, sensitivity, concern, routine } = answers;

  // Skin type tags
  if (feel === "dry") tags.add("dry skin").add("hydration");
  if (feel === "oily") tags.add("oily skin").add("pore control");
  if (feel === "combination") tags.add("combination skin").add("balance");
  if (feel === "normal") tags.add("normal skin");

  // Sensitivity
  if (sensitivity === "sensitive") tags.add("sensitive skin").add("fragrance-free").add("gentle");
  if (sensitivity === "acne") tags.add("acne-prone").add("non-comedogenic");

  // Concern tags (matches products.bestFor values)
  if (concern === "brightening") tags.add("brightening").add("vitamin c").add("niacinamide").add("even tone");
  if (concern === "antiaging") tags.add("anti-aging").add("retinol").add("firming").add("wrinkles");
  if (concern === "acne") tags.add("acne").add("blemishes").add("salicylic acid").add("clarifying");
  if (concern === "hydration") tags.add("hydration").add("moisturizing").add("hyaluronic acid");

  // Routine size
  if (routine === "minimal") tags.add("essential").add("multi-tasking");
  if (routine === "full") tags.add("layering").add("treatment");

  return Array.from(tags);
}

// GET /skin-profile — get current user's profile
router.get("/skin-profile", requireAuth, async (req: any, res) => {
  try {
    const [profile] = await db
      .select()
      .from(skinProfilesTable)
      .where(eq(skinProfilesTable.userId, req.userId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "No skin profile found" });
      return;
    }
    res.json(profile);
  } catch {
    res.status(500).json({ error: "Failed to fetch skin profile" });
  }
});

// POST /skin-profile — save/upsert quiz answers
router.post("/skin-profile", requireAuth, async (req: any, res) => {
  try {
    const { feel, sensitivity, concern, routine } = req.body;

    if (!feel || !sensitivity || !concern || !routine) {
      res.status(400).json({ error: "All quiz answers are required" });
      return;
    }

    const validSkinTypes = ["dry", "oily", "combination", "normal"];
    const validSensitivities = ["sensitive", "normal", "acne"];
    const validConcerns = ["brightening", "antiaging", "acne", "hydration"];
    const validRoutines = ["minimal", "standard", "full", "any"];

    if (!validSkinTypes.includes(feel)) {
      res.status(400).json({ error: "Invalid skin type" });
      return;
    }

    const answers = { feel, sensitivity, concern, routine };
    const recommendedTags = deriveRecommendedTags(answers);

    const skinTypeMap: Record<string, string> = {
      dry: "dry", oily: "oily", combination: "combination", normal: "normal",
    };

    const [profile] = await db
      .insert(skinProfilesTable)
      .values({
        userId: req.userId,
        skinType: skinTypeMap[feel] ?? "normal",
        sensitivity: validSensitivities.includes(sensitivity) ? sensitivity : "normal",
        concern: validConcerns.includes(concern) ? concern : "hydration",
        routinePreference: validRoutines.includes(routine) ? routine : "standard",
        answers,
        recommendedTags,
      })
      .onConflictDoUpdate({
        target: skinProfilesTable.userId,
        set: {
          skinType: skinTypeMap[feel] ?? "normal",
          sensitivity: validSensitivities.includes(sensitivity) ? sensitivity : "normal",
          concern: validConcerns.includes(concern) ? concern : "hydration",
          routinePreference: validRoutines.includes(routine) ? routine : "standard",
          answers,
          recommendedTags,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(profile);
  } catch {
    res.status(500).json({ error: "Failed to save skin profile" });
  }
});

// DELETE /skin-profile — reset quiz
router.delete("/skin-profile", requireAuth, async (req: any, res) => {
  try {
    await db
      .delete(skinProfilesTable)
      .where(eq(skinProfilesTable.userId, req.userId));
    res.json({ message: "Skin profile cleared" });
  } catch {
    res.status(500).json({ error: "Failed to delete skin profile" });
  }
});

export default router;
