import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "easydatatransfer-web",
    timestamp: new Date().toISOString()
  });
}
