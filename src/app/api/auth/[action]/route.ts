import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  bookmarks,
  dhikrDailyProgress,
  dhikrSessions,
  emailVerificationTokens,
  learningProgress,
  passwordResetTokens,
  profiles,
  quranBookmarks,
  readingProgress,
  sessions,
  users,
} from "@/db/schema";
import {
  clearSessionCookie,
  createOpaqueToken,
  getCurrentUser,
  getRequestOrigin,
  hashPassword,
  hashToken,
  isValidEmail,
  issueSession,
  sendAuthEmail,
  verifyPassword,
} from "@/lib/server-auth";

type Context = { params: Promise<{ action: string }> };
type Body = Record<string, unknown>;

async function readBody(request: Request): Promise<Body> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Body) : {};
  } catch {
    return {};
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function serverError(error: unknown) {
  console.error("Authentication request failed", error);
  return NextResponse.json({ error: "We could not complete that request. Please try again." }, { status: 500 });
}

export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  try {
    if (action === "me") {
      return NextResponse.json({ user: await getCurrentUser() });
    }

    if (action === "verify") {
      const token = new URL(request.url).searchParams.get("token") ?? "";
      if (!token) return NextResponse.redirect(new URL("/?verified=invalid", getRequestOrigin(request)));
      const [record] = await db
        .select({ id: emailVerificationTokens.id, userId: emailVerificationTokens.userId })
        .from(emailVerificationTokens)
        .where(and(eq(emailVerificationTokens.tokenHash, hashToken(token)), gt(emailVerificationTokens.expiresAt, new Date())))
        .limit(1);
      if (!record) return NextResponse.redirect(new URL("/?verified=invalid", getRequestOrigin(request)));
      await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, record.userId));
      await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, record.userId));
      return NextResponse.redirect(new URL("/?verified=success", getRequestOrigin(request)));
    }

    if (action === "export") {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Please sign in to export your data." }, { status: 401 });
      const [dhikr, sessionsData, ayahBookmarks, reading, learning, saved] = await Promise.all([
        db.select().from(dhikrDailyProgress).where(eq(dhikrDailyProgress.userId, user.id)),
        db.select().from(dhikrSessions).where(eq(dhikrSessions.userId, user.id)),
        db.select().from(quranBookmarks).where(eq(quranBookmarks.userId, user.id)),
        db.select().from(readingProgress).where(eq(readingProgress.userId, user.id)),
        db.select().from(learningProgress).where(eq(learningProgress.userId, user.id)),
        db.select().from(bookmarks).where(eq(bookmarks.userId, user.id)),
      ]);
      return NextResponse.json({ exportedAt: new Date().toISOString(), user, dhikr, dhikrSessions: sessionsData, quranBookmarks: ayahBookmarks, readingProgress: reading, learningProgress: learning, bookmarks: saved });
    }

    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request, context: Context) {
  const { action } = await context.params;
  const body = await readBody(request);

  try {
    if (action === "register") {
      const fullName = text(body.fullName).slice(0, 120);
      const email = text(body.email).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (fullName.length < 2) return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
      if (!isValidEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });

      const passwordHash = await hashPassword(password);
      let user: typeof users.$inferSelect;
      try {
        user = await db.transaction(async (tx) => {
          const [created] = await tx.insert(users).values({ email, passwordHash }).returning();
          await tx.insert(profiles).values({ id: created.id, fullName });
          return created;
        });
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
        throw error;
      }

      const verificationToken = createOpaqueToken();
      await db.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      const verificationUrl = `${getRequestOrigin(request)}/api/auth/verify?token=${encodeURIComponent(verificationToken)}`;
      const emailSent = await sendAuthEmail(email, "Verify your Noor account", `Welcome to Noor, ${fullName}. Verify your email within 24 hours: ${verificationUrl}`);
      await issueSession(user.id);
      return NextResponse.json({
        user: await getCurrentUser(),
        message: emailSent
          ? "Your account is ready. A verification link has been sent to your email."
          : "Your account is ready. Email delivery is not configured, so your account remains unverified for now.",
        verificationUrl: !emailSent && process.env.NODE_ENV !== "production" ? verificationUrl : undefined,
      }, { status: 201 });
    }

    if (action === "login") {
      const email = text(body.email).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (!isValidEmail(email) || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
      }
      await issueSession(user.id);
      return NextResponse.json({ user: await getCurrentUser(), message: "Welcome back." });
    }

    if (action === "logout") {
      const current = await getCurrentUser();
      if (current) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const token = cookieStore.get("noor_session")?.value;
        if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
      }
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    if (action === "forgot-password") {
      const email = text(body.email).toLowerCase();
      if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
      let resetUrl: string | undefined;
      if (user) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        const token = createOpaqueToken();
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        resetUrl = `${getRequestOrigin(request)}/?reset=${encodeURIComponent(token)}`;
        const sent = await sendAuthEmail(user.email, "Reset your Noor password", `Use this link within one hour to choose a new password: ${resetUrl}`);
        if (sent) resetUrl = undefined;
      }
      return NextResponse.json({
        message: "If an account exists for that email, password reset instructions are ready.",
        resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
      });
    }

    if (action === "reset-password") {
      const token = text(body.token);
      const password = typeof body.password === "string" ? body.password : "";
      if (!token) return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
      if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
      const [reset] = await db
        .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
        .from(passwordResetTokens)
        .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), gt(passwordResetTokens.expiresAt, new Date())))
        .limit(1);
      if (!reset) return NextResponse.json({ error: "The reset link is invalid or expired." }, { status: 400 });
      await db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, reset.userId));
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, reset.userId));
      await db.delete(sessions).where(eq(sessions.userId, reset.userId));
      return NextResponse.json({ message: "Your password has been updated. You can now sign in." });
    }

    return NextResponse.json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const { action } = await context.params;
  if (action !== "me") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to update your profile." }, { status: 401 });
  const body = await readBody(request);
  const patch: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.fullName === "string") {
    const name = body.fullName.trim().slice(0, 120);
    if (name.length < 2) return NextResponse.json({ error: "Name must have at least 2 characters." }, { status: 400 });
    patch.fullName = name;
  }
  if (body.avatarUrl === null) patch.avatarUrl = null;
  if (typeof body.avatarUrl === "string") {
    const value = body.avatarUrl.trim();
    if (value.length > 2048) return NextResponse.json({ error: "Profile image URL is too long." }, { status: 400 });
    if (value) {
      try {
        if (new URL(value).protocol !== "https:") return NextResponse.json({ error: "Profile image URLs must use HTTPS." }, { status: 400 });
      } catch {
        return NextResponse.json({ error: "Enter a valid profile image URL." }, { status: 400 });
      }
    }
    patch.avatarUrl = value || null;
  }
  if (body.preferredLanguage === "id" || body.preferredLanguage === "en") patch.preferredLanguage = body.preferredLanguage;
  if (body.theme === "light" || body.theme === "dark") patch.theme = body.theme;
  if (typeof body.arabicFontSize === "number") patch.arabicFontSize = Math.min(48, Math.max(24, Math.round(body.arabicFontSize)));
  if (typeof body.showTranslation === "boolean") patch.showTranslation = body.showTranslation;
  if (typeof body.notificationsEnabled === "boolean") patch.notificationsEnabled = body.notificationsEnabled;
  if (typeof body.soundEnabled === "boolean") patch.soundEnabled = body.soundEnabled;
  if (typeof body.vibrationEnabled === "boolean") patch.vibrationEnabled = body.vibrationEnabled;
  try {
    await db.update(profiles).set(patch).where(eq(profiles.id, user.id));
    return NextResponse.json({ user: await getCurrentUser() });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const { action } = await context.params;
  if (action !== "me") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to delete your account." }, { status: 401 });
  const body = await readBody(request);
  const password = typeof body.password === "string" ? body.password : "";
  try {
    const [record] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!record || !(await verifyPassword(password, record.passwordHash))) {
      return NextResponse.json({ error: "Your password is not correct." }, { status: 403 });
    }
    await db.delete(users).where(eq(users.id, user.id));
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
