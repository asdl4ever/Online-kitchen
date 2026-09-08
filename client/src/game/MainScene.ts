import Phaser from "phaser";
import { AREAS, areaAt, WORLD_BOUNDS, type Area } from "shared";
import { GameBridge, GAME_BRIDGE_KEY } from "./bridge";
import { SESSION_KEY, type GameSession } from "./session";
import {
  createPlayerRig,
  movePlayerRig,
  syncPlayerVisuals,
  teleportPlayer,
  type PlayerRig,
} from "./player";
import {
  RESTAURANT_SCENE_KEY,
  LUMBER_YARD_SCENE_KEY,
  ENTRY_RETURN_KEY,
} from "./RoomScene";
import type { TreeSprite } from "./types";

const AREA_COLORS: Record<Area["kind"], number> = {
  spawn: 0x7ec850,
  forest: 0x2f6b2f,
  lumberYard: 0x8a6642,
  restaurant: 0xe0574f,
  phoneStore: 0x5b7bd5,
};

const AREA_PLAQUE_EMOJI: Record<Area["kind"], string> = {
  spawn: "⛲",
  forest: "🌲",
  lumberYard: "🪵",
  restaurant: "🍽️",
  phoneStore: "📱",
};

export const AREA_CHANGE_EVENT = "area-change";

const LUMBER_BUILDING = { x: -400, y: -140 };
const LUMBER_DOOR = { x: -400, y: -76 };
const RESTAURANT_BUILDING = { x: 0, y: 330 };
const RESTAURANT_DOOR = { x: 0, y: 402 };
const PHONE_STORE_POS = { x: 340, y: 350 };

type PendingInteract =
  | { kind: "enter-restaurant" }
  | { kind: "enter-lumber" }
  | { kind: "phone-shop" }
  | null;

export class MainScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private session!: GameSession;
  private rig!: PlayerRig;
  private lastAreaLabel: string | undefined;
  private pendingInteract: PendingInteract = null;
  private treeSprites = new Map<string, TreeSprite>();

  constructor() {
    super("MainScene");
  }

  create(): void {
    // Bridge & session are attached via the game registry before boot.
    this.bridge = this.game.registry.get(GAME_BRIDGE_KEY) as GameBridge;
    this.session = this.game.registry.get(SESSION_KEY) as GameSession;

    this.physics.world.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );

    this.drawWorld();
    this.drawBuildings();

    this.rig = createPlayerRig(this, 0, 0);

    this.cameras.main.startFollow(this.rig.circle, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );

    this.events.on("wake", () => this.onWake());
    this.session.publishSnapshot();
  }

  private onWake(): void {
    const returnPos = this.game.registry.get(ENTRY_RETURN_KEY) as
      | { x: number; y: number }
      | undefined;
    if (returnPos) {
      this.game.registry.remove(ENTRY_RETURN_KEY);
      teleportPlayer(this.rig, returnPos.x, returnPos.y);
    }
    this.pendingInteract = null;
  }

  private drawWorld(): void {
    this.add.rectangle(
      WORLD_BOUNDS.x + WORLD_BOUNDS.width / 2,
      WORLD_BOUNDS.y + WORLD_BOUNDS.height / 2,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
      0xcfe8cf,
    ).setOrigin(0.5);

    for (const area of AREAS) {
      const cx = area.bounds.x + area.bounds.width / 2;
      const cy = area.bounds.y + area.bounds.height / 2;
      this.add.rectangle(
        cx,
        cy,
        area.bounds.width,
        area.bounds.height,
        AREA_COLORS[area.kind],
        0.8,
      );
      this.drawAreaPlaque(area);
    }

    this.drawGrassDecor();
    this.drawWorldFence();
  }

  private drawAreaPlaque(area: Area): void {
    const cx = area.bounds.x + area.bounds.width / 2;
    const top = area.bounds.y + 18;
    const label = `${AREA_PLAQUE_EMOJI[area.kind] ?? "📍"} ${area.label}`;
    const text = this.add
      .text(cx, top, label, {
        fontSize: "17px",
        color: "#ffffff",
        fontStyle: "bold",
        padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5);
    const w = text.width + 20;
    const h = 34;
    const bg = this.add.graphics();
    bg.fillStyle(0x3d2b1f, 0.72);
    bg.fillRoundedRect(cx - w / 2, top - h / 2, w, h, 12);
    bg.lineStyle(2, 0xfffaf2, 0.9);
    bg.strokeRoundedRect(cx - w / 2, top - h / 2, w, h, 12);
    text.setDepth(bg.depth + 1);
  }

  private drawGrassDecor(): void {
    const decor = ["🌿", "🌱", "🌼", "🌷", "🍀", "🍄"];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 90; i++) {
      const x = WORLD_BOUNDS.x + 30 + rand() * (WORLD_BOUNDS.width - 60);
      const y = WORLD_BOUNDS.y + 30 + rand() * (WORLD_BOUNDS.height - 60);
      if (this.insideAnyArea(x, y)) continue;
      const emoji = decor[Math.floor(rand() * decor.length)];
      this.add
        .text(x, y, emoji, { fontSize: `${14 + Math.floor(rand() * 8)}px` })
        .setOrigin(0.5)
        .setAlpha(0.85);
    }
  }

  private insideAnyArea(x: number, y: number): boolean {
    return AREAS.some(
      (a) =>
        x >= a.bounds.x &&
        x <= a.bounds.x + a.bounds.width &&
        y >= a.bounds.y &&
        y <= a.bounds.y + a.bounds.height,
    );
  }

  private drawWorldFence(): void {
    const step = 64;
    const minX = WORLD_BOUNDS.x;
    const minY = WORLD_BOUNDS.y;
    const maxX = WORLD_BOUNDS.x + WORLD_BOUNDS.width;
    const maxY = WORLD_BOUNDS.y + WORLD_BOUNDS.height;
    for (let x = minX; x <= maxX; x += step) {
      this.add.text(x, minY, "🪵", { fontSize: "18px" }).setOrigin(0.5);
      this.add.text(x, maxY, "🪵", { fontSize: "18px" }).setOrigin(0.5);
    }
    for (let y = minY + step; y < maxY; y += step) {
      this.add.text(minX, y, "🪵", { fontSize: "18px" }).setOrigin(0.5);
      this.add.text(maxX, y, "🪵", { fontSize: "18px" }).setOrigin(0.5);
    }
  }

  private drawBuildings(): void {
    this.drawBuilding(LUMBER_BUILDING, "🏪", "木材店", "🪵");
    this.drawDoorMarker(LUMBER_DOOR);
    this.drawBuilding(RESTAURANT_BUILDING, "🍽️", "餐厅", "🧑‍🍳");
    this.drawDoorMarker(RESTAURANT_DOOR);
    this.drawShopMarker(PHONE_STORE_POS, "📱", "手机店", "📲 买手机");
  }

  private drawBuilding(
    pos: { x: number; y: number },
    emoji: string,
    label: string,
    counterEmoji: string,
  ): void {
    // Shadow
    this.add.ellipse(pos.x + 2, pos.y + 34, 110, 18, 0x3d2b1f, 0.18);
    // Building body
    this.add.rectangle(pos.x, pos.y, 120, 84, 0x6b5140, 0.95);
    // Roof
    this.add.rectangle(pos.x, pos.y - 46, 132, 20, 0x8a5a44, 0.98);
    this.add.rectangle(pos.x, pos.y - 32, 120, 10, 0x7a4c3a, 0.98);
    // Window + counter emoji inside
    this.add.rectangle(pos.x - 30, pos.y + 4, 26, 22, 0xfff3d6, 0.95);
    this.add.text(pos.x + 26, pos.y + 4, counterEmoji, { fontSize: "22px" }).setOrigin(0.5);
    // Sign
    const sign = this.add
      .text(pos.x, pos.y - 72, `${emoji} ${label}`, {
        fontSize: "14px",
        color: "#fff8ec",
        fontStyle: "bold",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5);
    const sw = sign.width + 14;
    const signBg = this.add.graphics();
    signBg.fillStyle(0x3d2b1f, 0.82);
    signBg.fillRoundedRect(pos.x - sw / 2, pos.y - 90, sw, 28, 10);
    sign.setDepth(signBg.depth + 1);
  }

  private drawDoorMarker(pos: { x: number; y: number }): void {
    this.add
      .text(pos.x, pos.y, "🚪", { fontSize: "24px" })
      .setOrigin(0.5);
    this.add
      .text(pos.x, pos.y + 22, "进入", {
        fontSize: "11px",
        color: "#fff8ec",
        backgroundColor: "#3d2b1f99",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
  }

  private drawShopMarker(
    pos: { x: number; y: number },
    emoji: string,
    label: string,
    hint?: string,
  ): void {
    this.add.ellipse(pos.x + 2, pos.y + 22, 60, 14, 0x3d2b1f, 0.18);
    this.add.rectangle(pos.x, pos.y, 52, 42, 0x3b3b3b, 0.92);
    this.add.rectangle(pos.x, pos.y - 4, 44, 30, 0x574434, 0.95);
    this.add.text(pos.x + 2, pos.y - 4, emoji, { fontSize: "26px" }).setOrigin(0.5);
    const sign = this.add
      .text(pos.x, pos.y - 34, `${emoji} ${label}`, {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);
    const sw = sign.width + 12;
    const signBg = this.add.graphics();
    signBg.fillStyle(0x3d2b1f, 0.78);
    signBg.fillRoundedRect(pos.x - sw / 2, pos.y - 46, sw, 24, 8);
    sign.setDepth(signBg.depth + 1);
    if (hint) {
      this.add
        .text(pos.x, pos.y + 32, hint, {
          fontSize: "11px",
          color: "#fff8ec",
          backgroundColor: "#3d2b1f99",
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5);
    }
  }

  private pressInteract(): void {
    switch (this.pendingInteract?.kind) {
      case "enter-restaurant":
        this.enterRoom(RESTAURANT_SCENE_KEY, RESTAURANT_DOOR);
        break;
      case "enter-lumber":
        this.enterRoom(LUMBER_YARD_SCENE_KEY, LUMBER_DOOR);
        break;
      case "phone-shop":
        this.bridge.patch({ phoneShopOpen: true });
        break;
    }
  }

  private enterRoom(sceneKey: string, doorOnMap: { x: number; y: number }): void {
    this.bridgePatchPrompt(null);
    // Drop the player in front of the door when they come back out.
    this.game.registry.set(ENTRY_RETURN_KEY, {
      x: doorOnMap.x,
      y: doorOnMap.y + 24,
    });
    this.scene.sleep();
    this.scene.launch(sceneKey);
  }

  private bridgePatchPrompt(prompt: string | null): void {
    if (prompt !== this.bridge.getSnapshot().prompt) {
      this.bridge.patch({ prompt });
    }
  }

  private detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const range = 70;

    let next: PendingInteract = null;
    let prompt: string | null = null;
    if (dist(pos, RESTAURANT_DOOR) <= range) {
      next = { kind: "enter-restaurant" };
      prompt = "按 F 进入餐厅";
    } else if (dist(pos, LUMBER_DOOR) <= range) {
      next = { kind: "enter-lumber" };
      prompt = "按 F 进入木材店";
    } else if (dist(pos, PHONE_STORE_POS) <= range) {
      next = { kind: "phone-shop" };
      prompt = this.session.inventory.hasPhone ? "按 F 进入手机店" : "按 F 买手机";
    }
    this.pendingInteract = next;
    this.bridgePatchPrompt(prompt);
  }

  update(_time: number, _delta: number): void {
    this.session.tick(this.game.loop.delta);

    // Chop with held mouse button
    const pointer = this.input.activePointer;
    if (pointer.isDown && pointer.button === 0) {
      this.session.chopAt(
        { x: this.rig.circle.x, y: this.rig.circle.y },
        this.game.loop.delta / 1000,
      );
    }

    movePlayerRig(this.rig);
    syncPlayerVisuals(this.rig);

    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.interact)) {
      this.pressInteract();
    }
    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.openInventory)) {
      this.bridge.patch({
        inventoryOpen: !this.bridge.getSnapshot().inventoryOpen,
      });
    }
    if (Phaser.Input.Keyboard.JustDown(this.rig.keys.openSettings)) {
      this.bridge.patch({
        settingsOpen: !this.bridge.getSnapshot().settingsOpen,
      });
    }

    this.detectInteract();
    this.renderTrees();

    const area = areaAt({ x: this.rig.circle.x, y: this.rig.circle.y });
    const label = area ? area.label : "野外地带";
    if (label !== this.lastAreaLabel) {
      this.lastAreaLabel = label;
      this.events.emit(AREA_CHANGE_EVENT, label);
    }
  }

  private renderTrees(): void {
    for (const tree of this.session.forest.trees) {
      const existing = this.treeSprites.get(tree.id);
      const wantStanding = tree.state === "standing";
      if (!existing || existing.container.active !== wantStanding) {
        existing?.container.destroy();
        this.treeSprites.delete(tree.id);
        const container = this.add.container(tree.position.x, tree.position.y);
        const graphic = wantStanding
          ? this.add.text(0, -8, "🌳", { fontSize: "30px" }).setOrigin(0.5)
          : this.add.text(0, 0, "🪵", { fontSize: "22px" }).setOrigin(0.5);
        container.add(graphic);
        this.treeSprites.set(tree.id, { container, graphic });
      }
    }
  }
}