import Phaser from "phaser";

export interface PlayerRig {
  circle: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  shadow: Phaser.GameObjects.Ellipse;
  /** Animated face: sclera + pupils that track movement + periodic blink. */
  eyes: Phaser.GameObjects.Container;
  keys: Record<string, Phaser.Input.Keyboard.Key>;
}

export const PLAYER_SPEED = 240;
const PUPIL_OFFSET = 3.2;

export function createPlayerRig(scene: Phaser.Scene, x: number, y: number): PlayerRig {
  const circle = scene.add.circle(x, y, 14, 0xffd93b);
  scene.physics.add.existing(circle);
  const body = circle.body as Phaser.Physics.Arcade.Body;
  body.setCollideWorldBounds(true);

  const shadow = scene.add.ellipse(x + 2, y + 12, 26, 10, 0x3d2b1f, 0.22);

  // Cartoon eyes: white sclera, dark pupils that look where you walk.
  const eyes = scene.add.container(x, y);
  const leftSclera = scene.add.circle(-5.5, -3, 4.4, 0xffffff);
  const rightSclera = scene.add.circle(5.5, -3, 4.4, 0xffffff);
  const leftPupil = scene.add.circle(-5.5, -3, 2.1, 0x2b1d10);
  const rightPupil = scene.add.circle(5.5, -3, 2.1, 0x2b1d10);
  const mouth = scene.add.arc(0, 3.5, 4.5, 20, 160, false, 0xa8642a);
  mouth.setStrokeStyle(1.6, 0xa8642a);
  eyes.add([leftSclera, rightSclera, leftPupil, rightPupil, mouth]);
  eyes.setDepth(5);

  scheduleBlink(scene, eyes, leftSclera, rightSclera, leftPupil, rightPupil);

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

  return { circle, body, shadow, eyes, keys };
}

function scheduleBlink(
  scene: Phaser.Scene,
  eyes: Phaser.GameObjects.Container,
  leftSclera: Phaser.GameObjects.Arc,
  rightSclera: Phaser.GameObjects.Arc,
  leftPupil: Phaser.GameObjects.Arc,
  rightPupil: Phaser.GameObjects.Arc,
): void {
  scene.time.delayedCall(1600 + Math.random() * 2400, () => {
    if (!eyes.active || !eyes.scene) return;
    scene.tweens.add({
      targets: [leftSclera, rightSclera, leftPupil, rightPupil],
      scaleY: 0.12,
      yoyo: true,
      hold: 60,
      duration: 70,
      ease: "Quad.easeInOut",
    });
    scheduleBlink(scene, eyes, leftSclera, rightSclera, leftPupil, rightPupil);
  });
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
  rig.eyes.setPosition(rig.circle.x, rig.circle.y);

  // Pupils look toward the walking direction.
  const v = rig.body.velocity;
  const speed = Math.hypot(v.x, v.y);
  let ox = 0;
  let oy = 0;
  if (speed > 4) {
    ox = (v.x / speed) * PUPIL_OFFSET;
    oy = (v.y / speed) * PUPIL_OFFSET;
  }
  const [leftPupil, rightPupil] = rig.eyes.list.slice(2, 4) as Phaser.GameObjects.Arc[];
  leftPupil.x = -5.5 + ox;
  leftPupil.y = -3 + oy;
  rightPupil.x = 5.5 + ox;
  rightPupil.y = -3 + oy;
}

export function teleportPlayer(rig: PlayerRig, x: number, y: number): void {
  rig.body.reset(x, y);
  rig.circle.setPosition(x, y);
  rig.eyes.setPosition(x, y);
}