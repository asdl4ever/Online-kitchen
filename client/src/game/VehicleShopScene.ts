import Phaser from "phaser";
import { VEHICLES, type VehicleTier } from "shared";
import {
  RoomScene,
  CAR_SHOP_SCENE_KEY,
  DEALERSHIP_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

/**
 * Vehicle shop interior. Two flavours:
 *  - CarShopScene (车店): light tier, budget rides
 *  - DealershipScene (4S店): luxury tier, showroom vibe
 */
export class VehicleShopScene extends RoomScene {
  private tier: VehicleTier = "light";
  private panelCommand: "open-car-shop" | "open-dealership" = "open-car-shop";

  protected configure(tier: VehicleTier): void {
    this.tier = tier;
    this.panelCommand = tier === "light" ? "open-car-shop" : "open-dealership";
  }

  protected getLayout() {
    return {
      width: 620,
      height: 460,
      floorColor: this.tier === "light" ? 0xd8d8d8 : 0xf0e6d0,
      wallColor: this.tier === "light" ? 0x5a6a7a : 0x8a5a2a,
      doorPos: { x: 310, y: 410 },
    };
  }

  protected drawRoom(): void {
    const stock = VEHICLES.filter((v) => v.tier === this.tier);
    const title =
      this.tier === "light" ? "🛵 车行" : "🏎️ 4S 店";
    this.drawFloorAndWalls(title);
    this.drawDoor();

    stock.forEach((v, i) => {
      const x = 310 + (i - (stock.length - 1) / 2) * 190;
      const y = 150;
      this.add.ellipse(x + 3, y + 40, 120, 18, 0x3d2b1f, 0.18);
      // Rotating platform
      this.add.ellipse(x, y + 26, 110, 34, this.tier === "light" ? 0xb8c4d0 : 0xe8c88a, 0.9);
      this.add.text(x, y, v.emoji, { fontSize: "44px" }).setOrigin(0.5);
      this.add
        .text(x, y + 52, `${v.name} ${v.price}元`, {
          fontSize: "12px",
          color: "#fff8ec",
          fontStyle: "bold",
          backgroundColor: "#3d2b1f99",
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5);
    });

    // Counter
    const cy = 320;
    this.add.ellipse(310 + 2, cy + 22, 120, 14, 0x3d2b1f, 0.18);
    this.add.rectangle(310, cy + 8, 130, 28, 0x8a6642);
    this.add.rectangle(310, cy - 4, 130, 20, 0xb08a5f);
    this.add.text(274, cy - 18, "🧑‍💼", { fontSize: "26px" });
    this.add
      .text(310, cy + 36, "💰 选购你的爱车", {
        fontSize: "12px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1f99",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = this.tier === "light" ? "按 F 离开车行" : "按 F 离开 4S 店";
    } else if (this.near(pos, { x: 310, y: 320 }, 90)) {
      next = { kind: "counter" };
      prompt = this.tier === "light" ? "按 F 看车 🛵" : "按 F 看车 🏎️";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ [this.panelCommand]: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}

export class CarShopScene extends VehicleShopScene {
  constructor() {
    super(CAR_SHOP_SCENE_KEY);
    this.configure("light");
  }
}

export class DealershipScene extends VehicleShopScene {
  constructor() {
    super(DEALERSHIP_SCENE_KEY);
    this.configure("luxury");
  }
}