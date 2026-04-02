import type { AIClassification, SchoolMessage } from "@/types";
import { stripHtml } from "./message-parser";

const CACHE_KEY = "school_organiser_ai_cache";

interface CacheEntry {
  hash: string;
  results: AIClassification[];
}

function hashIds(messages: SchoolMessage[]): string {
  return messages.map((m) => m.id).join(",");
}

function loadCache(hash: string): AIClassification[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.hash === hash ? entry.results : null;
  } catch {
    return null;
  }
}

function saveCache(hash: string, results: AIClassification[]) {
  try {
    const entry: CacheEntry = { hash, results };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — skip cache
  }
}

export async function analyzeEmails(
  messages: SchoolMessage[],
  childName: string,
  childClass: string
): Promise<AIClassification[]> {
  if (!messages.length) return [];

  const hash = hashIds(messages);
  const cached = loadCache(hash);
  if (cached) {
    if (process.env.NODE_ENV === "development") {
      console.log("[school-organiser] AI cache hit", cached.length, "classifications");
    }
    return cached;
  }

  const emails = messages.map((m) => ({
    id: m.id,
    subject: m.subject,
    date: m.date,
    // Send only a short snippet — subjects carry most of the useful info for Social Schools
    snippet: stripHtml(m.body).slice(0, 200),
  }));

  const res = await fetch("/api/analyze-emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails, childName, childClass }),
  });

  if (!res.ok) {
    throw new Error(`AI analysis failed: ${res.status}`);
  }

  const data = await res.json();
  const results: AIClassification[] = Array.isArray(data.results) ? data.results : [];
  saveCache(hash, results);
  if (process.env.NODE_ENV === "development") {
    console.log("[school-organiser] AI analysis OK", results.length, "classifications (cached for this session)");
  }
  return results;
}
