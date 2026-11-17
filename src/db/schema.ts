import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  avatarUrl: text("avatar_url"),
  preferredLanguage: varchar("preferred_language", { length: 8 }).default("id").notNull(),
  theme: varchar("theme", { length: 12 }).default("light").notNull(),
  arabicFontSize: integer("arabic_font_size").default(34).notNull(),
  showTranslation: boolean("show_translation").default(true).notNull(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(false).notNull(),
  vibrationEnabled: boolean("vibration_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("email_verification_token_hash_unique").on(table.tokenHash)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("password_reset_token_hash_unique").on(table.tokenHash)],
);

export const dhikrLibrary = pgTable(
  "dhikr_library",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    arabicText: text("arabic_text").default("").notNull(),
    transliteration: text("transliteration").default("").notNull(),
    translation: text("translation").notNull(),
    explanation: text("explanation").default("").notNull(),
    reference: text("reference").default("Personal entry").notNull(),
    defaultTarget: integer("default_target").default(33).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dhikr_library_owner_id_idx").on(table.ownerId),
    check("dhikr_library_target_positive", sql`${table.defaultTarget} > 0`),
    pgPolicy("dhikr_library_owner_policy", {
      for: "all",
      using: sql`${table.ownerId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
      withCheck: sql`${table.ownerId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
    }),
  ],
).enableRLS();

export const dhikrDailyProgress = pgTable(
  "dhikr_daily_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dhikrId: varchar("dhikr_id", { length: 80 }).notNull(),
    progressDate: date("progress_date").notNull(),
    count: integer("count").default(0).notNull(),
    target: integer("target").default(33).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.dhikrId, table.progressDate] }),
    index("dhikr_daily_progress_user_date_idx").on(table.userId, table.progressDate),
    check("dhikr_daily_count_nonnegative", sql`${table.count} >= 0`),
    check("dhikr_daily_target_positive", sql`${table.target} > 0`),
    pgPolicy("dhikr_daily_progress_owner_policy", {
      for: "all",
      using: sql`${table.userId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
      withCheck: sql`${table.userId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
    }),
  ],
).enableRLS();

export const dhikrSessions = pgTable(
  "dhikr_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dhikrId: varchar("dhikr_id", { length: 80 }).notNull(),
    count: integer("count").notNull(),
    target: integer("target").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dhikr_sessions_user_created_idx").on(table.userId, table.createdAt),
    check("dhikr_session_count_nonnegative", sql`${table.count} >= 0`),
    check("dhikr_session_target_positive", sql`${table.target} > 0`),
    pgPolicy("dhikr_sessions_owner_policy", {
      for: "all",
      using: sql`${table.userId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
      withCheck: sql`${table.userId} = nullif(current_setting('noor.user_id', true), '')::uuid`,
    }),
  ],
).enableRLS();

export const quranBookmarks = pgTable(
  "quran_bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surahNumber: integer("surah_number").notNull(),
    ayahNumber: integer("ayah_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("quran_bookmarks_user_ayah_unique").on(
      table.userId,
      table.surahNumber,
      table.ayahNumber,
    ),
    index("quran_bookmarks_user_idx").on(table.userId),
  ],
);

export const readingProgress = pgTable(
  "reading_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: varchar("content_type", { length: 24 }).notNull(),
    contentId: varchar("content_id", { length: 120 }).notNull(),
    progress: integer("progress").default(0).notNull(),
    position: integer("position").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reading_progress_user_content_unique").on(
      table.userId,
      table.contentType,
      table.contentId,
    ),
    index("reading_progress_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export type LessonQuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export const learningLessons = pgTable(
  "learning_lessons",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    description: text("description").notNull(),
    objectives: jsonb("objectives").$type<string[]>().notNull(),
    content: text("content").notNull(),
    source: text("source").notNull(),
    quiz: jsonb("quiz").$type<LessonQuizQuestion[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("learning_lessons_category_idx").on(table.category)],
);

export const learningProgress = pgTable(
  "learning_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: varchar("lesson_id", { length: 80 })
      .notNull()
      .references(() => learningLessons.id, { onDelete: "cascade" }),
    completionStatus: varchar("completion_status", { length: 24 }).default("in_progress").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("learning_progress_user_lesson_unique").on(table.userId, table.lessonId),
    index("learning_progress_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const libraryItems = pgTable(
  "library_items",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    itemType: varchar("item_type", { length: 32 }).notNull(),
    content: text("content").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("library_items_category_idx").on(table.category)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentType: varchar("content_type", { length: 24 }).notNull(),
    contentId: varchar("content_id", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_content_unique").on(table.userId, table.contentType, table.contentId),
    index("bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const dashboardMetrics = pgTable("dashboard_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  metricDate: date("metric_date").notNull(),
  quranAyahsRead: integer("quran_ayahs_read").default(0).notNull(),
  learningMinutes: integer("learning_minutes").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dashboard_metrics_user_date_unique").on(table.userId, table.metricDate),
]);

