import Phaser from "phaser";
import { AREAS, areaAt, WORLD_BOUNDS, type Area } from "shared";
import { GameBridge, GAME_BRIDGE_KEY } from "./bridge";
import { SESSION_KEY, type GameSession, type ChopOutcome } from "./session";
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
  ARCADE_SCENE_KEY,
  CASINO_SCENE_KEY,
  ENTRY_RETURN_KEY,
} from "./RoomScene";
import type { TreeSprite } from "./types";

const AREA_COLORS: Record<Area["kind"], number> = {
  spawn: 0x7ec850,
  forest: 0x2f6b2f,
  lumberYard: 0x8a6642,
  restaurant: 0xe0574f,
  phoneStore: 0x5b7bd5,
  town: 0xd9a066,
  foodStreet: 0xe8b04a,
  arcade: 0x8a6ac9,
  casino: 0xb3395e,
};

const AREA_PLAQUE_EMOJI: Record<Area["kind"], string> = {
  spawn: "⛲",
  forest: "🌲",
  lumberYard: "🪵",
  restaurant: "🍽️",
  phoneStore: "📱",
  town: "🏡",
  foodStreet: "🍢",
  arcade: "🕹️",
  casino: "🎰",
};

/** Areas whose name already shows on a building sign (no area plaque). */
const AREAS_WITH_BUILDING_SIGN: Area["kind"][] = [
  "lumberYard",
  "restaurant",
  "phoneStore",
];

export const AREA_CHANGE_EVENT = "area-change";

const LUMBER_BUILDING = { x: -730, y: -190 };
const LUMBER_DOOR = { x: -730, y: -110 };
const RESTAURANT_BUILDING = { x: 0, y: 505 };
const RESTAURANT_DOOR = { x: 0, y: 585 };
const PHONE_STORE_POS = { x: 470, y: 500 };
const ARCADE_BUILDING = { x: -1010, y: -480 };
const ARCADE_DOOR = { x: -1010, y: -400 };
const CASINO_BUILDING = { x: -950, y: 400 };
const CASINO_DOOR = { x: -950, y: 480 };
const FOOD_STREET_POS = { x: 260, y: 200 };

type PendingInteract =
  | { kind: "enter-restaurant" }
  | { kind: "enter-lumber" }
  | { kind: "enter-arcade" }
  | { kind: "enter-casino" }
  | { kind: "phone-shop" }
  | { kind: "food-street" }
  | null;

export class MainScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private session!: GameSession;
  private rig!: PlayerRig;
  private lastAreaLabel: string | undefined;
  private pendingInteract: PendingInteract = null;
  private treeSprites = new Map<string, TreeSprite>();
  private axeSwing: Phaser.GameObjects.Text | null = null;
  private chopBar: {
    bg: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle;
    treeId: string;
  } | null = null;

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
    this.drawTownDecor();

    this.rig = createPlayerRig(this, 0, 0);

    this.cameras.main.startFollow(this.rig.circle, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );
    this.cameras.main.setZoom(1.4);

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
      // The forest gets an organic blended floor instead of a hard block.
      if (area.kind === "forest") {
        this.drawForestFloor(area);
      } else {
        this.add.rectangle(
          cx,
          cy,
          area.bounds.width,
          area.bounds.height,
          AREA_COLORS[area.kind],
          0.8,
        );
      }
      // Buildings already carry a sign with the same name — skip those
      // areas to avoid duplicated titles.
      if (!AREAS_WITH_BUILDING_SIGN.includes(area.kind)) {
        this.drawAreaPlaque(area);
      }
    }

    this.drawRoads();
    this.drawGrassDecor();
    this.drawRocks();
    this.drawWorldFence();
  }

  /** Road layout: capsule segments + junction circles for smooth corners.
   *  The network links every venue: west arm (lumber/arcade/casino),
   *  south arm (restaurant), east arm (phone store/food street),
   *  and a north-east trunk past the forest to the town. */
  private roadSegments(): {
    h: Array<{ y: number; x1: number; x2: number }>;
    v: Array<{ x: number; y1: number; y2: number }>;
    j: Array<{ x: number; y: number }>;
  } {
    return {
      h: [
        { y: -16, x1: 0, x2: ARCADE_DOOR.x },
        { y: 16, x1: 0, x2: 1240 },
        { y: -1140, x1: 1000, x2: 1240 },
      ],
      v: [
        { x: 0, y1: 50, y2: RESTAURANT_DOOR.y },
        { x: LUMBER_DOOR.x, y1: -16, y2: LUMBER_DOOR.y },
        { x: PHONE_STORE_POS.x, y1: 16, y2: PHONE_STORE_POS.y - 24 },
        { x: ARCADE_DOOR.x, y1: -16, y2: ARCADE_DOOR.y },
        { x: CASINO_DOOR.x, y1: -16, y2: CASINO_DOOR.y },
        { x: 900, y1: 16, y2: -500 },
        { x: 1240, y1: 16, y2: -1140 },
      ],
      j: [
        { x: 0, y: -16 },
        { x: 0, y: 16 },
        { x: LUMBER_DOOR.x, y: -16 },
        { x: PHONE_STORE_POS.x, y: 16 },
        { x: ARCADE_DOOR.x, y: -16 },
        { x: CASINO_DOOR.x, y: -16 },
        { x: 900, y: 16 },
        { x: 1240, y: 16 },
        { x: 1240, y: -1140 },
      ],
    };
  }

  /** Sandy paths linking the residential spots; the wilderness stays wild. */
  private drawRoads(): void {
    const segs = this.roadSegments();
    const draw = (width: number, color: number) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      for (const s of segs.h) {
        const from = Math.min(s.x1, s.x2);
        const len = Math.abs(s.x2 - s.x1);
        g.fillRoundedRect(from - width / 2, s.y - width / 2, len + width, width, width / 2);
      }
      for (const s of segs.v) {
        const from = Math.min(s.y1, s.y2);
        const len = Math.abs(s.y2 - s.y1);
        g.fillRoundedRect(s.x - width / 2, from - width / 2, width, len + width, width / 2);
      }
      for (const j of segs.j) {
        g.fillCircle(j.x, j.y, width / 2);
      }
    };
    draw(54, 0xc4ad82);
    draw(44, 0xd9c49c);
  }

    /**
   * The forest blends into the meadow: a faint core plus layered organic
   * patches that spill past the edges and fade outwards.
   */
  private drawForestFloor(area: Area): void {
    const b = area.bounds;
    this.add.rectangle(
      b.x + b.width / 2,
      b.y + b.height / 2,
      b.width,
      b.height,
      0x3f8f3f,
      0.3,
    );

    let seed = 909;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 80; i++) {
      const x = b.x - 100 + rand() * (b.width + 200);
      const y = b.y - 100 + rand() * (b.height + 200);
      const inside =
        x > b.x - 24 && x < b.x + b.width + 24 &&
        y > b.y - 24 && y < b.y + b.height + 24;
      const r = 26 + rand() * 50;
      const color = rand() > 0.45 ? 0x3f8f3f : 0x5fae5f;
      this.add.ellipse(x, y, r * 2, r * 1.4, color, inside ? 0.3 : 0.14);
    }
  }

  private drawAreaPlaque(area: Area): void {    const cx = area.bounds.x + area.bounds.width / 2;
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

  /** Decorative small town past the forest: houses and a well. */
  private drawTownDecor(): void {
    const town = AREAS.find((a) => a.kind === "town")!;
    const b = town.bounds;
    this.drawHouse(b.x + 80, b.y + 80, "🏠");
    this.drawHouse(b.x + 230, b.y + 170, "🏡");
    this.drawHouse(b.x + 340, b.y + 70, "🏘️");
    this.add.text(b.x + 150, b.y + 210, "⛲", { fontSize: "28px" }).setOrigin(0.5);
    this.add.text(b.x + 300, b.y + 200, "🛒", { fontSize: "24px" }).setOrigin(0.5);
  }

  private drawHouse(x: number, y: number, emoji: string): void {
    this.add.ellipse(x + 2, y + 26, 100, 16, 0x3d2b1f, 0.18);
    this.add.rectangle(x, y, 92, 62, 0xf2e3c2, 0.98);
    this.add.rectangle(x, y - 40, 104, 24, 0xb85c3f, 0.98);
    this.add.rectangle(x, y - 28, 92, 10, 0xa34e34, 0.98);
    this.add.rectangle(x - 22, y + 2, 24, 20, 0xbfe3ef, 0.95);
    this.add.text(x + 26, y + 8, emoji, { fontSize: "20px" }).setOrigin(0.5);
    this.add.text(x - 26, y + 12, "🚪", { fontSize: "16px" }).setOrigin(0.5);
  }

  private drawGrassDecor(): void {
    const decor = ["🌿", "🌱", "🌼", "🌷", "🍀", "🍄"];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 170; i++) {
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

  /** Rocks scattered across the wilderness (not inside areas, not on roads). */
  private drawRocks(): void {
    let seed = 777;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const placed: { x: number; y: number }[] = [];
    let attempts = 0;
    while (placed.length < 32 && attempts < 600) {
      attempts += 1;
      const x = WORLD_BOUNDS.x + 40 + rand() * (WORLD_BOUNDS.width - 80);
      const y = WORLD_BOUNDS.y + 40 + rand() * (WORLD_BOUNDS.height - 80);
      if (this.insideAnyArea(x, y)) continue;
      if (this.nearRoad(x, y, 46)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 90)) continue;
      placed.push({ x, y });
      const big = rand() > 0.6;
      this.add.ellipse(x + 2, y + (big ? 10 : 6), big ? 30 : 20, big ? 12 : 8, 0x3d2b1f, 0.15);
      this.add
        .text(x, y, big ? "🪨" : "🪨", {
          fontSize: big ? "26px" : "18px",
        })
        .setOrigin(0.5);
    }
  }

  private nearRoad(x: number, y: number, padding: number): boolean {
    const segs = this.roadSegments();
    const inSpan = (v: number, a: number, b: number, pad: number) =>
      v > Math.min(a, b) - pad && v < Math.max(a, b) + pad;
    for (const s of segs.h) {
      if (Math.abs(y - s.y) < padding && inSpan(x, s.x1, s.x2, padding + 30)) return true;
    }
    for (const s of segs.v) {
      if (Math.abs(x - s.x) < padding && inSpan(y, s.y1, s.y2, padding + 30)) return true;
    }
    for (const j of segs.j) {
      if (Math.hypot(x - j.x, y - j.y) < padding + 28) return true;
    }
    return false;
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
    this.drawBuilding(ARCADE_BUILDING, "🕹️", "电玩店", "🎮");
    this.drawDoorMarker(ARCADE_DOOR);
    this.drawBuilding(CASINO_BUILDING, "🎰", "赌场", "🎲");
    this.drawDoorMarker(CASINO_DOOR);
    this.drawFoodStreet();
  }

  private drawFoodStreet(): void {
    const stalls = [
      { x: FOOD_STREET_POS.x - 90, emoji: "🍢" },
      { x: FOOD_STREET_POS.x, emoji: "🍡" },
      { x: FOOD_STREET_POS.x + 90, emoji: "🧋" },
    ];
    for (const stall of stalls) {
      this.drawShopMarker({ x: stall.x, y: FOOD_STREET_POS.y }, stall.emoji, "");
    }
    // Street sign + string lights
    const sign = this.add
      .text(FOOD_STREET_POS.x, FOOD_STREET_POS.y - 78, "🍢 小吃街", {
        fontSize: "15px",
        color: "#fff8ec",
        fontStyle: "bold",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5);
    const sw = sign.width + 14;
    const signBg = this.add.graphics();
    signBg.fillStyle(0x3d2b1f, 0.82);
    signBg.fillRoundedRect(FOOD_STREET_POS.x - sw / 2, FOOD_STREET_POS.y - 96, sw, 28, 10);
    sign.setDepth(signBg.depth + 1);
    for (let i = 0; i < 7; i++) {
      this.add
        .text(FOOD_STREET_POS.x - 120 + i * 40, FOOD_STREET_POS.y - 56, "🏮", {
          fontSize: "14px",
        })
        .setOrigin(0.5);
    }
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
    if (label) {
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
    }
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
      case "enter-arcade":
        this.enterRoom(ARCADE_SCENE_KEY, ARCADE_DOOR);
        break;
      case "enter-casino":
        this.enterRoom(CASINO_SCENE_KEY, CASINO_DOOR);
        break;
      case "phone-shop":
        this.bridge.patch({ phoneShopOpen: true });
        break;
      case "food-street":
        this.bridge.patch({ snackStreetOpen: true });
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
    } else if (dist(pos, ARCADE_DOOR) <= range) {
      next = { kind: "enter-arcade" };
      prompt = "按 F 进入电玩店";
    } else if (dist(pos, CASINO_DOOR) <= range) {
      next = { kind: "enter-casino" };
      prompt = "按 F 进入赌场";
    } else if (dist(pos, FOOD_STREET_POS) <= range) {
      next = { kind: "food-street" };
      prompt = "按 F 逛小吃街 🍢";
    } else if (dist(pos, PHONE_STORE_POS) <= range) {
      next = { kind: "phone-shop" };
      prompt = this.session.inventory.hasPhone ? "按 F 进入手机店" : "按 F 买手机";
    }
    this.pendingInteract = next;
    this.bridgePatchPrompt(prompt);
  }

  update(_time: number, _delta: number): void {
    this.session.tick(this.game.loop.delta);

    // Left click uses the selected hotbar item; the axe chops trees.
    const pointer = this.input.activePointer;
    const chopping = pointer.isDown && pointer.button === 0 && this.isSelectedAxe();
    let outcome: ChopOutcome | null = null;
    if (chopping) {
      outcome = this.session.chopAt(
        { x: this.rig.circle.x, y: this.rig.circle.y },
        this.game.loop.delta / 1000,
      );
    }
    this.updateChopVisuals(chopping, outcome, this.time.now);

    movePlayerRig(this.rig);
    syncPlayerVisuals(this.rig, this.input.activePointer);

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

  private isSelectedAxe(): boolean {
    const ui = this.bridge.getSnapshot();
    return ui.hotbar[ui.selectedSlot] === "axe";
  }

  private static readonly BAR_WIDTH = 50;

  /**
   * While chopping: swing the axe next to the player and draw a progress
   * bar above the tree currently being chopped.
   */
  private updateChopVisuals(
    chopping: boolean,
    outcome: ChopOutcome | null,
    nowMs: number,
  ): void {
    // Axe swing
    if (chopping) {
      if (!this.axeSwing) {
        this.axeSwing = this.add
          .text(0, 0, "🪓", { fontSize: "28px" })
          .setOrigin(0.5, 0.9)
          .setDepth(6);
      }
      const phase = nowMs * 0.02;
      this.axeSwing.setPosition(
        this.rig.circle.x + 17,
        this.rig.circle.y - 2 + Math.sin(phase) * 2.5,
      );
      this.axeSwing.setRotation(Math.sin(phase) * 0.85 - 0.35);
    } else if (this.axeSwing) {
      this.axeSwing.destroy();
      this.axeSwing = null;
    }

    // Progress bar above the target tree
    const tree =
      chopping && outcome
        ? this.session.forest.trees.find((t) => t.id === outcome.treeId)
        : undefined;
    if (tree) {
      if (!this.chopBar || this.chopBar.treeId !== tree.id) {
        this.chopBar?.bg.destroy();
        this.chopBar?.fill.destroy();
        const bg = this.add
          .rectangle(tree.position.x, tree.position.y - 38, MainScene.BAR_WIDTH + 4, 11, 0x3d2b1f, 0.85)
          .setDepth(7);
        const fill = this.add
          .rectangle(
            tree.position.x - MainScene.BAR_WIDTH / 2,
            tree.position.y - 38,
            Math.max(2, MainScene.BAR_WIDTH * outcome!.progress),
            6,
            0x8bd44a,
          )
          .setOrigin(0, 0.5)
          .setDepth(8);
        this.chopBar = { bg, fill, treeId: tree.id };
      } else {
        this.chopBar.fill.width = Math.max(
          2,
          MainScene.BAR_WIDTH * outcome!.progress,
        );
      }
    } else if (this.chopBar) {
      this.chopBar.bg.destroy();
      this.chopBar.fill.destroy();
      this.chopBar = null;
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