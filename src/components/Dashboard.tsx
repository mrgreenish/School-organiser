"use client";

import { useCallback, useEffect, useState } from "react";
import type { MessageCategory, SchoolMessage } from "@/types";
import { fetchSocialSchoolsEmails } from "@/lib/gmail-client";
import MessageCard from "./MessageCard";
import PrivacyNotice from "./PrivacyNotice";

const CATEGORY_FILTERS: { value: MessageCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "urgent", label: "Urgent" },
  { value: "event", label: "Events" },
  { value: "payment", label: "Payments" },
  { value: "homework", label: "Homework" },
  { value: "newsletter", label: "Newsletters" },
  { value: "absence", label: "Absence" },
  { value: "general", label: "General" },
];

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly";

export default function Dashboard() {
  const [messages, setMessages] = useState<SchoolMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MessageCategory | "all">("all");
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadMessages = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await fetchSocialSchoolsEmails(accessToken);
      setMessages(msgs);
      setIsAuthenticated(true);
    } catch (err) {
      if (err instanceof Error && err.message === "TOKEN_EXPIRED") {
        sessionStorage.removeItem("gmail_access_token");
        setIsAuthenticated(false);
        setError("Session expired. Please connect Gmail again.");
      } else {
        setError("Failed to load messages. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for existing token in sessionStorage (browser-only, never sent to server)
    const token = sessionStorage.getItem("gmail_access_token");
    if (token) {
      loadMessages(token);
    }
  }, [loadMessages]);

  function handleGoogleLogin() {
    // Use Google's OAuth2 implicit flow - token stays in the browser
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin + "/auth/callback",
      response_type: "token",
      scope: SCOPES,
      prompt: "consent",
      include_granted_scopes: "true",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function handleDisconnect() {
    sessionStorage.removeItem("gmail_access_token");
    setMessages([]);
    setIsAuthenticated(false);
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="space-y-6">
        <PrivacyNotice />
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Connect your Gmail
          </h2>
          <p className="text-gray-600 text-center max-w-md">
            Connect your Gmail to fetch Social Schools messages. All processing
            happens in your browser - no email data is sent to any server.
          </p>
          {!GOOGLE_CLIENT_ID && (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
              Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your{" "}
              <code>.env.local</code> file first.
            </p>
          )}
          <button
            onClick={handleGoogleLogin}
            disabled={!GOOGLE_CLIENT_ID}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Gmail Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">
          Fetching Social Schools messages from Gmail...
        </p>
        <p className="text-xs text-gray-400">
          Direct browser-to-Google connection (no server involved)
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={handleGoogleLogin}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reconnect Gmail
        </button>
      </div>
    );
  }

  const filtered = messages.filter((m) => {
    if (filter !== "all" && m.category !== filter) return false;
    if (showImportantOnly && !m.important) return false;
    return true;
  });

  const importantCount = messages.filter((m) => m.important).length;
  const actionCount = messages.filter((m) => m.actionRequired).length;
  const upcomingEvents = messages.filter((m) => m.category === "event");

  return (
    <div className="space-y-6">
      <PrivacyNotice />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Messages</p>
          <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-sm text-red-600">Important</p>
          <p className="text-2xl font-bold text-red-700">{importantCount}</p>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <p className="text-sm text-orange-600">Action Required</p>
          <p className="text-2xl font-bold text-orange-700">{actionCount}</p>
        </div>
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <p className="text-sm text-purple-600">Events</p>
          <p className="text-2xl font-bold text-purple-700">
            {upcomingEvents.length}
          </p>
        </div>
      </div>

      {/* Upcoming events quick view */}
      {upcomingEvents.length > 0 && (
        <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
          <h3 className="font-semibold text-purple-900 mb-2">
            Upcoming Events
          </h3>
          <div className="space-y-1">
            {upcomingEvents.slice(0, 5).map((e) => (
              <p key={e.id} className="text-sm text-purple-800">
                {e.subject}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === cat.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showImportantOnly}
              onChange={(e) => setShowImportantOnly(e.target.checked)}
              className="rounded"
            />
            Important only
          </label>
          <button
            onClick={handleDisconnect}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-8">
          No messages match your filters.
        </p>
      )}
    </div>
  );
}
