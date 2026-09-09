import Phaser from "phaser";
import { getFurniture } from "shared";
import {
  RoomScene,
  HOUSE_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

/** Interior of the player's own house with furniture slots. */
export class HouseScene extends RoomScene {
  private houseId: string | null = null;
  private furnitureSprites: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(HOUSE_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 560,
      height: 420,
      floorColor: 0xf3e4c8,
      wallColor: 0x9b6d4c,
      doorPos: { x: 280, y: 370 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🏠 我的家");
    this.drawDoor();
    // Cozy rug
    this.add.ellipse(280, 220, 220, 130, 0xe8b04a, 0.35);
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    const isExit = this.near(pos, this.layout.doorPos, 60);
    this.pending = isExit ? { kind: "exit" } : null;
    this.bridgePatchPrompt(isExit ? "按 F 出门" : null);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "exit") this.exitRoom();
  }

  protected roomUpdate(_dt: number): void {
    const houseId = this.game.registry.get("house-id") as string | null;
    if (houseId !== this.houseId) {
      this.houseId = houseId;
      this.renderFurniture();
    }
  }

  private renderFurniture(): void {
    for (const sprite of this.furnitureSprites) sprite.destroy();
    this.furnitureSprites = [];
    if (!this.houseId) return;
    const slots = this.session.furnishings[this.houseId] ?? [];
    const spots = [
      { x: 140, y: 140 },
      { x: 420, y: 140 },
      { x: 140, y: 290 },
      { x: 420, y: 290 },
    ];
    spots.forEach((spot, i) => {
      // Slot marker
      this.add.rectangle(spot.x, spot.y, 64, 52, 0xd9c9a8, 0.5);
      const furnitureId = slots[i] ?? null;
      if (furnitureId) {
        const item = getFurniture(furnitureId);
        const text = this.add
          .text(spot.x, spot.y, item.emoji, { fontSize: "30px" })
          .setOrigin(0.5);
        this.furnitureSprites.push(text);
      } else {
        this.add
          .text(spot.x, spot.y, "＋", { fontSize: "18px", color: "#a08a6a" })
          .setOrigin(0.5);
      }
    });
  }
}