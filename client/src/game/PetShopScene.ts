import Phaser from "phaser";
import { PET_EGG_PRICE } from "shared";
import {
  RoomScene,
  PET_SHOP_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const COUNTER = { x: 310, y: 130 };

export class PetShopScene extends RoomScene {
  constructor() {
    super(PET_SHOP_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 620,
      height: 460,
      floorColor: 0xd8ecd0,
      wallColor: 0x5f8a5f,
      doorPos: { x: 310, y: 410 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🐾 宠物店");
    this.drawDoor();

    // Egg display shelf
    for (const x of [240, 310, 380]) {
      this.add.rectangle(x, COUNTER.y - 44, 44, 10, 0x8a6642, 0.95);
      this.add.text(x, COUNTER.y - 62, "🥚", { fontSize: "24px" }).setOrigin(0.5);
    }

    // Counter with the shopkeeper
    this.add.ellipse(COUNTER.x + 2, COUNTER.y + 26, 130, 16, 0x3d2b1f, 0.18);
    this.add.rectangle(COUNTER.x, COUNTER.y + 12, 140, 30, 0x6f9b6f);
    this.add.rectangle(COUNTER.x, COUNTER.y, 140, 22, 0x93bd93);
    this.add.text(COUNTER.x - 40, COUNTER.y - 14, "👩‍🌾", { fontSize: "28px" });
    this.add
      .text(COUNTER.x, COUNTER.y + 40, `🥚 闪闪宠物蛋 ${PET_EGG_PRICE} 元`, {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Cute decor
    this.add.text(80, 300, "🦴", { fontSize: "24px" }).setOrigin(0.5);
    this.add.text(540, 300, "🐾", { fontSize: "24px" }).setOrigin(0.5);
    this.add.text(120, 80, "🧶", { fontSize: "22px" }).setOrigin(0.5);
    this.add.text(500, 80, "🎾", { fontSize: "22px" }).setOrigin(0.5);
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开宠物店";
    } else if (this.near(pos, COUNTER, 90)) {
      next = { kind: "counter" };
      prompt = "按 F 买宠物蛋 🥚";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ petShopOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}