import Phaser from "phaser";
import { MainScene, AREA_CHANGE_EVENT } from "./MainScene";
import { GameBridge } from "./bridge";
import { DEFAULT_BINDINGS, makeAudioSettings } from "shared";

export function createGame(
  parent: HTMLElement,
  bridge: GameBridge,
): Phaser.Game {
  const game = new Phaser.Game({
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

  const scene = game.scene.getScene("MainScene") as MainScene;
  scene.constructorBridge(bridge);

  return game;
}

export function makeDefaultBridge(): GameBridge {
  return new GameBridge({
    bindings: { ...DEFAULT_BINDINGS },
    audio: makeAudioSettings(),
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