import Phaser from "phaser";
import {
  RoomScene,
  ARCADE_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const MACHINE = { x: 300, y: 130 };

export class ArcadeScene extends RoomScene {
  constructor() {
    super(ARCADE_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 600,
      height: 460,
      floorColor: 0xdcd0f0,
      wallColor: 0x5a4a7a,
      doorPos: { x: 300, y: 410 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🕹️ 电玩店");
    this.drawDoor();

    // Arcade cabinets
    const cabinets = [
      { x: MACHINE.x - 110, emoji: "🎮" },
      { x: MACHINE.x, emoji: "🕹️" },
      { x: MACHINE.x + 110, emoji: "🎮" },
    ];
    for (const cab of cabinets) {
      this.add.ellipse(cab.x + 2, MACHINE.y + 40, 70, 14, 0x3d2b1f, 0.18);
      this.add.rectangle(cab.x, MACHINE.y, 56, 84, 0x46356b, 0.98);
      this.add.rectangle(cab.x, MACHINE.y - 12, 56, 40, 0x6a54a0, 0.98);
      this.add.text(cab.x, MACHINE.y - 12, cab.emoji, { fontSize: "26px" }).setOrigin(0.5);
      this.add.rectangle(cab.x, MACHINE.y + 26, 44, 16, 0x2b2145, 0.95);
    }
    const sign = this.add
      .text(MACHINE.x, MACHINE.y - 66, "🎯 打地鼠机", {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Decor
    this.add.text(60, 300, "🧸", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(540, 300, "🎲", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(90, 90, "🏆", { fontSize: "24px" }).setOrigin(0.5);
    void sign;
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开电玩店";
    } else if (this.near(pos, MACHINE, 90)) {
      next = { kind: "counter" };
      prompt = "按 F 玩打地鼠 🐹";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ arcadeOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}