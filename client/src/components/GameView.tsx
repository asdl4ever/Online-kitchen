import { useEffect, useRef, useState } from "react";
import {
  createGame,
  destroyGame,
  makeDefaultBridge,
  onAreaChange,
} from "../game/createGame";
import { GameBridge } from "../game/bridge";
import { Hud } from "./Hud";
import { BackpackOverlay } from "./BackpackOverlay";
import { MenuOverlay } from "./MenuOverlay";
import { DepotOverlay } from "./DepotOverlay";
import { PhoneShopOverlay } from "./PhoneShopOverlay";
import { PhoneAppOverlay } from "./PhoneAppOverlay";
import { CollectionOverlay } from "./CollectionOverlay";
import { SettingsOverlay } from "./SettingsOverlay";
import { Toast } from "./Toast";

export function GameView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bridge, setBridge] = useState<GameBridge | null>(null);
  const [areaLabel, setAreaLabel] = useState<string>("出生广场");

  useEffect(() => {
    if (!containerRef.current) return;
    const b = makeDefaultBridge();
    const game = createGame(containerRef.current, b);
    const onArea = (label: string) => setAreaLabel(label);
    const off = onAreaChange(game, onArea);
    setBridge(b);
    return () => {
      off();
      destroyGame(game);
    };
  }, []);

  return (
    <div className="game-root">
      <div ref={containerRef} className="game-canvas" />
      {bridge && (
        <>
          <Hud bridge={bridge} areaLabel={areaLabel} />
          <BackpackOverlay bridge={bridge} />
          <MenuOverlay bridge={bridge} />
          <DepotOverlay bridge={bridge} />
          <PhoneShopOverlay bridge={bridge} />
          <PhoneAppOverlay bridge={bridge} />
          <CollectionOverlay bridge={bridge} />
          <SettingsOverlay bridge={bridge} />
          <Toast bridge={bridge} />
        </>
      )}
    </div>
  );
}