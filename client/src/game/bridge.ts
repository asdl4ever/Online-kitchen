import type {
  AudioSettings,
  Bindings,
  Dish,
  FoodEntry,
  OrderStatus,
} from "shared";

export interface OrderView {
  id: string;
  dish: Dish;
  status: OrderStatus;
  placedAt: number;
  readyAt: number;
}

export type HotbarItem = "axe" | null;
export const HOTBAR_SIZE = 10;

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