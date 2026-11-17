import type { LessonQuizQuestion } from "@/db/schema";

export type DhikrPreset = {
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

export const DHIKR_PRESETS: DhikrPreset[] = [
  {
    id: "subhanallah",
    title: "Subhanallah",
    category: "Tasbih, tahmid & takbir",
    arabicText: "سُبْحَانَ اللَّهِ",
    transliteration: "Subḥānallāh",
    translation: "Glory be to Allah.",
    explanation: "A remembrance declaring Allah's perfection.",
    reference: "Sahih Muslim 597 — among the remembrances reported after prayer.",
    defaultTarget: 33,
  },
  {
    id: "alhamdulillah",
    title: "Alhamdulillah",
    category: "Tasbih, tahmid & takbir",
    arabicText: "الْحَمْدُ لِلَّهِ",
    transliteration: "Al-ḥamdu lillāh",
    translation: "All praise belongs to Allah.",
    explanation: "A concise expression of praise and gratitude to Allah.",
    reference: "Sahih Muslim 597 — among the remembrances reported after prayer.",
    defaultTarget: 33,
  },
  {
    id: "allahu-akbar",
    title: "Allahu Akbar",
    category: "Tasbih, tahmid & takbir",
    arabicText: "اللَّهُ أَكْبَرُ",
    transliteration: "Allāhu akbar",
    translation: "Allah is greater.",
    explanation: "A remembrance affirming Allah's greatness.",
    reference: "Sahih Muslim 597 — among the remembrances reported after prayer.",
    defaultTarget: 33,
  },
  {
    id: "istighfar",
    title: "Istighfar",
    category: "Istighfar",
    arabicText: "أَسْتَغْفِرُ اللّٰهَ",
    transliteration: "Astaghfirullāh",
    translation: "I seek forgiveness from Allah.",
    explanation: "A short supplication seeking Allah's forgiveness.",
    reference: "Sahih Muslim 591 — the Prophet ﷺ sought forgiveness three times after prayer.",
    defaultTarget: 3,
  },
  {
    id: "subhanallahi-wa-bihamdihi",
    title: "Tasbih with praise",
    category: "Dzikir pagi",
    arabicText: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subḥānallāhi wa biḥamdih",
    translation: "Glory and praise be to Allah.",
    explanation: "A remembrance combining glorification and praise.",
    reference: "Sahih al-Bukhari 6405 and Sahih Muslim 2691.",
    defaultTarget: 100,
  },
  {
    id: "dua-yunus",
    title: "Supplication of Yunus",
    category: "Dzikir petang",
    arabicText: "لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    transliteration: "Lā ilāha illā anta, subḥānaka innī kuntu minaẓ-ẓālimīn",
    translation: "There is no deity except You; glory be to You. I was among the wrongdoers.",
    explanation: "The supplication mentioned in the Qur'an in the account of Prophet Yunus.",
    reference: "Qur'an 21:87 (Arabic text and verse reference).",
    defaultTarget: 1,
  },
];

export type LessonSeed = {
  id: string;
  title: string;
  category: string;
  description: string;
  objectives: string[];
  content: string;
  source: string;
  quiz: LessonQuizQuestion[];
};

export const LESSONS: LessonSeed[] = [
  {
    id: "pillars-of-iman",
    title: "The pillars of iman",
    category: "Aqidah",
    description: "A guided overview of the six articles of faith, with primary references.",
    objectives: ["Name the six articles of faith", "Locate the Qur'an and hadith references", "Reflect on faith as learning and practice"],
    content: "## A foundation for learning\n\nThe well-known narration of Jibril describes iman through belief in Allah, His angels, His revealed books, His messengers, the Last Day, and divine decree. This lesson is a study outline, not a substitute for a teacher or a detailed creed text.\n\nRead the passage in its source and note how the Qur'an connects belief with action. Compare your notes with a trusted teacher, especially when studying theological differences.\n\n## Reflection\n\nWhich article of faith would you like to understand more deeply? Write down one question and a reliable source to explore it.",
    source: "Qur'an 2:285; Hadith Jibril, Sahih Muslim 8 (numbering may vary by edition).",
    quiz: [{ question: "Which source contains the well-known Hadith Jibril narration?", options: ["Sahih Muslim", "A modern novel", "A travel diary"], answerIndex: 0, explanation: "The Hadith of Jibril is recorded in Sahih Muslim; numbering may vary by edition." }],
  },
  {
    id: "wudu-study-guide",
    title: "Wudu: a study guide",
    category: "Fiqih",
    description: "Use Qur'an 5:6 as a starting point for learning about purification.",
    objectives: ["Find the Qur'anic passage on wudu", "Identify questions to take to a qualified teacher", "Distinguish a study note from a legal ruling"],
    content: "## Begin with the source\n\nQur'an 5:6 mentions purification before prayer and describes actions related to washing and wiping. Read the full verse in a trusted translation and consult a teacher for practical details.\n\nJurisprudential schools discuss conditions, nullifiers, and cases of difficulty with nuance. This short note does not issue a ruling and should not replace qualified instruction.\n\n## Reflection\n\nKeep a list of questions about your own circumstances, then ask a knowledgeable local scholar or teacher.",
    source: "Qur'an 5:6; consult a qualified teacher for school-specific fiqh and personal rulings.",
    quiz: [{ question: "What is the best use of this introductory wudu note?", options: ["As a starting point for study and questions", "As a personal fatwa for every situation", "As a replacement for the Qur'an"], answerIndex: 0, explanation: "This is an educational outline; personal rulings belong with qualified scholarship." }],
  },
  {
    id: "intention-and-consistency",
    title: "Intention & steady deeds",
    category: "Akhlak",
    description: "Reflect on sincerity and sustainable practice through foundational sources.",
    objectives: ["Explain why intention matters", "Choose a manageable learning habit", "Reflect without judging others"],
    content: "## Sincerity and practice\n\nThe hadith collection of Sahih al-Bukhari opens with the narration about actions and intentions. It is a useful starting point for reflecting on why an action is done, while remembering that inner states are ultimately known to Allah.\n\nBuild habits with humility: choose a small practice you can sustain, review it gently, and avoid turning personal progress into a measure of anyone else's faith.\n\n## Reflection\n\nWhat is one small act of worship or learning you can make more consistent this week?",
    source: "Sahih al-Bukhari 1; Sahih Muslim 1907 (hadith on intentions; numbering varies by edition).",
    quiz: [{ question: "What does reflecting on intention encourage?", options: ["Sincerity and self-accountability", "Judging another person's faith", "Ignoring reliable sources"], answerIndex: 0, explanation: "The lesson frames intention as personal reflection, not as a basis for judging others." }],
  },
  {
    id: "prophetic-biography-sources",
    title: "Reading the seerah with care",
    category: "Sirah Nabawiyah",
    description: "A simple method for approaching the Prophet's biography and its sources.",
    objectives: ["Separate source text from later commentary", "Record citations while reading", "Compare claims with recognized scholarship"],
    content: "## A careful reading method\n\nThe seerah is studied through early reports, hadith literature, and later scholarly works. Editions and reports differ, so keep the author, edition, and page or chapter reference with your notes.\n\nBegin with a recognized seerah text under the guidance of a teacher. When a report is quoted, ask where it is recorded and how scholars have assessed it. A short app summary cannot replace that source work.\n\n## Reflection\n\nChoose one event, then collect the original reference and one scholarly explanation before summarizing it.",
    source: "Ibn Hisham, al-Sirah al-Nabawiyyah (consult a reliable edition and qualified commentary).",
    quiz: [{ question: "What should accompany a seerah note?", options: ["A traceable source and edition", "An unsourced viral quote", "A claim that all reports are identical"], answerIndex: 0, explanation: "Traceable citations help readers assess the report and its context." }],
  },
  {
    id: "hadith-reading-basics",
    title: "A beginner's guide to hadith references",
    category: "Hadith",
    description: "Learn what a collection citation can—and cannot—tell you.",
    objectives: ["Recognize collection and numbering references", "Check an edition and chapter", "Avoid sharing unverified quotations"],
    content: "## Follow the citation\n\nA useful hadith reference names a collection and, where possible, a book or chapter and a numbering system. Numbering can differ between editions and databases, so verify the wording in a reliable text.\n\nA citation alone does not make every quotation suitable for every context. Authentication and interpretation are scholarly disciplines; consult specialist works and teachers rather than drawing a ruling from a short excerpt.\n\n## Reflection\n\nBefore sharing a narration, locate its text in a trusted collection and record which edition you used.",
    source: "Study method: verify references in the named hadith collection and a recognized scholarly edition.",
    quiz: [{ question: "Why can hadith numbering differ?", options: ["Editions and numbering systems vary", "References never need checking", "All databases use one global number"], answerIndex: 0, explanation: "Always include the collection and verify the edition, chapter, or numbering system." }],
  },
  {
    id: "tafsir-study-method",
    title: "An introduction to tafsir study",
    category: "Tafsir",
    description: "Approach Qur'anic explanation through language, context, and scholarship.",
    objectives: ["Distinguish translation from tafsir", "Use a recognized tafsir source", "Record context and questions"],
    content: "## Translation and explanation\n\nA translation conveys meaning in another language; it is not the Arabic Qur'an itself. Tafsir is a scholarly discipline that engages language, context, transmitted explanations, and other methods.\n\nQur'an 16:44 refers to the Messenger explaining what was sent down to people. Study a passage with a trusted translation and recognized tafsir, and ask a qualified teacher when interpretations require context.\n\n## Reflection\n\nChoose a short passage and compare its translation with a recognized tafsir. Note which details are translation and which are commentary.",
    source: "Qur'an 16:44; consult a recognized tafsir with a qualified teacher.",
    quiz: [{ question: "Is a translation identical to the Arabic Qur'an?", options: ["No; it conveys meaning in another language", "Yes, word-for-word in every case", "It replaces all tafsir study"], answerIndex: 0, explanation: "Translations are interpretations of meaning and should be identified as translations." }],
  },
  {
    id: "islamic-history-sourcework",
    title: "Studying Islamic history with sources",
    category: "Islamic history",
    description: "Build a balanced timeline and keep primary sources visible.",
    objectives: ["Record author and date for a historical source", "Notice the difference between report and interpretation", "Compare reputable scholarship"],
    content: "## History as careful reading\n\nHistorical writing draws on reports with different dates, perspectives, and transmission histories. A useful study note distinguishes what a source says from how a later author interprets it.\n\nKeep a timeline, cite the edition, and compare reputable scholarship. This method encourages curiosity without flattening complex events into unsourced social-media summaries.\n\n## Reflection\n\nPick one period and identify a primary source plus a modern scholarly introduction to read alongside it.",
    source: "Method note: use cited primary texts and recognized academic or scholarly editions; verify each claim in context.",
    quiz: [{ question: "What should a careful history note distinguish?", options: ["A source's report and a later interpretation", "Evidence and citations as unnecessary", "Every later summary as a primary source"], answerIndex: 0, explanation: "Separating report from interpretation makes historical reading more transparent." }],
  },
  {
    id: "daily-knowledge-seeking",
    title: "A daily habit of beneficial learning",
    category: "Daily Islamic knowledge",
    description: "Turn a short study session into a traceable, reflective routine.",
    objectives: ["Set one clear learning intention", "Use a named source", "Record one question for follow-up"],
    content: "## A gentle learning rhythm\n\nBegin with a question, choose a reliable source, and make a few notes. Qur'an 20:114 includes the supplication to ask for an increase in knowledge. Keep study grounded by checking references and asking people qualified in the topic.\n\nA short, regular session can include reading, citation checking, and a written reflection. Progress is personal; the goal here is thoughtful learning rather than speed.\n\n## Reflection\n\nWrite one thing you learned, where you found it, and one question for your next study session.",
    source: "Qur'an 20:114 (Arabic text and verse reference).",
    quiz: [{ question: "What makes a learning note useful later?", options: ["A question and a traceable source", "An unattributed screenshot", "A personal opinion presented as a ruling"], answerIndex: 0, explanation: "A source and follow-up question make the note easier to verify and continue." }],
  },
];

export type LibrarySeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  itemType: string;
  content: string;
  source: string;
};

export const LIBRARY_ITEMS: LibrarySeed[] = [
  {
    id: "quiet-start-study-note",
    title: "A quiet start: making room for remembrance",
    description: "An original Noor reflection on building a gentle daily rhythm.",
    category: "Study notes",
    itemType: "Article",
    content: "## Begin where you are\n\nA routine becomes easier to return to when it is simple enough to fit an ordinary day. Choose a moment you already have—before opening a book, after a walk, or at the close of a work session—and make space for a short remembrance or reading.\n\nKeep the practice grounded in sources you trust. When you learn a supplication, note its Arabic text, meaning, and reference. A personal notebook can help you return to questions without needing to memorize everything at once.\n\nConsistency does not require a perfect streak. If a day becomes busy, begin again with kindness and keep learning at a pace that supports sincerity and understanding.\n\n### A small practice\n\nWrite down one intention for tomorrow and one source you would like to study. Keep both practical and specific.",
    source: "Original Noor editorial study note. Reflection only; not a religious ruling.",
  },
  {
    id: "how-to-read-references",
    title: "How to keep useful study references",
    description: "A practical reading guide for Qur'an, hadith, and learning notes.",
    category: "Learning guides",
    itemType: "Guide",
    content: "## A reliable reading notebook\n\nFor every note, record the title of the source, author or translator, edition, and the relevant chapter, surah and ayah, or hadith number. Numbering can differ across editions, so include enough detail for another reader to find the passage.\n\nKeep quotations short and clearly marked. Separate a source's wording from your own reflection, and label translations as translations. When a point touches a personal ruling or specialist question, bring it to a qualified teacher rather than relying on a short note.\n\n### A useful template\n\n- Question\n- Source and edition\n- Reference\n- What the source says\n- My reflection\n- Follow-up question\n\nThis habit makes learning more transparent and easier to revisit.",
    source: "Original Noor editorial guide to study practice. Not a scholarly authentication or fatwa.",
  },
  {
    id: "reading-with-care",
    title: "Reading with care: translation and commentary",
    description: "A short introduction to identifying what kind of text you are reading.",
    category: "Qur'an study",
    itemType: "Article",
    content: "## Name the kind of text\n\nA translation conveys meaning in another language. Commentary adds explanation and context. A personal reflection is different from both. Naming these layers helps readers understand what they are seeing and where to look for more detail.\n\nWhen you read a verse, note the translation edition and consult recognized tafsir for explanation. For hadith, verify the collection and edition and ask qualified scholars about authentication and interpretation.\n\n## Continue thoughtfully\n\nKeep a small list of questions, use sources with clear citations, and resist sharing a quotation whose reference you cannot verify. Careful reading is a practice of respect for both the source and the reader.",
    source: "Original Noor editorial study note; Qur'an 16:44 is suggested as a primary reference for further study.",
  },
  {
    id: "learning-path-foundations",
    title: "Foundations of faith: a reading path",
    description: "A compact, source-led sequence for a first study session.",
    category: "Aqidah",
    itemType: "Reading path",
    content: "## A four-step reading path\n\n1. Read Qur'an 2:285 in a trusted translation and note the themes of belief.\n2. Read the Hadith Jibril narration in Sahih Muslim 8, checking the numbering for your edition.\n3. Write down terms you want to understand more fully.\n4. Take those questions to a qualified teacher or recognized introductory text.\n\nThis is an outline for personal study, not a complete creed curriculum. Traditions may explain details with different terminology, so follow reliable scholarship within your learning context.\n\n### Notes\n\nKeep references visible and distinguish source text from your own summary.",
    source: "Qur'an 2:285; Sahih Muslim 8, Hadith Jibril (numbering varies by edition).",
  },
];

export const LEARNING_CATEGORIES = [
  "All topics",
  "Aqidah",
  "Fiqih",
  "Akhlak",
  "Sirah Nabawiyah",
  "Hadith",
  "Tafsir",
  "Islamic history",
  "Daily Islamic knowledge",
];

export const LIBRARY_CATEGORIES = [
  "All materials",
  "Study notes",
  "Learning guides",
  "Qur'an study",
  "Aqidah",
];
