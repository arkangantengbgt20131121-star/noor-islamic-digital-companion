export type AppUser = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
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

export type DhikrItem = {
  id: string;
  title: string;
  category: string;
  arabicText: string;
  transliteration: string;
  translation: string;
  explanation: string;
  reference: string;
  defaultTarget: number;
};

export type DhikrProgress = {
  dhikrId: string;
  progressDate: string;
  count: number;
  target: number;
};

export type QuranSurah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
};

export type QuranAyah = {
  number: number;
  globalNumber: number;
  arabic: string;
  translation: string;
  audio: string | null;
};

export type QuranData = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahCount: number;
  translationSource: string;
  source: string;
  ayahs: QuranAyah[];
};

export type QuranSearchResult = {
  number: number;
  numberInSurah: number;
  text: string;
  surah: { number: number; name: string; englishName: string; englishNameTranslation: string };
};

export type LessonQuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  category: string;
  description: string;
  objectives: string[];
  content: string;
  source: string;
  quiz: LessonQuizQuestion[];
};

export type LibraryItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: string;
  content: string;
  source: string;
};

export type AppBookmark = {
  type: "quran" | "lesson" | "library";
  contentId: string;
  title: string;
  description: string;
  createdAt: string;
};

export type DashboardSummary = {
  today: string;
  dhikrCount: number;
  dhikrTarget: number;
  quran: { contentId: string; progress: number; position: number; updatedAt: string } | null;
  completedLessons: number;
  startedLessons: number;
  totalDhikrEntries: number;
  recentLibrary: { contentId: string; title: string; progress: number; updatedAt: string }[];
  signedIn: boolean;
};
