/**
 * Client-side Gmail fetcher.
 *
 * PRIVACY: All Gmail communication happens directly between the user's
 * browser and Google's servers. No email data is ever sent to our backend.
 * The access token lives only in the browser's memory/sessionStorage.
 *
 * We request the `gmail.readonly` scope and ONLY query emails matching
 * Social Schools senders. The query filter is visible in this source code.
 */

import type { SchoolMessage } from "@/types";
import { categorizeMessage, extractInfo, isImportant } from "./message-parser";

const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";

// Only fetch emails from these senders - this is the privacy guarantee
const SOCIAL_SCHOOLS_QUERY =
  'from:noreply@socialschools.eu OR from:@socialschools.nl OR subject:"Social Schools"';

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface GmailFullMessage {
  id: string;
  snippet: string;
  payload: {
    headers: GmailHeader[];
    body?: { data?: string };
    parts?: GmailPart[];
  };
}

async function gmailFetch<T>(
  endpoint: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${GMAIL_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("TOKEN_EXPIRED");
    throw new Error(`Gmail API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchSocialSchoolsEmails(
  accessToken: string,
  maxResults = 50
): Promise<SchoolMessage[]> {
  // Step 1: List message IDs matching Social Schools query ONLY
  const listData = await gmailFetch<{ messages?: GmailMessage[] }>(
    `/messages?q=${encodeURIComponent(SOCIAL_SCHOOLS_QUERY)}&maxResults=${maxResults}`,
    accessToken
  );

  const messageIds = listData.messages || [];
  if (messageIds.length === 0) return [];

  // Step 2: Fetch full content for each message (browser <-> Google directly)
  const messages: SchoolMessage[] = [];

  // Fetch in batches of 10 to avoid rate limits
  for (let i = 0; i < messageIds.length; i += 10) {
    const batch = messageIds.slice(i, i + 10);
    const results = await Promise.all(
      batch.map((msg) =>
        gmailFetch<GmailFullMessage>(
          `/messages/${msg.id}?format=full`,
          accessToken
        )
      )
    );

    for (const full of results) {
      const headers = full.payload.headers || [];
      const subject =
        headers.find((h) => h.name === "Subject")?.value || "(no subject)";
      const from = headers.find((h) => h.name === "From")?.value || "";
      const date = headers.find((h) => h.name === "Date")?.value || "";

      const body = extractBody(full.payload);
      const category = categorizeMessage(subject, body);
      const info = extractInfo(body);

      messages.push({
        id: full.id,
        subject,
        from,
        date,
        snippet: full.snippet || "",
        body,
        category,
        important: isImportant(subject, body, category),
        actionRequired:
          info.actionItems.length > 0 || info.deadlines.length > 0,
        deadline: info.deadlines[0],
        labels: [
          category,
          ...(info.actionItems.length > 0 ? ["action-required"] : []),
        ],
      });
    }
  }

  return messages;
}

function extractBody(payload: GmailFullMessage["payload"]): string {
  if (payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }

  if (payload.parts) {
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    const chosen = htmlPart || textPart;

    if (chosen?.body?.data) {
      return atob(chosen.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }

    // Recurse into nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const result = extractBody({
          headers: [],
          parts: part.parts,
        });
        if (result) return result;
      }
    }
  }

  return "";
}
