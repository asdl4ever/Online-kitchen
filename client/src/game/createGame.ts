import Phaser from "phaser";
import { MainScene, AREA_CHANGE_EVENT } from "./MainScene";
import { RestaurantScene } from "./RestaurantScene";
import { LumberYardScene } from "./LumberYardScene";
import { ArcadeScene } from "./ArcadeScene";
import { CasinoScene } from "./CasinoScene";
import { GameBridge, GAME_BRIDGE_KEY } from "./bridge";
import { GameSession, SESSION_KEY } from "./session";
import { DEFAULT_BINDINGS, makeAudioSettings } from "shared";

export function createGame(
  parent: HTMLElement,
  session: GameSession,
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
    scene: [MainScene, RestaurantScene, LumberYardScene, ArcadeScene, CasinoScene],
  });
  game.registry.set(GAME_BRIDGE_KEY, session.bridge);
  game.registry.set(SESSION_KEY, session);
  return game;
}

export function makeDefaultSession(): GameSession {
  const bridge = new GameBridge({
    bindings: { ...DEFAULT_BINDINGS },
    audio: makeAudioSettings(),
  });
  return new GameSession(bridge);
}

/**
 * Subscribes to area-change events once the scene has booted.
 * Returns an unsubscribe function. Safe before the scene is running.
 */
export function onAreaChange(
  game: Phaser.Game,
  listener: (label: string) => void,
): () => void {
  let scene = game.scene.getScene("MainScene") as Phaser.Scene | null;
  if (scene) {
    attachToScene(scene, listener);
    return () => detachFromScene(scene!, listener);
  }
  const onReady = () => {
    scene = game.scene.getScene("MainScene") as Phaser.Scene | null;
    if (scene) attachToScene(scene, listener);
  };
  game.events.on(Phaser.Scenes.Events.READY, onReady);
  return () => {
    game.events.off(Phaser.Scenes.Events.READY, onReady);
    if (scene) detachFromScene(scene, listener);
  };
}

function attachToScene(scene: Phaser.Scene, listener: (label: string) => void): void {
  if (scene.sys.settings.status === Phaser.Scenes.RUNNING) {
    scene.events.on(AREA_CHANGE_EVENT, listener);
    return;
  }
  scene.events.once(Phaser.Scenes.Events.READY, () =>
    scene.events.on(AREA_CHANGE_EVENT, listener),
  );
}

function detachFromScene(
  scene: Phaser.Scene,
  listener: (label: string) => void,
): void {
  scene.events.off(AREA_CHANGE_EVENT, listener);
}

export function destroyGame(game: Phaser.Game): void {
  game.destroy(true);
}