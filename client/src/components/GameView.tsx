import { useEffect, useRef, useState } from "react";
import { createGame, destroyGame, onAreaChange } from "../game/createGame";

export function GameView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [areaLabel, setAreaLabel] = useState<string>("出生广场");

  useEffect(() => {
    if (!containerRef.current) return;
    const game = createGame(containerRef.current);
    const off = onAreaChange(game, setAreaLabel);
    return () => {
      off();
      destroyGame(game);
    };
  }, []);

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-canvas" />
      <div className="game-overlay">
        <div className="hud-area">
          <span className="hud-label">当前区域</span>
          <span className="hud-value">{areaLabel}</span>
        </div>
        <div className="hud-help">
          <p>WASD 移动</p>
          <p>鼠标左键 砍树</p>
          <p>E 背包</p>
          <p>F 交互</p>
          <p>Esc 设置</p>
        </div>
      </div>
    </div>
  );
}