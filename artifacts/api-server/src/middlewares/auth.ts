import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUser?: typeof usersTable.$inferSelect;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = clerkId;

  // Clerk JWT session claims — try multiple known claim key formats
  const claims = (auth as any)?.sessionClaims ?? {};
  const claimedEmail: string | null =
    claims.email ?? claims.email_address ?? claims.primary_email_address ?? null;
  const claimedFirst: string | null =
    claims.first_name ?? claims.firstName ?? null;
  const claimedLast: string | null =
    claims.last_name ?? claims.lastName ?? null;

  let user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1)
    .then((r) => r[0]);

  // Role from Clerk publicMetadata takes precedence (set via Clerk dashboard or API)
  const clerkRole: string | null = (auth as any)?.sessionClaims?.metadata?.role
    ?? (auth as any)?.sessionClaims?.public_metadata?.role
    ?? null;

  // Emails that always get admin role regardless of Clerk metadata
  const ADMIN_EMAILS = ["alammahatab717@gmail.com"];
  const effectiveRole = clerkRole
    ?? (claimedEmail && ADMIN_EMAILS.includes(claimedEmail) ? "admin" : null);

  if (!user) {
    // First time seeing this user — create with whatever we have from claims
    const email = claimedEmail ?? `${clerkId}@clerk.user`;
    const isAdminEmail = ADMIN_EMAILS.includes(email);
    const [inserted] = await db
      .insert(usersTable)
      .values({
        clerkId,
        email,
        firstName: claimedFirst,
        lastName: claimedLast,
        role: effectiveRole ?? (isAdminEmail ? "admin" : "user"),
      })
      .returning();
    user = inserted;
  } else {
    // Update name/email/role from claims if the DB record has gaps
    const isAdminEmail = claimedEmail ? ADMIN_EMAILS.includes(claimedEmail) : ADMIN_EMAILS.includes(user.email);
    const resolvedRole = effectiveRole ?? (isAdminEmail ? "admin" : null);
    const needsUpdate =
      (claimedFirst && user.firstName !== claimedFirst) ||
      (claimedLast && user.lastName !== claimedLast) ||
      (claimedEmail && user.email !== claimedEmail) ||
      (resolvedRole && user.role !== resolvedRole);

    if (needsUpdate) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (claimedFirst) updates.firstName = claimedFirst;
      if (claimedLast) updates.lastName = claimedLast;
      if (claimedEmail) updates.email = claimedEmail;
      if (resolvedRole) updates.role = resolvedRole;

      const [updated] = await db
        .update(usersTable)
        .set(updates)
        .where(eq(usersTable.clerkId, clerkId))
        .returning();
      user = updated;
    }
  }

  if (user.isBlocked) {
    res.status(403).json({ error: "Account is blocked" });
    return;
  }

  req.dbUser = user;
  next();
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await new Promise<void>((resolve) => requireAuth(req, res, () => resolve()));
  if (res.headersSent) return;
  if (req.dbUser?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
