import { PHONE_PRICE } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

export function PhoneShopOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  if (!state.phoneShopOpen) return null;
  const owned = state.hasPhone;

  return (
    <div
      className="overlay-backdrop"
      onClick={() => bridge.send({ type: "close-phone-shop" })}
    >
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>📱 手机店</h2>
        {owned ? (
          <>
            <p>你已经有一部手机啦，随时打开手机 App 远程点餐。</p>
            <button
              className="btn"
              onClick={() => bridge.send({ type: "close-phone-shop" })}
            >
              关闭
            </button>
          </>
        ) : (
          <>
            <p>一部手机 {PHONE_PRICE} 元，买下后即可在地图任意处点餐。</p>
            <p className="panel-balance">余额：💰 {state.money}</p>
            <button
              className="btn"
              disabled={state.money < PHONE_PRICE}
              onClick={() => bridge.send({ type: "buy-phone" })}
            >
              {state.money >= PHONE_PRICE ? "购买 📱" : "钱不够哦"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => bridge.send({ type: "close-phone-shop" })}
            >
              离开
            </button>
          </>
        )}
      </div>
    </div>
  );
}