import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { RoomManager, MAX_PLAYERS_PER_ROOM } from "./rooms.js";

interface ClientInfo {
  socket: WebSocket;
  roomCode?: string;
}

const PORT = Number(process.env.PORT ?? 3001);
const manager = new RoomManager();
const clients = new Map<WebSocket, ClientInfo>();

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

function send(socket: WebSocket, type: string, payload: unknown): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ type, payload }));
  }
}

function errorOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

wss.on("connection", (socket) => {
  clients.set(socket, { socket });

  socket.on("message", (data) => {
    let msg: { type?: string; payload?: unknown };
    try {
      msg = JSON.parse(String(data));
    } catch {
      send(socket, "error", { message: "bad-json" });
      return;
    }

    const info = clients.get(socket)!;
    switch (msg.type) {
      case "create-room": {
        const room = manager.createRoom(playerId(socket));
        info.roomCode = room.code;
        send(socket, "room-joined", {
          code: room.code,
          players: room.players,
          hostId: room.hostId,
        });
        break;
      }
      case "join-room": {
        const raw = String((msg.payload as { code?: unknown } | undefined)?.code ?? "");
        try {
          const room = manager.joinRoom(raw, playerId(socket));
          info.roomCode = room.code;
          send(socket, "room-joined", {
            code: room.code,
            players: room.players,
            hostId: room.hostId,
          });
        } catch (err) {
          send(socket, "error", { message: errorOf(err) });
        }
        break;
      }
      case "leave-room": {
        const code = info.roomCode;
        if (code) {
          manager.leaveRoom(code, playerId(socket));
          info.roomCode = undefined;
        }
        send(socket, "room-left", {});
        break;
      }
      default:
        send(socket, "error", { message: "unknown-message" });
    }
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info?.roomCode) {
      manager.leaveRoom(info.roomCode, playerId(socket));
    }
    clients.delete(socket);
  });
});

function playerId(socket: WebSocket): string {
  const ip = (socket as unknown as { _socket?: { remoteAddress?: string } })._socket
    ?.remoteAddress;
  return ip ?? "unknown";
}

console.log(`[server] listening on http://localhost:${PORT}`);
console.log(`[server] max players per room: ${MAX_PLAYERS_PER_ROOM}`);
server.listen(PORT);