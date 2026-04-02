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
