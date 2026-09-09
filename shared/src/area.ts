import type { Rect } from "./types";

export type AreaKind =
  | "spawn"
  | "forest"
  | "lumberYard"
  | "restaurant"
  | "phoneStore"
  | "town"
  | "foodStreet"
  | "arcade"
  | "casino";

export interface Area {
  id: string;
  kind: AreaKind;
  label: string;
  bounds: Rect;
}

export const WORLD_BOUNDS: Rect = {
  x: -1500,
  y: -1300,
  width: 3000,
  height: 2600,
};

export const AREAS: Area[] = [
  {
    id: "spawn",
    kind: "spawn",
    label: "出生广场",
    bounds: { x: -100, y: -100, width: 200, height: 200 },
  },
  {
    id: "forest",
    kind: "forest",
    label: "树林",
    bounds: { x: 640, y: -980, width: 560, height: 440 },
  },
  {
    id: "town",
    kind: "town",
    label: "小镇",
    bounds: { x: 980, y: -1270, width: 420, height: 260 },
  },
  {
    id: "food-street",
    kind: "foodStreet",
    label: "小吃街",
    bounds: { x: 120, y: 120, width: 280, height: 150 },
  },
  {
    id: "arcade",
    kind: "arcade",
    label: "电玩店",
    bounds: { x: -1120, y: -560, width: 240, height: 180 },
  },
  {
    id: "casino",
    kind: "casino",
    label: "赌场",
    bounds: { x: -1080, y: 320, width: 260, height: 190 },
  },
  {
    id: "lumber-yard",
    kind: "lumberYard",
    label: "木材店",
    bounds: { x: -820, y: -260, width: 180, height: 140 },
  },
  {
    id: "restaurant",
    kind: "restaurant",
    label: "餐厅",
    bounds: { x: -140, y: 420, width: 280, height: 170 },
  },
  {
    id: "phone-store",
    kind: "phoneStore",
    label: "手机店",
    bounds: { x: 380, y: 440, width: 180, height: 120 },
  },
];

export function clampToWorld(pos: { x: number; y: number }): {
  x: number;
  y: number;
} {
  const minX = WORLD_BOUNDS.x;
  const minY = WORLD_BOUNDS.y;
  const maxX = WORLD_BOUNDS.x + WORLD_BOUNDS.width;
  const maxY = WORLD_BOUNDS.y + WORLD_BOUNDS.height;
  return {
    x: Math.min(maxX, Math.max(minX, pos.x)),
    y: Math.min(maxY, Math.max(minY, pos.y)),
  };
}

export function areaAt(pos: { x: number; y: number }): Area | undefined {
  return AREAS.find(
    (a) =>
      pos.x >= a.bounds.x &&
      pos.x <= a.bounds.x + a.bounds.width &&
      pos.y >= a.bounds.y &&
      pos.y <= a.bounds.y + a.bounds.height,
  );
}