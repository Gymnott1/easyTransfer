import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    challenge: crypto.randomUUID(),
    timeout: 60000,
    userVerification: "preferred",
    rpId: process.env.WEBAUTHN_RP_ID ?? "localhost",
    allowCredentials: []
  });
}
