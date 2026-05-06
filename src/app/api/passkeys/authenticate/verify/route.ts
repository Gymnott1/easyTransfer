import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const assertion = await request.json().catch(() => null);

  return NextResponse.json({
    verified: Boolean(assertion),
    sessionToken: assertion ? crypto.randomUUID() : null,
    expiresInSeconds: 3600,
    note: "This verification surface is ready for a real credential store and challenge replay protection."
  });
}
