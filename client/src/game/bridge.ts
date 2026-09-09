import type {
  AudioSettings,
  Bindings,
  Dish,
  FoodEntry,
  OrderStatus,
  Pet,
  PetQuality,
  PetSpeciesId,
  VehicleTier,
} from "shared";

export interface OrderView {
  id: string;
  dish: Dish;
  status: OrderStatus;
  placedAt: number;
  readyAt: number;
}

export type HotbarItem = "axe" | "egg" | null;
export const HOTBAR_SIZE = 10;

export interface PetView {
  id: string;
  species: PetSpeciesId;
  speciesName: string;
  emoji: string;
  quality: PetQuality;
  qualityName: string;
  qualityCss: string;
  stars: number;
  bonusPct: number;
}

export interface FishBagView {
  id: string;
  name: string;
  emoji: string;
  count: number;
  price: number;
}

export interface VehicleView {
  id: string;
  name: string;
  emoji: string;
  price: number;
  speedMult: number;
  tier: VehicleTier;
  owned: boolean;
  active: boolean;
}

export interface HousePanelView {
  houseId: string;
  name: string;
  emoji: string;
  price: number;
  owned: boolean;
}

export interface GameUiState {
  prompt: string | null;
  inventoryOpen: boolean;
  settingsOpen: boolean;
  menuOpen: boolean;
  depotOpen: boolean;
  phoneShopOpen: boolean;
  phoneAppOpen: boolean;
  collectionOpen: boolean;
  logs: number;
  money: number;
  hasPhone: boolean;
  orders: OrderView[];
  collection: FoodEntry[];
  seated: boolean;
  toast: { id: number; text: string; emoji?: string } | null;
  bindings: Bindings;
  audio: AudioSettings;
  hotbar: HotbarItem[];
  selectedSlot: number;
  snackStreetOpen: boolean;
  arcadeOpen: boolean;
  casinoOpen: boolean;
  casinoResult: { reels: string[]; bet: number; payout: number } | null;
  petShopOpen: boolean;
  petsOpen: boolean;
  pets: PetView[];
  activePetId: string | null;
  petBonusPct: number;
  playerPos: { x: number; y: number } | null;
  mapOpen: boolean;
  fishMarketOpen: boolean;
  fishBag: FishBagView[];
  fishTotal: number;
  furnitureOpen: boolean;
  carShopOpen: boolean;
  dealershipOpen: boolean;
  vehicles: VehicleView[];
  activeVehicleId: string | null;
  vehicleMult: number;
  housePanel: HousePanelView | null;
  ownedHouses: string[];
  comfort: number;
  diceResult: { dice: [number, number]; sum: number; payout: number; bet: number } | null;
  reactionOpen: boolean;
}

export type BridgeCommand =
  | { type: "toggle-inventory" }
  | { type: "toggle-settings" }
  | { type: "open-menu" }
  | { type: "close-menu" }
  | { type: "open-depot" }
  | { type: "close-depot" }
  | { type: "open-phone-shop" }
  | { type: "close-phone-shop" }
  | { type: "buy-phone" }
  | { type: "open-phone-app" }
  | { type: "close-phone-app" }
  | { type: "toggle-collection" }
  | { type: "order-food"; dishId: string }
  | { type: "sell-all-logs" }
  | { type: "sit-at-table" }
  | { type: "press-interact" }
  | { type: "set-audio"; audio: AudioSettings }
  | { type: "rebind"; action: string; key: string }
  | { type: "select-slot"; index: number }
  | { type: "open-snacks" }
  | { type: "close-snacks" }
  | { type: "order-snack"; snackId: string }
  | { type: "open-arcade" }
  | { type: "close-arcade" }
  | { type: "arcade-start" }
  | { type: "arcade-finish"; score: number }
  | { type: "open-casino" }
  | { type: "close-casino" }
  | { type: "casino-spin"; bet: number }
  | { type: "open-pet-shop" }
  | { type: "close-pet-shop" }
  | { type: "buy-egg" }
  | { type: "open-pets" }
  | { type: "close-pets" }
  | { type: "select-pet"; petId: string }
  | { type: "upgrade-pet"; petId: string }
  | { type: "toggle-map" }
  | { type: "close-map" }
  | { type: "open-fish-market" }
  | { type: "close-fish-market" }
  | { type: "sell-fish" }
  | { type: "open-furniture" }
  | { type: "close-furniture" }
  | { type: "buy-furniture"; furnitureId: string }
  | { type: "open-car-shop" }
  | { type: "close-car-shop" }
  | { type: "open-dealership" }
  | { type: "close-dealership" }
  | { type: "buy-vehicle"; vehicleId: string }
  | { type: "select-vehicle"; vehicleId: string }
  | { type: "buy-house"; houseId: string }
  | { type: "close-house-panel" }
  | { type: "reaction-start" }
  | { type: "reaction-finish"; ms: number }
  | { type: "open-reaction" }
  | { type: "close-reaction" }
  | { type: "dice-bet"; choice: "big" | "small"; bet: number }
  | { type: "click-position"; x: number; y: number };

export interface CommandResult {
  ok: boolean;
  reason?: string;
}

/** Registry key used to hand the GameBridge to the Phaser scene before boot. */
export const GAME_BRIDGE_KEY = "game-bridge";

/**
 * Thin state hub between the React overlay and the Phaser scene.
 * React holds UI flags + read-only snapshots; the scene owns the
 * authoritative game rules and mutates them; commands flow React -> scene.
 * The UI is refreshed by calling notify() after any relevant mutation.
 */
export class GameBridge {
  private state: GameUiState;
  private forwards: Map<BridgeCommand["type"], (c: BridgeCommand) => void> =
    new Map();
  private listeners = new Set<() => void>();
  private toastSeq = 0;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(initial: { bindings: Bindings; audio: AudioSettings }) {
    this.state = {
      prompt: null,
      inventoryOpen: false,
      settingsOpen: false,
      menuOpen: false,
      depotOpen: false,
      phoneShopOpen: false,
      phoneAppOpen: false,
      collectionOpen: false,
      logs: 0,
      money: 0,
      hasPhone: false,
      orders: [],
      collection: [],
      seated: false,
      toast: null,
      bindings: initial.bindings,
      audio: initial.audio,
      hotbar: (() => {
        const slots: HotbarItem[] = Array(HOTBAR_SIZE).fill(null);
        slots[0] = "axe";
        return slots;
      })(),
      selectedSlot: 0,
      snackStreetOpen: false,
      arcadeOpen: false,
      casinoOpen: false,
      casinoResult: null,
      petShopOpen: false,
      petsOpen: false,
      pets: [],
      activePetId: null,
      petBonusPct: 0,
      playerPos: null,
      mapOpen: false,
      fishMarketOpen: false,
      fishBag: [],
      fishTotal: 0,
      furnitureOpen: false,
      carShopOpen: false,
      dealershipOpen: false,
      vehicles: [],
      activeVehicleId: null,
      vehicleMult: 1,
      housePanel: null,
      ownedHouses: [],
      comfort: 0,
      diceResult: null,
      reactionOpen: false,
    };
  }

  getSnapshot(): GameUiState {
    return this.state;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }

  patch(partial: Partial<GameUiState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /** Alias for patch: scene authoritative values that should flow into the UI. */
  updateSnapshot(partial: Partial<GameUiState>): void {
    this.patch(partial);
  }

  showToast(text: string, emoji?: string): void {
    this.toastSeq += 1;
    this.state = {
      ...this.state,
      toast: { id: this.toastSeq, text, emoji },
    };
    this.notify();
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.timeoutHandle = setTimeout(() => {
      this.state = { ...this.state, toast: null };
      this.notify();
    }, 2200);
  }

  on(
    type: BridgeCommand["type"],
    handler: (c: BridgeCommand) => void,
  ): void {
    this.forwards.set(type, handler);
  }

  off(type: BridgeCommand["type"]): void {
    this.forwards.delete(type);
  }

  send(command: BridgeCommand): CommandResult {
    const handler = this.forwards.get(command.type);
    if (!handler) return { ok: false, reason: "no-handler" };
    handler(command);
    return { ok: true };
  }
}