import Phaser from "phaser";
import type { GameSession } from "./session";
import { SESSION_KEY } from "./session";
import {
  createPlayerRig,
  movePlayerRig,
  syncPlayerVisuals,
  type PlayerRig,
} from "./player";

export const MAIN_SCENE_KEY = "MainScene";
export const RESTAURANT_SCENE_KEY = "RestaurantScene";
export const LUMBER_YARD_SCENE_KEY = "LumberYardScene";
export const ARCADE_SCENE_KEY = "ArcadeScene";
export const CASINO_SCENE_KEY = "CasinoScene";

/** Registry key for the map position to drop the player at after exiting. */
export const ENTRY_RETURN_KEY = "entry-return";

export interface RoomLayout {
  width: number;
  height: number;
  floorColor: number;
  wallColor: number;
  doorPos: { x: number; y: number };
}

export type RoomPendingInteract =
  | { kind: "counter" }
  | { kind: "seat"; tableIndex: number }
  | { kind: "exit" }
  | null;

/**
 * Base for indoor room scenes: draws floor/walls/door, owns a local player,
 * forwards F/E/Esc keys, and returns to the map on exit.
 */
export abstract class RoomScene extends Phaser.Scene {
  protected session!: GameSession;
  protected rig!: PlayerRig;
  protected layout!: RoomLayout;
  protected pending: RoomPendingInteract = null;
  protected roomLabel = "";
  /** While seated the ball is fixed to the chair; F stands up. */
  protected movementLocked = false;

  protected abstract getLayout(): RoomLayout;
  protected abstract drawRoom(): void;
  protected abstract detectInteract(): void;
  protected abstract onInteract(): void;
  /** Called every frame after movement; override for scene-specific logic. */
  protected roomUpdate(_dtSeconds: number): void {}

  create(): void {
    this.session = this.game.registry.get(SESSION_KEY) as GameSession;
    this.layout = this.getLayout();
    this.pending = null;

    this.physics.world.setBounds(0, 0, this.layout.width, this.layout.height);

    this.drawRoom();

    this.rig = createPlayerRig(this, this.layout.doorPos.x, this.layout.doorPos.y + 36);

    this.cameras.main.setBounds(0, 0, this.layout.width, this.layout.height);
    this.cameras.main.startFollow(this.rig.circle, true, 0.1, 0.1);
    if (
      this.layout.width <= this.scale.width &&
      this.layout.height <= this.scale.height
    ) {
      this.cameras.main.centerOn(this.layout.width / 2, this.layout.height / 2);
    }

    this.bridgePatchPrompt(null);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.session.tick(delta);

    if (this.movementLocked) {
      this.rig.body.setVelocity(0, 0);
    } else {
      movePlayerRig(this.rig);
    }
    syncPlayerVisuals(this.rig, this.input.activePointer);

    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.interact)) {
      this.onInteract();
    }
    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.openInventory)) {
      this.session.bridge.patch({
        inventoryOpen: !this.session.bridge.getSnapshot().inventoryOpen,
      });
    }
    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.openSettings)) {
      this.session.bridge.patch({
        settingsOpen: !this.session.bridge.getSnapshot().settingsOpen,
      });
    }

    this.detectInteract();
    this.roomUpdate(dt);
  }

  protected exitRoom(): void {
    if (this.session.seatedTable !== null) {
      this.session.standUp(true);
    }
    this.movementLocked = false;
    this.bridgePatchPrompt(null);
    this.scene.stop();
    this.scene.wake(MAIN_SCENE_KEY);
  }

  protected bridgePatchPrompt(prompt: string | null): void {
    if (prompt !== this.session.bridge.getSnapshot().prompt) {
      this.session.bridge.patch({ prompt });
    }
  }

  /** Shared helpers for room drawing. */
  protected drawFloorAndWalls(label: string): void {
    const { width, height, floorColor, wallColor } = this.layout;
    this.add.rectangle(width / 2, height / 2, width, height, floorColor);
    // Walls
    const t = 24;
    this.add.rectangle(width / 2, t / 2, width, t, wallColor);
    this.add.rectangle(width / 2, height - t / 2, width, t, wallColor);
    this.add.rectangle(t / 2, height / 2, t, height, wallColor);
    this.add.rectangle(width - t / 2, height / 2, t, height, wallColor);
    // Door gap on the bottom wall
    const door = this.layout.doorPos;
    this.add.rectangle(door.x, height - t / 2, 72, t, 0x8a6642);
    // Title plaque
    const text = this.add
      .text(width / 2, 44, label, {
        fontSize: "22px",
        color: "#fff8ec",
        fontStyle: "bold",
        padding: { x: 16, y: 6 },
      })
      .setOrigin(0.5);
    const bg = this.add.graphics();
    const w = text.width + 24;
    bg.fillStyle(0x3d2b1f, 0.85);
    bg.fillRoundedRect(width / 2 - w / 2, 44 - 20, w, 40, 12);
    bg.lineStyle(2, 0xfffaf2, 0.9);
    bg.strokeRoundedRect(width / 2 - w / 2, 44 - 20, w, 40, 12);
    text.setDepth(bg.depth + 1);
  }

  protected drawDoor(): void {
    const door = this.layout.doorPos;
    this.add
      .text(door.x, door.y, "🚪", { fontSize: "30px" })
      .setOrigin(0.5);
  }

  protected near(pos: { x: number; y: number }, target: { x: number; y: number }, range = 70): boolean {
    return Math.hypot(pos.x - target.x, pos.y - target.y) <= range;
  }
}