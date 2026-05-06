import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSessionSchema = z.object({
  keepLive: z.boolean().default(false),
  mode: z.enum(["send", "receive"]).default("send")
});

const MAX_KEEP_LIVE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TTL_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = createSessionSchema.parse(await request.json().catch(() => ({})));
  const ttl = body.keepLive ? MAX_KEEP_LIVE_MS : DEFAULT_TTL_MS;
  const now = Date.now();

  return NextResponse.json({
    id: nanoid(12),
    mode: body.mode,
    keepLive: body.keepLive,
    createdAt: now,
    expiresAt: now + ttl,
    ttlSeconds: Math.floor(ttl / 1000)
  });
}
