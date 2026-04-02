"use client";

import { useCallback, useEffect, useState } from "react";
import type { OverviewData, OverviewItem } from "@/types";

// Stores { [messageId]: timestamp_when_checked }
type CheckedItems = Record<string, number>;

const STORAGE_KEY = "school_organiser_checked_items";
const GRAY_PERIOD_MS = 24 * 60 * 60 * 1000; // 1 day

function loadChecked(): CheckedItems {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveChecked(items: CheckedItems) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface SmartOverviewProps {
  overview: OverviewData;
  childName: string;
  onShowMessage: (messageId: string) => void;
  aiEnhanced?: boolean;
  aiLoading?: boolean;
}

interface PanelProps {
  title: string;
  items: OverviewItem[];
  borderColor: string;
  headerColor: string;
  badgeColor: string;
  emptyText: string;
  checkable?: boolean;
  checkedItems?: CheckedItems;
  onToggleCheck?: (id: string) => void;
  onShowMessage: (id: string) => void;
}

function Panel({
  title,
  items,
  borderColor,
  headerColor,
  badgeColor,
  emptyText,
  checkable,
  checkedItems,
  onToggleCheck,
  onShowMessage,
}: PanelProps) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 5;

  const now = Date.now();

  // Split items: active (not checked or recently checked/grayed), hidden (checked > 1 day)
  const visibleItems = items.filter((item) => {
    const checkedAt = checkedItems?.[item.sourceMessageId];
    if (!checkedAt) return true; // not checked
    return now - checkedAt < GRAY_PERIOD_MS; // grayed but still visible
  });

  const activeCount = items.filter((item) => !checkedItems?.[item.sourceMessageId]).length;
  const shown = expanded ? visibleItems : visibleItems.slice(0, LIMIT);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColor} overflow-hidden`}>
      <div className={`px-4 py-3 flex items-center justify-between ${headerColor}`}>
        <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
        {activeCount > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {activeCount}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {shown.length === 0 ? (
          <p className="px-4 py-3 text-sm text-gray-400 italic">{emptyText}</p>
        ) : (
          shown.map((item) => {
            const isChecked = !!checkedItems?.[item.sourceMessageId];
            return (
              <div
                key={item.sourceMessageId}
                className={`flex items-start gap-2 px-4 py-2.5 transition-colors ${
                  isChecked ? "opacity-40" : "hover:bg-gray-50"
                }`}
              >
                {checkable && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCheck?.(item.sourceMessageId);
                    }}
                    className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center hover:border-orange-400 transition-colors"
                    title={isChecked ? "Uncheck" : "Mark as done"}
                  >
                    {isChecked && <span className="text-orange-500 text-xs">✓</span>}
                  </button>
                )}
                <button
                  onClick={() => onShowMessage(item.sourceMessageId)}
                  className={`flex-1 text-left group min-w-0 ${isChecked ? "line-through" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-sm leading-snug flex-1 min-w-0 ${
                        isChecked
                          ? "text-gray-400"
                          : "text-gray-700 group-hover:text-gray-900"
                      }`}
                    >
                      {item.summary}
                      {item.amount && (
                        <span className={`ml-1.5 font-medium ${isChecked ? "text-gray-400" : "text-green-700"}`}>
                          {item.amount}
                        </span>
                      )}
                    </span>
                    {item.date && (
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                        {item.dateLabel && (
                          <span className="italic mr-1">{item.dateLabel}</span>
                        )}
                        {item.date}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
      {visibleItems.length > LIMIT && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors border-t border-gray-100"
        >
          {expanded ? "Show less" : `Show all ${visibleItems.length}`}
        </button>
      )}
    </div>
  );
}

export default function SmartOverview({ overview, childName, onShowMessage, aiEnhanced, aiLoading }: SmartOverviewProps) {
  const childFirst = childName.trim().split(/\s+/)[0] || "Child";
  const [checkedItems, setCheckedItems] = useState<CheckedItems>({});

  useEffect(() => {
    setCheckedItems(loadChecked());
  }, []);

  const handleToggleCheck = useCallback((messageId: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      if (next[messageId]) {
        delete next[messageId];
      } else {
        next[messageId] = Date.now();
      }
      saveChecked(next);
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Smart Overview</h2>
        {aiLoading && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin" />
            Analyzing with AI...
          </span>
        )}
        {aiEnhanced && !aiLoading && (
          <span className="text-xs text-blue-500 font-medium">✦ AI enhanced</span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Panel
          title="✅ Action Required"
          items={overview.actionItems}
          borderColor="border-l-orange-400"
          headerColor="bg-orange-50"
          badgeColor="bg-orange-100 text-orange-700"
          emptyText="Nothing to do right now"
          checkable
          checkedItems={checkedItems}
          onToggleCheck={handleToggleCheck}
          onShowMessage={onShowMessage}
        />
        <Panel
          title="📅 Coming Up"
          items={overview.comingUp}
          borderColor="border-l-blue-400"
          headerColor="bg-blue-50"
          badgeColor="bg-blue-100 text-blue-700"
          emptyText="No upcoming events found"
          onShowMessage={onShowMessage}
        />
        <Panel
          title="💡 Good to Know"
          items={overview.goodToKnow}
          borderColor="border-l-gray-400"
          headerColor="bg-gray-50"
          badgeColor="bg-gray-200 text-gray-600"
          emptyText="No general updates"
          onShowMessage={onShowMessage}
        />
        {childName.trim() && (
          <Panel
            title={`👧 About ${childFirst}`}
            items={overview.aboutChild}
            borderColor="border-l-purple-400"
            headerColor="bg-purple-50"
            badgeColor="bg-purple-100 text-purple-700"
            emptyText={`No messages specifically about ${childFirst}`}
            onShowMessage={onShowMessage}
          />
        )}
      </div>
    </div>
  );
}
