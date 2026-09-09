import Phaser from "phaser";
import {
  RoomScene,
  CASINO_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const MACHINE = { x: 310, y: 130 };

export class CasinoScene extends RoomScene {
  constructor() {
    super(CASINO_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 620,
      height: 460,
      floorColor: 0x5c2440,
      wallColor: 0x2e1a2a,
      doorPos: { x: 310, y: 410 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🎰 赌场");
    this.drawDoor();

    // Slot machine cabinet
    this.add.ellipse(MACHINE.x + 2, MACHINE.y + 46, 110, 16, 0x000000, 0.25);
    this.add.rectangle(MACHINE.x, MACHINE.y, 96, 96, 0x8b1e3f, 0.98);
    this.add.rectangle(MACHINE.x, MACHINE.y - 8, 76, 52, 0xffd93b, 0.98);
    this.add.text(MACHINE.x, MACHINE.y - 8, "🎰", { fontSize: "34px" }).setOrigin(0.5);
    this.add.rectangle(MACHINE.x, MACHINE.y + 34, 76, 18, 0x2e1a2a, 0.95);
    const sign = this.add
      .text(MACHINE.x, MACHINE.y - 72, "💰 幸运老虎机", {
        fontSize: "13px",
        color: "#ffe08a",
        fontStyle: "bold",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Velvet ropes + decor
    for (const x of [140, 480]) {
      this.add.text(x, 260, "🎱", { fontSize: "22px" }).setOrigin(0.5);
      this.add.text(x, 330, "🃏", { fontSize: "22px" }).setOrigin(0.5);
    }
    this.add.text(80, 80, "💰", { fontSize: "24px" }).setOrigin(0.5);
    this.add.text(540, 80, "💎", { fontSize: "24px" }).setOrigin(0.5);
    void sign;
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开赌场";
    } else if (this.near(pos, MACHINE, 95)) {
      next = { kind: "counter" };
      prompt = "按 F 玩老虎机 🎰";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ casinoOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}