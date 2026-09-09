import {
  AREAS,
  type ForestState,
  type Order,
  ARCADE_ENTRY_FEE,
  ARCADE_REWARD_PER_HIT,
  REACTION_ENTRY_FEE,
  reactionReward,
  addLogs,
  buyPhone,
  chopTree,
  comfortOf,
  generateForestTrees,
  getDish,
  getFish,
  getFurniture,
  getProperty,
  getQuality,
  getSnack,
  getSpecies,
  getVehicle,
  makeFoodCollection,
  makeInventory,
  makeTree,
  MAX_LOGS,
  PET_EGG_PRICE,
  placeOrder,
  recordEat,
  rebind,
  rollFish,
  rollPet,
  scheduleRegrow,
  sellLogs,
  serveOrder,
  spinSlots,
  starUpgradeCost,
  spendMoney,
  tickForest,
  tickOrders,
  upgradeStars,
  CASINO_BET_OPTIONS,
  diceMultiplier,
  rollDice,
  VEHICLES,
  HOUSE_FURNITURE_SLOTS,
  PROPERTIES,
  FURNITURE,
  petBonusPct,
  type DiceChoice,
  type Dish,
  type Pet,
  type Property,
} from "shared";
import {
  GameBridge,
  type BridgeCommand,
  type OrderView,
} from "./bridge";
import { addMoney } from "shared";

export const SESSION_KEY = "game-session";

export interface ChopOutcome {
  treeId: string;
  /** 0..1 how fully the tree has been chopped. */
  progress: number;
  completed: boolean;
  logDropped: number;
}

/** How far (px) the player can be from a tree to chop it. */
export const CHOP_RANGE = 110;
/** Damage per second while holding the mouse button near a tree. */
export const CHOP_DPS = 5;

function makeForestTrees(): ForestState["trees"] {
  const forestArea = AREAS.find((a) => a.kind === "forest")!;
  const points = generateForestTrees(forestArea.bounds, {
    seed: 20260908,
    count: 24,
    minDistance: 95,
    clusters: 3,
  });
  return points.map((p, i) =>
    makeTree(`tree-${i}`, p, { maxHp: 6, logDrop: 1, regrowSeconds: 12 }),
  );
}

/**
 * Owns all rule state (inventory, forest, orders, collection) and the
 * bridge command handlers. Scenes are views: they render and feed input,
 * but never own game data, so switching between map and indoor rooms
 * keeps progress intact.
 */
export class GameSession {
  readonly bridge: GameBridge;
  readonly inventory = makeInventory();
  readonly orders: Order[] = [];
  readonly collection = makeFoodCollection();
  readonly forest: ForestState;

  gameClock = 0;
  seatedTable: number | null = null;
  pets: Pet[] = [];
  activePetId: string | null = null;
  fishBag: Record<string, number> = {};
  fishing: {
    phase: "waiting" | "bite";
    biteAt: number;
    windowUntil: number;
  } | null = null;
  ownedHouseIds: string[] = [];
  activeHouseId: string | null = null;
  furnishings: Record<string, (string | null)[]> = {};
  ownedVehicleIds: string[] = [];
  activeVehicleId: string | null = null;

  private orderSeq = 0;
  private petSeq = 0;
  private lastFullToastAt = -999;

  constructor(bridge: GameBridge, forest?: ForestState) {
    this.bridge = bridge;
    this.forest = forest ?? { trees: makeForestTrees() };
    this.registerCommands();
  }

  /** Movement speed multiplier from the active vehicle. */
  speedMult(): number {
    return this.activeVehicleId
      ? getVehicle(this.activeVehicleId).speedMult
      : 1;
  }

  /** Comfort of the furniture in the active house (0 without one). */
  comfort(): number {
    if (!this.activeHouseId) return 0;
    return comfortOf(this.furnishings[this.activeHouseId] ?? []);
  }

  /* ============ 钓鱼 ============ */

  startFishing(rng: () => number = Math.random): void {
    if (this.fishing) return;
    const delay =
      2 + rng() * 4; // FISH_BITE_MIN..MAX seconds
    this.fishing = {
      phase: "waiting",
      biteAt: this.gameClock + delay,
      windowUntil: 0,
    };
    this.bridge.showToast("开始钓鱼，静静等待…", "🎣");
  }

  cancelFishing(silent = false): void {
    if (!this.fishing) return;
    this.fishing = null;
    if (!silent) this.bridge.showToast("收竿了", "🎣");
  }

  /** Advance the fishing minigame: waiting -> bite -> escaped. */
  tickFishing(): void {
    const f = this.fishing;
    if (!f) return;
    if (f.phase === "waiting" && this.gameClock >= f.biteAt) {
      f.phase = "bite";
      f.windowUntil = this.gameClock + 1.5;
      this.bridge.showToast("咬钩了！快按 F！🎣", "⚡");
    } else if (f.phase === "bite" && this.gameClock > f.windowUntil) {
      this.fishing = null;
      this.bridge.showToast("鱼跑了…再试一次", "💨");
    }
  }

  /** F pressed while fishing: catch on bite, cancel while waiting. */
  fishingAction(rng: () => number = Math.random): void {
    const f = this.fishing;
    if (!f) {
      this.startFishing(rng);
      return;
    }
    if (f.phase === "bite") {
      const fish = rollFish(rng);
      this.fishBag[fish.id] = (this.fishBag[fish.id] ?? 0) + 1;
      this.fishing = null;
      this.publishSnapshot();
      this.bridge.showToast(
        `钓到了 ${fish.name} ${fish.emoji}！价值 ${fish.price} 元`,
        fish.emoji,
      );
    } else {
      this.cancelFishing();
    }
  }

  /** Sell the whole fish bag; comfort boosts the price. */
  sellFish(): void {
    const entries = Object.entries(this.fishBag).filter(([, n]) => n > 0);
    if (entries.length === 0) {
      this.bridge.showToast("鱼篓空空如也", "🪣");
      return;
    }
    let earned = 0;
    let total = 0;
    const bonus = 1 + this.comfort() / 100;
    for (const [id, count] of entries) {
      earned += Math.floor(getFish(id).price * count * bonus);
      total += count;
    }
    this.fishBag = {};
    addMoney(this.inventory, earned);
    this.publishSnapshot();
    this.bridge.showToast(
      `卖出 ${total} 条鱼 +${earned} 元${this.comfort() > 0 ? `（家具舒适度 +${this.comfort()}%）` : ""}`,
      "🐟",
    );
  }

  /* ============ 房产与家具 ============ */

  buyHouse(houseId: string): void {
    const property = this.tryProperty(houseId);
    if (!property) return;
    if (this.ownedHouseIds.includes(houseId)) {
      this.bridge.showToast("这套房子已经是你的啦", "🏠");
      return;
    }
    if (!spendMoney(this.inventory, property.price)) {
      this.bridge.showToast(`${property.name}要 ${property.price} 元`, "🏠");
      return;
    }
    this.ownedHouseIds.push(houseId);
    this.activeHouseId = houseId;
    this.furnishings[houseId] = Array(HOUSE_FURNITURE_SLOTS).fill(null);
    this.publishSnapshot();
    this.bridge.patch({ housePanel: null });
    this.bridge.showToast(`恭喜入住 ${property.name}！${property.emoji}`, "🎉");
  }

  private tryProperty(houseId: string): Property | null {
    const property = PROPERTIES.find((p) => p.id === houseId);
    if (!property) {
      this.bridge.showToast("没有这个房源", "❓");
      return null;
    }
    return property;
  }

  /** Buy furniture into the first empty slot of the active house. */
  buyFurniture(furnitureId: string): void {
    const item = FURNITURE.find((f) => f.id === furnitureId);
    if (!item) return;
    if (!this.activeHouseId) {
      this.bridge.showToast("先买一套房子才能放家具哦", "🏠");
      return;
    }
    const slots = this.furnishings[this.activeHouseId];
    const slot = slots.findIndex((s) => s === null);
    if (slot < 0) {
      this.bridge.showToast("家里放满了，先腾个位置吧", "🛋️");
      return;
    }
    if (!spendMoney(this.inventory, item.price)) {
      this.bridge.showToast(`${item.name}要 ${item.price} 元`, "🛒");
      return;
    }
    slots[slot] = item.id;
    this.publishSnapshot();
    this.bridge.showToast(
      `买下 ${item.name} ${item.emoji}！舒适度 +${item.comfort}%（鱼价加成）`,
      item.emoji,
    );
  }

  /* ============ 载具 ============ */

  buyVehicle(vehicleId: string): void {
    const vehicle = VEHICLES.find((v) => v.id === vehicleId);
    if (!vehicle) return;
    if (this.ownedVehicleIds.includes(vehicleId)) {
      this.selectVehicle(vehicleId);
      return;
    }
    if (!spendMoney(this.inventory, vehicle.price)) {
      this.bridge.showToast(`${vehicle.name}要 ${vehicle.price} 元`, "🚗");
      return;
    }
    this.ownedVehicleIds.push(vehicleId);
    this.activeVehicleId = vehicleId;
    this.publishSnapshot();
    this.bridge.showToast(
      `提车成功：${vehicle.name} ${vehicle.emoji}！移速 ×${vehicle.speedMult}`,
      vehicle.emoji,
    );
  }

  selectVehicle(vehicleId: string): void {
    if (!this.ownedVehicleIds.includes(vehicleId)) return;
    this.activeVehicleId =
      this.activeVehicleId === vehicleId ? null : vehicleId;
    this.publishSnapshot();
    if (this.activeVehicleId) {
      this.bridge.showToast(
        `${getVehicle(vehicleId).name} 已上路 ${getVehicle(vehicleId).emoji}`,
        "🛣️",
      );
    } else {
      this.bridge.showToast("已收起载具，靠腿走路", "🚶");
    }
  }

  /* ============ 街机反应 & 骰子 ============ */

  reactionStart(): boolean {
    if (!spendMoney(this.inventory, REACTION_ENTRY_FEE)) {
      this.bridge.showToast(`入场费要 ${REACTION_ENTRY_FEE} 元哦`, "⚡");
      return false;
    }
    this.publishSnapshot();
    return true;
  }

  reactionFinish(ms: number): void {
    const reward = reactionReward(ms);
    addMoney(this.inventory, reward);
    this.publishSnapshot();
    this.bridge.showToast(
      `反应 ${Math.round(ms)}ms，赢得 ${reward} 元 ⚡`,
      reward >= 60 ? "🎉" : "🙂",
    );
  }

  diceBet(choice: DiceChoice, bet: number): void {
    this.diceBetWithRng(choice, bet, Math.random);
  }

  diceBetWithRng(choice: DiceChoice, bet: number, rng: () => number): void {
    if (!CASINO_BET_OPTIONS.includes(bet)) return;
    if (!spendMoney(this.inventory, bet)) {
      this.bridge.showToast("赌本不够哦", "🎲");
      return;
    }
    const roll = rollDice(rng);
    const multiplier = diceMultiplier(roll, choice);
    const payout = Math.floor(bet * multiplier);
    if (payout > 0) addMoney(this.inventory, payout);
    this.publishSnapshot();
    this.bridge.patch({
      diceResult: { dice: roll.dice, sum: roll.sum, payout, bet },
    });
  }

  /** Advance the world clock and settle forest regrowth / cooking orders. */
  tick(dtMs: number): void {
    this.gameClock += dtMs / 1000;
    tickForest(this.forest, this.gameClock);
    tickOrders(this.orders, this.gameClock);
    this.tickFishing();
  }

  chopAt(
    playerPos: { x: number; y: number },
    dtSeconds: number,
  ): ChopOutcome | null {
    if (this.inventory.logs >= MAX_LOGS) {
      if (this.gameClock - this.lastFullToastAt > 3) {
        this.lastFullToastAt = this.gameClock;
        this.bridge.showToast("背包满了，先去木材店卖掉木材吧", "🎒");
      }
      return null;
    }
    let nearest: (typeof this.forest.trees)[number] | null = null;
    let nearestDist = CHOP_RANGE;
    for (const tree of this.forest.trees) {
      if (tree.state !== "standing") continue;
      const d = Math.hypot(tree.position.x - playerPos.x, tree.position.y - playerPos.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = tree;
      }
    }
    if (!nearest) return null;
    const result = chopTree(nearest, CHOP_DPS * dtSeconds);
    const progress = 1 - nearest.hp / nearest.maxHp;
    if (result.completed) {
      addLogs(this.inventory, result.logDropped);
      scheduleRegrow(nearest, this.gameClock);
      this.bridge.showToast(`获得木材 x${result.logDropped}`, "🪵");
      this.publishSnapshot();
    }
    return {
      treeId: nearest.id,
      progress,
      completed: result.completed,
      logDropped: result.logDropped,
    };
  }

  sellAllLogs(): void {
    const bonus = this.woodBonusPct();
    const result = sellLogs(this.inventory, this.inventory.logs, bonus);
    this.publishSnapshot();
    if (result.sold > 0) {
      const bonusNote = bonus > 0 ? `（含宠物加成 +${bonus}%）` : "";
      this.bridge.showToast(
        `卖出 ${result.sold} 根木材 +${result.earned} 元${bonusNote}`,
        "💰",
      );
    } else {
      this.bridge.showToast("还没有木材可卖", "🧺");
    }
  }

  /** Active pet's wood-selling bonus in percent (0 without a pet). */
  woodBonusPct(): number {
    const active = this.pets.find((p) => p.id === this.activePetId);
    return active ? petBonusPct(active) : 0;
  }

  activePet(): Pet | null {
    return this.pets.find((p) => p.id === this.activePetId) ?? null;
  }

  /** Put a pet egg into the first empty hotbar slot. */
  buyEgg(): void {
    const ui = this.bridge.getSnapshot();
    const emptySlot = ui.hotbar.findIndex((item) => item === null);
    if (emptySlot < 0) {
      this.bridge.showToast("物品栏满了，腾个格子放蛋吧", "🥚");
      return;
    }
    if (!spendMoney(this.inventory, PET_EGG_PRICE)) {
      this.bridge.showToast(`宠物蛋要 ${PET_EGG_PRICE} 元哦`, "🥚");
      return;
    }
    const hotbar = [...ui.hotbar];
    hotbar[emptySlot] = "egg";
    this.bridge.patch({ hotbar });
    this.publishSnapshot();
    this.bridge.showToast("买到宠物蛋！选中后左键敲开孵化", "🥚");
  }

  /** Use the selected egg: hatch a random pet with random quality. */
  hatchEgg(rng: () => number = Math.random): void {
    const ui = this.bridge.getSnapshot();
    const eggSlot = ui.hotbar.findIndex((item) => item === "egg");
    if (eggSlot < 0) return;
    const hotbar = [...ui.hotbar];
    hotbar[eggSlot] = null;
    this.bridge.patch({ hotbar });

    const roll = rollPet(rng);
    const pet: Pet = {
      id: `pet-${this.petSeq++}`,
      species: roll.species,
      quality: roll.quality,
      stars: 1,
    };
    this.pets.push(pet);
    if (!this.activePetId) this.activePetId = pet.id;

    const species = getSpecies(pet.species);
    const quality = getQuality(pet.quality);
    this.publishSnapshot();
    this.bridge.showToast(
      `孵化成功：${quality.name}「${species.name}」${species.emoji}！卖木加成 +${petBonusPct(pet)}%`,
      species.emoji,
    );
  }

  selectPet(petId: string): void {
    if (!this.pets.some((p) => p.id === petId)) return;
    this.activePetId = petId;
    this.publishSnapshot();
    const pet = this.pets.find((p) => p.id === petId)!;
    this.bridge.showToast(`${getSpecies(pet.species).name} 出战！`, "🐾");
  }

  upgradePet(petId: string): void {
    const pet = this.pets.find((p) => p.id === petId);
    if (!pet) return;
    const cost = starUpgradeCost(pet);
    if (cost === null) {
      this.bridge.showToast("已经满星啦", "⭐");
      return;
    }
    if (!spendMoney(this.inventory, cost)) {
      this.bridge.showToast(`升星需要 ${cost} 元`, "⭐");
      return;
    }
    upgradeStars(pet);
    this.publishSnapshot();
    this.bridge.showToast(`升星成功！${"⭐".repeat(pet.stars)}`, "✨");
  }

  buyPhoneNow(): void {
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
  }

  orderFood(dishId: string): void {
    const dish = getDish(dishId);
    const result = placeOrder({
      inventory: this.inventory,
      dishId,
      customerId: "local",
      nowSeconds: this.gameClock,
    });
    this.publishSnapshot();
    if (!result.ok || !result.order) {
      this.bridge.showToast(
        result.reason === "insufficient-funds" ? "钱不够哦" : "菜品不存在",
        "😢",
      );
      return;
    }
    this.orders.push(result.order);
    this.publishSnapshot();
    const wasPhone = this.bridge.getSnapshot().phoneAppOpen;
    this.bridge.patch({ menuOpen: false, phoneAppOpen: false });
    this.bridge.showToast(
      wasPhone
        ? `手机下单成功：${dish?.name ?? ""}，请就座等待`
        : `已下单 ${dish?.name ?? ""}，请就座等待`,
      "🧾",
    );
  }

  sitAt(tableIndex: number): void {
    this.seatedTable = tableIndex;
    this.bridge.patch({ seated: true });
    this.bridge.showToast(`已入座 ${tableIndex + 1} 号桌`, "💺");
  }

  standUp(silent = false): void {
    if (this.seatedTable === null) return;
    this.seatedTable = null;
    this.bridge.patch({ seated: false });
    if (!silent) this.bridge.showToast("已起身", "🚶");
  }

  /** First ready order, if any (delivery claims it with serveOrder). */
  peekReadyOrder(): Order | null {
    return this.orders.find((o) => o.status === "ready") ?? null;
  }

  /** Mark the order served and record it into the food collection. */
  finishOrder(order: Order): void {
    serveOrder(order);
    const dish = getDish(order.dishId);
    if (dish) {
      recordEat({
        collection: this.collection,
        dishId: dish.id,
        nowSeconds: this.gameClock,
      });
      this.bridge.showToast(`上菜啦：${dish.name}，请享用！`, dish.emoji);
    }
    this.publishSnapshot();
  }

  publishSnapshot(): void {
    const orders: OrderView[] = this.orders.map((o) => ({
      id: o.id,
      dish: getDish(o.dishId)!,
      status: o.status,
      placedAt: o.placedAtSeconds,
      readyAt: o.readyAtSeconds,
    }));
    const pets = this.pets.map((p) => {
      const species = getSpecies(p.species);
      const quality = getQuality(p.quality);
      return {
        id: p.id,
        species: p.species,
        speciesName: species.name,
        emoji: species.emoji,
        quality: p.quality,
        qualityName: quality.name,
        qualityCss: quality.css,
        stars: p.stars,
        bonusPct: petBonusPct(p),
      };
    });
    this.bridge.updateSnapshot({
      logs: this.inventory.logs,
      money: this.inventory.money,
      hasPhone: this.inventory.hasPhone,
      orders,
      collection: Object.values(this.collection.entries),
      pets,
      activePetId: this.activePetId,
      petBonusPct: this.woodBonusPct(),
      fishBag: Object.entries(this.fishBag)
        .filter(([, n]) => n > 0)
        .map(([id, count]) => {
          const fish = getFish(id);
          return {
            id,
            name: fish.name,
            emoji: fish.emoji,
            count,
            price: fish.price,
          };
        }),
      fishTotal: Object.values(this.fishBag).reduce((n, c) => n + c, 0),
      vehicles: VEHICLES.map((v) => ({
        id: v.id,
        name: v.name,
        emoji: v.emoji,
        price: v.price,
        speedMult: v.speedMult,
        tier: v.tier,
        owned: this.ownedVehicleIds.includes(v.id),
        active: this.activeVehicleId === v.id,
      })),
      activeVehicleId: this.activeVehicleId,
      vehicleMult: this.speedMult(),
      ownedHouses: [...this.ownedHouseIds],
      comfort: this.comfort(),
    });
  }

  dishOf(order: Order): Dish {
    return getDish(order.dishId)!;
  }

  /** Street snack: pay & eat instantly, counts into the collection. */
  orderSnack(snackId: string): void {
    const snack = getSnack(snackId);
    if (!snack) return;
    if (!spendMoney(this.inventory, snack.price)) {
      this.bridge.showToast("钱不够哦", "😢");
      return;
    }
    recordEat({
      collection: this.collection,
      dishId: snack.id,
      nowSeconds: this.gameClock,
    });
    this.publishSnapshot();
    this.bridge.showToast(`吃掉 ${snack.name} ${snack.emoji}，真香！`, snack.emoji);
  }

  /** Pay the entry fee for whack-a-mole; the overlay runs the game. */
  arcadeStart(): boolean {
    if (!spendMoney(this.inventory, ARCADE_ENTRY_FEE)) {
      this.bridge.showToast(`入场费要 ${ARCADE_ENTRY_FEE} 元哦`, "🕹️");
      return false;
    }
    this.publishSnapshot();
    return true;
  }

  /** Reward the player for their whack-a-mole score. */
  arcadeFinish(score: number): void {
    const payout = Math.max(0, Math.floor(score)) * ARCADE_REWARD_PER_HIT;
    addMoney(this.inventory, payout);
    this.publishSnapshot();
    this.bridge.showToast(
      `打地鼠命中 ${score} 只，赢得 ${payout} 元 🕹️`,
      "🎉",
    );
  }

  /** Spin the slot machine; result is stored for the overlay to reveal. */
  casinoSpin(bet: number, rng: () => number = Math.random): void {
    if (!CASINO_BET_OPTIONS.includes(bet)) return;
    if (!spendMoney(this.inventory, bet)) {
      this.bridge.showToast("赌本不够哦，量力而行", "🎰");
      return;
    }
    const { reels, multiplier } = spinSlots(rng);
    const payout = Math.floor(bet * multiplier);
    if (payout > 0) addMoney(this.inventory, payout);
    this.publishSnapshot();
    this.bridge.patch({
      casinoResult: { reels: [...reels], bet, payout },
    });
  }

  private registerCommands(): void {
    const handler = (c: BridgeCommand) => this.handleCommand(c);
    for (const type of [
      "toggle-inventory",
      "toggle-settings",
      "open-menu",
      "close-menu",
      "open-depot",
      "close-depot",
      "open-phone-shop",
      "close-phone-shop",
      "buy-phone",
      "open-phone-app",
      "close-phone-app",
      "toggle-collection",
      "order-food",
      "sell-all-logs",
      "sit-at-table",
      "press-interact",
      "set-audio",
      "rebind",
      "select-slot",
      "open-snacks",
      "close-snacks",
      "order-snack",
      "open-arcade",
      "close-arcade",
      "arcade-start",
      "arcade-finish",
      "open-casino",
      "close-casino",
      "casino-spin",
      "open-pet-shop",
      "close-pet-shop",
      "buy-egg",
      "open-pets",
      "close-pets",
      "select-pet",
      "upgrade-pet",
      "toggle-map",
      "close-map",
      "open-fish-market",
      "close-fish-market",
      "sell-fish",
      "open-furniture",
      "close-furniture",
      "buy-furniture",
      "open-car-shop",
      "close-car-shop",
      "open-dealership",
      "close-dealership",
      "buy-vehicle",
      "select-vehicle",
      "buy-house",
      "close-house-panel",
      "reaction-start",
      "reaction-finish",
      "open-reaction",
      "close-reaction",
      "dice-bet",
    ] as const) {
      this.bridge.on(type, handler);
    }
  }

  private handleCommand(c: BridgeCommand): void {
    const ui = this.bridge.getSnapshot();
    switch (c.type) {
      case "toggle-inventory":
        this.bridge.patch({ inventoryOpen: !ui.inventoryOpen });
        break;
      case "toggle-settings":
        this.bridge.patch({ settingsOpen: !ui.settingsOpen });
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
      case "buy-phone":
        this.buyPhoneNow();
        break;
      case "open-phone-app":
        if (!this.inventory.hasPhone) {
          this.bridge.showToast("还没有手机，去手机店买一部吧", "📵");
          break;
        }
        this.bridge.patch({ phoneAppOpen: !ui.phoneAppOpen });
        break;
      case "close-phone-app":
        this.bridge.patch({ phoneAppOpen: false });
        break;
      case "toggle-collection":
        this.bridge.patch({ collectionOpen: !ui.collectionOpen });
        break;
      case "order-food":
        this.orderFood(c.dishId);
        break;
      case "sell-all-logs":
        this.sellAllLogs();
        break;
      case "sit-at-table":
        // Scene-side interactions handle seating precisely; no-op fallback.
        break;
      case "press-interact":
        // F key is handled by the active scene; no-op for remote triggers.
        break;
      case "set-audio":
        this.bridge.patch({ audio: c.audio });
        break;
      case "rebind": {
        const result = rebind({
          bindings: ui.bindings,
          action: c.action as never,
          key: c.key,
        });
        this.bridge.patch({ bindings: result.bindings });
        break;
      }
      case "select-slot": {
        const index = Math.max(0, Math.min(9, Math.floor(c.index)));
        this.bridge.patch({ selectedSlot: index });
        break;
      }
      case "open-snacks":
        this.bridge.patch({ snackStreetOpen: true });
        break;
      case "close-snacks":
        this.bridge.patch({ snackStreetOpen: false });
        break;
      case "order-snack":
        this.orderSnack(c.snackId);
        break;
      case "open-arcade":
        this.bridge.patch({ arcadeOpen: true });
        break;
      case "close-arcade":
        this.bridge.patch({ arcadeOpen: false });
        break;
      case "arcade-start":
        this.arcadeStart();
        break;
      case "arcade-finish":
        this.arcadeFinish(c.score);
        break;
      case "open-casino":
        this.bridge.patch({ casinoOpen: true });
        break;
      case "close-casino":
        this.bridge.patch({ casinoOpen: false });
        break;
      case "casino-spin":
        this.casinoSpin(c.bet);
        break;
      case "open-pet-shop":
        this.bridge.patch({ petShopOpen: true });
        break;
      case "close-pet-shop":
        this.bridge.patch({ petShopOpen: false });
        break;
      case "buy-egg":
        this.buyEgg();
        break;
      case "open-pets":
        this.bridge.patch({ petsOpen: !ui.petsOpen });
        break;
      case "close-pets":
        this.bridge.patch({ petsOpen: false });
        break;
      case "select-pet":
        this.selectPet(c.petId);
        break;
      case "upgrade-pet":
        this.upgradePet(c.petId);
        break;
      case "toggle-map":
        this.bridge.patch({ mapOpen: !ui.mapOpen });
        break;
      case "close-map":
        this.bridge.patch({ mapOpen: false });
        break;
      case "open-fish-market":
        this.bridge.patch({ fishMarketOpen: true });
        break;
      case "close-fish-market":
        this.bridge.patch({ fishMarketOpen: false });
        break;
      case "sell-fish":
        this.sellFish();
        break;
      case "open-furniture":
        this.bridge.patch({ furnitureOpen: true });
        break;
      case "close-furniture":
        this.bridge.patch({ furnitureOpen: false });
        break;
      case "buy-furniture":
        this.buyFurniture(c.furnitureId);
        break;
      case "open-car-shop":
        this.bridge.patch({ carShopOpen: true });
        break;
      case "close-car-shop":
        this.bridge.patch({ carShopOpen: false });
        break;
      case "open-dealership":
        this.bridge.patch({ dealershipOpen: true });
        break;
      case "close-dealership":
        this.bridge.patch({ dealershipOpen: false });
        break;
      case "buy-vehicle":
        this.buyVehicle(c.vehicleId);
        break;
      case "select-vehicle":
        this.selectVehicle(c.vehicleId);
        break;
      case "buy-house":
        this.buyHouse(c.houseId);
        break;
      case "close-house-panel":
        this.bridge.patch({ housePanel: null });
        break;
      case "reaction-start":
        this.reactionStart();
        break;
      case "reaction-finish":
        this.reactionFinish(c.ms);
        break;
      case "open-reaction":
        this.bridge.patch({ reactionOpen: true });
        break;
      case "close-reaction":
        this.bridge.patch({ reactionOpen: false });
        break;
      case "dice-bet":
        this.diceBet(c.choice, c.bet);
        break;
    }
  }
}