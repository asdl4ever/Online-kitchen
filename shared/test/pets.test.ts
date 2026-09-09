import { describe, expect, it } from "vitest";
import {
  PET_MAX_STARS,
  PET_SPECIES,
  PET_QUALITIES,
  petBonusPct,
  rollPet,
  starUpgradeCost,
  upgradeStars,
  type Pet,
} from "../src/pets";

function makePet(quality: Pet["quality"], stars = 1): Pet {
  return { id: "p1", species: "cat", quality, stars };
}

describe("pet rolls", () => {
  it("rolls every species and quality within the pools", () => {
    const seen = new Set<string>();
    const seenQ = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const roll = rollPet(() => (i % 100) / 100);
      seen.add(roll.species);
      seenQ.add(roll.quality);
    }
    // With a sweeping rng every bucket is visited.
    expect(seen.size).toBe(PET_SPECIES.length);
    expect(seenQ.size).toBe(PET_QUALITIES.length);
  });

  it("is deterministic for a fixed rng", () => {
    const a = rollPet(() => 0.42);
    const b = rollPet(() => 0.42);
    expect(a).toEqual(b);
  });
});

describe("pet quality & stars", () => {
  it("grants higher base bonus for better quality", () => {
    expect(petBonusPct(makePet("common"))).toBe(0);
    expect(petBonusPct(makePet("rare"))).toBe(5);
    expect(petBonusPct(makePet("epic"))).toBe(10);
    expect(petBonusPct(makePet("legendary"))).toBe(20);
  });

  it("adds bonus per star above one", () => {
    expect(petBonusPct(makePet("rare", 3))).toBe(15);
    expect(petBonusPct(makePet("legendary", 5))).toBe(40);
  });

  it("caps stars at the maximum", () => {
    const pet = makePet("common", PET_MAX_STARS);
    expect(upgradeStars(pet)).toBe(false);
    expect(pet.stars).toBe(PET_MAX_STARS);
    expect(starUpgradeCost(pet)).toBeNull();
  });

  it("charges more for higher stars", () => {
    expect(starUpgradeCost(makePet("common", 1))).toBe(200);
    expect(starUpgradeCost(makePet("common", 4))).toBe(800);
    const pet = makePet("common", 2);
    expect(upgradeStars(pet)).toBe(true);
    expect(pet.stars).toBe(3);
  });
});
