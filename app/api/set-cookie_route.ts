import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { name, value } = await request.json();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, value, { path: "/", httpOnly: true });
  return response;
}