import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { RoomManager, MAX_PLAYERS_PER_ROOM } from "./rooms.js";

interface ClientInfo {
  socket: WebSocket;
  playerId: string;
  roomCode?: string;
  name?: string;
}

const PORT = Number(process.env.PORT ?? 3001);
const manager = new RoomManager();
const clients = new Map<WebSocket, ClientInfo>();

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", rooms: manager.size }));
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

function broadcast(
  roomCode: string,
  type: string,
  payload: unknown,
  excludeId?: string,
): void {
  for (const [, info] of clients) {
    if (info.roomCode === roomCode && info.playerId !== excludeId) {
      send(info.socket, type, payload);
    }
  }
}

function errorOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

wss.on("connection", (socket) => {
  const playerId = randomUUID();
  clients.set(socket, { socket, playerId });

  send(socket, "welcome", { playerId });

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
        const p = (msg.payload as { name?: string } | undefined) ?? {};
        const name = p.name?.trim().slice(0, 12) || `玩家${playerId.slice(0, 4)}`;
        info.name = name;
        const room = manager.createRoom(playerId);
        info.roomCode = room.code;
        room.names.set(playerId, name);
        send(socket, "room-joined", {
          code: room.code,
          players: room.players.map((id) => ({
            id,
            name: room.names.get(id) ?? id.slice(0, 6),
          })),
          hostId: room.hostId,
          you: playerId,
        });
        break;
      }
      case "join-room": {
        const raw = String(
          (msg.payload as { code?: unknown; name?: unknown } | undefined)?.code ?? "",
        );
        const p = (msg.payload as { name?: string } | undefined) ?? {};
        const name = p.name?.trim().slice(0, 12) || `玩家${playerId.slice(0, 4)}`;
        info.name = name;
        try {
          const room = manager.joinRoom(raw, playerId);
          info.roomCode = room.code;
          room.names.set(playerId, name);
          send(socket, "room-joined", {
            code: room.code,
            players: room.players.map((id) => ({
              id,
              name: room.names.get(id) ?? id.slice(0, 6),
            })),
            hostId: room.hostId,
            you: playerId,
          });
          broadcast(
            room.code,
            "player-joined",
            { id: playerId, name },
            playerId,
          );
        } catch (err) {
          send(socket, "error", { message: errorOf(err) });
        }
        break;
      }
      case "leave-room": {
        const code = info.roomCode;
        if (code) {
          broadcast(code, "player-left", { id: playerId }, playerId);
          manager.leaveRoom(code, playerId);
          info.roomCode = undefined;
        }
        send(socket, "room-left", {});
        break;
      }
      case "set-name": {
        const p = (msg.payload as { name?: string }) ?? {};
        const name = p.name?.trim().slice(0, 12);
        if (name) {
          info.name = name;
          if (info.roomCode) {
            const room = manager.getRoom(info.roomCode);
            if (room) room.names.set(playerId, name);
          }
        }
        break;
      }
      case "position": {
        const p = (msg.payload as { x?: unknown; y?: unknown }) ?? {};
        const x = Number(p.x);
        const y = Number(p.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) break;
        if (info.roomCode) {
          const room = manager.getRoom(info.roomCode);
          if (room) {
            room.positions.set(playerId, { x, y });
            broadcast(
              info.roomCode,
              "player-moved",
              { id: playerId, x, y },
              playerId,
            );
          }
        }
        break;
      }
      default:
        send(socket, "error", { message: "unknown-message" });
    }
  });

  socket.on("close", () => {
    const info = clients.get(socket);
    if (info?.roomCode) {
      broadcast(info.roomCode, "player-left", { id: info.playerId }, info.playerId);
      manager.leaveRoom(info.roomCode, info.playerId);
    }
    clients.delete(socket);
  });
});

console.log(`[server] listening on http://localhost:${PORT}`);
console.log(`[server] max players per room: ${MAX_PLAYERS_PER_ROOM}`);
server.listen(PORT);
