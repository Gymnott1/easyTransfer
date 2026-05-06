import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";

const port = Number(process.env.SIGNALING_PORT ?? 8787);

const messageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    sessionId: z.string().min(3),
    peerId: z.string().min(3),
    role: z.enum(["sender", "receiver"])
  }),
  z.object({
    type: z.enum(["offer", "answer", "ice"]),
    sessionId: z.string().min(3),
    peerId: z.string().min(3),
    payload: z.unknown()
  }),
  z.object({
    type: z.literal("presence"),
    sessionId: z.string().min(3),
    peerId: z.string().min(3),
    status: z.enum(["online", "offline"])
  })
]);

type ClientMeta = {
  sessionId?: string;
  peerId?: string;
  role?: "sender" | "receiver";
};

const clients = new Map<WebSocket, ClientMeta>();
const sessions = new Map<string, Set<WebSocket>>();

const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "easydatatransfer-signaling" }));
    return;
  }

  response.writeHead(404);
  response.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  clients.set(socket, {});

  socket.on("message", (raw) => {
    const parsed = messageSchema.safeParse(JSON.parse(raw.toString()));
    if (!parsed.success) {
      socket.send(JSON.stringify({ type: "error", message: "Invalid signaling message" }));
      return;
    }

    const message = parsed.data;

    if (message.type === "join") {
      clients.set(socket, {
        sessionId: message.sessionId,
        peerId: message.peerId,
        role: message.role
      });

      if (!sessions.has(message.sessionId)) {
        sessions.set(message.sessionId, new Set());
      }

      sessions.get(message.sessionId)?.add(socket);
    }

    broadcast(message.sessionId, socket, JSON.stringify(message));
  });

  socket.on("close", () => {
    const meta = clients.get(socket);
    clients.delete(socket);
    if (!meta?.sessionId) return;

    const peers = sessions.get(meta.sessionId);
    peers?.delete(socket);
    if (peers?.size === 0) sessions.delete(meta.sessionId);

    broadcast(
      meta.sessionId,
      socket,
      JSON.stringify({
        type: "presence",
        sessionId: meta.sessionId,
        peerId: meta.peerId ?? "unknown",
        status: "offline"
      })
    );
  });
});

function broadcast(sessionId: string, sender: WebSocket, payload: string) {
  const peers = sessions.get(sessionId);
  if (!peers) return;

  for (const peer of peers) {
    if (peer === sender || peer.readyState !== peer.OPEN) continue;
    peer.send(payload);
  }
}

httpServer.listen(port, () => {
  console.log(`EasyDataTransfer signaling server listening on :${port}`);
});
