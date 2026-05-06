import type { SignalMessage } from "@/lib/types";

export type PeerOptions = {
  sessionId: string;
  peerId: string;
  role: "sender" | "receiver";
  signalingUrl: string;
  onMessage: (data: ArrayBuffer | string) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class TransferPeer {
  private readonly connection: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private socket: WebSocket | null = null;

  constructor(private readonly options: PeerOptions) {
    this.connection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(process.env.NEXT_PUBLIC_TURN_URL
          ? [
              {
                urls: process.env.NEXT_PUBLIC_TURN_URL,
                username: process.env.NEXT_PUBLIC_TURN_USERNAME,
                credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL
              }
            ]
          : [])
      ]
    });

    this.connection.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.sendSignal({
        type: "ice",
        sessionId: this.options.sessionId,
        peerId: this.options.peerId,
        payload: event.candidate.toJSON()
      });
    };

    this.connection.ondatachannel = (event) => {
      this.attachChannel(event.channel);
    };
  }

  async connect() {
    this.socket = new WebSocket(this.options.signalingUrl);
    this.socket.addEventListener("open", async () => {
      this.sendSignal({
        type: "join",
        sessionId: this.options.sessionId,
        peerId: this.options.peerId,
        role: this.options.role
      });

      if (this.options.role === "sender") {
        this.channel = this.connection.createDataChannel("easydatatransfer", {
          ordered: true
        });
        this.attachChannel(this.channel);
        const offer = await this.connection.createOffer();
        await this.connection.setLocalDescription(offer);
        this.sendSignal({
          type: "offer",
          sessionId: this.options.sessionId,
          peerId: this.options.peerId,
          payload: offer
        });
      }
    });

    this.socket.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data as string) as SignalMessage;
      if (message.sessionId !== this.options.sessionId || message.peerId === this.options.peerId) return;

      if (message.type === "offer") {
        await this.connection.setRemoteDescription(message.payload);
        const answer = await this.connection.createAnswer();
        await this.connection.setLocalDescription(answer);
        this.sendSignal({
          type: "answer",
          sessionId: this.options.sessionId,
          peerId: this.options.peerId,
          payload: answer
        });
      }

      if (message.type === "answer") {
        await this.connection.setRemoteDescription(message.payload);
      }

      if (message.type === "ice") {
        await this.connection.addIceCandidate(message.payload);
      }
    });
  }

  send(data: ArrayBuffer | string) {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Transfer channel is not open");
    }
    if (typeof data === "string") {
      this.channel.send(data);
      return;
    }

    this.channel.send(data);
  }

  close() {
    this.channel?.close();
    this.connection.close();
    this.socket?.close();
    this.options.onClose?.();
  }

  private attachChannel(channel: RTCDataChannel) {
    this.channel = channel;
    this.channel.binaryType = "arraybuffer";
    this.channel.onopen = () => this.options.onOpen?.();
    this.channel.onclose = () => this.options.onClose?.();
    this.channel.onmessage = (event) => this.options.onMessage(event.data as ArrayBuffer | string);
  }

  private sendSignal(message: SignalMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }
}
