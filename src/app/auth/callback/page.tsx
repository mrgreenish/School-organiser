"use client";

import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    // Extract access token from URL fragment (implicit OAuth flow)
    // Token is in the URL hash, never sent to the server
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");

    if (accessToken) {
      // Store only in sessionStorage (cleared when tab closes)
      sessionStorage.setItem("gmail_access_token", accessToken);
    }

    // Redirect to dashboard
    window.location.href = "/";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Connecting your account...</p>
    </div>
  );
}
