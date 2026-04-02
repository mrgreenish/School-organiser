"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthCallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      window.location.href = "/";
      return;
    }

    async function exchangeCode() {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirectUri: window.location.origin + "/auth/callback",
        }),
      });

      if (res.ok) {
        const { access_token } = await res.json();
        if (access_token) {
          sessionStorage.setItem("gmail_access_token", access_token);
        }
      }

      window.location.href = "/";
    }

    exchangeCode();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Connecting your account...</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500">Connecting your account...</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
