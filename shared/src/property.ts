export interface Property {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export const PROPERTIES: Property[] = [
  { id: "maple", name: "枫景小屋", emoji: "🏠", price: 2000 },
  { id: "lakeside", name: "湖畔别墅", emoji: "🏡", price: 8000 },
];

export interface FurnitureItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Comfort points contributed to the home. */
  comfort: number;
}

export const FURNITURE: FurnitureItem[] = [
  { id: "sofa", name: "沙发", emoji: "🛋️", price: 300, comfort: 5 },
  { id: "bed", name: "大床", emoji: "🛏️", price: 500, comfort: 8 },
  { id: "tv", name: "电视", emoji: "📺", price: 400, comfort: 6 },
  { id: "plant", name: "绿植", emoji: "🪴", price: 150, comfort: 3 },
  { id: "lamp", name: "落地灯", emoji: "💡", price: 200, comfort: 4 },
  { id: "painting", name: "油画", emoji: "🖼️", price: 350, comfort: 5 },
];

export const HOUSE_FURNITURE_SLOTS = 4;

export function getProperty(id: string): Property {
  return PROPERTIES.find((p) => p.id === id)!;
}

export function getFurniture(id: string): FurnitureItem {
  return FURNITURE.find((f) => f.id === id)!;
}

/** Total comfort of the furniture placed in a house (null slots ignored). */
export function comfortOf(slots: (string | null)[]): number {
  return slots.reduce((n, id) => (id ? n + getFurniture(id).comfort : n), 0);
}