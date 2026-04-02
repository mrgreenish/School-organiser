import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const { code, redirectUri } = await request.json();

  if (!code || !redirectUri) {
    return NextResponse.json({ error: "Missing code or redirectUri" }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 500 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Google token exchange failed:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 401 });
  }

  const { access_token, refresh_token } = await tokenRes.json();

  if (refresh_token) {
    const cookieStore = await cookies();
    cookieStore.set("gmail_refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS,
    });
  }

  return NextResponse.json({ access_token });
}
