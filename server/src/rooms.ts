export const MAX_PLAYERS_PER_ROOM = 4;
export const ROOM_CODE_LENGTH = 4;

export interface Room {
  code: string;
  players: string[];
  hostId: string;
  createdAt: number;
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(playerId: string): Room {
    if (this.rooms.size >= 10000) {
      throw new Error("too-many-rooms");
    }
    let code = randomCode();
    for (let i = 0; i < 1000 && this.rooms.has(code); i++) {
      code = randomCode();
    }
    const room: Room = {
      code,
      players: [playerId],
      hostId: playerId,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  joinRoom(rawCode: string, playerId: string): Room {
    const code = normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error("room-not-found");
    }
    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw new Error("room-full");
    }
    if (!room.players.includes(playerId)) {
      room.players.push(playerId);
    }
    return room;
  }

  leaveRoom(rawCode: string, playerId: string): Room | undefined {
    const code = normalizeCode(rawCode);
    const room = this.rooms.get(code);
    if (!room) return undefined;
    room.players = room.players.filter((id) => id !== playerId);
    if (room.players.length === 0) {
      this.rooms.delete(code);
      return room;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players[0];
    }
    return room;
  }

  getRoom(rawCode: string): Room | undefined {
    return this.rooms.get(normalizeCode(rawCode));
  }

  get size(): number {
    return this.rooms.size;
  }
}