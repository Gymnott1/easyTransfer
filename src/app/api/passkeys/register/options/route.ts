import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    rp: {
      name: "EasyDataTransfer",
      id: process.env.WEBAUTHN_RP_ID ?? "localhost"
    },
    user: {
      id: "demo-user",
      name: "demo@easydatatransfer.local",
      displayName: "Demo User"
    },
    challenge: crypto.randomUUID(),
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred"
    }
  });
}
