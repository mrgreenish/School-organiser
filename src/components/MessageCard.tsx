"use client";

import type { SchoolMessage } from "@/types";
import { extractInfo } from "@/lib/message-parser";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  urgent: { bg: "bg-red-100", text: "text-red-800", icon: "🚨" },
  event: { bg: "bg-purple-100", text: "text-purple-800", icon: "📅" },
  absence: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "🏠" },
  homework: { bg: "bg-blue-100", text: "text-blue-800", icon: "📚" },
  payment: { bg: "bg-green-100", text: "text-green-800", icon: "💶" },
  newsletter: { bg: "bg-gray-100", text: "text-gray-800", icon: "📰" },
  general: { bg: "bg-slate-100", text: "text-slate-800", icon: "✉️" },
};

export default function MessageCard({ message }: { message: SchoolMessage }) {
  const style = CATEGORY_STYLES[message.category] || CATEGORY_STYLES.general;
  const info = extractInfo(message.body);

  return (
    <div
      className={`rounded-lg border p-4 ${
        message.important ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
            >
              {style.icon} {message.category}
            </span>
            {message.actionRequired && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                Action required
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">
            {message.subject}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(message.date).toLocaleDateString("nl-NL", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-700 mt-2 line-clamp-3">
        {message.snippet}
      </p>

      {(info.dates.length > 0 ||
        info.amounts.length > 0 ||
        info.deadlines.length > 0 ||
        info.actionItems.length > 0) && (
        <div className="mt-3 space-y-1">
          {info.dates.length > 0 && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Dates:</span>{" "}
              {info.dates.slice(0, 3).join(", ")}
            </p>
          )}
          {info.amounts.length > 0 && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">Amounts:</span>{" "}
              {info.amounts.join(", ")}
            </p>
          )}
          {info.deadlines.length > 0 && (
            <p className="text-xs text-red-600 font-medium">
              Deadline: {info.deadlines[0]}
            </p>
          )}
          {info.actionItems.length > 0 && (
            <div className="text-xs text-orange-700">
              <span className="font-medium">To do:</span>
              <ul className="list-disc list-inside ml-1">
                {info.actionItems.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
