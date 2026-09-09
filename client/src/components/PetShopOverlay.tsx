import { PET_EGG_PRICE } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function PetShopOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.petShopOpen) return null;

  const hasEmptySlot = state.hotbar.some((item) => item === null);

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-pet-shop" })}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>🐾 宠物店</h2>
        <p>
          闪闪宠物蛋 🥚 一颗 <b>{PET_EGG_PRICE}</b> 元
        </p>
        <p className="panel-balance">💰 余额 {state.money} 元</p>
        <p className="panel-hint">
          💡 孵化出随机宠物和品质：普通→传说，品质越好卖木材加成越高；重复买蛋可攒更多伙伴！
        </p>
        <button
          className="btn"
          disabled={state.money < PET_EGG_PRICE || !hasEmptySlot}
          onClick={() => bridge.send({ type: "buy-egg" })}
        >
          {!hasEmptySlot ? "物品栏满了" : state.money >= PET_EGG_PRICE ? "买蛋 🥚" : "钱不够哦"}
        </button>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-pet-shop" })}>
          🚪 离开
        </button>
      </div>
    </div>
  );
}