import Phaser from "phaser";
import { getQuality, getSpecies, type Pet } from "shared";

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

export function syncPlayerVisuals(
  rig: PlayerRig,
  pointer?: Phaser.Input.Pointer,
): void {
  rig.shadow.setPosition(rig.circle.x + 2, rig.circle.y + 12);
  rig.eyes.setPosition(rig.circle.x, rig.circle.y);

  // Pupils follow the mouse cursor (fall back to center).
  if (!pointer) return;
  const dx = pointer.worldX - rig.circle.x;
  const dy = pointer.worldY - rig.circle.y;
  const dist = Math.hypot(dx, dy);
  let ox = 0;
  let oy = 0;
  if (dist > 10) {
    ox = (dx / dist) * PUPIL_OFFSET;
    oy = (dy / dist) * PUPIL_OFFSET;
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

/** Visual pet that trails the player with a quality-colored aura. */
export interface PetVisual {
  id: string;
  emoji: string;
  color: number;
}

export function petVisualOf(pet: Pet): PetVisual {
  return {
    id: pet.id,
    emoji: getSpecies(pet.species).emoji,
    color: getQuality(pet.quality).color,
  };
}

export class PetTrail {
  private container: Phaser.GameObjects.Container | null = null;
  private petId: string | null = null;
  private x = 0;
  private y = 0;

  constructor(private scene: Phaser.Scene) {}

  /** Call every frame; creates/destroys the follower as the pet changes. */
  update(targetX: number, targetY: number, pet: PetVisual | null, dt: number): void {
    if (!pet) {
      this.container?.destroy();
      this.container = null;
      this.petId = null;
      return;
    }
    if (!this.container || this.petId !== pet.id) {
      this.container?.destroy();
      const container = this.scene.add.container(targetX - 22, targetY + 8);
      const aura = this.scene.add.circle(0, 4, 12, pet.color, 0.45);
      const body = this.scene.add.text(0, 0, pet.emoji, { fontSize: "22px" }).setOrigin(0.5);
      container.add([aura, body]);
      container.setDepth(4);
      this.container = container;
      this.petId = pet.id;
      this.x = targetX - 22;
      this.y = targetY + 8;
    }
    const lerp = Math.min(1, dt * 5);
    this.x += (targetX - 22 - this.x) * lerp;
    this.y += (targetY + 8 - this.y) * lerp;
    this.container.setPosition(this.x, this.y);
    // Hop while moving
    this.container.y += Math.sin(this.scene.time.now * 0.012) * 2;
  }

  destroy(): void {
    this.container?.destroy();
    this.container = null;
    this.petId = null;
  }
}