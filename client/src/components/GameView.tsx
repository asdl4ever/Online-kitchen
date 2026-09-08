import { useEffect, useRef, useState } from "react";
import {
  createGame,
  destroyGame,
  makeDefaultSession,
  onAreaChange,
} from "../game/createGame";
import type { GameBridge } from "../game/bridge";
import { Hud } from "./Hud";
import { BackpackOverlay } from "./BackpackOverlay";
import { MenuOverlay } from "./MenuOverlay";
import { DepotOverlay } from "./DepotOverlay";
import { PhoneShopOverlay } from "./PhoneShopOverlay";
import { PhoneAppOverlay } from "./PhoneAppOverlay";
import { CollectionOverlay } from "./CollectionOverlay";
import { SettingsOverlay } from "./SettingsOverlay";
import { Toast } from "./Toast";
import { Hotbar } from "./Hotbar";

export function GameView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bridge, setBridge] = useState<GameBridge | null>(null);
  const [areaLabel, setAreaLabel] = useState<string>("出生广场");

  useEffect(() => {
    if (!containerRef.current) return;
    const session = makeDefaultSession();
    const game = createGame(containerRef.current, session);
    const onArea = (label: string) => setAreaLabel(label);
    const off = onAreaChange(game, onArea);
    setBridge(session.bridge);
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
          <Hotbar bridge={bridge} />
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