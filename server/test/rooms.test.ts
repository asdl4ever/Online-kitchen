import { describe, expect, it } from "vitest";
import { RoomManager, MAX_PLAYERS_PER_ROOM } from "../src/rooms.js";

describe("RoomManager", () => {
  it("creates a room and sets the creator as host", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    expect(room.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(room.players).toEqual(["p1"]);
    expect(room.hostId).toBe("p1");
  });

  it("generates unique room codes", () => {
    const manager = new RoomManager();
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(manager.createRoom(`p${i}`).code);
    }
    expect(codes.size).toBe(100);
  });

  it("joins an existing room case-insensitively", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    const joined = manager.joinRoom(room.code.toLowerCase(), "p2");
    expect(joined.players).toEqual(["p1", "p2"]);
  });

  it("keeps host when the host leaves and hands it to the next player", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    manager.joinRoom(room.code, "p2");
    const updated = manager.leaveRoom(room.code, "p1");
    expect(updated?.hostId).toBe("p2");
    expect(updated?.players).toEqual(["p2"]);
  });

  it("deletes an empty room when the last player leaves", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    manager.leaveRoom(room.code, "p1");
    expect(manager.getRoom(room.code)).toBeUndefined();
    expect(manager.size).toBe(0);
  });

  it("rejects joining a non-existent room", () => {
    const manager = new RoomManager();
    expect(() => manager.joinRoom("ZZZZ", "p1")).toThrow("room-not-found");
  });

  it("rejects joining a full room", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    for (let i = 1; i < MAX_PLAYERS_PER_ROOM; i++) {
      manager.joinRoom(room.code, `p${i + 1}`);
    }
    expect(() => manager.joinRoom(room.code, "extra")).toThrow("room-full");
  });

  it("does not duplicate the same player in a room", () => {
    const manager = new RoomManager();
    const room = manager.createRoom("p1");
    const joined = manager.joinRoom(room.code, "p1");
    expect(joined.players).toEqual(["p1"]);
  });
});