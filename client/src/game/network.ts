export interface RemotePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
}

export type NetworkEvent =
  | { type: "connected"; playerId: string }
  | { type: "room-joined"; code: string; players: RemotePlayer[]; hostId: string; you: string }
  | { type: "room-left" }
  | { type: "player-joined"; id: string; name: string }
  | { type: "player-left"; id: string }
  | { type: "player-moved"; id: string; x: number; y: number }
  | { type: "error"; message: string };

type Listener = (event: NetworkEvent) => void;

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:3001";

export class Network {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private _playerId: string | null = null;
  private _roomCode: string | null = null;
  private _connected = false;

  get playerId(): string | null { return this._playerId; }
  get roomCode(): string | null { return this._roomCode; }
  get connected(): boolean { return this._connected; }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(event: NetworkEvent): void {
    for (const fn of this.listeners) fn(event);
  }

  connect(): void {
    if (this.ws) return;
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      this._connected = true;
    };

    ws.onmessage = (ev) => {
      let msg: { type?: string; payload?: unknown };
      try { msg = JSON.parse(String(ev.data)); } catch { return; }
      const p = msg.payload as Record<string, unknown> | undefined;
      switch (msg.type) {
        case "welcome":
          this._playerId = String(p?.playerId ?? "");
          this.emit({ type: "connected", playerId: this._playerId });
          break;
        case "room-joined":
          this._roomCode = String(p?.code ?? "");
          this.emit({
            type: "room-joined",
            code: this._roomCode,
            players: (p?.players as { id: string; name: string }[] ?? []).map((pp) => ({
              id: pp.id, name: pp.name, x: 0, y: 0,
            })),
            hostId: String(p?.hostId ?? ""),
            you: String(p?.you ?? ""),
          });
          break;
        case "room-left":
          this._roomCode = null;
          this.emit({ type: "room-left" });
          break;
        case "player-joined":
          this.emit({ type: "player-joined", id: String(p?.id ?? ""), name: String(p?.name ?? "") });
          break;
        case "player-left":
          this.emit({ type: "player-left", id: String(p?.id ?? "") });
          break;
        case "player-moved":
          this.emit({ type: "player-moved", id: String(p?.id ?? ""), x: Number(p?.x ?? 0), y: Number(p?.y ?? 0) });
          break;
        case "error":
          this.emit({ type: "error", message: String(p?.message ?? "unknown") });
          break;
      }
    };

    ws.onclose = () => {
      this._connected = false;
      this.ws = null;
      this._roomCode = null;
    };

    ws.onerror = () => {
      this._connected = false;
    };
  }

  private send(type: string, payload?: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  createRoom(name: string): void {
    this.connect();
    const waitOpen = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("create-room", { name });
      } else {
        setTimeout(waitOpen, 50);
      }
    };
    waitOpen();
  }

  joinRoom(code: string, name: string): void {
    this.connect();
    const waitOpen = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send("join-room", { code, name });
      } else {
        setTimeout(waitOpen, 50);
      }
    };
    waitOpen();
  }

  leaveRoom(): void {
    this.send("leave-room");
  }

  sendPosition(x: number, y: number): void {
    this.send("position", { x: Math.round(x), y: Math.round(y) });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this._connected = false;
    this._roomCode = null;
  }
}
