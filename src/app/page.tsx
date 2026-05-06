"use client";

import {
  Activity,
  BadgeCheck,
  Clock3,
  Copy,
  FileText,
  Fingerprint,
  Image,
  Link2,
  MonitorSmartphone,
  Pause,
  Play,
  Plus,
  QrCode,
  Radio,
  Inbox,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  Video,
  Wifi,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { createSessionId, formatBytes, formatDuration, nowPlus } from "@/lib/format";
import { authenticatePasskey } from "@/lib/passkeys";
import type { ConnectionHealth, LiveSession, TransferItem } from "@/lib/types";

const demoTransfers: TransferItem[] = [
  {
    id: "tr_img",
    name: "IMG_2044.png",
    kind: "image",
    size: 4_800_000,
    progress: 74,
    status: "transferring"
  },
  {
    id: "tr_text",
    name: "Clipboard text",
    kind: "text",
    size: 920,
    progress: 100,
    status: "complete"
  },
  {
    id: "tr_video",
    name: "match-highlight.mov",
    kind: "video",
    size: 87_000_000,
    progress: 18,
    status: "queued"
  }
];

export default function Home() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [keepLive, setKeepLive] = useState(true);
  const [receiverMode, setReceiverMode] = useState(false);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [health, setHealth] = useState<ConnectionHealth>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [backupPassword, setBackupPassword] = useState("");
  const [lastUnlockMode, setLastUnlockMode] = useState("Not verified yet");
  const [unlockError, setUnlockError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setHealth("expired");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => {
      setTransfers((items) =>
        items.map((item) => {
          if (item.status !== "transferring") return item;
          const progress = Math.min(100, item.progress + 3);
          return {
            ...item,
            progress,
            status: progress >= 100 ? "complete" : "transferring"
          };
        })
      );
    }, 900);
    return () => window.clearInterval(timer);
  }, [session]);

  const stats = useMemo(() => {
    const active = transfers.filter((item) => item.status === "transferring").length;
    const complete = transfers.filter((item) => item.status === "complete").length;
    const total = transfers.reduce((sum, item) => sum + item.size, 0);
    return { active, complete, total };
  }, [transfers]);

  async function wakeTransfer() {
    setUnlockError("");
    const authorized = await authorizeWake(backupPassword);
    if (!authorized) return;

    await registerServiceWorker();
    const nextSession: LiveSession = {
      id: createSessionId(),
      deviceName: "This device",
      receiverName: "Waiting receiver",
      createdAt: Date.now(),
      expiresAt: nowPlus(keepLive ? 12 : 1),
      keepLive,
      mode: "send"
    };

    setSession({
      ...nextSession
    });
    setHealth("live");
    setTransfers(demoTransfers);

    await openFloatingTransferWindow(nextSession);
  }

  function receiveTransfer() {
    setReceiverMode(true);
    setSession({
      id: createSessionId(),
      deviceName: "Receiver device",
      receiverName: "Sender nearby",
      createdAt: Date.now(),
      expiresAt: nowPlus(1),
      keepLive: false,
      mode: "receive"
    });
    setHealth("waiting");
    setTransfers([]);
  }

  function endSession() {
    setSession(null);
    setTransfers([]);
    setHealth("idle");
    setReceiverMode(false);
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map<TransferItem>((file, index) => ({
      id: `${file.name}-${Date.now()}-${index}`,
      name: file.name,
      kind: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("text/")
            ? "text"
            : "file",
      size: file.size,
      progress: 1,
      status: "transferring"
    }));
    setTransfers((items) => [...next, ...items]);
  }

  return (
    <main className="min-h-screen px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 rounded-[8px] border border-ink/10 bg-ink px-5 py-4 text-white shadow-soft md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Radio className="h-4 w-4 text-mint" />
              Live secure transfer pipe
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">EasyDataTransfer</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill health={health} />
            <button
              className="control inline-flex items-center gap-2 rounded-[8px] bg-white px-4 py-2 text-sm font-semibold text-ink"
              onClick={receiveTransfer}
            >
              <Inbox className="h-4 w-4" />
              Receive
            </button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass flex min-h-[430px] flex-col justify-between rounded-[8px] p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-steel">Zero storage. Biometric gated. Multi-send.</p>
                <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-normal sm:text-6xl">
                  Wake a private connection. Send anything until it expires.
                </h2>
              </div>
              <div className="rounded-[8px] border border-ink/10 bg-white p-3">
                <QrCode className="h-16 w-16" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Capability icon={Image} label="Images" />
                <Capability icon={Video} label="Video" />
                <Capability icon={FileText} label="Docs" />
                <Capability icon={Link2} label="Text" />
              </div>
              <div className="flex flex-col gap-3 sm:min-w-80">
                <label className="flex items-center justify-between rounded-[8px] border border-ink/10 bg-white p-3 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-coral" />
                    Keep Live up to 12h
                  </span>
                  <input
                    type="checkbox"
                    checked={keepLive}
                    onChange={(event) => setKeepLive(event.target.checked)}
                    className="h-5 w-5 accent-ink"
                  />
                </label>
                <input
                  type="password"
                  value={backupPassword}
                  onChange={(event) => setBackupPassword(event.target.value)}
                  placeholder="Set backup password (optional)"
                  className="control rounded-[8px] border border-ink/10 bg-white px-3 py-2 text-sm"
                />
                <button
                  className="control inline-flex w-full items-center justify-center gap-3 rounded-[8px] bg-ink px-5 py-4 text-base font-semibold text-white shadow-soft"
                  onClick={wakeTransfer}
                >
                  <Fingerprint className="h-5 w-5 text-mint" />
                  Wake up transfer
                </button>
                <p className="text-xs text-ink/70">
                  Laptop auth supports fingerprint, face unlock, device PIN, or saved password fallback.
                </p>
                {unlockError ? <p className="text-xs font-semibold text-coral">{unlockError}</p> : null}
              </div>
            </div>
          </div>

          <LiveWidget
            session={session}
            health={health}
            secondsLeft={secondsLeft}
            receiverMode={receiverMode}
            lastUnlockMode={lastUnlockMode}
            onOpenFloating={() => openFloatingTransferWindow(session)}
            onEnd={endSession}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Dashboard stats={stats} session={session} health={health} />
          <TransferPanel
            transfers={transfers}
            session={session}
            fileRef={fileRef}
            onFiles={addFiles}
            onPick={() => fileRef.current?.click()}
          />
        </section>
      </div>
    </main>
  );

  async function authorizeWake(localPassword: string) {
    try {
      await authenticatePasskey();
      setLastUnlockMode("Fingerprint / Face / Passkey");
      return true;
    } catch {
      if (!localPassword.trim()) {
        setUnlockError("Passkey was not available. Add a backup password to wake transfer.");
        return false;
      }

      const typed = window.prompt("Enter your backup password to wake transfer") ?? "";
      if (typed !== localPassword) {
        setUnlockError("Backup password did not match.");
        return false;
      }

      setLastUnlockMode("Backup password");
      return true;
    }
  }
}

function Capability({ icon: Icon, label }: { icon: typeof Image; label: string }) {
  return (
    <div className="rounded-[8px] border border-ink/10 bg-white p-3">
      <Icon className="h-5 w-5 text-steel" />
      <div className="mt-3 text-sm font-semibold">{label}</div>
    </div>
  );
}

function StatusPill({ health }: { health: ConnectionHealth }) {
  const copy = {
    idle: "Idle",
    waiting: "Waiting",
    live: "Live",
    reconnecting: "Reconnecting",
    expired: "Expired"
  }[health];
  return (
    <div className="control inline-flex items-center gap-2 rounded-[8px] border border-white/15 px-4 py-2 text-sm font-semibold">
      <span
        className={clsx("h-2.5 w-2.5 rounded-full", {
          "bg-white/45": health === "idle",
          "bg-yellow-300": health === "waiting" || health === "reconnecting",
          "bg-mint": health === "live",
          "bg-coral": health === "expired"
        })}
      />
      {copy}
    </div>
  );
}

function LiveWidget({
  session,
  health,
  secondsLeft,
  receiverMode,
  lastUnlockMode,
  onOpenFloating,
  onEnd
}: {
  session: LiveSession | null;
  health: ConnectionHealth;
  secondsLeft: number;
  receiverMode: boolean;
  lastUnlockMode: string;
  onOpenFloating: () => void;
  onEnd: () => void;
}) {
  return (
    <aside className="glass rounded-[8px] p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-steel">
          <Activity className="h-4 w-4" />
          Floating live widget preview
        </div>
        {session ? (
          <button className="rounded-[8px] p-2 hover:bg-ink/5" onClick={onEnd} aria-label="End session">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="mt-6 rounded-[8px] bg-ink p-4 text-white shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={clsx("h-3 w-3 rounded-full", {
                "bg-white/35": health === "idle",
                "bg-yellow-300": health === "waiting" || health === "reconnecting",
                "bg-mint": health === "live",
                "bg-coral": health === "expired"
              })}
            />
            <div>
              <div className="text-sm font-semibold">
                {session ? (receiverMode ? "Receiving pipe" : "Transfer pipe live") : "Pipe sleeping"}
              </div>
              <div className="text-xs text-white/60">
                {session ? `Session ${session.id}` : "Tap Wake up transfer to start"}
              </div>
            </div>
          </div>
          <button className="rounded-full bg-white/10 p-2" aria-label="Pause live widget">
            {session ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <MiniMetric label="Expires" value={session ? formatDuration(secondsLeft) : "0m"} />
          <MiniMetric label="Mode" value={session?.keepLive ? "Keep Live" : session ? "1 hour" : "Off"} />
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <WidgetRow icon={ShieldCheck} label="Auth" value={lastUnlockMode} />
        <WidgetRow icon={Wifi} label="Route" value={health === "live" ? "P2P direct" : "Signaling standby"} />
        <WidgetRow icon={MonitorSmartphone} label="Peer" value={session?.receiverName ?? "No receiver"} />
      </div>

      <button
        className="control mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-ink/10 bg-white px-4 py-2 text-sm font-semibold"
        onClick={onOpenFloating}
        disabled={!session}
      >
        <MonitorSmartphone className="h-4 w-4" />
        Open floating mini-window
      </button>
    </aside>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] bg-white/10 p-3">
      <div className="text-xs text-white/55">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function WidgetRow({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[8px] border border-ink/10 bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-steel">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Dashboard({
  stats,
  session,
  health
}: {
  stats: { active: number; complete: number; total: number };
  session: LiveSession | null;
  health: ConnectionHealth;
}) {
  return (
    <section className="glass rounded-[8px] p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Live data</h2>
        <BadgeCheck className="h-5 w-5 text-mint" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Live connections" value={session && health !== "expired" ? "1" : "0"} />
        <Stat label="Waiting" value={health === "waiting" ? "1" : "0"} />
        <Stat label="Transfers" value={`${stats.active} active`} />
        <Stat label="Completed" value={`${stats.complete}`} />
        <Stat label="Data stored" value="0 bytes" />
        <Stat label="Total queued" value={formatBytes(stats.total)} />
      </div>
      <div className="mt-5 rounded-[8px] border border-ink/10 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-steel">
          <Smartphone className="h-4 w-4" />
          Production routing policy
        </div>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          Files move browser to browser through WebRTC. The server keeps only session state, transfer
          metadata, and expiring signaling messages.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-ink/10 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-steel">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TransferPanel({
  transfers,
  session,
  fileRef,
  onPick,
  onFiles
}: {
  transfers: TransferItem[];
  session: LiveSession | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <section className="glass rounded-[8px] p-5 shadow-soft">
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        multiple
        onChange={(event) => onFiles(event.currentTarget.files)}
      />
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Transfers</h2>
          <p className="mt-1 text-sm text-ink/60">Images, videos, docs, links, text, and clipboard data.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="control inline-flex items-center gap-2 rounded-[8px] border border-ink/10 bg-white px-4 py-2 text-sm font-semibold"
            onClick={onPick}
            disabled={!session}
          >
            <Upload className="h-4 w-4" />
            Add files
          </button>
          <button
            className="control inline-flex items-center gap-2 rounded-[8px] bg-ink px-4 py-2 text-sm font-semibold text-white"
            disabled={!session}
          >
            <Send className="h-4 w-4 text-mint" />
            Send text
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {transfers.length ? (
          transfers.map((item) => <TransferRow key={item.id} item={item} />)
        ) : (
          <button
            className="flex min-h-44 flex-col items-center justify-center rounded-[8px] border border-dashed border-ink/20 bg-white/65 p-6 text-center"
            onClick={session ? onPick : undefined}
          >
            <Plus className="h-8 w-8 text-steel" />
            <span className="mt-3 text-sm font-semibold">
              {session ? "Add your first transfer" : "Wake a session to start sending"}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

function TransferRow({ item }: { item: TransferItem }) {
  const Icon = item.kind === "image" ? Image : item.kind === "video" ? Video : item.kind === "text" ? Copy : FileText;
  return (
    <div className="rounded-[8px] border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-[8px] bg-paper p-2">
            <Icon className="h-5 w-5 text-steel" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.name}</div>
            <div className="text-xs text-ink/55">{formatBytes(item.size)}</div>
          </div>
        </div>
        <span className="text-xs font-semibold capitalize text-steel">{item.status}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
        <div
          className={clsx("h-full rounded-full", item.status === "complete" ? "bg-mint" : "bg-coral")}
          style={{ width: `${item.progress}%` }}
        />
      </div>
    </div>
  );
}

async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // Registration can fail in unsupported previews; the app still works without PWA extras.
  }
}

async function openFloatingTransferWindow(session: LiveSession | null) {
  if (!session || typeof window === "undefined") return;
  if (!window.matchMedia("(min-width: 960px)").matches) return;

  const summary = {
    mode: session.mode === "send" ? "Sending" : "Receiving",
    expires: formatDuration(Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)))
  };

  const pipApi = (window as Window & {
    documentPictureInPicture?: {
      requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
    };
  }).documentPictureInPicture;

  if (pipApi) {
    try {
      const pip = await pipApi.requestWindow({ width: 360, height: 220 });
      pip.document.body.innerHTML = floatingPanelMarkup(session.id, summary.mode, summary.expires);
      pip.document.title = "EasyDataTransfer Live";
      return;
    } catch {
      // If PiP is blocked or unavailable, fall back to a popup window.
    }
  }

  const popup = window.open("", "easytransfer-live", "width=360,height=240,resizable=yes");
  if (!popup) return;
  popup.document.body.innerHTML = floatingPanelMarkup(session.id, summary.mode, summary.expires);
  popup.document.title = "EasyDataTransfer Live";
}

function floatingPanelMarkup(sessionId: string, mode: string, expires: string) {
  return `
    <div style="
      font-family: Inter, system-ui, sans-serif;
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at top left, #9ef3d0 0%, #e8fff5 36%, #f4f8ff 100%);
      color: #121417;
      padding: 12px;
    ">
      <div style="background:#ffffffd9;border:1px solid #1214171f;border-radius:12px;padding:14px;width:100%;max-width:320px;">
        <div style="font-size:12px;font-weight:700;color:#44515d;letter-spacing:.02em;">Floating transfer</div>
        <div style="margin-top:8px;font-size:18px;font-weight:700;">${mode} session active</div>
        <div style="margin-top:6px;font-size:12px;color:#5f6a74;">Session ${sessionId}</div>
        <div style="margin-top:10px;font-size:13px;color:#36404a;">Expires in ${expires}</div>
      </div>
    </div>
  `;
}
