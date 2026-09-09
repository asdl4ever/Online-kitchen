import Phaser from "phaser";
import {
  RoomScene,
  FURNITURE_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const COUNTER = { x: 280, y: 130 };

export class FurnitureScene extends RoomScene {
  constructor() {
    super(FURNITURE_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 560,
      height: 420,
      floorColor: 0xe8dcc8,
      wallColor: 0x8a7a5a,
      doorPos: { x: 280, y: 370 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🛋️ 家具店");
    this.drawDoor();

    // Display furniture
    const display = ["🛋️", "🛏️", "📺", "🪴", "💡", "🖼️"];
    display.forEach((emoji, i) => {
      const x = 110 + (i % 3) * 170;
      const y = i < 3 ? 80 : 190;
      this.add.rectangle(x, y + 26, 90, 12, 0x8a7a5a, 0.9);
      this.add.text(x, y, emoji, { fontSize: "30px" }).setOrigin(0.5);
    });

    // Counter with the clerk
    this.add.ellipse(COUNTER.x + 2, COUNTER.y + 26, 120, 16, 0x3d2b1f, 0.18);
    this.add.rectangle(COUNTER.x, COUNTER.y + 12, 130, 30, 0xa08a6a);
    this.add.rectangle(COUNTER.x, COUNTER.y, 130, 22, 0xc4ab80);
    this.add.text(COUNTER.x - 36, COUNTER.y - 14, "🧕", { fontSize: "28px" });
    this.add
      .text(COUNTER.x, COUNTER.y + 40, "🛒 买家具装点你的家", {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开家具店";
    } else if (this.near(pos, COUNTER, 90)) {
      next = { kind: "counter" };
      prompt = "按 F 逛家具";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ furnitureOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}