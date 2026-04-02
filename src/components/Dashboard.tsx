"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AIClassification, MessageCategory, SchoolMessage } from "@/types";
import { fetchSocialSchoolsEmails } from "@/lib/gmail-client";
import { buildOverview, buildOverviewWithAI } from "@/lib/overview-builder";
import { analyzeEmails } from "@/lib/ai-classifier";
import MessageCard from "./MessageCard";
import PrivacyNotice from "./PrivacyNotice";
import SmartOverview from "./SmartOverview";
import ChildNameInput from "./ChildNameInput";

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
  const [childName, setChildName] = useState("");
  const [childClass, setChildClass] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<AIClassification[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  function handleChildNameChange(name: string) {
    setChildName(name);
    localStorage.setItem("school_organiser_child_name", name);
  }

  function handleChildClassChange(cls: string) {
    setChildClass(cls);
    localStorage.setItem("school_organiser_child_class", cls);
  }

  const runAiAnalysis = useCallback(async (msgs: SchoolMessage[], name: string, cls: string) => {
    setAiLoading(true);
    try {
      const results = await analyzeEmails(msgs, name, cls);
      setAiResults(results);
    } catch {
      // Silently fall back to keyword-based overview
    } finally {
      setAiLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (accessToken: string, name: string, cls: string) => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await fetchSocialSchoolsEmails(accessToken);
      setMessages(msgs);
      setIsAuthenticated(true);
      runAiAnalysis(msgs, name, cls);
    } catch (err) {
      if (err instanceof Error && err.message === "TOKEN_EXPIRED") {
        // Try to silently refresh before giving up
        try {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            const { access_token: newToken } = await refreshRes.json();
            sessionStorage.setItem("gmail_access_token", newToken);
            const msgs = await fetchSocialSchoolsEmails(newToken);
            setMessages(msgs);
            setIsAuthenticated(true);
            runAiAnalysis(msgs, name, cls);
            return;
          }
        } catch {
          // fall through to login screen
        }
        sessionStorage.removeItem("gmail_access_token");
        setIsAuthenticated(false);
        setError(null);
      } else {
        setError("Failed to load messages. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [runAiAnalysis]);

  useEffect(() => {
    // Read child info from localStorage before loading — needed for AI analysis context
    const name = localStorage.getItem("school_organiser_child_name") || "";
    const cls = localStorage.getItem("school_organiser_child_class") || "";
    if (name) setChildName(name);
    if (cls) setChildClass(cls);

    async function init() {
      let token = sessionStorage.getItem("gmail_access_token");

      // DEV ONLY: auto-login using dev_token from .env.local (via API route)
      if (!token && process.env.NODE_ENV === "development") {
        try {
          const res = await fetch("/api/dev-token");
          const data = await res.json();
          if (data.token) {
            token = data.token;
            sessionStorage.setItem("gmail_access_token", data.token);
          }
        } catch {
          // ignore — fall through to silent refresh
        }
      }

      // No token in sessionStorage (e.g. tab was closed and reopened) —
      // try to silently get a new access token using the HttpOnly refresh token cookie
      if (!token) {
        try {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            const { access_token } = await refreshRes.json();
            if (access_token) {
              token = access_token;
              sessionStorage.setItem("gmail_access_token", access_token);
            }
          }
        } catch {
          // ignore — fall through to login screen
        }
      }

      if (token) {
        loadMessages(token, name, cls);
      }
    }

    init();
  }, [loadMessages]);

  const overview = useMemo(
    () =>
      aiResults.length
        ? buildOverviewWithAI(messages, childName, childClass, aiResults)
        : buildOverview(messages, childName, childClass),
    [messages, childName, childClass, aiResults]
  );

  function handleGoogleLogin() {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin + "/auth/callback",
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function handleDisconnect() {
    sessionStorage.removeItem("gmail_access_token");
    setMessages([]);
    setIsAuthenticated(false);
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }

  function handleShowMessage(messageId: string) {
    setHighlightedId(messageId);
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightedId(null), 2500);
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="space-y-6">
        <PrivacyNotice />
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900">Connect your Gmail</h2>
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
        <p className="text-gray-500">Fetching Social Schools messages from Gmail...</p>
        <p className="text-xs text-gray-400">Direct browser-to-Google connection (no server involved)</p>
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

  return (
    <div className="space-y-8">
      <PrivacyNotice />

      {/* Child name + disconnect row */}
      <div className="flex items-center justify-between">
        <ChildNameInput
          childName={childName}
          childClass={childClass}
          onChangeName={handleChildNameChange}
          onChangeClass={handleChildClassChange}
        />
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Smart Overview panels */}
      <SmartOverview
        overview={overview}
        childName={childName}
        onShowMessage={handleShowMessage}
        aiEnhanced={aiResults.length > 0}
        aiLoading={aiLoading}
      />

      {/* All messages */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            All Messages ({messages.length})
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showImportantOnly}
              onChange={(e) => setShowImportantOnly(e.target.checked)}
              className="rounded"
            />
            Important only
          </label>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Message grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((message) => (
            <div
              key={message.id}
              id={`message-${message.id}`}
              className={`rounded-xl transition-all duration-500 ${
                highlightedId === message.id
                  ? "ring-2 ring-blue-500 ring-offset-2"
                  : ""
              }`}
            >
              <MessageCard message={message} />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">No messages match your filters.</p>
        )}
      </div>
    </div>
  );
}
