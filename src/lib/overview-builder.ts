import type { SchoolMessage, OverviewData, OverviewItem, AIClassification } from "@/types";
import { extractInfo, stripHtml } from "./message-parser";

const DUTCH_MONTHS: Record<string, number> = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mrt: 2, maart: 2,
  apr: 3, april: 3,
  mei: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  aug: 7, augustus: 7,
  sep: 8, september: 8,
  okt: 9, oktober: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseDate(str: string): Date | null {
  if (!str) return null;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    const month = parseInt(dmy[2]) - 1;
    const day = parseInt(dmy[1]);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(parseInt(dmy[3]), month, day);
    }
  }

  // "12 april 2026" / "12 apr" (Dutch)
  const dutchLong = str.match(/(\d{1,2})\s+([a-z]+)\s*(\d{4})?/i);
  if (dutchLong) {
    const month = DUTCH_MONTHS[dutchLong[2].toLowerCase()];
    if (month !== undefined) {
      const year = dutchLong[3] ? parseInt(dutchLong[3]) : new Date().getFullYear();
      return new Date(year, month, parseInt(dutchLong[1]));
    }
  }

  // RFC 2822 or ISO
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Social Schools emails are notification stubs — the email send date IS the relevant date.
 * Body dates without explicit years are unreliable (default to current year → wrong).
 * Always use the email Date header as the source of truth.
 */
function getMessageDate(msg: SchoolMessage): { formatted: string | null; parsed: Date | null } {
  const d = parseDate(msg.date);
  if (d && d.getFullYear() > 2000) return { formatted: formatDate(d), parsed: d };
  return { formatted: null, parsed: null };
}

function sortByDate(items: OverviewItem[], newestFirst = false): OverviewItem[] {
  return items.sort((a, b) => {
    const da = a.date ? parseDate(a.date) : null;
    const db = b.date ? parseDate(b.date) : null;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return newestFirst ? db.getTime() - da.getTime() : da.getTime() - db.getTime();
  });
}

function isGarbageItem(s: string): boolean {
  return /@media|{table|max-width|px}|font-|class=|style=/i.test(s) || s.length > 120;
}

// Class filter: only hide messages clearly for a DIFFERENT class.
const CLASS_PATTERN = /\b(groep|klas)?\s*(\d{1,2}\s*[a-z])\b/gi;
function isRelevantToClass(text: string, subject: string, childClass: string): boolean {
  if (!childClass) return true;
  const c = childClass.replace(/\s+/g, "");
  const combined = `${subject} ${text}`.toLowerCase();
  const matches = Array.from(combined.matchAll(CLASS_PATTERN));
  if (matches.length === 0) return true; // school-wide
  return matches.some((m) => (m[2] || "").replace(/\s+/g, "") === c);
}

const EVENT_KEYWORDS =
  /\b(excursie|uitje|sportdag|ouderavond|schoolreis|voorstelling|concert|museum|uitstapje|feest|viering|open dag|informatieavond|theaterbezoek|bibliotheek|cpc|ontbijt|speelgoedmiddag|kerst|sint|pietengym|lentekriebels|studiedag|inloopmoment|inloopavond)\b/i;

const SCHOOL_NEWS_KEYWORDS =
  /\b(nutsinfo|nieuwsbrief|weekbrief|bezuiniging|veiligheid|incident|vakantie|studiedag|hoofdluis|gevonden voorwerpen|werkdruk|routines|beleid)\b/i;

export function buildOverview(
  messages: SchoolMessage[],
  childName: string,
  childClass: string
): OverviewData {
  const actionItems: OverviewItem[] = [];
  const comingUp: OverviewItem[] = [];
  const goodToKnow: OverviewItem[] = [];
  const aboutChild: OverviewItem[] = [];

  const childFirst = (childName || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
  const childFull = (childName || "").trim().toLowerCase();
  const childClassNorm = (childClass || "").trim().toLowerCase();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const recentCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks
  const actionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const msg of messages) {
    const info = extractInfo(msg.body);
    const text = stripHtml(msg.body).toLowerCase();
    const subjectLower = msg.subject.toLowerCase();

    if (childClassNorm && !isRelevantToClass(text, msg.subject, childClassNorm)) {
      continue;
    }

    const { formatted: date, parsed: emailDate } = getMessageDate(msg);
    const cleanActions = info.actionItems.filter((a) => !isGarbageItem(a));

    // Determine message type
    const isAction =
      msg.actionRequired || cleanActions.length > 0 || info.deadlines.length > 0 || msg.category === "payment";
    const isEvent = msg.category === "event" || EVENT_KEYWORDS.test(msg.subject);
    const isNews = SCHOOL_NEWS_KEYWORDS.test(msg.subject) || msg.category === "newsletter";
    const isAboutChild =
      childFull.length > 0 &&
      (text.includes(childFull) || subjectLower.includes(childFull) ||
       (childFirst.length > 2 && (text.includes(childFirst) || subjectLower.includes(childFirst))));

    // Detect absence notifications (date shown is notification date, not absence date)
    const isAbsenceNotification = /absentiemelding/i.test(msg.subject);

    // Clean subject
    const subject = msg.subject
      .replace(/^Nutsschool Bezuidenhout\s*[-–]\s*/i, "")
      .replace(/^Nieuwe absentiemelding voor\s+/i, "Verlofmelding: ")
      .replace(/^Nieuw bericht in gesprek\s+/i, "")
      .trim();

    const cleanSummary = cleanActions[0]
      ? cleanActions[0]
          .replace(/^(graag|please|svp|s\.v\.p\.|meenemen|meebrengen|bring|inschrijven|aanmelden|opgeven|sign up|register|vergeet niet|don'?t forget|herinnering|reminder)\s+/gi, "")
          .trim()
          .slice(0, 80)
      : null;

    const item: OverviewItem = {
      summary: cleanSummary || subject,
      date,
      ...(isAbsenceNotification ? { dateLabel: "melding" } : {}),
      sourceMessageId: msg.id,
      sourceSubject: msg.subject,
      ...(info.amounts[0] ? { amount: info.amounts[0] } : {}),
    };

    // Action items: payments always show, others only if recent (last 7 days)
    if (isAction) {
      const keepAlways = msg.category === "payment";
      if (keepAlways || !emailDate || emailDate >= actionCutoff) {
        actionItems.push({ ...item });
      }
    }

    // Coming up: future events + today/yesterday (still relevant)
    const eventCutoff = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    if (isEvent && emailDate && emailDate >= eventCutoff) {
      comingUp.push({ ...item });
    }

    // Good to know: school news from last 2 weeks, not already shown elsewhere
    if (isNews && !isAction && !isAboutChild && emailDate && emailDate >= recentCutoff) {
      goodToKnow.push({ ...item });
    }

    // About child: always show (all-time)
    if (isAboutChild) {
      aboutChild.push({ ...item });
    }
  }

  return {
    actionItems: sortByDate(actionItems),
    comingUp: sortByDate(comingUp),
    goodToKnow: sortByDate(goodToKnow, true),
    aboutChild: sortByDate(aboutChild, true),
  };
}

/**
 * Build overview using AI classifications as the primary source.
 * Falls back to buildOverview() if aiResults is empty.
 */
export function buildOverviewWithAI(
  messages: SchoolMessage[],
  childName: string,
  childClass: string,
  aiResults: AIClassification[]
): OverviewData {
  if (!aiResults.length) return buildOverview(messages, childName, childClass);

  const aiMap = new Map(aiResults.map((r) => [r.id, r]));
  const childClassNorm = childClass.trim().toLowerCase().replace(/\s+/g, "");

  const actionItems: OverviewItem[] = [];
  const comingUp: OverviewItem[] = [];
  const goodToKnow: OverviewItem[] = [];
  const aboutChild: OverviewItem[] = [];

  for (const msg of messages) {
    const ai = aiMap.get(msg.id);
    if (!ai || ai.category === "ignore") continue;

    // Class filter: skip if AI says it's for a different class
    if (
      childClassNorm &&
      ai.relevantToClass !== "all" &&
      ai.relevantToClass &&
      ai.relevantToClass.toLowerCase().replace(/\s+/g, "") !== childClassNorm
    ) {
      continue;
    }

    const { formatted: date } = getMessageDate(msg);
    const info = extractInfo(msg.body);

    const cleanSubject = msg.subject
      .replace(/^Nutsschool Bezuidenhout\s*[-–]\s*/i, "")
      .replace(/^Nieuwe absentiemelding voor\s+/i, "Verlofmelding: ")
      .replace(/^Nieuw bericht in gesprek\s+/i, "")
      .trim();

    const isAbsenceNotification = /absentiemelding/i.test(msg.subject);

    const item: OverviewItem = {
      summary: ai.summary || cleanSubject,
      date,
      ...(isAbsenceNotification ? { dateLabel: "melding" } : {}),
      sourceMessageId: msg.id,
      sourceSubject: msg.subject,
      ...(info.amounts[0] ? { amount: info.amounts[0] } : {}),
    };

    switch (ai.category) {
      case "action":
      case "payment":
        actionItems.push(item);
        break;
      case "event":
        comingUp.push(item);
        break;
      case "news":
        goodToKnow.push(item);
        break;
      case "child":
        aboutChild.push(item);
        // Also add to action if actionRequired
        if (ai.actionRequired) actionItems.push(item);
        break;
    }
  }

  return {
    actionItems: sortByDate(actionItems),
    comingUp: sortByDate(comingUp),
    goodToKnow: sortByDate(goodToKnow, true),
    aboutChild: sortByDate(aboutChild, true),
  };
}
