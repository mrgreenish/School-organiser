import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const token = process.env.dev_token;
  if (!token) {
    return NextResponse.json({ token: null });
  }
  return NextResponse.json({ token });
}
