import Phaser from "phaser";

export interface PlayerRig {
  circle: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  shadow: Phaser.GameObjects.Ellipse;
  face: Phaser.GameObjects.Text;
  keys: Record<string, Phaser.Input.Keyboard.Key>;
}

export const PLAYER_SPEED = 240;

export function createPlayerRig(scene: Phaser.Scene, x: number, y: number): PlayerRig {
  const circle = scene.add.circle(x, y, 14, 0xffd93b);
  scene.physics.add.existing(circle);
  const body = circle.body as Phaser.Physics.Arcade.Body;
  body.setCollideWorldBounds(true);

  const shadow = scene.add.ellipse(x + 2, y + 12, 26, 10, 0x3d2b1f, 0.22);
  const face = scene.add
    .text(x, y - 1, "◕‿◕", { fontSize: "10px", color: "#7a5a00" })
    .setOrigin(0.5);

  const kb = scene.input.keyboard!;
  kb.addCapture([
    Phaser.Input.Keyboard.KeyCodes.F,
    Phaser.Input.Keyboard.KeyCodes.E,
    Phaser.Input.Keyboard.KeyCodes.W,
    Phaser.Input.Keyboard.KeyCodes.A,
    Phaser.Input.Keyboard.KeyCodes.S,
    Phaser.Input.Keyboard.KeyCodes.D,
  ]);
  const keys = {
    interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F, false, false),
    openInventory: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false, false),
    openSettings: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false, false),
    moveUp: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W, false, false),
    moveDown: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, false, false),
    moveLeft: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A, false, false),
    moveRight: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, false, false),
  };

  return { circle, body, shadow, face, keys };
}

export function movePlayerRig(rig: PlayerRig, speed = PLAYER_SPEED): void {
  const dx =
    (rig.keys.moveRight.isDown ? 1 : 0) - (rig.keys.moveLeft.isDown ? 1 : 0);
  const dy =
    (rig.keys.moveDown.isDown ? 1 : 0) - (rig.keys.moveUp.isDown ? 1 : 0);

  let vx = 0;
  let vy = 0;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    vx = (dx / len) * speed;
    vy = (dy / len) * speed;
  }
  rig.body.setVelocity(vx, vy);
}

export function syncPlayerVisuals(rig: PlayerRig): void {
  rig.shadow.setPosition(rig.circle.x + 2, rig.circle.y + 12);
  rig.face.setPosition(rig.circle.x, rig.circle.y - 1);
}

export function teleportPlayer(rig: PlayerRig, x: number, y: number): void {
  rig.body.reset(x, y);
  rig.circle.setPosition(x, y);
}