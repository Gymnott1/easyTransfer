import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const credential = await request.json().catch(() => null);

  return NextResponse.json({
    verified: Boolean(credential),
    note: "Wire this route to @simplewebauthn/server with PostgreSQL-backed challenges before production launch."
  });
}
