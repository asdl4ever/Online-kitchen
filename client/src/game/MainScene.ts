import Phaser from "phaser";
import {
  AREAS,
  areaAt,
  WORLD_BOUNDS,
  type Area,
  type ForestState,
  type Order,
  chopTree,
  makeTree,
  scheduleRegrow,
  tickForest,
  addLogs,
  sellLogs,
  buyPhone,
  makeInventory,
  placeOrder,
  getDish,
  tickOrders,
  serveOrder,
  recordEat,
  makeFoodCollection,
  rebind,
  type Bindings,
  type Dish,
} from "shared";
import {
  GameBridge,
  GAME_BRIDGE_KEY,
  type BridgeCommand,
  type OrderView,
} from "./bridge";

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

export interface Mechanics {
  chopDamagePerSecond: number;
  interactRange: number;
}

const LUMBER_DEPOT_POS = { x: -400, y: -140 };
const COUNTER_POS = { x: -40, y: 310 };
const PHONE_STORE_POS = { x: 340, y: 350 };
const TABLE_POSITIONS = [
  { x: -20, y: 360 },
  { x: 60, y: 360 },
  { x: -20, y: 410 },
];

type PendingInteract =
  | { kind: "menu" }
  | { kind: "depot" }
  | { kind: "phone-shop" }
  | { kind: "seat"; tableIndex: number }
  | null;

interface TreeSprite {
  container: Phaser.GameObjects.Container;
  graphic: Phaser.GameObjects.GameObject;
}

export class MainScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerFace!: Phaser.GameObjects.Text;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private playerSpeed = 240;
  private lastAreaLabel: string | undefined;
  private mechanics: Mechanics = {
    chopDamagePerSecond: 5,
    interactRange: 70,
  };

  private forest: ForestState = { trees: [] };
  private inventory = makeInventory();
  private orders: Order[] = [];
  private collection = makeFoodCollection();
  private seatedTable: number | null = null;
  private seatGameObject: Phaser.GameObjects.Container | null = null;
  private gameClock = 0;
  private lastDeltaMs = 0;
  private pendingInteract: PendingInteract = null;
  private treeSprites = new Map<string, TreeSprite>();
  private waiterWiggle = 0;

  constructor() {
    super("MainScene");
  }

  constructorBridge(bridge: GameBridge): void {
    this.bridge = bridge;
  }

  create(): void {
    // Bridge is attached by createGame via the game registry before boot.
    const registered = this.game.registry.get(GAME_BRIDGE_KEY) as
      | GameBridge
      | undefined;
    if (registered) {
      this.bridge = registered;
    }
    this.physics.world.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );

    this.drawWorld();
    this.spawnForest();
    this.drawFacilities();

    this.player = this.add.circle(0, 0, 14, 0xffd93b);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);

    // Soft shadow + cute face follow the ball every frame
    this.playerShadow = this.add.ellipse(0, 12, 26, 10, 0x3d2b1f, 0.22);
    this.playerFace = this.add
      .text(0, -2, "◕‿◕", { fontSize: "10px", color: "#7a5a00" })
      .setOrigin(0.5);

    this.bindKeys();
    this.registerBridgeCommands();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );

    this.publishSnapshot();
  }

  private drawWorld(): void {
    // Ground base
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
      // Rounded title plaque at the top of each area
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
      // Deterministic LCG so decor layout is stable between runs.
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 90; i++) {
      const x =
        WORLD_BOUNDS.x + 30 + rand() * (WORLD_BOUNDS.width - 60);
      const y =
        WORLD_BOUNDS.y + 30 + rand() * (WORLD_BOUNDS.height - 60);
      // Keep decor out of the restaurant/phone store interiors
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

  private spawnForest(): void {
    const forestArea = AREAS.find((a) => a.kind === "forest")!;
    const cols = 5;
    const rows = 5;
    const spacingX = 46;
    const spacingY = 66;
    const startX = forestArea.bounds.x + 30;
    const startY = forestArea.bounds.y + 50;
    let idx = 0;
    const trees: ForestState["trees"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = r % 2 === 0 ? 0 : spacingX / 2;
        const x = startX + c * spacingX + offset;
        const y = startY + r * spacingY;
        trees.push(
          makeTree(`tree-${idx}`, { x, y }, { maxHp: 6, logDrop: 1, regrowSeconds: 12 }),
        );
        idx += 1;
      }
    }
    this.forest = { trees };
  }

  private drawFacilities(): void {
    this.drawShopMarker(LUMBER_DEPOT_POS, "🏪", "木材店", "💰 卖木材换钱");
    this.drawShopMarker(COUNTER_POS, "🧑‍🍳", "点餐台", "📝 找老板点单");
    this.drawShopMarker(PHONE_STORE_POS, "📱", "手机店", "📲 买手机");
    TABLE_POSITIONS.forEach((pos, i) => {
      // Table shadow
      this.add.ellipse(pos.x + 2, pos.y + 4, 40, 30, 0x3d2b1f, 0.18);
      this.add.rectangle(pos.x, pos.y, 36, 36, 0x9b6d4c, 0.98);
      this.add.rectangle(pos.x, pos.y, 28, 28, 0xc08b5f, 0.98);
      this.add
        .text(pos.x, pos.y, `🪑`, { fontSize: "16px" })
        .setOrigin(0.5);
      this.add
        .text(pos.x + 14, pos.y - 14, `${i + 1}`, {
          fontSize: "11px",
          color: "#fff",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(1);
      this.add.circle(pos.x + 14, pos.y - 14, 8, 0xe8833a, 0.95);
    });
  }

  private drawShopMarker(
    pos: { x: number; y: number },
    emoji: string,
    label: string,
    hint?: string,
  ): void {
    // Shadow
    this.add.ellipse(pos.x + 2, pos.y + 22, 60, 14, 0x3d2b1f, 0.18);
    // Booth body
    this.add.rectangle(pos.x, pos.y, 52, 42, 0x3b3b3b, 0.92);
    this.add.rectangle(pos.x, pos.y - 4, 44, 30, 0x574434, 0.95);
    this.add.text(pos.x + 2, pos.y - 4, emoji, { fontSize: "26px" }).setOrigin(0.5);
    // Sign
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

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    kb.addCapture([Phaser.Input.Keyboard.KeyCodes.F, Phaser.Input.Keyboard.KeyCodes.E]);
    this.keys = {};
    this.keys.interact = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F, false, false);
    this.keys.openInventory = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false, false);
    this.keys.openSettings = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false, false);
    this.keys.moveUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W, false, false);
    this.keys.moveDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, false, false);
    this.keys.moveLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A, false, false);
    this.keys.moveRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, false, false);
  }

  private registerBridgeCommands(): void {
    const handler = (c: BridgeCommand) => this.handleCommand(c);
    this.bridge.on("toggle-inventory", handler);
    this.bridge.on("toggle-settings", handler);
    this.bridge.on("open-menu", handler);
    this.bridge.on("close-menu", handler);
    this.bridge.on("open-depot", handler);
    this.bridge.on("close-depot", handler);
    this.bridge.on("open-phone-shop", handler);
    this.bridge.on("close-phone-shop", handler);
    this.bridge.on("buy-phone", handler);
    this.bridge.on("open-phone-app", handler);
    this.bridge.on("close-phone-app", handler);
    this.bridge.on("toggle-collection", handler);
    this.bridge.on("order-food", handler);
    this.bridge.on("sell-all-logs", handler);
    this.bridge.on("sit-at-table", handler);
    this.bridge.on("press-interact", handler);
    this.bridge.on("set-audio", handler);
    this.bridge.on("rebind", handler);
  }

  private handleCommand(c: BridgeCommand): void {
    switch (c.type) {
      case "toggle-inventory":
        this.bridge.patch({ inventoryOpen: !this.bridge.getSnapshot().inventoryOpen });
        break;
      case "toggle-settings":
        this.bridge.patch({ settingsOpen: !this.bridge.getSnapshot().settingsOpen });
        break;
      case "open-menu":
        this.bridge.patch({ menuOpen: true });
        break;
      case "close-menu":
        this.bridge.patch({ menuOpen: false });
        break;
      case "open-depot":
        this.bridge.patch({ depotOpen: true });
        break;
      case "close-depot":
        this.bridge.patch({ depotOpen: false });
        break;
      case "open-phone-shop":
        this.bridge.patch({ phoneShopOpen: true });
        break;
      case "close-phone-shop":
        this.bridge.patch({ phoneShopOpen: false });
        break;
      case "buy-phone": {
        const bought = buyPhone(this.inventory);
        this.publishSnapshot();
        if (bought) {
          this.bridge.patch({ phoneShopOpen: false });
          this.bridge.showToast("已购入手机，可随时远程点餐", "📱");
        } else if (this.inventory.hasPhone) {
          this.bridge.showToast("你已经有手机啦", "📱");
        } else {
          this.bridge.showToast("钱不够买手机", "😢");
        }
        break;
      }
      case "open-phone-app":
        if (!this.inventory.hasPhone) {
          this.bridge.showToast("还没有手机，去手机店买一部吧", "📵");
          break;
        }
        this.bridge.patch({ phoneAppOpen: !this.bridge.getSnapshot().phoneAppOpen });
        break;
      case "close-phone-app":
        this.bridge.patch({ phoneAppOpen: false });
        break;
      case "toggle-collection":
        this.bridge.patch({
          collectionOpen: !this.bridge.getSnapshot().collectionOpen,
        });
        break;
      case "order-food": {
        const dish = getDish(c.dishId);
        const result = placeOrder({
          inventory: this.inventory,
          dishId: c.dishId,
          customerId: "local",
          nowSeconds: this.gameClock,
        });
        this.publishSnapshot();
        if (!result.ok) {
          this.bridge.showToast(
            result.reason === "insufficient-funds" ? "钱不够哦" : "菜品不存在",
            "😢",
          );
        } else {
          const wasPhone = this.bridge.getSnapshot().phoneAppOpen;
          this.bridge.patch({
            menuOpen: false,
            phoneAppOpen: false,
          });
          this.bridge.showToast(
            wasPhone
              ? `手机下单成功：${dish?.name ?? ""}，请就座等待`
              : `已下单 ${dish?.name ?? ""}，请就座等待`,
            "🧾",
          );
        }
        break;
      }
      case "sell-all-logs": {
        const result = sellLogs(this.inventory, this.inventory.logs);
        this.publishSnapshot();
        if (result.sold > 0) {
          this.bridge.showToast(`卖出 ${result.sold} 根木材 +${result.earned} 元`, "💰");
        } else {
          this.bridge.showToast("还没有木材可卖", "🧺");
        }
        break;
      }
      case "sit-at-table":
        this.toggleSeat();
        break;
      case "press-interact":
        this.pressInteract();
        break;
      case "set-audio":
        this.bridge.patch({ audio: c.audio });
        break;
      case "rebind": {
        const current = this.bridge.getSnapshot();
        const result = rebind({
          bindings: current.bindings,
          action: c.action as never,
          key: c.key,
        });
        this.bridge.patch({ bindings: result.bindings });
        break;
      }
    }
  }

  private toggleSeat(): void {
    const pending = this.pendingInteract;
    if (pending?.kind === "seat") {
      if (this.seatedTable !== null && this.seatedTable !== pending.tableIndex) {
        this.seatGameObject?.destroy();
        this.seatGameObject = null;
      }
      this.seatedTable = pending.tableIndex;
      this.placeSeatVisual(pending.tableIndex);
      this.bridge.patch({ seated: true });
      this.bridge.showToast(`已入座 ${pending.tableIndex + 1} 号桌`, "💺");
      this.pendingInteract = null;
      return;
    }
    if (this.seatedTable !== null) {
      this.seatedTable = null;
      this.seatGameObject?.destroy();
      this.seatGameObject = null;
      this.bridge.patch({ seated: false });
      this.bridge.showToast("已起身", "🚶");
    }
  }

  private placeSeatVisual(tableIndex: number): void {
    this.seatGameObject?.destroy();
    const table = TABLE_POSITIONS[tableIndex];
    const container = this.add.container(table.x, table.y);
    const balloon = this.add.circle(0, -22, 10, 0xffffff, 0.9);
    container.add(balloon);
    container.add(this.add.text(-6, -26, "😋", { fontSize: "14px" }));
    this.seatGameObject = container;
  }

  private pressInteract(): void {
    if (this.pendingInteract?.kind === "menu") {
      this.bridge.patch({ menuOpen: true });
    } else if (this.pendingInteract?.kind === "depot") {
      this.bridge.patch({ depotOpen: true });
    } else if (this.pendingInteract?.kind === "phone-shop") {
      this.bridge.patch({ phoneShopOpen: true });
    } else if (this.pendingInteract?.kind === "seat") {
      this.toggleSeat();
    }
  }

  private detectInteract(): void {
    const pos = { x: this.player.x, y: this.player.y };
    const range = this.mechanics.interactRange;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const nearCounter = dist(pos, COUNTER_POS) <= range;
    const nearDepot = dist(pos, LUMBER_DEPOT_POS) <= range;
    const nearPhoneShop = dist(pos, PHONE_STORE_POS) <= range;
    let nearTable: number | null = null;
    TABLE_POSITIONS.forEach((t, i) => {
      if (dist(pos, t) <= range) nearTable = i;
    });

    let next: PendingInteract = null;
    let prompt: string | null = null;
    if (nearCounter) {
      next = { kind: "menu" };
      prompt = "按 F 向老板点单";
    } else if (nearDepot) {
      next = { kind: "depot" };
      prompt = "按 F 出售木材";
    } else if (nearPhoneShop) {
      next = { kind: "phone-shop" };
      prompt = this.inventory.hasPhone ? "按 F 进入手机店" : "按 F 买手机";
    } else if (nearTable !== null) {
      next = { kind: "seat", tableIndex: nearTable };
      prompt = this.seatedTable !== null ? "按 F 起身" : "按 F 入座";
    }
    this.pendingInteract = next;
    if (prompt !== this.bridge.getSnapshot().prompt) {
      this.bridge.patch({ prompt });
    }
  }

  private updateChop(): void {
    const pointer = this.input.activePointer;
    const mouseDown = pointer.isDown && pointer.button === 0;
    if (!mouseDown) return;
    const pos = { x: this.player.x, y: this.player.y };
    let nearestIdx = -1;
    let nearestDist = this.mechanics.interactRange + 40;
    for (let i = 0; i < this.forest.trees.length; i++) {
      const tree = this.forest.trees[i];
      if (tree.state !== "standing") continue;
      const d = Math.hypot(tree.position.x - pos.x, tree.position.y - pos.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    if (nearestIdx >= 0 && nearestDist <= this.mechanics.interactRange + 40) {
      const tree = this.forest.trees[nearestIdx];
      const result = chopTree(
        tree,
        this.mechanics.chopDamagePerSecond * (this.lastDeltaMs / 1000),
      );
      if (result.completed) {
        addLogs(this.inventory, result.logDropped);
        scheduleRegrow(tree, this.gameClock);
        this.bridge.showToast(`获得木材 x${result.logDropped}`, "🪵");
        this.publishSnapshot();
      }
    }
  }

  update(_time: number, _delta: number): void {
    this.lastDeltaMs = this.game.loop.delta;
    this.gameClock += this.lastDeltaMs / 1000;
    tickForest(this.forest, this.gameClock);

    // chop uses pointer, which is GUI-safe
    this.updateChop();

    const dx =
      (this.keys.moveRight?.isDown ? 1 : 0) -
      (this.keys.moveLeft?.isDown ? 1 : 0);
    const dy =
      (this.keys.moveDown?.isDown ? 1 : 0) -
      (this.keys.moveUp?.isDown ? 1 : 0);

    let vx = 0;
    let vy = 0;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      vx = (dx / len) * this.playerSpeed;
      vy = (dy / len) * this.playerSpeed;
    }
    this.playerBody.setVelocity(vx, vy);

    this.playerShadow.setPosition(this.player.x + 2, this.player.y + 12);
    this.playerFace.setPosition(this.player.x, this.player.y - 1);

    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this.pressInteract();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.openInventory)) {
      this.bridge.patch({
        inventoryOpen: !this.bridge.getSnapshot().inventoryOpen,
      });
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.openSettings)) {
      this.bridge.patch({
        settingsOpen: !this.bridge.getSnapshot().settingsOpen,
      });
    }

    this.detectInteract();
    this.syncSeat();
    this.renderTrees();
    this.tickOrderDelivery();

    const area = areaAt({ x: this.player.x, y: this.player.y });
    const label = area ? area.label : "野外地带";
    if (label !== this.lastAreaLabel) {
      this.lastAreaLabel = label;
      this.events.emit(AREA_CHANGE_EVENT, label);
    }
  }

  private syncSeat(): void {
    if (this.seatedTable === null || !this.seatGameObject) return;
    const table = TABLE_POSITIONS[this.seatedTable];
    this.seatGameObject.x = table.x;
    this.seatGameObject.y = table.y + Math.sin(this.waiterWiggle) * 2;
    this.waiterWiggle += 0.05;
  }

  private renderTrees(): void {
    for (const tree of this.forest.trees) {
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

  private tickOrderDelivery(): void {
    const changed = tickOrders(this.orders, this.gameClock);
    let delivered = false;
    for (const order of changed) {
      if (order.status !== "ready") continue;
      this.deliverToTable(order);
      delivered = true;
    }
    if (delivered) {
      this.publishSnapshot();
    }
  }

  private deliverToTable(order: Order): void {
    const dish = getDish(order.dishId)!;
    const table = TABLE_POSITIONS[this.seatedTable ?? 0];
    const emoji = this.add.text(
      COUNTER_POS.x,
      COUNTER_POS.y - 20,
      dish.emoji,
      { fontSize: "26px" },
    );
    this.tweens.add({
      targets: emoji,
      x: table.x,
      y: table.y - 26,
      duration: 900,
      ease: "Quad.easeInOut",
      onComplete: () => {
        emoji.destroy();
        this.recordCollection(dish);
      },
    });
    serveOrder(order);
  }

  private recordCollection(dish: Dish): void {
    recordEat({
      collection: this.collection,
      dishId: dish.id,
      nowSeconds: this.gameClock,
    });
    this.bridge.showToast(`上菜啦：${dish.name}，请享用！`, dish.emoji);
    this.publishSnapshot();
  }

  private publishSnapshot(): void {
    if (!this.bridge) return;
    const orders: OrderView[] = this.orders.map((o) => ({
      id: o.id,
      dish: getDish(o.dishId)!,
      status: o.status,
      placedAt: o.placedAtSeconds,
      readyAt: o.readyAtSeconds,
    }));
    this.bridge.updateSnapshot({
      logs: this.inventory.logs,
      money: this.inventory.money,
      hasPhone: this.inventory.hasPhone,
      orders,
      collection: Object.values(this.collection.entries),
    });
  }
}