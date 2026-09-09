import Phaser from "phaser";
import {
  RoomScene,
  ARCADE_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const MACHINE = { x: 300, y: 130 };
const REACTION_MACHINE = { x: 490, y: 150 };

export class ArcadeScene extends RoomScene {
  constructor() {
    super(ARCADE_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 660,
      height: 480,
      floorColor: 0xdcd0f0,
      wallColor: 0x5a4a7a,
      doorPos: { x: 300, y: 430 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🕹️ 电玩店");
    this.drawDoor();

    // Arcade cabinets
    const cabinets = [
      { x: MACHINE.x - 200, emoji: "🎮" },
      { x: MACHINE.x - 100, emoji: "🕹️" },
      { x: MACHINE.x, emoji: "🎮" },
    ];
    for (const cab of cabinets) {
      this.add.ellipse(cab.x + 2, MACHINE.y + 40, 70, 14, 0x3d2b1f, 0.18);
      this.add.rectangle(cab.x, MACHINE.y, 56, 84, 0x46356b, 0.98);
      this.add.rectangle(cab.x, MACHINE.y - 12, 56, 40, 0x6a54a0, 0.98);
      this.add.text(cab.x, MACHINE.y - 12, cab.emoji, { fontSize: "26px" }).setOrigin(0.5);
      this.add.rectangle(cab.x, MACHINE.y + 26, 44, 16, 0x2b2145, 0.95);
    }
    this.add
      .text(MACHINE.x - 100, MACHINE.y - 66, "🎯 打地鼠机", {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Reaction machine on the right
    this.add.ellipse(REACTION_MACHINE.x + 2, REACTION_MACHINE.y + 40, 70, 14, 0x3d2b1f, 0.18);
    this.add.rectangle(REACTION_MACHINE.x, REACTION_MACHINE.y, 56, 84, 0x6b3550, 0.98);
    this.add.rectangle(REACTION_MACHINE.x, REACTION_MACHINE.y - 12, 56, 40, 0x9b4a6a, 0.98);
    this.add.text(REACTION_MACHINE.x, REACTION_MACHINE.y - 12, "⚡", { fontSize: "26px" }).setOrigin(0.5);
    this.add.rectangle(REACTION_MACHINE.x, REACTION_MACHINE.y + 26, 44, 16, 0x452030, 0.95);
    this.add
      .text(REACTION_MACHINE.x, REACTION_MACHINE.y - 66, "⚡ 极速反应机", {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Decor
    this.add.text(60, 320, "🧸", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(600, 320, "🎲", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(90, 90, "🏆", { fontSize: "24px" }).setOrigin(0.5);
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开电玩店";
    } else if (this.near(pos, REACTION_MACHINE, 80)) {
      next = { kind: "reaction" };
      prompt = "按 F 玩极速反应 ⚡";
    } else if (this.near(pos, MACHINE, 100)) {
      next = { kind: "counter" };
      prompt = "按 F 玩打地鼠 🐹";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ arcadeOpen: true });
    } else if (this.pending?.kind === "reaction") {
      this.session.bridge.patch({ reactionOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {}
}