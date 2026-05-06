export type ConnectionHealth = "idle" | "waiting" | "live" | "reconnecting" | "expired";

export type TransferKind = "image" | "video" | "text" | "file";

export type TransferStatus = "queued" | "transferring" | "complete" | "failed";

export type TransferItem = {
  id: string;
  name: string;
  kind: TransferKind;
  size: number;
  progress: number;
  status: TransferStatus;
};

export type LiveSession = {
  id: string;
  deviceName: string;
  receiverName: string;
  createdAt: number;
  expiresAt: number;
  keepLive: boolean;
  mode: "send" | "receive";
};

export type SignalMessage =
  | {
      type: "join";
      sessionId: string;
      peerId: string;
      role: "sender" | "receiver";
    }
  | {
      type: "offer" | "answer";
      sessionId: string;
      peerId: string;
      payload: RTCSessionDescriptionInit;
    }
  | {
      type: "ice";
      sessionId: string;
      peerId: string;
      payload: RTCIceCandidateInit;
    }
  | {
      type: "presence";
      sessionId: string;
      peerId: string;
      status: "online" | "offline";
    };
