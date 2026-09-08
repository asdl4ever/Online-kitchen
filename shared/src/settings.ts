export type GameAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "chop"
  | "openInventory"
  | "interact"
  | "openSettings";

export interface Bindings {
  [action: string]: string;
}

export const DEFAULT_BINDINGS: Bindings = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  chop: "Mouse0",
  openInventory: "KeyE",
  interact: "KeyF",
  openSettings: "Escape",
};

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}

export function makeAudioSettings(
  overrides: Partial<AudioSettings> = {},
): AudioSettings {
  return {
    master: clamp01(overrides.master ?? 1),
    music: clamp01(overrides.music ?? 1),
    sfx: clamp01(overrides.sfx ?? 1),
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function effectiveVolume(audio: AudioSettings): number {
  return audio.master * audio.music * audio.sfx;
}

export interface RebindInput {
  bindings: Bindings;
  action: GameAction;
  key: string;
}

export interface RebindResult {
  ok: boolean;
  bindings: Bindings;
  /** Previous action(s) that lost this key due to conflict. */
  stolenFrom: string[];
}

/**
 * Rebinds an action to a key. If `key` is already used by another action,
 * that other action is reset to its default binding (conflict resolution).
 */
export function rebind(input: RebindInput): RebindResult {
  const bindings = { ...input.bindings };
  const stolenFrom: string[] = [];

  for (const [action, value] of Object.entries(bindings)) {
    if (action !== input.action && value === input.key) {
      bindings[action] = DEFAULT_BINDINGS[action];
      stolenFrom.push(action);
    }
  }
  bindings[input.action] = input.key;
  return { ok: true, bindings, stolenFrom };
}