import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { profiles, sessions, users } from "@/db/schema";

const scrypt = promisify(scryptCallback);
type UserTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const SESSION_COOKIE = "noor_session";

export async function withUserContext<T>(userId: string, operation: (transaction: UserTransaction) => Promise<T>): Promise<T> {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select set_config('noor.user_id', ${userId}, true)`);
    return operation(transaction);
  });
}
const SESSION_DAYS = 30;

export type PublicUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    preferredLanguage: string;
    theme: string;
    arabicFontSize: number;
    showTranslation: boolean;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, expectedString] = stored.split(":");
  if (!salt || !expectedString) return false;
  const expected = Buffer.from(expectedString, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export async function issueSession(userId: string) {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      preferredLanguage: profiles.preferredLanguage,
      theme: profiles.theme,
      arabicFontSize: profiles.arabicFontSize,
      showTranslation: profiles.showTranslation,
      notificationsEnabled: profiles.notificationsEnabled,
      soundEnabled: profiles.soundEnabled,
      vibrationEnabled: profiles.vibrationEnabled,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(profiles, eq(profiles.id, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    createdAt: row.createdAt,
    profile: {
      fullName: row.fullName,
      avatarUrl: row.avatarUrl,
      preferredLanguage: row.preferredLanguage,
      theme: row.theme,
      arabicFontSize: row.arabicFontSize,
      showTranslation: row.showTranslation,
      notificationsEnabled: row.notificationsEnabled,
      soundEnabled: row.soundEnabled,
      vibrationEnabled: row.vibrationEnabled,
    },
  };
}

export function isValidEmail(email: string) {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getRequestOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function sendAuthEmail(email: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [email], subject, text }),
  });
  if (!response.ok) {
    console.error("Auth email delivery failed", response.status);
    return false;
  }
  return true;
}
