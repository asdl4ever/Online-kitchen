import Phaser from "phaser";
import type { Order } from "shared";
import {
  RoomScene,
  RESTAURANT_SCENE_KEY,
  type RoomPendingInteract,
} from "./RoomScene";
import { syncPlayerVisuals } from "./player";

const COUNTER = { x: 320, y: 120 };
const TABLES = [
  { x: 200, y: 280 },
  { x: 320, y: 300 },
  { x: 440, y: 280 },
];
const SEAT_RANGE = 60;

interface SeatBubble {
  container: Phaser.GameObjects.Container;
}

export class RestaurantScene extends RoomScene {
  private seatBubble: SeatBubble | null = null;
  private delivering = false;
  private waiterWiggle = 0;

  constructor() {
    super(RESTAURANT_SCENE_KEY);
  }

  protected getLayout() {
    return {
      width: 640,
      height: 480,
      floorColor: 0xf3e0c8,
      wallColor: 0x8a5a44,
      doorPos: { x: 320, y: 430 },
    };
  }

  protected drawRoom(): void {
    this.drawFloorAndWalls("🍽️ 餐厅");
    this.drawDoor();

    // Potted plants + wall decor
    this.add.text(50, 70, "🪴", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(590, 70, "🪴", { fontSize: "26px" }).setOrigin(0.5);
    this.add.text(120, 60, "🖼️", { fontSize: "22px" }).setOrigin(0.5);
    this.add.text(520, 60, "🖼️", { fontSize: "22px" }).setOrigin(0.5);

    // Counter with the boss
    this.add.ellipse(COUNTER.x + 2, COUNTER.y + 26, 130, 16, 0x3d2b1f, 0.18);
    this.add.rectangle(COUNTER.x, COUNTER.y + 12, 140, 30, 0x9b6d4c);
    this.add.rectangle(COUNTER.x, COUNTER.y, 140, 22, 0xc08b5f);
    this.add.text(COUNTER.x - 40, COUNTER.y - 14, "🧑‍🍳", { fontSize: "28px" });
    const sign = this.add
      .text(COUNTER.x, COUNTER.y - 40, "📝 点餐台", {
        fontSize: "13px",
        color: "#fff8ec",
        fontStyle: "bold",
        backgroundColor: "#3d2b1fcc",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // Tables
    TABLES.forEach((t, i) => {
      this.add.ellipse(t.x + 2, t.y + 22, 56, 14, 0x3d2b1f, 0.18);
      this.add.rectangle(t.x, t.y, 52, 44, 0x9b6d4c);
      this.add.rectangle(t.x, t.y - 4, 42, 32, 0xe8dcc8);
      this.add.text(t.x, t.y - 4, "🪑", { fontSize: "18px" }).setOrigin(0.5);
      const num = this.add
        .text(t.x + 20, t.y - 22, `${i + 1}`, {
          fontSize: "11px",
          color: "#fff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.add.circle(t.x + 20, t.y - 22, 9, 0xe8833a, 0.95).setDepth(num.depth - 1);
    });
    void sign;
  }

  protected detectInteract(): void {
    const pos = { x: this.rig.circle.x, y: this.rig.circle.y };
    let next: RoomPendingInteract = null;
    let prompt: string | null = null;

    if (this.near(pos, this.layout.doorPos, 60)) {
      next = { kind: "exit" };
      prompt = "按 F 离开餐厅";
    } else if (this.near(pos, COUNTER, 80)) {
      next = { kind: "counter" };
      prompt = "按 F 向老板点单";
    } else {
      for (let i = 0; i < TABLES.length; i++) {
        if (this.near(pos, TABLES[i], SEAT_RANGE)) {
          next = { kind: "seat", tableIndex: i };
          prompt =
            this.session.seatedTable === i ? "按 F 起身" : `按 F 入座 ${i + 1} 号桌`;
          break;
        }
      }
    }

    this.pending = next;
    this.bridgePatchPrompt(prompt);
  }

  protected onInteract(): void {
    switch (this.pending?.kind) {
      case "counter":
        this.session.bridge.patch({ menuOpen: true });
        break;
      case "seat":
        this.toggleSeat(this.pending.tableIndex);
        break;
      case "exit":
        this.exitRoom();
        break;
    }
  }

  private toggleSeat(tableIndex: number): void {
    if (this.session.seatedTable === tableIndex) {
      this.session.standUp();
      this.clearSeatBubble();
      return;
    }
    this.session.sitAt(tableIndex);
    this.placeSeatBubble(tableIndex);
  }

  private placeSeatBubble(tableIndex: number): void {
    this.clearSeatBubble();
    const table = TABLES[tableIndex];
    const container = this.add.container(table.x, table.y);
    container.add(this.add.circle(0, -30, 11, 0xffffff, 0.92));
    container.add(this.add.text(-7, -36, "😋", { fontSize: "15px" }));
    this.seatBubble = { container };
  }

  private clearSeatBubble(): void {
    this.seatBubble?.container.destroy();
    this.seatBubble = null;
  }

  protected roomUpdate(_dt: number): void {
    // Seat bubble wiggle
    if (this.seatBubble) {
      this.seatBubble.container.y =
        TABLES[this.session.seatedTable ?? 0].y + Math.sin(this.waiterWiggle) * 2;
      this.waiterWiggle += 0.05;
    }

    // Deliver ready orders to the seated player
    if (this.delivering || this.session.seatedTable === null) return;
    const ready = this.session.peekReadyOrder();
    if (!ready) return;
    this.deliverOrder(ready);
  }

  private deliverOrder(order: Order): void {
    this.delivering = true;
    const dish = this.session.dishOf(order);
    const table = TABLES[this.session.seatedTable ?? 0];
    const plate = this.add.text(COUNTER.x, COUNTER.y + 6, dish.emoji, {
      fontSize: "28px",
    });
    this.tweens.add({
      targets: plate,
      x: table.x,
      y: table.y - 28,
      duration: 900,
      ease: "Quad.easeInOut",
      onComplete: () => {
        plate.destroy();
        this.session.finishOrder(order);
        this.delivering = false;
      },
    });
    syncPlayerVisuals(this.rig);
  }
}