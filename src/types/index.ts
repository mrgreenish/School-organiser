export interface SchoolMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
  category: MessageCategory;
  important: boolean;
  actionRequired: boolean;
  deadline?: string;
  labels: string[];
}

export type MessageCategory =
  | "event"
  | "newsletter"
  | "absence"
  | "homework"
  | "payment"
  | "general"
  | "urgent";

export interface ParsedInfo {
  dates: string[];
  amounts: string[];
  deadlines: string[];
  links: string[];
  actionItems: string[];
}

export interface OverviewItem {
  summary: string;
  date: string | null;
  /** Hint shown before the date, e.g. "notified" for absence requests */
  dateLabel?: string;
  sourceMessageId: string;
  sourceSubject: string;
  amount?: string;
}

export interface OverviewData {
  actionItems: OverviewItem[];
  comingUp: OverviewItem[];
  goodToKnow: OverviewItem[];
  aboutChild: OverviewItem[];
}

export interface AIClassification {
  id: string;
  category: "action" | "event" | "payment" | "news" | "child" | "ignore";
  summary: string;
  actionRequired: boolean;
  date: string | null;
  relevantToChild: boolean;
  relevantToClass: string;
}
