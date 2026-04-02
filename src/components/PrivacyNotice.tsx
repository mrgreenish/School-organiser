"use client";

import { useState } from "react";

export default function PrivacyNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-blue-600 text-lg mt-0.5">&#x1f512;</span>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">
            Your privacy is protected
          </h3>
          <p className="text-sm text-blue-800 mt-1">
            This app connects directly from your browser to Google. Your emails
            are <strong>never sent to our server</strong>.
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 mt-2 underline"
          >
            {expanded ? "Show less" : "How does this work?"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 text-sm text-blue-800">
              <p>
                <strong>1. Browser-only processing:</strong> When you connect
                Gmail, the authentication token stays in your browser&apos;s
                session storage. Email data is fetched directly from Google to
                your browser - our server never sees it.
              </p>
              <p>
                <strong>2. Filtered query:</strong> We only request emails
                matching{" "}
                <code className="bg-blue-100 px-1 rounded text-xs">
                  from:noreply@socialschools.eu
                </code>
                . No other emails are accessed.
              </p>
              <p>
                <strong>3. No storage:</strong> Your emails are not stored
                anywhere. When you close the tab, the data is gone.
              </p>
              <p>
                <strong>4. Open source:</strong> This app is fully open source.
                You can verify exactly what code runs and that no data leaves
                your browser.
              </p>
              <p>
                <strong>5. Revoke anytime:</strong> You can revoke access at{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  myaccount.google.com/permissions
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
