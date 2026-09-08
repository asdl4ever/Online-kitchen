import Phaser from "phaser";
import {
  RoomScene,
  LUMBER_YARD_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";

const COUNTER = { x: 320, y: 130 };

export class LumberYardScene extends RoomScene {
  constructor() {
    super(LUMBER_YARD_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 560,
      height: 420,
      floorColor: 0xe3cfae,
      wallColor: 0x7a5a3a,
      doorPos: { x: 280, y: 370 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🪵 木材店");
    this.drawDoor();

    // Wood piles & tools decor
    const piles = [
      { x: 90, y: 110, n: 3 },
      { x: 470, y: 110, n: 2 },
      { x: 90, y: 300, n: 2 },
      { x: 470, y: 300, n: 3 },
    ];
    for (const pile of piles) {
      for (let i = 0; i < pile.n; i++) {
        this.add
          .text(pile.x, pile.y - i * 12, "🪵", { fontSize: "20px" })
          .setOrigin(0.5);
      }
    }
    this.add.text(200, 70, "🪚", { fontSize: "22px" }).setOrigin(0.5);
    this.add.text(440, 70, "🪓", { fontSize: "22px" }).setOrigin(0.5);

    // Counter with the clerk
    this.add.ellipse(COUNTER.x + 2, COUNTER.y + 26, 130, 16, 0x3d2b1f, 0.18);
    this.add.rectangle(COUNTER.x, COUNTER.y + 12, 140, 30, 0x8a6642);
    this.add.rectangle(COUNTER.x, COUNTER.y, 140, 22, 0xb08a5f);
    this.add.text(COUNTER.x - 40, COUNTER.y - 14, "🧑‍💼", { fontSize: "28px" });
    this.add
      .text(COUNTER.x, COUNTER.y - 40, "💰 木材收购台", {
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
      prompt = "按 F 离开木材店";
    } else if (this.near(pos, COUNTER, 80)) {
      next = { kind: "counter" };
      prompt = "按 F 出售木材";
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    if (this.pending?.kind === "counter") {
      this.session.bridge.patch({ depotOpen: true });
    } else if (this.pending?.kind === "exit") {
      this.exitRoom();
    }
  }

  protected roomUpdate(): void {
    // Keep order cooking ticking (session.tick already runs in base update).
  }
}