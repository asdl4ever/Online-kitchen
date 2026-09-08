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
            <p>✅ 你已经有一部手机啦！</p>
            <p className="panel-hint">随时点击 HUD 的 📲 按钮，地图任意位置远程点餐。</p>
            <button
              className="btn"
              onClick={() => bridge.send({ type: "close-phone-shop" })}
            >
              关闭
            </button>
          </>
        ) : (
          <>
            <p>
              智能手机 📱 一部 <b>{PHONE_PRICE}</b> 元
            </p>
            <p className="panel-balance">💰 余额 {state.money} 元</p>
            <p className="panel-hint">
              💡 买下后不用跑柜台，在地图任意处用 App 点餐，菜照样送到桌前。
            </p>
            <button
              className="btn"
              disabled={state.money < PHONE_PRICE}
              onClick={() => bridge.send({ type: "buy-phone" })}
            >
              {state.money >= PHONE_PRICE ? "购买 📱" : "钱不够哦 😢"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => bridge.send({ type: "close-phone-shop" })}
            >
              🚪 离开
            </button>
          </>
        )}
      </div>
    </div>
  );
}