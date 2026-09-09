export type PetSpeciesId = "dog" | "cat" | "rabbit" | "duck" | "dragon";

export interface PetSpecies {
  id: PetSpeciesId;
  name: string;
  emoji: string;
  /** Spawn weight out of 100. */
  weight: number;
}

export const PET_SPECIES: PetSpecies[] = [
  { id: "dog", name: "小狗", emoji: "🐶", weight: 30 },
  { id: "cat", name: "小猫", emoji: "🐱", weight: 30 },
  { id: "rabbit", name: "小白兔", emoji: "🐰", weight: 20 },
  { id: "duck", name: "鸭鸭", emoji: "🦆", weight: 15 },
  { id: "dragon", name: "小龙", emoji: "🐲", weight: 5 },
];

export type PetQuality = "common" | "rare" | "epic" | "legendary";

export interface PetQualityDef {
  id: PetQuality;
  name: string;
  /** Hex color for the Phaser aura (0xRRGGBB). */
  color: number;
  /** CSS color for the React UI. */
  css: string;
  /** Spawn weight out of 100. */
  weight: number;
  /** Base wood-selling bonus in percent. */
  bonusPct: number;
}

export const PET_QUALITIES: PetQualityDef[] = [
  { id: "common", name: "普通", color: 0xb8b8b8, css: "#b8b8b8", weight: 60, bonusPct: 0 },
  { id: "rare", name: "稀有", color: 0x4a90e2, css: "#4a90e2", weight: 25, bonusPct: 5 },
  { id: "epic", name: "史诗", color: 0xa44ae2, css: "#a44ae2", weight: 12, bonusPct: 10 },
  { id: "legendary", name: "传说", color: 0xffb400, css: "#ffb400", weight: 3, bonusPct: 20 },
];

export const PET_MAX_STARS = 5;
/** Each star above 1 adds this much bonus percent. */
export const PET_BONUS_PER_STAR = 5;
export const PET_EGG_PRICE = 120;

export interface Pet {
  id: string;
  species: PetSpeciesId;
  quality: PetQuality;
  stars: number;
}

export function getSpecies(id: PetSpeciesId): PetSpecies {
  return PET_SPECIES.find((s) => s.id === id)!;
}

export function getQuality(id: PetQuality): PetQualityDef {
  return PET_QUALITIES.find((q) => q.id === id)!;
}

function weighted<T extends { weight: number }>(list: T[], rng: () => number): T {
  const total = list.reduce((n, item) => n + item.weight, 0);
  let roll = rng() * total;
  for (const item of list) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return list[list.length - 1];
}

export interface PetRoll {
  species: PetSpeciesId;
  quality: PetQuality;
}

/** Roll a random pet from an egg; deterministic for a given rng. */
export function rollPet(rng: () => number): PetRoll {
  return {
    species: weighted(PET_SPECIES, rng).id,
    quality: weighted(PET_QUALITIES, rng).id,
  };
}

export function petBonusPct(pet: Pet): number {
  const base = getQuality(pet.quality).bonusPct;
  return base + (pet.stars - 1) * PET_BONUS_PER_STAR;
}

/** Money needed to raise the pet to the next star (capped at MAX_STARS). */
export function starUpgradeCost(pet: Pet): number | null {
  if (pet.stars >= PET_MAX_STARS) return null;
  return 200 * pet.stars;
}

/** Raise a pet's stars; returns false when already maxed. */
export function upgradeStars(pet: Pet): boolean {
  if (pet.stars >= PET_MAX_STARS) return false;
  pet.stars += 1;
  return true;
}