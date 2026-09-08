import Phaser from "phaser";
import { MainScene, AREA_CHANGE_EVENT } from "./MainScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#cfe8cf",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [MainScene],
  });
}

export function onAreaChange(
  game: Phaser.Game,
  listener: (label: string) => void,
): () => void {
  const scene = game.scene.getScene("MainScene") as Phaser.Scene;
  scene.events.on(AREA_CHANGE_EVENT, listener);
  return () => scene.events.off(AREA_CHANGE_EVENT, listener);
}

export function destroyGame(game: Phaser.Game): void {
  game.destroy(true);
}