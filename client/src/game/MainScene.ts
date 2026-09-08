import Phaser from "phaser";
import {
  AREAS,
  areaAt,
  clampToWorld,
  WORLD_BOUNDS,
  type Area,
} from "shared";

const AREA_COLORS: Record<Area["kind"], number> = {
  spawn: 0x7ec850,
  forest: 0x2f6b2f,
  lumberYard: 0x8a6642,
  restaurant: 0xe0574f,
  phoneStore: 0x5b7bd5,
};

export const AREA_CHANGE_EVENT = "area-change";

export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private playerSpeed = 240;
  private lastAreaLabel: string | undefined;

  constructor() {
    super("MainScene");
  }

  create(): void {
    this.physics.world.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );

    this.drawWorld();

    this.player = this.add.circle(0, 0, 14, 0xffd93b);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);

    this.keys = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      WORLD_BOUNDS.x,
      WORLD_BOUNDS.y,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
    );
  }

  private drawWorld(): void {
    this.add.rectangle(
      WORLD_BOUNDS.x + WORLD_BOUNDS.width / 2,
      WORLD_BOUNDS.y + WORLD_BOUNDS.height / 2,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
      0xcfe8cf,
    ).setOrigin(0.5);

    for (const area of AREAS) {
      this.drawArea(area);
    }
  }

  private drawArea(area: Area): void {
    const cx = area.bounds.x + area.bounds.width / 2;
    const cy = area.bounds.y + area.bounds.height / 2;
    this.add.rectangle(
      cx,
      cy,
      area.bounds.width,
      area.bounds.height,
      AREA_COLORS[area.kind],
      0.8,
    );
    this.add
      .text(cx, cy, area.label, {
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    const dx =
      (this.keys.d.isDown ? 1 : 0) - (this.keys.a.isDown ? 1 : 0);
    const dy =
      (this.keys.s.isDown ? 1 : 0) - (this.keys.w.isDown ? 1 : 0);

    let vx = 0;
    let vy = 0;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      vx = (dx / len) * this.playerSpeed;
      vy = (dy / len) * this.playerSpeed;
    }

    this.playerBody.setVelocity(vx, vy);

    const pos = clampToWorld({
      x: this.playerBody.position.x + this.playerBody.halfWidth,
      y: this.playerBody.position.y + this.playerBody.halfHeight,
    });
    this.playerBody.reset(pos.x, pos.y);

    const area = areaAt(pos);
    const label = area ? area.label : "野外地带";
    if (label !== this.lastAreaLabel) {
      this.lastAreaLabel = label;
      this.events.emit(AREA_CHANGE_EVENT, label);
    }
  }
}