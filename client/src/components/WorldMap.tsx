import { useEffect } from "react";
import { AREAS, WORLD_BOUNDS } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const AREA_COLORS: Record<string, string> = {
  spawn: "#7ec850",
  forest: "#2f6b2f",
  lumberYard: "#8a6642",
  restaurant: "#e0574f",
  phoneStore: "#5b7bd5",
  town: "#d9a066",
  foodStreet: "#e8b04a",
  arcade: "#8a6ac9",
  casino: "#b3395e",
  petShop: "#6f9b6f",
  resort: "#ffd98a",
  lake: "#4a90d9",
  residential: "#c9a86a",
  furnitureShop: "#a08a5a",
  carShop: "#6a7a8a",
  dealership: "#c9a83a",
};

/**
 * Shared renderer for the corner minimap and the M-key fullscreen map.
 * Draws area rectangles from shared AREAS + a live player dot.
 */
export function WorldMap({
  bridge,
  width,
  showLabels,
}: {
  bridge: GameBridge;
  width: number;
  showLabels: boolean;
}) {
  const state = useGameState(bridge);
  const scale = width / WORLD_BOUNDS.width;
  const height = WORLD_BOUNDS.height * scale;
  const toX = (x: number) => (x - WORLD_BOUNDS.x) * scale;
  const toY = (y: number) => (y - WORLD_BOUNDS.y) * scale;

  return (
    <div
      className="worldmap"
      style={{ width, height: height + 6 }}
    >
      <div className="worldmap-inner" style={{ width, height }}>
        {AREAS.map((area) => (
          <div
            key={area.id}
            className="worldmap-area"
            style={{
              left: toX(area.bounds.x),
              top: toY(area.bounds.y),
              width: area.bounds.width * scale,
              height: area.bounds.height * scale,
              background: AREA_COLORS[area.kind] ?? "#999",
            }}
            title={area.label}
          >
            {showLabels && area.bounds.width * scale > 44 && (
              <span className="worldmap-label">{area.label}</span>
            )}
          </div>
        ))}
        {state.playerPos && (
          <div
            className="worldmap-player"
            style={{
              left: toX(state.playerPos.x) - 5,
              top: toY(state.playerPos.y) - 5,
            }}
          >
            🙂
          </div>
        )}
      </div>
    </div>
  );
}

export function Minimap({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  void state;
  return <WorldMap bridge={bridge} width={168} showLabels={false} />;
}

/** Fullscreen map toggled with M. */
export function MapOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM") {
        bridge.send({ type: "toggle-map" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bridge]);

  if (!state.mapOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-map" })}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>🗺️ 世界地图</h2>
        <WorldMap bridge={bridge} width={560} showLabels />
        <p className="panel-hint">按 M 或点击空白处关闭</p>
      </div>
    </div>
  );
}