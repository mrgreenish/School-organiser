import type { MessageCategory, ParsedInfo } from "@/types";

// Dutch + English keywords for categorization
const CATEGORY_PATTERNS: Record<MessageCategory, RegExp> = {
  urgent:
    /\b(spoed|urgent|belangrijk|important|emergency|noodgeval|direct|immediately)\b/i,
  event:
    /\b(uitnodiging|evenement|activiteit|event|invitation|feest|excursie|schoolreis|ouderavond|sportdag|voorstelling)\b/i,
  absence:
    /\b(ziek|absent|afwezig|absence|verlof|vrij|sick|ill|niet aanwezig)\b/i,
  homework:
    /\b(huiswerk|homework|opdracht|assignment|toets|test|proefwerk|werkstuk|project)\b/i,
  payment:
    /\b(betaling|betalen|kosten|payment|pay|euro|€|\beur\b|rekening|factuur|bijdrage|schoolgeld)\b/i,
  newsletter:
    /\b(nieuwsbrief|newsletter|weekbrief|maandbrief|info\s?brief|schoolnieuws|weekbericht)\b/i,
  general: /./,
};

export function categorizeMessage(
  subject: string,
  body: string
): MessageCategory {
  const text = `${subject} ${stripHtml(body)}`;

  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === "general") continue;
    if (pattern.test(text)) return category as MessageCategory;
  }

  return "general";
}

export function isImportant(
  subject: string,
  body: string,
  category: MessageCategory
): boolean {
  if (category === "urgent" || category === "payment") return true;

  const text = `${subject} ${stripHtml(body)}`;
  const importantPatterns =
    /\b(deadline|uiterlijk|voor\s+\d|vóór|action required|actie vereist|vergeet niet|don't forget|herinnering|reminder|verplicht|mandatory|let op|attention)\b/i;

  return importantPatterns.test(text);
}

export function extractInfo(body: string): ParsedInfo {
  const text = stripHtml(body);

  // Extract dates (Dutch and standard formats)
  const datePatterns = [
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
    /\b\d{1,2}\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s*\d{0,4}\b/gi,
    /\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{0,4}\b/gi,
    /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\s+\d{1,2}\s+\w+/gi,
  ];
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  }

  // Extract monetary amounts
  const amountPatterns = [
    /€\s*\d+([.,]\d{2})?/g,
    /\b\d+([.,]\d{2})?\s*euro\b/gi,
    /EUR\s*\d+([.,]\d{2})?/g,
  ];
  const amounts: string[] = [];
  for (const pattern of amountPatterns) {
    const matches = text.match(pattern);
    if (matches) amounts.push(...matches);
  }

  // Extract deadlines
  const deadlinePatterns = [
    /(?:deadline|uiterlijk|voor|vóór|before|due)\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/gi,
    /(?:deadline|uiterlijk|voor|vóór|before|due)\s*:?\s*(\d{1,2}\s+\w+\s*\d{0,4})/gi,
  ];
  const deadlines: string[] = [];
  for (const pattern of deadlinePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      deadlines.push(match[1]);
    }
  }

  // Extract URLs
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const links = text.match(urlPattern) || [];

  // Extract action items
  const actionPatterns = [
    /(?:graag|please|svp|s\.v\.p\.)\s+(.{10,80})/gi,
    /(?:vergeet niet|don't forget|herinnering|reminder)\s*:?\s*(.{10,80})/gi,
    /(?:inschrijven|aanmelden|opgeven|sign up|register)\s+(.{5,80})/gi,
    /(?:meenemen|meebrengen|bring)\s+(.{5,80})/gi,
  ];
  const actionItems: string[] = [];
  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      actionItems.push(match[0].trim());
    }
  }

  return { dates, amounts, deadlines, links, actionItems };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
