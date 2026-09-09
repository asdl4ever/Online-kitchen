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
import { SnackStreetOverlay } from "./SnackStreetOverlay";
import { ArcadeOverlay } from "./ArcadeOverlay";
import { CasinoOverlay } from "./CasinoOverlay";
import { PetsOverlay } from "./PetsOverlay";
import { PetShopOverlay } from "./PetShopOverlay";
import { Minimap, MapOverlay } from "./WorldMap";
import { FishMarketOverlay } from "./FishMarketOverlay";
import { FurnitureOverlay } from "./FurnitureOverlay";
import { CarShopOverlay, DealershipOverlay } from "./VehicleShopOverlay";
import { HousePanelOverlay } from "./HousePanelOverlay";
import { ReactionOverlay } from "./ReactionOverlay";

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
          <div className="minimap-corner">
            <Minimap bridge={bridge} />
            <p className="minimap-hint">按 M 看大地图</p>
          </div>
          <BackpackOverlay bridge={bridge} />
          <MenuOverlay bridge={bridge} />
          <DepotOverlay bridge={bridge} />
          <PhoneShopOverlay bridge={bridge} />
          <PhoneAppOverlay bridge={bridge} />
          <SnackStreetOverlay bridge={bridge} />
          <ArcadeOverlay bridge={bridge} />
          <CasinoOverlay bridge={bridge} />
          <PetsOverlay bridge={bridge} />
          <PetShopOverlay bridge={bridge} />
          <CollectionOverlay bridge={bridge} />
          <SettingsOverlay bridge={bridge} />
          <FishMarketOverlay bridge={bridge} />
          <FurnitureOverlay bridge={bridge} />
          <CarShopOverlay bridge={bridge} />
          <DealershipOverlay bridge={bridge} />
          <HousePanelOverlay bridge={bridge} />
          <ReactionOverlay bridge={bridge} />
          <MapOverlay bridge={bridge} />
          <Toast bridge={bridge} />
        </>
      )}
    </div>
  );
}