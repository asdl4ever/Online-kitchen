export type VehicleTier = "light" | "luxury";

export interface Vehicle {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Movement speed multiplier when this vehicle is active. */
  speedMult: number;
  tier: VehicleTier;
}

export const VEHICLES: Vehicle[] = [
  { id: "bike", name: "自行车", emoji: "🚲", price: 500, speedMult: 1.3, tier: "light" },
  { id: "scooter", name: "小电驴", emoji: "🛵", price: 1500, speedMult: 1.6, tier: "light" },
  { id: "car", name: "家用轿车", emoji: "🚗", price: 5000, speedMult: 2.0, tier: "luxury" },
  { id: "sport", name: "超跑", emoji: "🏎️", price: 20000, speedMult: 2.6, tier: "luxury" },
];

export function getVehicle(id: string): Vehicle {
  return VEHICLES.find((v) => v.id === id)!;
}