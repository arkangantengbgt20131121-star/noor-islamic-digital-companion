export const LOCAL_KEYS = {
  dhikr: "noor-local-dhikr-v1",
  bookmarks: "noor-local-bookmarks-v1",
  lessonProgress: "noor-local-lessons-v1",
  readingProgress: "noor-local-reading-v1",
  preferences: "noor-local-preferences-v1",
};

export type LocalBookmark = {
  type: "quran" | "lesson" | "library";
  contentId: string;
  title: string;
  description?: string;
  createdAt: string;
};

export type LocalLessonProgress = Record<string, boolean>;
